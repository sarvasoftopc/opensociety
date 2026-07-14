from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import Apartment, Residency, Tenant, User
from app.schemas.users import ApproveUserRequest, UpdateUserRoleRequest, UserResponse


router = APIRouter(prefix="/users", tags=["users"])


def require_admin(actor: ActorContext) -> ActorContext:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


@router.get("", response_model=list[UserResponse])
async def list_users(
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[UserResponse]:
    require_admin(actor)
    query = (
        db.query(User)
        .join(Tenant, User.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
    )
    if status_filter:
        query = query.filter(User.status == status_filter)
    rows = query.order_by(desc(User.created_at)).all()
    return [UserResponse.model_validate(row) for row in rows]


@router.post("/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: str,
    payload: ApproveUserRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> UserResponse:
    require_admin(actor)
    user = (
        db.query(User)
        .join(Tenant, User.tenant_id == Tenant.id)
        .filter(User.id == user_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")

    apartment = (
        db.query(Apartment)
        .join(Tenant, Apartment.tenant_id == Tenant.id)
        .filter(Apartment.id == payload.apartment_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if apartment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="apartment not found")

    active_residency = (
        db.query(Residency)
        .filter(
            Residency.user_id == user.id,
            Residency.apartment_id == apartment.id,
            Residency.end_date.is_(None),
        )
        .one_or_none()
    )
    if active_residency is None:
        db.add(
            Residency(
                tenant_id=user.tenant_id,
                user_id=user.id,
                apartment_id=apartment.id,
                relation=payload.relation,
                is_primary=payload.is_primary,
            )
        )

    user.status = "APPROVED"
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UpdateUserRoleRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> UserResponse:
    require_admin(actor)
    user = (
        db.query(User)
        .join(Tenant, User.tenant_id == Tenant.id)
        .filter(User.id == user_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
