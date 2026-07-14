from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.simple_pdf import render_text_pdf
from app.core.tenant import TenantContext
from app.db.models import Apartment, HouseHelp, HouseHelpEntry, MaintenanceBill, MaintenanceTicket, Payment, SocietyConfig, Tenant, VisitorEntry


router = APIRouter(prefix="/reports", tags=["reports"])


def require_admin(actor: ActorContext) -> None:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=403, detail="forbidden")


def collection_rate_pct(billed: int, collected: int) -> float:
    if billed <= 0:
        return 0.0
    return round((collected / billed) * 1000) / 10


def analyze_payers(rows: list[dict]) -> dict:
    result = {"early": 0, "onTime": 0, "late": 0, "outstanding": 0, "fullyPaid": 0, "avgDaysToPay": None}
    total_days = 0
    for row in rows:
        settled = row["paid"] >= row["total"] and row["total"] > 0 and row["last_paid_at"] is not None
        if not settled:
            result["outstanding"] += 1
            continue
        result["fullyPaid"] += 1
        days = round((row["last_paid_at"] - row["due_date"]).total_seconds() / 86400)
        total_days += days
        if days < 0:
            result["early"] += 1
        elif days == 0:
            result["onTime"] += 1
        else:
            result["late"] += 1
    if result["fullyPaid"] > 0:
        result["avgDaysToPay"] = round(total_days / result["fullyPaid"], 1)
    return result


def fill_hours(counts: dict[int, int]) -> list[dict]:
    return [{"hour": hour, "count": counts.get(hour, 0)} for hour in range(24)]


def fill_days_of_week(counts: dict[int, int]) -> list[dict]:
    return [{"dow": dow, "count": counts.get(dow, 0)} for dow in range(7)]


def compute_visitor_trends(db: Session, tenant_id: str, from_date: datetime, to_date: datetime) -> dict:
    rows = (
        db.query(VisitorEntry)
        .filter(VisitorEntry.tenant_id == tenant_id, VisitorEntry.created_at >= from_date, VisitorEntry.created_at <= to_date)
        .all()
    )
    by_hour_counts: dict[int, int] = defaultdict(int)
    by_type_counts: dict[str, int] = defaultdict(int)
    by_day_counts: dict[str, int] = defaultdict(int)
    for row in rows:
        dt = row.created_at
        by_hour_counts[dt.hour] += 1
        by_type_counts[row.type] += 1
        by_day_counts[dt.date().isoformat()] += 1
    by_hour = fill_hours(by_hour_counts)
    by_type = [{"type": key, "count": value} for key, value in sorted(by_type_counts.items(), key=lambda item: (-item[1], item[0]))]
    by_day = [{"date": key, "count": value} for key, value in sorted(by_day_counts.items())]
    total = len(rows)
    distinct_days = len(by_day)
    peak_hour = None
    max_count = 0
    for item in by_hour:
        if item["count"] > max_count:
            max_count = item["count"]
            peak_hour = item["hour"]
    return {
        "from": from_date.date().isoformat(),
        "to": to_date.date().isoformat(),
        "total": total,
        "distinctDays": distinct_days,
        "avgPerDay": round(total / distinct_days, 1) if distinct_days else 0,
        "peakHour": peak_hour,
        "byHour": by_hour,
        "byType": by_type,
        "byDay": by_day,
    }


@router.get("/finance")
async def finance_report(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return {"byMonth": [], "byMethod": [], "totalBilled": 0, "totalCollected": 0}
    bills = db.query(MaintenanceBill).filter(MaintenanceBill.tenant_id == tenant_row.id, MaintenanceBill.status != "CANCELLED").all()
    payments = db.query(Payment).filter(Payment.tenant_id == tenant_row.id).all()
    billed_by_month: dict[str, int] = defaultdict(int)
    for bill in bills:
        if bill.period_month:
            billed_by_month[bill.period_month] += bill.total_amount
    bill_by_id = {bill.id: bill for bill in bills}
    collected_by_month: dict[str, int] = defaultdict(int)
    by_method: dict[str, int] = defaultdict(int)
    for payment in payments:
        by_method[payment.method] += payment.amount
        bill = bill_by_id.get(payment.bill_id)
        if bill and bill.period_month:
            collected_by_month[bill.period_month] += payment.amount
    by_month = [
        {"period": period, "billed": billed_by_month[period], "collected": collected_by_month.get(period, 0)}
        for period in sorted(billed_by_month.keys(), reverse=True)
    ]
    methods = [{"method": method, "amount": amount} for method, amount in sorted(by_method.items(), key=lambda item: (-item[1], item[0]))]
    return {
        "byMonth": by_month,
        "byMethod": methods,
        "totalBilled": sum(item["billed"] for item in by_month),
        "totalCollected": sum(item["collected"] for item in by_month),
    }


@router.get("/collection-analytics")
async def collection_analytics(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return {"byMonth": [], "byTower": [], "payers": {}, "totalBilled": 0, "totalCollected": 0, "overallRatePct": 0, "fullyPaidPct": 0}
    bills = db.query(MaintenanceBill).filter(MaintenanceBill.tenant_id == tenant_row.id, MaintenanceBill.status != "CANCELLED").all()
    payments = db.query(Payment).filter(Payment.tenant_id == tenant_row.id).all()
    apt_lookup = {a.id: a for a in db.query(Apartment).filter(Apartment.tenant_id == tenant_row.id).all()}
    by_month_billed: dict[str, int] = defaultdict(int)
    by_month_collected: dict[str, int] = defaultdict(int)
    by_tower_billed: dict[str, int] = defaultdict(int)
    by_tower_collected: dict[str, int] = defaultdict(int)
    bill_payments: dict[str, list[Payment]] = defaultdict(list)
    for payment in payments:
        bill_payments[payment.bill_id].append(payment)
    payer_rows = []
    for bill in bills:
        if bill.period_month:
            by_month_billed[bill.period_month] += bill.total_amount
        apartment = apt_lookup.get(bill.apartment_id)
        if apartment:
            by_tower_billed[apartment.tower] += bill.total_amount
        pay_rows = bill_payments.get(bill.id, [])
        paid_total = sum(p.amount for p in pay_rows)
        if bill.period_month:
            by_month_collected[bill.period_month] += paid_total
        if apartment:
            by_tower_collected[apartment.tower] += paid_total
        if bill.due_date:
            last_paid_at = max((p.paid_at for p in pay_rows), default=None)
            payer_rows.append({"due_date": bill.due_date, "total": bill.total_amount, "paid": paid_total, "last_paid_at": last_paid_at})
    by_month = [
        {
            "period": period,
            "billed": by_month_billed[period],
            "collected": by_month_collected.get(period, 0),
            "ratePct": collection_rate_pct(by_month_billed[period], by_month_collected.get(period, 0)),
        }
        for period in sorted(by_month_billed.keys())
    ]
    by_tower = [
        {"tower": tower, "billed": by_tower_billed[tower], "collected": by_tower_collected.get(tower, 0)}
        for tower in sorted(by_tower_billed.keys())
    ]
    payers = analyze_payers(payer_rows)
    total_billed = sum(item["billed"] for item in by_month)
    total_collected = sum(item["collected"] for item in by_month)
    dated_bills = payers["fullyPaid"] + payers["outstanding"]
    return {
        "byMonth": by_month,
        "byTower": by_tower,
        "payers": payers,
        "totalBilled": total_billed,
        "totalCollected": total_collected,
        "overallRatePct": collection_rate_pct(total_billed, total_collected),
        "fullyPaidPct": round((payers["fullyPaid"] / dated_bills) * 1000) / 10 if dated_bills else 0,
    }


@router.get("/visitor-trends")
async def visitor_trends(
    from_param: str | None = Query(default=None, alias="from"),
    to_param: str | None = Query(default=None, alias="to"),
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> dict:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return {"from": "", "to": "", "total": 0, "distinctDays": 0, "avgPerDay": 0, "peakHour": None, "byHour": [], "byType": [], "byDay": []}
    to_date = datetime.fromisoformat(f"{to_param}T23:59:59+00:00") if to_param else datetime.now(timezone.utc)
    from_date = datetime.fromisoformat(f"{from_param}T00:00:00+00:00") if from_param else to_date - timedelta(days=30)
    return compute_visitor_trends(db, tenant_row.id, from_date, to_date)


@router.get("/house-help-analytics")
async def house_help_analytics(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return {"totalActive": 0, "totalAttendance": 0, "byType": [], "attendanceByDow": []}
    help_rows = db.query(HouseHelp).filter(HouseHelp.tenant_id == tenant_row.id, HouseHelp.is_active.is_(True)).all()
    entries = db.query(HouseHelpEntry).filter(HouseHelpEntry.tenant_id == tenant_row.id).all()
    by_type: dict[str, int] = defaultdict(int)
    for row in help_rows:
        by_type[row.type] += 1
    dow_counts: dict[int, int] = defaultdict(int)
    for entry in entries:
        dow_counts[(entry.check_in_at.weekday() + 1) % 7] += 1
    return {
        "totalActive": len(help_rows),
        "totalAttendance": len(entries),
        "byType": [{"label": key, "count": value} for key, value in sorted(by_type.items(), key=lambda item: (-item[1], item[0]))],
        "attendanceByDow": fill_days_of_week(dow_counts),
    }


@router.get("/maintenance-analytics")
async def maintenance_analytics(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return {"total": 0, "pending": 0, "avgResolutionHours": None, "byCategory": [], "byStatus": []}
    rows = db.query(MaintenanceTicket).filter(MaintenanceTicket.tenant_id == tenant_row.id).all()
    by_category: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)
    resolution_hours = []
    for row in rows:
        by_category[row.category] += 1
        by_status[row.status] += 1
        if row.resolved_at:
            resolution_hours.append(max(0, round(((row.resolved_at - row.created_at).total_seconds() / 3600) * 10) / 10))
    pending = sum(count for label, count in by_status.items() if label in {"OPEN", "IN_PROGRESS"})
    avg_resolution = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None
    return {
        "total": len(rows),
        "pending": pending,
        "avgResolutionHours": avg_resolution,
        "byCategory": [{"label": key, "count": value} for key, value in sorted(by_category.items(), key=lambda item: (-item[1], item[0]))],
        "byStatus": [{"label": key, "count": value} for key, value in sorted(by_status.items(), key=lambda item: (-item[1], item[0]))],
    }


@router.get("/visitor-trends/pdf")
async def visitor_trends_pdf(
    from_param: str | None = Query(default=None, alias="from"),
    to_param: str | None = Query(default=None, alias="to"),
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> Response:
    data = await visitor_trends(from_param, to_param, tenant, actor, db)
    society = (
        db.query(SocietyConfig)
        .join(Tenant, SocietyConfig.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    lines = [
        f"Society: {society.name if society else 'Society'}",
        f"Range: {data['from']} to {data['to']}",
        f"Total visitors: {data['total']}",
        f"Average/day: {data['avgPerDay']}",
        f"Peak hour: {data['peakHour'] if data['peakHour'] is not None else '-'}",
    ]
    pdf = render_text_pdf("Visitor Trends", lines)
    return Response(content=pdf, media_type="application/pdf", headers={"content-disposition": f'inline; filename="visitor-trends-{data["from"]}-to-{data["to"]}.pdf"'})
