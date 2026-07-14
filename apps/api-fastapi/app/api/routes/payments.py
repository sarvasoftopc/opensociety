from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import MaintenanceBill, Payment, Residency, Tenant
from app.schemas.finance import PaymentResponse, RecordPaymentRequest


router = APIRouter(prefix="/payments", tags=["payments"])


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def resident_apartment_ids(db: Session, actor: ActorContext) -> list[str]:
    if not actor.user_id:
        return []
    rows = db.query(Residency.apartment_id).filter(Residency.user_id == actor.user_id, Residency.end_date.is_(None)).all()
    return [row[0] for row in rows]


def bill_status_for(total: int, paid: int) -> str:
    if paid <= 0:
        return "ISSUED"
    if paid >= total:
        return "PAID"
    return "PARTIALLY_PAID"


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payload: RecordPaymentRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> PaymentResponse:
    require_roles(actor, "ADMIN", "RESIDENT")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    bill = (
        db.query(MaintenanceBill)
        .join(Tenant, MaintenanceBill.tenant_id == Tenant.id)
        .filter(MaintenanceBill.id == payload.bill_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if bill is None or tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="bill not found")
    if actor.role != "ADMIN":
        mine = resident_apartment_ids(db, actor)
        if bill.apartment_id not in mine:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    payment = Payment(
        tenant_id=tenant_row.id,
        bill_id=bill.id,
        apartment_id=bill.apartment_id,
        amount=payload.amount,
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
        paid_at=payload.paid_at or datetime.now(timezone.utc),
        recorded_by=actor.user_id,
    )
    db.add(payment)
    db.flush()
    paid = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.tenant_id == tenant_row.id, Payment.bill_id == bill.id)
        .scalar()
    )
    bill.status = bill_status_for(bill.total_amount, int(paid or 0))
    bill.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return PaymentResponse.model_validate(payment)


@router.get("", response_model=list[PaymentResponse])
async def list_payments(
    apartment_id: Annotated[str | None, Query(alias="apartmentId")] = None,
    bill_id: Annotated[str | None, Query(alias="billId")] = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[PaymentResponse]:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return []
    query = db.query(Payment).filter(Payment.tenant_id == tenant_row.id)
    if actor.role != "ADMIN":
        mine = resident_apartment_ids(db, actor)
        if not mine:
            return []
        query = query.filter(Payment.apartment_id.in_(mine))
    elif apartment_id:
        query = query.filter(Payment.apartment_id == apartment_id)
    if bill_id:
        query = query.filter(Payment.bill_id == bill_id)
    rows = query.order_by(desc(Payment.paid_at)).all()
    return [PaymentResponse.model_validate(row) for row in rows]
