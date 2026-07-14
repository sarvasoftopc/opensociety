from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Apartment, ParkingSlot, Tenant, User, VisitorEntry
from app.schemas.parking import (
    AssignParkingSlotRequest,
    CreateParkingSlotRequest,
    ParkingDirectoryRow,
    ParkingSlotResponse,
    UpdateParkingSlotRequest,
    VisitorParkingSlotRow,
    VisitorParkingSummary,
    VisitorParkingView,
)


router = APIRouter(prefix="/parking", tags=["parking"])


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def normalize_slot_number(value: str) -> str:
    return " ".join(value.strip().upper().split())


def apartment_label(apartment: Apartment | None) -> str | None:
    if apartment is None:
        return None
    return f"{apartment.tower}-{apartment.apartment_no}"


@router.get("/slots", response_model=list[ParkingSlotResponse])
async def list_parking_slots(
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[ParkingSlotResponse]:
    require_roles(actor, "ADMIN")
    rows = (
        db.query(ParkingSlot, Apartment)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .outerjoin(Apartment, Apartment.id == ParkingSlot.apartment_id)
        .filter(Tenant.slug == tenant.tenant_slug, ParkingSlot.is_visitor.is_(False))
        .order_by(asc(ParkingSlot.slot_number))
        .all()
    )
    results: list[ParkingSlotResponse] = []
    for slot, apartment in rows:
        item = ParkingSlotResponse.model_validate(slot)
        item.apartment = apartment_label(apartment)
        results.append(item)
    return results


@router.get("/directory", response_model=list[ParkingDirectoryRow])
async def list_parking_directory(
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[ParkingDirectoryRow]:
    _ = actor
    rows = (
        db.query(ParkingSlot, Apartment)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .outerjoin(Apartment, Apartment.id == ParkingSlot.apartment_id)
        .filter(Tenant.slug == tenant.tenant_slug, ParkingSlot.is_active.is_(True), ParkingSlot.is_visitor.is_(False))
        .order_by(asc(ParkingSlot.slot_number))
        .all()
    )
    return [
        ParkingDirectoryRow(
            slotNumber=slot.slot_number,
            type=slot.type,
            isTemporary=slot.is_temporary,
            assignedUntil=slot.assigned_until,
            apartment=apartment_label(apartment),
        )
        for slot, apartment in rows
    ]


@router.get("/visitor", response_model=VisitorParkingView)
async def list_visitor_parking(
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VisitorParkingView:
    require_roles(actor, "ADMIN", "GUARD")
    rows = (
        db.query(ParkingSlot, VisitorEntry)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .outerjoin(VisitorEntry, VisitorEntry.id == ParkingSlot.occupied_by_entry_id)
        .filter(Tenant.slug == tenant.tenant_slug, ParkingSlot.is_visitor.is_(True))
        .order_by(asc(ParkingSlot.slot_number))
        .all()
    )
    slots = [
        VisitorParkingSlotRow(
            id=slot.id,
            slotNumber=slot.slot_number,
            type=slot.type,
            isActive=slot.is_active,
            isVisitor=slot.is_visitor,
            occupiedByEntryId=slot.occupied_by_entry_id,
            occupiedAt=slot.occupied_at,
            visitorName=entry.visitor_name if entry else None,
            vehicleNumber=entry.vehicle_number if entry else None,
        )
        for slot, entry in rows
    ]
    active_visitor_slots = [slot for slot in slots if slot.is_active and slot.is_visitor]
    occupied = len([slot for slot in active_visitor_slots if slot.occupied_by_entry_id is not None])
    total = len(active_visitor_slots)
    summary = VisitorParkingSummary(total=total, available=total - occupied, occupied=occupied, isFull=total > 0 and occupied >= total)
    return VisitorParkingView(slots=slots, summary=summary)


@router.post("/slots", response_model=ParkingSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_parking_slot(
    payload: CreateParkingSlotRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> ParkingSlotResponse:
    require_roles(actor, "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")

    slot_number = normalize_slot_number(payload.slot_number)
    dupe = db.query(ParkingSlot).filter(ParkingSlot.tenant_id == tenant_row.id, ParkingSlot.slot_number == slot_number).one_or_none()
    if dupe is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slot number already exists")

    row = ParkingSlot(
        tenant_id=tenant_row.id,
        slot_number=slot_number,
        type=payload.type,
        is_visitor=payload.is_visitor,
        notes=payload.notes,
        is_active=True,
        is_temporary=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ParkingSlotResponse.model_validate(row)


@router.put("/slots/{slot_id}", response_model=ParkingSlotResponse)
async def update_parking_slot(
    slot_id: str,
    payload: UpdateParkingSlotRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> ParkingSlotResponse:
    require_roles(actor, "ADMIN")
    row = (
        db.query(ParkingSlot)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .filter(ParkingSlot.id == slot_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")

    updates = payload.model_dump(exclude_unset=True)
    if "slot_number" in updates and updates["slot_number"] is not None:
        normalized = normalize_slot_number(updates["slot_number"])
        dupe = (
            db.query(ParkingSlot)
            .filter(ParkingSlot.tenant_id == row.tenant_id, ParkingSlot.slot_number == normalized, ParkingSlot.id != row.id)
            .one_or_none()
        )
        if dupe is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slot number already exists")
        row.slot_number = normalized
    if "type" in updates:
        row.type = updates["type"]
    if "is_visitor" in updates:
        row.is_visitor = updates["is_visitor"]
    if "notes" in updates:
        row.notes = updates["notes"]
    if "is_active" in updates:
        row.is_active = updates["is_active"]
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return ParkingSlotResponse.model_validate(row)


@router.post("/slots/{slot_id}/assign", response_model=ParkingSlotResponse)
async def assign_parking_slot(
    slot_id: str,
    payload: AssignParkingSlotRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> ParkingSlotResponse:
    require_roles(actor, "ADMIN")
    row = (
        db.query(ParkingSlot)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .filter(ParkingSlot.id == slot_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    if row.is_visitor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="visitor slots are auto-assigned at the gate, not to a flat",
        )

    if payload.apartment_id is not None:
        apartment = (
            db.query(Apartment)
            .join(Tenant, Apartment.tenant_id == Tenant.id)
            .filter(Apartment.id == payload.apartment_id, Tenant.slug == tenant.tenant_slug)
            .one_or_none()
        )
        if apartment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="apartment not found")

    assignee = actor.user_id
    if assignee is not None:
        user = (
            db.query(User)
            .join(Tenant, User.tenant_id == Tenant.id)
            .filter(User.id == assignee, Tenant.slug == tenant.tenant_slug)
            .one_or_none()
        )
        if user is None:
            assignee = None

    releasing = payload.apartment_id is None
    row.apartment_id = payload.apartment_id
    row.is_temporary = payload.is_temporary
    row.assigned_until = payload.assigned_until if not releasing else None
    row.assigned_by = None if releasing else assignee
    row.assigned_at = None if releasing else datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return ParkingSlotResponse.model_validate(row)


@router.delete("/slots/{slot_id}")
async def delete_parking_slot(
    slot_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> dict[str, bool]:
    require_roles(actor, "ADMIN")
    row = (
        db.query(ParkingSlot)
        .join(Tenant, ParkingSlot.tenant_id == Tenant.id)
        .filter(ParkingSlot.id == slot_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
