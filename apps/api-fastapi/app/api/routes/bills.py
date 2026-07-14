import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.simple_pdf import render_text_pdf
from app.core.tenant import TenantContext
from app.db.models import Apartment, BillLineItem, MaintenanceBill, Payment, Residency, SocietyConfig, Tenant
from app.schemas.finance import (
    BillLineItemResponse,
    CreateBillRequest,
    DuesRow,
    GenerateBillsRequest,
    MaintenanceBillResponse,
)


router = APIRouter(prefix="/bills", tags=["bills"])


def require_roles(actor: ActorContext, *roles: str) -> ActorContext:
    if actor.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


def compute_bill(items: list[dict]) -> tuple[list[dict], int, int, int]:
    lines = []
    subtotal = 0
    tax_amount = 0
    for item in items:
        tax = round((item["amount"] * item["taxRatePct"]) / 100)
        line = {**item, "taxAmount": tax}
        lines.append(line)
        subtotal += item["amount"]
        tax_amount += tax
    return lines, subtotal, tax_amount, subtotal + tax_amount


def bill_status_for(total: int, paid: int) -> str:
    if paid <= 0:
        return "ISSUED"
    if paid >= total:
        return "PAID"
    return "PARTIALLY_PAID"


def resident_apartment_ids(db: Session, actor: ActorContext) -> list[str]:
    if not actor.user_id:
        return []
    rows = db.query(Residency.apartment_id).filter(Residency.user_id == actor.user_id, Residency.end_date.is_(None)).all()
    return [row[0] for row in rows]


def paid_by_bill(db: Session, tenant_id: str, bill_ids: list[str]) -> dict[str, int]:
    if not bill_ids:
        return {}
    rows = (
        db.query(Payment.bill_id, func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.tenant_id == tenant_id, Payment.bill_id.in_(bill_ids))
        .group_by(Payment.bill_id)
        .all()
    )
    return {bill_id: int(amount) for bill_id, amount in rows}


def build_bill_response(row: MaintenanceBill, paid_amount: int = 0, apartment: str | None = None, line_items: list[BillLineItemResponse] | None = None) -> MaintenanceBillResponse:
    return MaintenanceBillResponse(
        id=row.id,
        apartmentId=row.apartment_id,
        type=row.type,
        title=row.title,
        periodMonth=row.period_month,
        subtotal=row.subtotal,
        taxAmount=row.tax_amount,
        totalAmount=row.total_amount,
        status=row.status,
        dueDate=row.due_date,
        issuedAt=row.issued_at,
        createdBy=row.created_by,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
        paidAmount=paid_amount,
        apartment=apartment,
        lineItems=line_items,
    )


@router.post("/generate")
async def generate_bills(
    payload: GenerateBillsRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, int]:
    require_roles(actor, "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")
    apartments = db.query(Apartment).filter(Apartment.tenant_id == tenant_row.id, Apartment.is_active.is_(True)).all()
    existing = (
        db.query(MaintenanceBill.apartment_id)
        .filter(
            MaintenanceBill.tenant_id == tenant_row.id,
            MaintenanceBill.period_month == payload.period_month,
            MaintenanceBill.type == "MONTHLY",
        )
        .all()
    )
    existing_apartments = {row[0] for row in existing}
    lines, subtotal, tax_amount, total_amount = compute_bill(
        [item.model_dump(by_alias=True) for item in payload.line_items]
    )
    created = 0
    for apartment in apartments:
        if apartment.id in existing_apartments:
            continue
        bill = MaintenanceBill(
            tenant_id=tenant_row.id,
            apartment_id=apartment.id,
            type="MONTHLY",
            title=payload.title,
            period_month=payload.period_month,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status="ISSUED",
            due_date=payload.due_date,
            created_by=actor.user_id,
        )
        db.add(bill)
        db.flush()
        for line in lines:
            db.add(
                BillLineItem(
                    tenant_id=tenant_row.id,
                    bill_id=bill.id,
                    description=line["description"],
                    amount=line["amount"],
                    tax_rate_pct=line["taxRatePct"],
                    tax_amount=line["taxAmount"],
                )
            )
        created += 1
    db.commit()
    return {"created": created, "skipped": len(apartments) - created}


@router.post("", response_model=MaintenanceBillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    payload: CreateBillRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> MaintenanceBillResponse:
    require_roles(actor, "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    apartment = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Apartment.id == payload.apartment_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if tenant_row is None or apartment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="apartment not found")
    lines, subtotal, tax_amount, total_amount = compute_bill([item.model_dump(by_alias=True) for item in payload.line_items])
    bill = MaintenanceBill(
        tenant_id=tenant_row.id,
        apartment_id=payload.apartment_id,
        type="ONE_TIME",
        title=payload.title,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        due_date=payload.due_date,
        created_by=actor.user_id,
    )
    db.add(bill)
    db.flush()
    for line in lines:
        db.add(
            BillLineItem(
                tenant_id=tenant_row.id,
                bill_id=bill.id,
                description=line["description"],
                amount=line["amount"],
                tax_rate_pct=line["taxRatePct"],
                tax_amount=line["taxAmount"],
            )
        )
    db.commit()
    db.refresh(bill)
    return build_bill_response(bill)


@router.get("/dues", response_model=list[DuesRow])
async def list_dues(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[DuesRow]:
    require_roles(actor, "ADMIN")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return []
    bills = (
        db.query(MaintenanceBill, Apartment)
        .join(Apartment, Apartment.id == MaintenanceBill.apartment_id)
        .filter(MaintenanceBill.tenant_id == tenant_row.id, MaintenanceBill.status != "CANCELLED")
        .all()
    )
    payments = (
        db.query(Payment.apartment_id, func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.tenant_id == tenant_row.id)
        .group_by(Payment.apartment_id)
        .all()
    )
    paid_by_apartment = {apartment_id: int(paid) for apartment_id, paid in payments}
    billed_by_apartment: dict[str, dict] = {}
    for bill, apartment in bills:
        current = billed_by_apartment.setdefault(
            apartment.id,
            {"apartmentId": apartment.id, "apartment": f"{apartment.tower}-{apartment.apartment_no}", "billed": 0},
        )
        current["billed"] += bill.total_amount
    rows = []
    for apartment_id, item in billed_by_apartment.items():
        paid = paid_by_apartment.get(apartment_id, 0)
        outstanding = item["billed"] - paid
        if outstanding > 0:
            rows.append(DuesRow(apartmentId=apartment_id, apartment=item["apartment"], billed=item["billed"], paid=paid, outstanding=outstanding))
    rows.sort(key=lambda row: row.outstanding, reverse=True)
    return rows


@router.get("", response_model=list[MaintenanceBillResponse])
async def list_bills(
    apartment_id: Annotated[str | None, Query(alias="apartmentId")] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    period: str | None = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[MaintenanceBillResponse]:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return []
    query = (
        db.query(MaintenanceBill, Apartment)
        .join(Apartment, Apartment.id == MaintenanceBill.apartment_id)
        .filter(MaintenanceBill.tenant_id == tenant_row.id)
    )
    if actor.role != "ADMIN":
        mine = resident_apartment_ids(db, actor)
        if not mine:
            return []
        query = query.filter(MaintenanceBill.apartment_id.in_(mine))
    elif apartment_id:
        query = query.filter(MaintenanceBill.apartment_id == apartment_id)
    if status_filter:
        query = query.filter(MaintenanceBill.status == status_filter)
    if period:
        query = query.filter(MaintenanceBill.period_month == period)
    rows = query.order_by(desc(MaintenanceBill.issued_at)).all()
    paid_map = paid_by_bill(db, tenant_row.id, [bill.id for bill, _ in rows])
    return [
        build_bill_response(bill, paid_map.get(bill.id, 0), f"{apartment.tower}-{apartment.apartment_no}")
        for bill, apartment in rows
    ]


@router.get("/{bill_id}", response_model=MaintenanceBillResponse)
async def get_bill(
    bill_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> MaintenanceBillResponse:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    row = (
        db.query(MaintenanceBill, Apartment)
        .join(Apartment, Apartment.id == MaintenanceBill.apartment_id)
        .filter(MaintenanceBill.id == bill_id, Tenant.id == MaintenanceBill.tenant_id, Tenant.slug == tenant.tenant_slug)
        .join(Tenant, MaintenanceBill.tenant_id == Tenant.id)
        .one_or_none()
    )
    if row is None or tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    bill, apartment = row
    if actor.role != "ADMIN":
        mine = resident_apartment_ids(db, actor)
        if bill.apartment_id not in mine:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    line_items = db.query(BillLineItem).filter(BillLineItem.bill_id == bill_id, BillLineItem.tenant_id == tenant_row.id).all()
    paid = paid_by_bill(db, tenant_row.id, [bill_id]).get(bill_id, 0)
    return build_bill_response(
        bill,
        paid,
        f"{apartment.tower}-{apartment.apartment_no}",
        [BillLineItemResponse.model_validate(item) for item in line_items],
    )


@router.get("/{bill_id}/invoice")
async def get_invoice(
    bill_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    bill = await get_bill(bill_id, tenant, actor, db)
    society = (
        db.query(SocietyConfig)
        .join(Tenant, SocietyConfig.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    lines = [
        f"Society: {society.name if society else 'Society'}",
        f"Apartment: {bill.apartment or ''}",
        f"Title: {bill.title}",
        f"Status: {bill.status}",
        f"Total: {bill.total_amount / 100:.2f}",
        f"Paid: {(bill.paid_amount or 0) / 100:.2f}",
    ]
    pdf = render_text_pdf(f"Invoice {bill.id[:8].upper()}", lines)
    headers = {"content-disposition": f'inline; filename="invoice-{bill.id[:8]}.pdf"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)
