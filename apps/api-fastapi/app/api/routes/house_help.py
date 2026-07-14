from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Apartment, HouseHelp, HouseHelpAssignment, HouseHelpEntry, HouseHelpReview, Residency, Tenant
from app.schemas.house_help import (
    CheckInHouseHelpRequest,
    CreateHouseHelpAssignmentRequest,
    CreateHouseHelpRequest,
    CreateHouseHelpReviewRequest,
    HouseHelpAssignmentResponse,
    HouseHelpEntryResponse,
    HouseHelpResponse,
    HouseHelpReviewResponse,
    HouseHelpReviewsView,
    UpdateHouseHelpRequest,
    UpdateVerificationRequest,
)


router = APIRouter(prefix="/house-help", tags=["house-help"])


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def lives_in_apartment(db: Session, actor: ActorContext, apartment_id: str) -> bool:
    if not actor.user_id:
        return False
    return (
        db.query(Residency)
        .filter(Residency.user_id == actor.user_id, Residency.apartment_id == apartment_id, Residency.end_date.is_(None))
        .one_or_none()
        is not None
    )


def trust_score(sum_ratings: int, count: int) -> int:
    prior_mean = 3
    prior_weight = 3
    smoothed = (sum_ratings + prior_mean * prior_weight) / (count + prior_weight)
    return round((smoothed / 5) * 100)


def verification_level(id_verified: bool, background_check: str) -> str:
    return "VERIFIED" if id_verified and background_check == "CLEARED" else "UNVERIFIED"


def compute_trust_score(rating_trust: int, id_verified: bool, background_check: str, tenure_days: int, incident_count: int) -> int:
    score = rating_trust * 0.4
    if id_verified:
        score += 20
    if background_check == "CLEARED":
        score += 28
    elif background_check == "FLAGGED":
        score -= 40
    score += min(tenure_days // 30, 12)
    score -= incident_count * 10
    return max(0, min(100, round(score)))


@router.get("", response_model=list[HouseHelpResponse])
async def list_house_help(
    type_filter: str | None = Query(default=None, alias="type"),
    apartment_id: str | None = Query(default=None, alias="apartmentId"),
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[HouseHelpResponse]:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return []
    query = db.query(HouseHelp).filter(HouseHelp.tenant_id == tenant_row.id)
    if actor.role != "ADMIN":
        query = query.filter(HouseHelp.is_active.is_(True))
    if type_filter:
        query = query.filter(HouseHelp.type == type_filter)
    if apartment_id:
        assigned_ids = db.query(HouseHelpAssignment.house_help_id).filter(
            HouseHelpAssignment.tenant_id == tenant_row.id, HouseHelpAssignment.apartment_id == apartment_id
        )
        query = query.filter(HouseHelp.id.in_(assigned_ids))
    rows = query.order_by(asc(HouseHelp.name)).all()
    ratings = (
        db.query(HouseHelpReview.house_help_id, HouseHelpReview.rating)
        .filter(HouseHelpReview.tenant_id == tenant_row.id)
        .all()
    )
    by_help: dict[str, list[int]] = {}
    for house_help_id, rating in ratings:
        by_help.setdefault(house_help_id, []).append(rating)
    now = datetime.now(timezone.utc)
    result = []
    for row in rows:
        ratings_for_help = by_help.get(row.id, [])
        count = len(ratings_for_help)
        rating_sum = sum(ratings_for_help)
        avg = round(rating_sum / count, 1) if count else None
        tenure_days = (now - row.created_at).days
        rating_trust = trust_score(rating_sum, count)
        result.append(
            HouseHelpResponse(
                id=row.id,
                name=row.name,
                phone=row.phone,
                type=row.type,
                photoUrl=row.photo_url,
                idProofType=row.id_proof_type,
                idProofNumber=row.id_proof_number,
                idProofUrl=row.id_proof_url,
                idVerified=row.id_verified,
                backgroundCheck=row.background_check,
                incidentCount=row.incident_count,
                isActive=row.is_active,
                registeredBy=row.registered_by,
                createdAt=row.created_at,
                updatedAt=row.updated_at,
                ratingAvg=avg,
                reviewCount=count,
                trustScore=compute_trust_score(rating_trust, row.id_verified, row.background_check, tenure_days, row.incident_count),
                verificationLevel=verification_level(row.id_verified, row.background_check),
            )
        )
    return result


@router.get("/{house_help_id}/reviews", response_model=HouseHelpReviewsView)
async def get_house_help_reviews(
    house_help_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpReviewsView:
    _ = actor
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    rows = (
        db.query(HouseHelpReview)
        .filter(HouseHelpReview.tenant_id == tenant_row.id, HouseHelpReview.house_help_id == house_help_id)
        .order_by(desc(HouseHelpReview.created_at))
        .all()
    ) if tenant_row else []
    ratings = [row.rating for row in rows]
    count = len(ratings)
    total = sum(ratings)
    average = round(total / count, 1) if count else None
    return HouseHelpReviewsView(
        reviews=[HouseHelpReviewResponse.model_validate(row) for row in rows],
        summary={"average": average, "count": count, "trustScore": trust_score(total, count)},
    )


@router.post("/{house_help_id}/reviews", status_code=status.HTTP_201_CREATED)
async def create_house_help_review(
    house_help_id: str,
    payload: CreateHouseHelpReviewRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    require_roles(actor, "RESIDENT", "ADMIN")
    if not actor.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthenticated")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    help_row = (
        db.query(HouseHelp)
        .filter(HouseHelp.tenant_id == tenant_row.id, HouseHelp.id == house_help_id)
        .one_or_none()
    ) if tenant_row else None
    if help_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="house help not found")
    row = (
        db.query(HouseHelpReview)
        .filter(
            HouseHelpReview.tenant_id == tenant_row.id,
            HouseHelpReview.house_help_id == house_help_id,
            HouseHelpReview.reviewer_id == actor.user_id,
        )
        .one_or_none()
    )
    if row is None:
        row = HouseHelpReview(
            tenant_id=tenant_row.id,
            house_help_id=house_help_id,
            reviewer_id=actor.user_id,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"ok": True, "id": row.id, "rating": row.rating}
    row.rating = payload.rating
    row.comment = payload.comment
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id, "rating": row.rating}


@router.post("/{house_help_id}/verification", response_model=HouseHelpResponse)
async def update_house_help_verification(
    house_help_id: str,
    payload: UpdateVerificationRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpResponse:
    require_roles(actor, "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    row = (
        db.query(HouseHelp)
        .filter(HouseHelp.tenant_id == tenant_row.id, HouseHelp.id == house_help_id)
        .one_or_none()
    ) if tenant_row else None
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    updates = payload.model_dump(exclude_unset=True)
    if "id_verified" in updates:
        row.id_verified = updates["id_verified"]
    if "background_check" in updates:
        row.background_check = updates["background_check"]
    if "incident_count" in updates:
        row.incident_count = updates["incident_count"]
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return HouseHelpResponse.model_validate(row)


@router.post("", response_model=HouseHelpResponse, status_code=status.HTTP_201_CREATED)
async def create_house_help(
    payload: CreateHouseHelpRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpResponse:
    require_roles(actor, "RESIDENT", "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=404, detail="tenant not found")
    row = HouseHelp(
        tenant_id=tenant_row.id,
        name=payload.name,
        phone=payload.phone,
        type=payload.type,
        photo_url=payload.photo_url,
        id_proof_type=payload.id_proof_type,
        id_proof_number=payload.id_proof_number,
        id_proof_url=payload.id_proof_url,
        registered_by=actor.user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return HouseHelpResponse.model_validate(row)


@router.put("/{house_help_id}", response_model=HouseHelpResponse)
async def update_house_help(
    house_help_id: str,
    payload: UpdateHouseHelpRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpResponse:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    row = (
        db.query(HouseHelp)
        .filter(HouseHelp.tenant_id == tenant_row.id, HouseHelp.id == house_help_id)
        .one_or_none()
    ) if tenant_row else None
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    if actor.role != "ADMIN" and not (actor.role == "RESIDENT" and row.registered_by == actor.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return HouseHelpResponse.model_validate(row)


@router.get("/entries", response_model=list[HouseHelpEntryResponse])
async def list_house_help_entries(
    active: str | None = None,
    house_help_id: str | None = Query(default=None, alias="houseHelpId"),
    from_param: str | None = Query(default=None, alias="from"),
    to_param: str | None = Query(default=None, alias="to"),
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[HouseHelpEntryResponse]:
    _ = actor
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    query = db.query(HouseHelpEntry, HouseHelp, Apartment).filter(HouseHelpEntry.tenant_id == tenant_row.id).outerjoin(HouseHelp, HouseHelp.id == HouseHelpEntry.house_help_id).outerjoin(Apartment, Apartment.id == HouseHelpEntry.apartment_id) if tenant_row else None
    if query is None:
        return []
    if active == "true":
        query = query.filter(HouseHelpEntry.check_out_at.is_(None))
    if house_help_id:
        query = query.filter(HouseHelpEntry.house_help_id == house_help_id)
    if from_param:
        query = query.filter(HouseHelpEntry.check_in_at >= datetime.fromisoformat(f"{from_param}T00:00:00+00:00"))
    if to_param:
        query = query.filter(HouseHelpEntry.check_in_at <= datetime.fromisoformat(f"{to_param}T23:59:59+00:00"))
    rows = query.order_by(desc(HouseHelpEntry.check_in_at)).all()
    return [
        HouseHelpEntryResponse(
            id=entry.id,
            houseHelpId=entry.house_help_id,
            apartmentId=entry.apartment_id,
            checkInAt=entry.check_in_at,
            checkInBy=entry.check_in_by,
            checkOutAt=entry.check_out_at,
            checkOutBy=entry.check_out_by,
            createdAt=entry.created_at,
            helpName=help.name if help else "",
            type=help.type if help else "",
            apartment=f"{apartment.tower}-{apartment.apartment_no}" if apartment else None,
        )
        for entry, help, apartment in rows
    ]


@router.post("/{house_help_id}/checkin", response_model=HouseHelpEntryResponse, status_code=status.HTTP_201_CREATED)
async def check_in_house_help(
    house_help_id: str,
    payload: CheckInHouseHelpRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpEntryResponse:
    require_roles(actor, "GUARD", "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    row = (
        db.query(HouseHelp)
        .filter(HouseHelp.tenant_id == tenant_row.id, HouseHelp.id == house_help_id)
        .one_or_none()
    ) if tenant_row else None
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    if not row.is_active:
        raise HTTPException(status_code=409, detail="house help is inactive")
    open_entry = (
        db.query(HouseHelpEntry)
        .filter(HouseHelpEntry.tenant_id == tenant_row.id, HouseHelpEntry.house_help_id == house_help_id, HouseHelpEntry.check_out_at.is_(None))
        .one_or_none()
    )
    if open_entry:
        raise HTTPException(status_code=409, detail="already checked in")
    entry = HouseHelpEntry(
        tenant_id=tenant_row.id,
        house_help_id=house_help_id,
        apartment_id=payload.apartment_id,
        check_in_by=actor.user_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return HouseHelpEntryResponse.model_validate(entry)


@router.post("/entries/{entry_id}/checkout", response_model=HouseHelpEntryResponse)
async def check_out_house_help(
    entry_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpEntryResponse:
    require_roles(actor, "GUARD", "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    row = (
        db.query(HouseHelpEntry)
        .filter(HouseHelpEntry.tenant_id == tenant_row.id, HouseHelpEntry.id == entry_id)
        .one_or_none()
    ) if tenant_row else None
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    if row.check_out_at is not None:
        raise HTTPException(status_code=409, detail="already checked out")
    row.check_out_at = datetime.now(timezone.utc)
    row.check_out_by = actor.user_id
    db.commit()
    db.refresh(row)
    return HouseHelpEntryResponse.model_validate(row)


@router.get("/{house_help_id}/assignments", response_model=list[HouseHelpAssignmentResponse])
async def list_house_help_assignments(
    house_help_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[HouseHelpAssignmentResponse]:
    _ = actor
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    rows = (
        db.query(HouseHelpAssignment)
        .filter(HouseHelpAssignment.tenant_id == tenant_row.id, HouseHelpAssignment.house_help_id == house_help_id)
        .order_by(desc(HouseHelpAssignment.created_at))
        .all()
    ) if tenant_row else []
    return [HouseHelpAssignmentResponse.model_validate(row) for row in rows]


@router.post("/{house_help_id}/assignments", response_model=HouseHelpAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_house_help(
    house_help_id: str,
    payload: CreateHouseHelpAssignmentRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpAssignmentResponse:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=404, detail="tenant not found")
    help_row = db.query(HouseHelp).filter(HouseHelp.tenant_id == tenant_row.id, HouseHelp.id == house_help_id).one_or_none()
    if help_row is None:
        raise HTTPException(status_code=404, detail="house help not found")
    apartment = db.query(Apartment).filter(Apartment.tenant_id == tenant_row.id, Apartment.id == payload.apartment_id).one_or_none()
    if apartment is None:
        raise HTTPException(status_code=404, detail="apartment not found")
    if actor.role != "ADMIN" and not (actor.role == "RESIDENT" and lives_in_apartment(db, actor, payload.apartment_id)):
        raise HTTPException(status_code=403, detail="forbidden")
    existing = (
        db.query(HouseHelpAssignment)
        .filter(
            HouseHelpAssignment.tenant_id == tenant_row.id,
            HouseHelpAssignment.house_help_id == house_help_id,
            HouseHelpAssignment.apartment_id == payload.apartment_id,
        )
        .one_or_none()
    )
    if existing:
        raise HTTPException(status_code=409, detail="already assigned to this apartment")
    row = HouseHelpAssignment(
        tenant_id=tenant_row.id,
        house_help_id=house_help_id,
        apartment_id=payload.apartment_id,
        assigned_by=actor.user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return HouseHelpAssignmentResponse.model_validate(row)


@router.delete("/{house_help_id}/assignments/{apartment_id}", response_model=HouseHelpAssignmentResponse)
async def remove_house_help_assignment(
    house_help_id: str,
    apartment_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> HouseHelpAssignmentResponse:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=404, detail="tenant not found")
    if actor.role != "ADMIN" and not (actor.role == "RESIDENT" and lives_in_apartment(db, actor, apartment_id)):
        raise HTTPException(status_code=403, detail="forbidden")
    row = (
        db.query(HouseHelpAssignment)
        .filter(
            HouseHelpAssignment.tenant_id == tenant_row.id,
            HouseHelpAssignment.house_help_id == house_help_id,
            HouseHelpAssignment.apartment_id == apartment_id,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    response = HouseHelpAssignmentResponse.model_validate(row)
    db.delete(row)
    db.commit()
    return response
