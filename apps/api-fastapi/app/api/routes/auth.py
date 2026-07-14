from typing import Annotated

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Tenant, User


router = APIRouter(prefix="/auth", tags=["auth"])


class AuthMeResponse(BaseModel):
    id: str
    tenantId: str
    tenantSlug: str
    name: str
    email: str | None
    phone: str | None
    role: str
    status: str
    isActive: bool
    authSource: str


class UpdateMyProfileRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    phone: str | None = None


@router.get("/me", response_model=AuthMeResponse)
async def get_me(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthMeResponse:
    row = (
        db.query(User, Tenant.slug)
        .join(Tenant, Tenant.id == User.tenant_id)
        .filter(User.id == actor.user_id, Tenant.slug == tenant.tenant_slug)
        .one()
    )
    user, tenant_slug = row
    return AuthMeResponse(
        id=user.id,
        tenantId=user.tenant_id,
        tenantSlug=tenant_slug,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        status=user.status,
        isActive=user.is_active,
        authSource=actor.auth_source,
    )


@router.patch("/me", response_model=AuthMeResponse)
async def update_me(
    payload: UpdateMyProfileRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthMeResponse:
    user = (
        db.query(User, Tenant.slug)
        .join(Tenant, Tenant.id == User.tenant_id)
        .filter(User.id == actor.user_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    row, tenant_slug = user
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None and updates["name"].strip():
        row.name = updates["name"].strip()
    if "phone" in updates:
        row.phone = updates["phone"].strip() if updates["phone"] else None
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return AuthMeResponse(
        id=row.id,
        tenantId=row.tenant_id,
        tenantSlug=tenant_slug,
        name=row.name,
        email=row.email,
        phone=row.phone,
        role=row.role,
        status=row.status,
        isActive=row.is_active,
        authSource=actor.auth_source,
    )
