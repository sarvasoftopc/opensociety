from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Guard, GuardDevice, GuardDutySession, Tenant
from app.schemas.guard_duty import BindGuardDeviceRequest, ClockCoordinates, GuardDutySessionResponse
from app.schemas.guard_devices import GuardDeviceResponse
from app.schemas.guards import CreateGuardRequest, GuardResponse, UpdateGuardRequest


router = APIRouter(prefix="/guards", tags=["guards"])


def require_admin(actor: ActorContext) -> ActorContext:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


@router.get("", response_model=list[GuardResponse])
async def list_guards(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[GuardResponse]:
    _ = actor
    rows = (
        db.query(Guard)
        .join(Tenant, Guard.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .order_by(asc(Guard.name))
        .all()
    )
    return [GuardResponse.model_validate(row) for row in rows]


@router.post("", response_model=GuardResponse, status_code=status.HTTP_201_CREATED)
async def create_guard(
    payload: CreateGuardRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> GuardResponse:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")
    row = Guard(
        tenant_id=tenant_row.id,
        user_id=payload.user_id,
        name=payload.name,
        phone=payload.phone,
        employee_code=payload.employee_code,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return GuardResponse.model_validate(row)


@router.patch("/{guard_id}", response_model=GuardResponse)
async def update_guard(
    guard_id: str,
    payload: UpdateGuardRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> GuardResponse:
    require_admin(actor)
    row = (
        db.query(Guard)
        .join(Tenant, Guard.tenant_id == Tenant.id)
        .filter(Guard.id == guard_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        row.name = updates["name"]
    if "phone" in updates:
        row.phone = updates["phone"]
    if "employee_code" in updates:
        row.employee_code = updates["employee_code"]
    if "is_active" in updates:
        row.is_active = updates["is_active"]
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return GuardResponse.model_validate(row)


@router.get("/{guard_id}/devices", response_model=list[GuardDeviceResponse])
async def list_guard_devices(
    guard_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[GuardDeviceResponse]:
    require_admin(actor)
    rows = (
        db.query(GuardDevice)
        .join(Tenant, GuardDevice.tenant_id == Tenant.id)
        .filter(GuardDevice.guard_id == guard_id, Tenant.slug == tenant.tenant_slug)
        .order_by(desc(GuardDevice.bound_at))
        .all()
    )
    return [GuardDeviceResponse.model_validate(row) for row in rows]


@router.post("/{guard_id}/devices/{device_id}/revoke", response_model=GuardDeviceResponse)
async def revoke_guard_device(
    guard_id: str,
    device_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> GuardDeviceResponse:
    require_admin(actor)
    row = (
        db.query(GuardDevice)
        .join(Tenant, GuardDevice.tenant_id == Tenant.id)
        .filter(
            GuardDevice.guard_id == guard_id,
            GuardDevice.device_id == device_id,
            GuardDevice.revoked_at.is_(None),
            Tenant.slug == tenant.tenant_slug,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    row.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return GuardDeviceResponse.model_validate(row)


@router.post("/{guard_id}/devices", response_model=GuardDeviceResponse, status_code=status.HTTP_201_CREATED)
async def bind_guard_device(
    guard_id: str,
    payload: BindGuardDeviceRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> GuardDeviceResponse:
    require_admin(actor)
    guard = (
        db.query(Guard)
        .join(Tenant, Guard.tenant_id == Tenant.id)
        .filter(Guard.id == guard_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if guard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="guard not found")
    active = (
        db.query(GuardDevice)
        .join(Tenant, GuardDevice.tenant_id == Tenant.id)
        .filter(GuardDevice.guard_id == guard_id, GuardDevice.revoked_at.is_(None), Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if active and active.device_id != payload.device_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="guard already bound to another device")
    if active:
        active.model = payload.model
        active.last_active_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(active)
        return GuardDeviceResponse.model_validate(active)
    row = GuardDevice(tenant_id=guard.tenant_id, guard_id=guard_id, device_id=payload.device_id, model=payload.model)
    db.add(row)
    db.commit()
    db.refresh(row)
    return GuardDeviceResponse.model_validate(row)


@router.get("/duty/active", response_model=list[GuardDutySessionResponse])
async def list_active_duty(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[GuardDutySessionResponse]:
    _ = actor
    rows = (
        db.query(GuardDutySession, Guard)
        .join(Guard, Guard.id == GuardDutySession.guard_id)
        .join(Tenant, GuardDutySession.tenant_id == Tenant.id)
        .filter(GuardDutySession.clock_out_at.is_(None), Tenant.slug == tenant.tenant_slug)
        .order_by(desc(GuardDutySession.clock_in_at))
        .all()
    )
    return [
        GuardDutySessionResponse(
            id=session.id,
            guardId=session.guard_id,
            clockInAt=session.clock_in_at,
            clockInLat=session.clock_in_lat,
            clockInLng=session.clock_in_lng,
            checkpoint=session.checkpoint,
            clockInPhotoUrl=session.clock_in_photo_url,
            clockOutAt=session.clock_out_at,
            clockOutLat=session.clock_out_lat,
            clockOutLng=session.clock_out_lng,
            createdAt=session.created_at,
            guardName=guard.name,
        )
        for session, guard in rows
    ]


@router.get("/duty", response_model=list[GuardDutySessionResponse])
async def list_duty_sessions(
    guard_id: str | None = Query(default=None, alias="guardId"),
    from_param: str | None = Query(default=None, alias="from"),
    to_param: str | None = Query(default=None, alias="to"),
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[GuardDutySessionResponse]:
    _ = actor
    query = (
        db.query(GuardDutySession, Guard)
        .join(Guard, Guard.id == GuardDutySession.guard_id)
        .join(Tenant, GuardDutySession.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
    )
    if guard_id:
        query = query.filter(GuardDutySession.guard_id == guard_id)
    if from_param:
        query = query.filter(GuardDutySession.clock_in_at >= datetime.fromisoformat(f"{from_param}T00:00:00+00:00"))
    if to_param:
        query = query.filter(GuardDutySession.clock_in_at <= datetime.fromisoformat(f"{to_param}T23:59:59+00:00"))
    rows = query.order_by(desc(GuardDutySession.clock_in_at)).all()
    return [
        GuardDutySessionResponse(
            id=session.id,
            guardId=session.guard_id,
            clockInAt=session.clock_in_at,
            clockInLat=session.clock_in_lat,
            clockInLng=session.clock_in_lng,
            checkpoint=session.checkpoint,
            clockInPhotoUrl=session.clock_in_photo_url,
            clockOutAt=session.clock_out_at,
            clockOutLat=session.clock_out_lat,
            clockOutLng=session.clock_out_lng,
            createdAt=session.created_at,
            guardName=guard.name,
        )
        for session, guard in rows
    ]


@router.post("/{guard_id}/duty/clock-in", response_model=GuardDutySessionResponse, status_code=status.HTTP_201_CREATED)
async def clock_in_guard(
    guard_id: str,
    payload: ClockCoordinates,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> GuardDutySessionResponse:
    require_roles(actor, "GUARD", "ADMIN")
    guard = (
        db.query(Guard)
        .join(Tenant, Guard.tenant_id == Tenant.id)
        .filter(Guard.id == guard_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if guard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="guard not found")
    if not guard.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="guard is inactive")
    open_session = (
        db.query(GuardDutySession)
        .filter(GuardDutySession.tenant_id == guard.tenant_id, GuardDutySession.guard_id == guard_id, GuardDutySession.clock_out_at.is_(None))
        .one_or_none()
    )
    if open_session is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="guard already on duty")
    row = GuardDutySession(
        tenant_id=guard.tenant_id,
        guard_id=guard_id,
        clock_in_lat=payload.lat,
        clock_in_lng=payload.lng,
        checkpoint=payload.checkpoint,
        clock_in_photo_url=payload.clock_in_photo_url,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return GuardDutySessionResponse.model_validate(row)


@router.post("/duty/{session_id}/clock-out", response_model=GuardDutySessionResponse)
async def clock_out_guard(
    session_id: str,
    payload: ClockCoordinates,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> GuardDutySessionResponse:
    require_roles(actor, "GUARD", "ADMIN")
    row = (
        db.query(GuardDutySession)
        .join(Tenant, GuardDutySession.tenant_id == Tenant.id)
        .filter(GuardDutySession.id == session_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    if row.clock_out_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already clocked out")
    row.clock_out_at = datetime.now(timezone.utc)
    row.clock_out_lat = payload.lat
    row.clock_out_lng = payload.lng
    db.commit()
    db.refresh(row)
    return GuardDutySessionResponse.model_validate(row)
