from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Apartment, Residency, Tenant, Vehicle, VisitorEntry
from app.schemas.vehicles import CreateVehicleRequest, UpdateVehicleRequest, VehicleGateLogRow, VehicleResponse


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def normalize_plate(value: str) -> str:
    return "".join(ch for ch in value.upper() if ch not in {" ", "-"})


def resident_apartment_ids(db: Session, actor: ActorContext) -> list[str]:
    if not actor.user_id:
        return []
    rows = db.query(Residency.apartment_id).filter(Residency.user_id == actor.user_id, Residency.end_date.is_(None)).all()
    return [row[0] for row in rows]


@router.get("", response_model=list[VehicleResponse])
async def list_vehicles(
    apartment_id: Annotated[str | None, Query(alias="apartmentId")] = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[VehicleResponse]:
    query = (
        db.query(Vehicle)
        .join(Tenant, Vehicle.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
    )
    if actor.role != "ADMIN":
        mine = resident_apartment_ids(db, actor)
        if not mine:
            return []
        scoped_ids = [apartment_id] if apartment_id and apartment_id in mine else mine
        query = query.filter(Vehicle.apartment_id.in_(scoped_ids))
    elif apartment_id:
        query = query.filter(Vehicle.apartment_id == apartment_id)

    rows = query.order_by(desc(Vehicle.created_at)).all()
    return [VehicleResponse.model_validate(row) for row in rows]


@router.get("/gate-log", response_model=list[VehicleGateLogRow])
async def list_vehicle_gate_log(
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[VehicleGateLogRow]:
    require_roles(actor, "ADMIN", "GUARD")
    rows = (
        db.query(VisitorEntry, Apartment)
        .join(Tenant, VisitorEntry.tenant_id == Tenant.id)
        .outerjoin(Apartment, Apartment.id == VisitorEntry.apartment_id)
        .filter(Tenant.slug == tenant.tenant_slug, VisitorEntry.vehicle_number.is_not(None))
        .order_by(desc(VisitorEntry.created_at))
        .limit(100)
        .all()
    )
    known = (
        db.query(Vehicle.registration_number)
        .join(Tenant, Vehicle.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .all()
    )
    registered = {plate for (plate,) in known}
    result: list[VehicleGateLogRow] = []
    for visitor, apartment in rows:
        apartment_label = None
        if apartment is not None:
            apartment_label = f"{apartment.tower}-{apartment.apartment_no}"
        plate = normalize_plate(visitor.vehicle_number) if visitor.vehicle_number else None
        result.append(
            VehicleGateLogRow(
                id=visitor.id,
                visitorName=visitor.visitor_name,
                vehicleNumber=visitor.vehicle_number,
                type=visitor.type,
                status=visitor.status,
                checkInAt=visitor.check_in_at,
                checkOutAt=visitor.check_out_at,
                createdAt=visitor.created_at,
                apartment=apartment_label,
                registered=bool(plate and plate in registered),
            )
        )
    return result


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: CreateVehicleRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VehicleResponse:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    apartment = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Apartment.id == payload.apartment_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if tenant_row is None or apartment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="apartment not found")

    mine = resident_apartment_ids(db, actor)
    if actor.role != "ADMIN" and not (actor.role == "RESIDENT" and payload.apartment_id in mine):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    normalized_plate = normalize_plate(payload.registration_number)
    dupe = (
        db.query(Vehicle)
        .filter(Vehicle.tenant_id == tenant_row.id, Vehicle.registration_number == normalized_plate)
        .one_or_none()
    )
    if dupe is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="vehicle already registered")

    row = Vehicle(
        tenant_id=tenant_row.id,
        apartment_id=payload.apartment_id,
        registered_by=actor.user_id,
        registration_number=normalized_plate,
        type=payload.type,
        make=payload.make,
        color=payload.color,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return VehicleResponse.model_validate(row)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    payload: UpdateVehicleRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> VehicleResponse:
    row = (
        db.query(Vehicle)
        .join(Tenant, Vehicle.tenant_id == Tenant.id)
        .filter(Vehicle.id == vehicle_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")

    mine = resident_apartment_ids(db, actor)
    if actor.role != "ADMIN" and not (actor.role == "RESIDENT" and row.apartment_id in mine):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    updates = payload.model_dump(exclude_unset=True)
    if "registration_number" in updates and updates["registration_number"] is not None:
        normalized_plate = normalize_plate(updates["registration_number"])
        dupe = (
            db.query(Vehicle)
            .filter(
                Vehicle.tenant_id == row.tenant_id,
                Vehicle.registration_number == normalized_plate,
                Vehicle.id != row.id,
            )
            .one_or_none()
        )
        if dupe is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="vehicle already registered")
        row.registration_number = normalized_plate
    if "type" in updates:
        row.type = updates["type"]
    if "make" in updates:
        row.make = updates["make"]
    if "color" in updates:
        row.color = updates["color"]
    if "is_active" in updates:
        row.is_active = updates["is_active"]
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return VehicleResponse.model_validate(row)
