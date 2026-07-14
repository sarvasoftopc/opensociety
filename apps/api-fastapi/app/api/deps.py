from collections.abc import Generator
from uuid import UUID, uuid5, NAMESPACE_URL
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext, resolve_tenant
from app.core.auth import ActorContext, resolve_actor
from app.db.models import Tenant, User
from app.db.session import SessionLocal


async def get_tenant(
    x_tenant_id: Annotated[str | None, Header()] = None,
    x_society_slug: Annotated[str | None, Header()] = None,
    host: Annotated[str | None, Header()] = None,
) -> TenantContext:
    return resolve_tenant(tenant_id=x_tenant_id, society_slug=x_society_slug, host=host)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_actor(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> ActorContext:
    actor = await resolve_actor(authorization=authorization, dev_user_id=x_user_id)
    tenant_row = _get_or_create_tenant(db, tenant) if db is not None and tenant is not None else None

    if actor.auth_source == "supabase" and actor.subject and db is not None and tenant_row is not None:
        user = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                or_(
                    User.supabase_auth_id == actor.subject,
                    User.email == actor.email if actor.email else False,
                ),
            )
            .one_or_none()
        )
        if user is None:
            is_first_user = db.query(User).filter(User.tenant_id == tenant_row.id).first() is None
            user = User(
                tenant_id=tenant_row.id,
                supabase_auth_id=actor.subject,
                email=actor.email,
                phone=actor.phone,
                name=actor.name or actor.email or "Resident",
                role="ADMIN" if is_first_user else "RESIDENT",
                status="APPROVED" if is_first_user else "PENDING",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            changed = False
            if not user.supabase_auth_id:
                user.supabase_auth_id = actor.subject
                changed = True
            if actor.email and user.email != actor.email:
                user.email = actor.email
                changed = True
            if actor.phone and user.phone != actor.phone:
                user.phone = actor.phone
                changed = True
            if actor.name and user.name != actor.name:
                user.name = actor.name
                changed = True
            if changed:
                db.commit()
                db.refresh(user)
        actor.subject = user.supabase_auth_id or actor.subject
        actor.user_id = user.id
        actor.role = user.role
        actor.status = user.status
        actor.name = user.name
        actor.email = user.email
        actor.phone = user.phone
        actor.is_authenticated = True

    if x_user_id and db is not None:
        filters = [User.clerk_id == x_user_id]
        try:
            filters.append(User.id == str(UUID(x_user_id)))
        except ValueError:
            filters.append(User.id == x_user_id)
        user = db.query(User).filter(or_(*filters)).one_or_none()
        if user is None and tenant_row is not None:
            user = User(
                id=str(uuid5(NAMESPACE_URL, f"{tenant_row.slug}:{x_user_id}")),
                tenant_id=tenant_row.id,
                clerk_id=x_user_id,
                email=f"{x_user_id}@dev.local",
                name=x_user_id.replace("-", " ").title(),
                role=actor.role or "ADMIN",
                status=actor.status or "APPROVED",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        if user is not None:
            actor.subject = user.id
            actor.user_id = user.id
            actor.role = user.role
            actor.status = user.status
            actor.name = user.name
            actor.email = user.email
            actor.phone = user.phone
            actor.is_authenticated = True
            actor.auth_source = "dev-db-user"
    return actor


def _get_or_create_tenant(db: Session, tenant: TenantContext) -> Tenant:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is not None:
        return tenant_row
    tenant_row = Tenant(slug=tenant.tenant_slug, name=tenant.tenant_slug.replace("-", " ").title())
    db.add(tenant_row)
    db.commit()
    db.refresh(tenant_row)
    return tenant_row
def require_authenticated_actor(actor: Annotated[ActorContext, Depends(get_actor)]) -> ActorContext:
    if not actor.is_authenticated:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")
    return actor
