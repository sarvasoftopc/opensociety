from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Apartment, MaintenanceTicket, Residency, Tenant, User
from app.schemas.tickets import AssignTicketRequest, CreateTicketRequest, TicketResponse, TransitionTicketRequest


router = APIRouter(prefix="/tickets", tags=["tickets"])

TICKET_TRANSITIONS = {
    "start": (["OPEN"], "IN_PROGRESS"),
    "resolve": (["IN_PROGRESS"], "RESOLVED"),
    "close": (["RESOLVED"], "CLOSED"),
    "reopen": (["RESOLVED"], "IN_PROGRESS"),
    "cancel": (["OPEN", "IN_PROGRESS"], "CANCELLED"),
}


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


@router.get("", response_model=list[TicketResponse])
async def list_tickets(
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[TicketResponse]:
    query = (
        db.query(MaintenanceTicket)
        .join(Tenant, MaintenanceTicket.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
    )
    if status_filter:
        query = query.filter(MaintenanceTicket.status == status_filter)

    if actor.role != "ADMIN":
        mine = (
            db.query(Residency.apartment_id)
            .filter(Residency.user_id == actor.user_id, Residency.end_date.is_(None))
            .all()
        )
        apt_ids = [row[0] for row in mine]
        if not apt_ids:
            return []
        query = query.filter(MaintenanceTicket.apartment_id.in_(apt_ids))

    rows = query.order_by(desc(MaintenanceTicket.created_at)).all()
    return [TicketResponse.model_validate(row) for row in rows]


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: CreateTicketRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> TicketResponse:
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
    if actor.role == "RESIDENT":
        residency = (
            db.query(Residency)
            .filter(
                Residency.user_id == actor.user_id,
                Residency.apartment_id == payload.apartment_id,
                Residency.end_date.is_(None),
            )
            .one_or_none()
        )
        if residency is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a resident of this apartment")

    row = MaintenanceTicket(
        tenant_id=tenant_row.id,
        apartment_id=payload.apartment_id,
        raised_by=actor.user_id or "dev-admin",
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status="OPEN",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TicketResponse.model_validate(row)


@router.post("/{ticket_id}/transition", response_model=TicketResponse)
async def transition_ticket(
    ticket_id: str,
    payload: TransitionTicketRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> TicketResponse:
    require_roles(actor, "ADMIN")
    row = (
        db.query(MaintenanceTicket)
        .join(Tenant, MaintenanceTicket.tenant_id == Tenant.id)
        .filter(MaintenanceTicket.id == ticket_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    allowed, to_status = TICKET_TRANSITIONS[payload.action]
    if row.status not in allowed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"cannot {payload.action} a ticket in {row.status} state")
    row.status = to_status
    row.updated_at = datetime.now(timezone.utc)
    if payload.action == "resolve":
        row.resolved_at = datetime.now(timezone.utc)
        if payload.resolution_note:
            row.resolution_note = payload.resolution_note
    db.commit()
    db.refresh(row)
    return TicketResponse.model_validate(row)


@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: str,
    payload: AssignTicketRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> TicketResponse:
    require_roles(actor, "ADMIN")
    assignee = (
        db.query(User)
        .join(Tenant, User.tenant_id == Tenant.id)
        .filter(User.id == payload.assigned_to, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if assignee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assignee not found")
    row = (
        db.query(MaintenanceTicket)
        .join(Tenant, MaintenanceTicket.tenant_id == Tenant.id)
        .filter(MaintenanceTicket.id == ticket_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    row.assigned_to = payload.assigned_to
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return TicketResponse.model_validate(row)
