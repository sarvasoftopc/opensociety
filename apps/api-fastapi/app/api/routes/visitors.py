import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.notifications import create_notification
from app.core.tenant import TenantContext
from app.db.models import Apartment, ParkingSlot, Residency, Tenant, User, VisitorEntry, VisitorPreApproval
from app.schemas.visitors import (
    CheckInVisitorRequest,
    CreatePreApprovalRequest,
    CreateVisitorRequest,
    DenyVisitorRequest,
    RedeemPreApprovalRequest,
    VisitorEntryResponse,
    VisitorPreApprovalResponse,
)


router = APIRouter(prefix="/visitors", tags=["visitors"])


VISITOR_TRANSITIONS = {
    "approve": (["PENDING"], "APPROVED"),
    "deny": (["PENDING"], "DENIED"),
    "checkin": (["APPROVED"], "ENTERED"),
    "checkout": (["ENTERED"], "EXITED"),
}


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def apply_transition(row: VisitorEntry, action: str) -> None:
    allowed, to_status = VISITOR_TRANSITIONS[action]
    if row.status not in allowed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"cannot {action} a visitor in {row.status} state")
    row.status = to_status
    row.updated_at = datetime.now(timezone.utc)


def resolved_actor_user_id(actor: ActorContext) -> str:
    if actor.user_id:
        return actor.user_id
    if actor.subject:
        return actor.subject
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")


def allocate_visitor_slot(db: Session, tenant_slug: str, entry_id: str) -> None:
    slot = (
        db.query(ParkingSlot)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .filter(
            Tenant.slug == tenant_slug,
            ParkingSlot.is_visitor.is_(True),
            ParkingSlot.is_active.is_(True),
            ParkingSlot.occupied_by_entry_id.is_(None),
        )
        .order_by(asc(ParkingSlot.slot_number))
        .first()
    )
    if slot is None:
        return
    slot.occupied_by_entry_id = entry_id
    slot.occupied_at = datetime.now(timezone.utc)
    slot.updated_at = datetime.now(timezone.utc)


def release_visitor_slot(db: Session, tenant_slug: str, entry_id: str) -> None:
    slot = (
        db.query(ParkingSlot)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .filter(
            Tenant.slug == tenant_slug,
            ParkingSlot.occupied_by_entry_id == entry_id,
        )
        .one_or_none()
    )
    if slot is None:
        return
    slot.occupied_by_entry_id = None
    slot.occupied_at = None
    slot.updated_at = datetime.now(timezone.utc)


def to_visitor_response(row: VisitorEntry, apartment: Apartment | None = None) -> VisitorEntryResponse:
    apartment_label = None
    if apartment is not None:
        apartment_label = f"{apartment.tower}-{apartment.apartment_no}"
    return VisitorEntryResponse(
        id=row.id,
        apartmentId=row.apartment_id,
        apartmentLabel=apartment_label,
        preApprovalId=row.pre_approval_id,
        visitorName=row.visitor_name,
        visitorPhone=row.visitor_phone,
        type=row.type,
        status=row.status,
        purpose=row.purpose,
        partnerName=row.partner_name,
        vehicleNumber=row.vehicle_number,
        photoUrl=row.photo_url,
        approvedBy=row.approved_by,
        deniedReason=row.denied_reason,
        checkInBy=row.check_in_by,
        checkOutBy=row.check_out_by,
        checkInAt=row.check_in_at,
        checkOutAt=row.check_out_at,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


@router.get("", response_model=list[VisitorEntryResponse])
async def list_visitors(
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    apartment_id: str | None = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[VisitorEntryResponse]:
    _ = actor
    query = (
        db.query(VisitorEntry, Apartment)
        .join(Tenant, VisitorEntry.tenant_id == Tenant.id)
        .join(Apartment, Apartment.id == VisitorEntry.apartment_id)
        .filter(Tenant.slug == tenant.tenant_slug)
    )
    if status_filter:
        query = query.filter(VisitorEntry.status == status_filter)
    if apartment_id:
        query = query.filter(VisitorEntry.apartment_id == apartment_id)
    rows = query.order_by(desc(VisitorEntry.created_at)).all()
    return [to_visitor_response(row, apartment) for row, apartment in rows]


@router.post("", response_model=VisitorEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_visitor(
    payload: CreateVisitorRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorEntryResponse:
    require_roles(actor, "GUARD", "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    apartment = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Apartment.id == payload.apartment_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if tenant_row is None or apartment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="apartment not found")
    row = VisitorEntry(
        tenant_id=tenant_row.id,
        apartment_id=payload.apartment_id,
        visitor_name=payload.visitor_name,
        visitor_phone=payload.visitor_phone,
        type=payload.type,
        status="PENDING",
        purpose=payload.purpose,
        partner_name=payload.partner_name,
        photo_url=payload.photo_url,
        vehicle_number=payload.vehicle_number,
    )
    db.add(row)
    db.flush()
    resident_ids = [
        user_id
        for (user_id,) in db.query(Residency.user_id)
        .filter(Residency.apartment_id == payload.apartment_id, Residency.end_date.is_(None))
        .all()
    ]
    for resident_id in resident_ids:
        create_notification(
            db,
            tenant_slug=tenant.tenant_slug,
            user_id=resident_id,
            type="VISITOR_APPROVAL_REQUEST",
            title=f"Visitor approval needed for {apartment.tower}-{apartment.apartment_no}",
            body=f"{payload.visitor_name} is waiting at the gate for approval.",
            data={"visitorId": row.id, "apartmentId": payload.apartment_id, "screen": "visitors"},
            source="VISITOR_GATE",
            attempt_push=True,
        )
    db.commit()
    db.refresh(row)
    return to_visitor_response(row, apartment)


@router.post("/{visitor_id}/approve", response_model=VisitorEntryResponse)
async def approve_visitor(
    visitor_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorEntryResponse:
    require_roles(actor, "RESIDENT", "ADMIN")
    row = (
        db.query(VisitorEntry)
        .join(Tenant, VisitorEntry.tenant_id == Tenant.id)
        .filter(VisitorEntry.id == visitor_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    apply_transition(row, "approve")
    row.approved_by = actor.user_id
    db.commit()
    db.refresh(row)
    apartment = db.query(Apartment).filter(Apartment.id == row.apartment_id).one_or_none()
    return to_visitor_response(row, apartment)


@router.post("/{visitor_id}/deny", response_model=VisitorEntryResponse)
async def deny_visitor(
    visitor_id: str,
    payload: DenyVisitorRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorEntryResponse:
    require_roles(actor, "RESIDENT", "ADMIN")
    row = (
        db.query(VisitorEntry)
        .join(Tenant, VisitorEntry.tenant_id == Tenant.id)
        .filter(VisitorEntry.id == visitor_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    apply_transition(row, "deny")
    row.denied_reason = payload.reason
    db.commit()
    db.refresh(row)
    apartment = db.query(Apartment).filter(Apartment.id == row.apartment_id).one_or_none()
    return to_visitor_response(row, apartment)


@router.post("/{visitor_id}/checkin", response_model=VisitorEntryResponse)
async def check_in_visitor(
    visitor_id: str,
    payload: CheckInVisitorRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorEntryResponse:
    require_roles(actor, "GUARD", "ADMIN")
    row = (
        db.query(VisitorEntry)
        .join(Tenant, VisitorEntry.tenant_id == Tenant.id)
        .filter(VisitorEntry.id == visitor_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    apply_transition(row, "checkin")
    row.check_in_at = datetime.now(timezone.utc)
    row.check_in_by = resolved_actor_user_id(actor)
    if payload.photo_url is not None:
        row.photo_url = payload.photo_url
    if payload.vehicle_number is not None:
        row.vehicle_number = payload.vehicle_number
    allocate_visitor_slot(db, tenant.tenant_slug, row.id)
    db.commit()
    db.refresh(row)
    apartment = db.query(Apartment).filter(Apartment.id == row.apartment_id).one_or_none()
    return to_visitor_response(row, apartment)


@router.post("/{visitor_id}/checkout", response_model=VisitorEntryResponse)
async def check_out_visitor(
    visitor_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorEntryResponse:
    require_roles(actor, "GUARD", "ADMIN")
    row = (
        db.query(VisitorEntry)
        .join(Tenant, VisitorEntry.tenant_id == Tenant.id)
        .filter(VisitorEntry.id == visitor_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    apply_transition(row, "checkout")
    row.check_out_at = datetime.now(timezone.utc)
    row.check_out_by = resolved_actor_user_id(actor)
    release_visitor_slot(db, tenant.tenant_slug, row.id)
    db.commit()
    db.refresh(row)
    apartment = db.query(Apartment).filter(Apartment.id == row.apartment_id).one_or_none()
    return to_visitor_response(row, apartment)


@router.get("/pre-approvals", response_model=list[VisitorPreApprovalResponse])
async def list_pre_approvals(
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[VisitorPreApprovalResponse]:
    _ = actor
    rows = (
        db.query(VisitorPreApproval)
        .join(Tenant, VisitorPreApproval.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .order_by(desc(VisitorPreApproval.created_at))
        .all()
    )
    return [VisitorPreApprovalResponse.model_validate(row) for row in rows]


@router.post("/pre-approvals", response_model=VisitorPreApprovalResponse, status_code=status.HTTP_201_CREATED)
async def create_pre_approval(
    payload: CreatePreApprovalRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorPreApprovalResponse:
    require_roles(actor, "RESIDENT", "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    apartment = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Apartment.id == payload.apartment_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if tenant_row is None or apartment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="apartment not found")
    row = VisitorPreApproval(
        tenant_id=tenant_row.id,
        apartment_id=payload.apartment_id,
        created_by=actor.user_id or str(uuid.uuid4()),
        visitor_name=payload.visitor_name,
        visitor_phone=payload.visitor_phone,
        approval_type=payload.approval_type,
        code=uuid.uuid4().hex[:8].upper(),
        valid_until=datetime.fromisoformat(payload.valid_until.replace("Z", "+00:00")) if payload.valid_until else None,
        max_uses=payload.max_uses,
        use_count=0,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return VisitorPreApprovalResponse.model_validate(row)


@router.post("/pre-approvals/redeem", response_model=VisitorEntryResponse, status_code=status.HTTP_201_CREATED)
async def redeem_pre_approval(
    payload: RedeemPreApprovalRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorEntryResponse:
    require_roles(actor, "GUARD", "ADMIN")
    row = (
        db.query(VisitorPreApproval)
        .join(Tenant, VisitorPreApproval.tenant_id == Tenant.id)
        .filter(VisitorPreApproval.code == payload.code, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None or not row.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invalid or inactive code")
    now = datetime.now(timezone.utc)
    if row.valid_until is not None and row.valid_until < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="code expired")
    effective_max = 1 if row.approval_type == "ONE_TIME" else row.max_uses
    if effective_max is not None and row.use_count >= effective_max:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="code exhausted")

    entry = VisitorEntry(
        tenant_id=row.tenant_id,
        apartment_id=row.apartment_id,
        pre_approval_id=row.id,
        visitor_name=row.visitor_name,
        visitor_phone=row.visitor_phone,
        type="GUEST",
        status="ENTERED",
        check_in_at=now,
        check_in_by=resolved_actor_user_id(actor),
    )
    row.use_count += 1
    db.add(entry)
    db.commit()
    db.refresh(entry)
    apartment = db.query(Apartment).filter(Apartment.id == entry.apartment_id).one_or_none()
    return to_visitor_response(entry, apartment)


@router.post("/pre-approvals/{pre_approval_id}/revoke", response_model=VisitorPreApprovalResponse)
async def revoke_pre_approval(
    pre_approval_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorPreApprovalResponse:
    require_roles(actor, "ADMIN")
    row = (
        db.query(VisitorPreApproval)
        .join(Tenant, VisitorPreApproval.tenant_id == Tenant.id)
        .filter(VisitorPreApproval.id == pre_approval_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    row.is_active = False
    db.commit()
    db.refresh(row)
    return VisitorPreApprovalResponse.model_validate(row)
