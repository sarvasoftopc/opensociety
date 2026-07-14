from typing import Annotated

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Apartment, Residency, Tenant
from app.schemas.apartments import (
    ApartmentResponse,
    CreateApartmentRequest,
    CreateApartmentsBulkRequest,
    UpdateApartmentRequest,
)


router = APIRouter(prefix="/apartments", tags=["apartments"])


@router.get("", response_model=list[ApartmentResponse])
async def list_apartments(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ApartmentResponse]:
    _ = actor
    rows = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .order_by(asc(Apartment.tower), asc(Apartment.apartment_no))
        .all()
    )
    return [ApartmentResponse.model_validate(row) for row in rows]


@router.get("/mine", response_model=list[ApartmentResponse])
async def list_my_apartments(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ApartmentResponse]:
    if not actor.user_id:
        return []
    rows = (
        db.query(Apartment)
        .join(Residency, Residency.apartment_id == Apartment.id)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(
            Tenant.slug == tenant.tenant_slug,
            Residency.user_id == actor.user_id,
            Residency.end_date.is_(None),
        )
        .order_by(asc(Apartment.tower), asc(Apartment.apartment_no))
        .all()
    )
    return [ApartmentResponse.model_validate(row) for row in rows]


def require_admin(actor: ActorContext) -> ActorContext:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


@router.post("", response_model=ApartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_apartment(
    payload: CreateApartmentRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> ApartmentResponse:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")

    row = Apartment(
        tenant_id=tenant_row.id,
        tower=payload.tower,
        apartment_no=payload.apartment_no,
        floor=payload.floor,
        bhk_type=payload.bhk_type,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApartmentResponse.model_validate(row)


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_apartments_bulk(
    payload: CreateApartmentsBulkRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")

    created_rows: list[Apartment] = []
    for item in payload.apartments:
        row = Apartment(
            tenant_id=tenant_row.id,
            tower=item.tower,
            apartment_no=item.apartment_no,
            floor=item.floor,
            bhk_type=item.bhk_type,
            is_active=True,
        )
        db.add(row)
        created_rows.append(row)
    db.commit()
    for row in created_rows:
        db.refresh(row)
    return {
        "count": len(created_rows),
        "apartments": [ApartmentResponse.model_validate(row).model_dump(by_alias=True, mode="json") for row in created_rows],
    }


@router.patch("/{apartment_id}", response_model=ApartmentResponse)
async def update_apartment(
    apartment_id: str,
    payload: UpdateApartmentRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> ApartmentResponse:
    require_admin(actor)
    row = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Apartment.id == apartment_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")

    updates = payload.model_dump(exclude_unset=True)
    if "tower" in updates:
        row.tower = updates["tower"]
    if "apartment_no" in updates:
        row.apartment_no = updates["apartment_no"]
    if "floor" in updates:
        row.floor = updates["floor"]
    if "bhk_type" in updates:
        row.bhk_type = updates["bhk_type"]
    if "is_active" in updates:
        row.is_active = updates["is_active"]
    row.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)
    return ApartmentResponse.model_validate(row)
