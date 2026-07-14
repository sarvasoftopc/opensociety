from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant
from app.core.tenant import TenantContext
from app.db.models import Tenant, User


router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _get_or_create_tenant(db: Session, tenant: TenantContext) -> Tenant:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is not None:
        return tenant_row
    tenant_row = Tenant(slug=tenant.tenant_slug, name=tenant.tenant_slug.replace("-", " ").title())
    db.add(tenant_row)
    db.commit()
    db.refresh(tenant_row)
    return tenant_row


def _extract_user_snapshot(payload: dict[str, Any]) -> dict[str, str | None]:
    data = payload.get("data") or payload.get("record") or payload.get("user") or {}
    email_addresses = data.get("email_addresses") or []
    phone_numbers = data.get("phone_numbers") or []
    user_metadata = data.get("user_metadata") or {}

    first_name = data.get("first_name") or user_metadata.get("first_name")
    last_name = data.get("last_name") or user_metadata.get("last_name")
    full_name = data.get("full_name") or user_metadata.get("full_name")
    email = data.get("email") or (email_addresses[0].get("email_address") if email_addresses else None)
    phone = data.get("phone") or data.get("phone_number") or (phone_numbers[0].get("phone_number") if phone_numbers else None)
    name = full_name or " ".join(part for part in [first_name, last_name] if part).strip() or email or "Resident"

    return {
        "external_id": data.get("id") or data.get("user_id"),
        "email": email,
        "phone": phone,
        "name": name,
    }


def _upsert_user_from_event(db: Session, tenant_row: Tenant, snapshot: dict[str, str | None]) -> None:
    external_id = snapshot["external_id"]
    email = snapshot["email"]
    phone = snapshot["phone"]
    name = snapshot["name"] or "Resident"

    row = None
    if external_id:
        row = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                User.supabase_auth_id == external_id,
            )
            .one_or_none()
        )
    if row is None and email:
        row = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                User.email == email,
            )
            .one_or_none()
        )

    if row is None:
        db.add(
            User(
                tenant_id=tenant_row.id,
                supabase_auth_id=external_id,
                clerk_id=external_id,
                email=email,
                phone=phone,
                name=name,
                role="RESIDENT",
                status="PENDING",
                is_active=True,
            )
        )
        db.commit()
        return

    row.supabase_auth_id = external_id or row.supabase_auth_id
    row.clerk_id = row.clerk_id or external_id
    row.email = email or row.email
    row.phone = phone or row.phone
    row.name = name or row.name
    row.is_active = True
    db.commit()


def _deactivate_user_from_event(db: Session, tenant_row: Tenant, snapshot: dict[str, str | None]) -> None:
    external_id = snapshot["external_id"]
    email = snapshot["email"]
    row = None
    if external_id:
        row = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                User.supabase_auth_id == external_id,
            )
            .one_or_none()
        )
    if row is None and email:
        row = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                User.email == email,
            )
            .one_or_none()
        )
    if row is not None:
        row.is_active = False
        row.status = "SUSPENDED"
        db.commit()


@router.post("/clerk")
@router.post("/auth")
async def auth_webhook(
    request: Request,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, bool]:
    payload: dict[str, Any] = await request.json()
    tenant_row = _get_or_create_tenant(db, tenant)
    event_type = payload.get("type") or payload.get("event")
    snapshot = _extract_user_snapshot(payload)

    if event_type in {"user.created", "user.updated", "auth.user.created", "auth.user.updated"}:
        _upsert_user_from_event(db, tenant_row, snapshot)
    elif event_type in {"user.deleted", "auth.user.deleted"}:
        _deactivate_user_from_event(db, tenant_row, snapshot)

    return {"ok": True}
