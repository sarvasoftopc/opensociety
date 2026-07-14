from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.notifications import create_notification
from app.core.tenant import TenantContext
from app.db.models import AppNotification, Tenant, User, UserDeviceToken
from app.schemas.notifications import (
    NotificationDispatchResponse,
    NotificationResponse,
    RegisterDeviceTokenRequest,
    SendTestNotificationRequest,
)


router = APIRouter(prefix="/notifications", tags=["notifications"])


def require_admin(actor: ActorContext) -> None:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[NotificationResponse]:
    if not actor.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        return []
    try:
        rows = (
            db.query(AppNotification)
            .filter(AppNotification.tenant_id == tenant_row.id, AppNotification.user_id == actor.user_id)
            .order_by(AppNotification.created_at.desc())
            .limit(50)
            .all()
        )
    except ProgrammingError:
        db.rollback()
        return []
    return [NotificationResponse.model_validate(row) for row in rows]


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> NotificationResponse:
    if not actor.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    row = (
        db.query(AppNotification)
        .filter(
            AppNotification.id == notification_id,
            AppNotification.tenant_id == (tenant_row.id if tenant_row else None),
            AppNotification.user_id == actor.user_id,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="notification not found")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(row)
    return NotificationResponse.model_validate(row)


@router.post("/register-device", response_model=dict[str, bool])
async def register_device_token(
    payload: RegisterDeviceTokenRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, bool]:
    if not actor.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")
    try:
        existing = (
            db.query(UserDeviceToken)
            .filter(UserDeviceToken.tenant_id == tenant_row.id, UserDeviceToken.token == payload.token)
            .one_or_none()
        )
    except ProgrammingError:
        db.rollback()
        return {"ok": True}
    if existing is None:
        existing = UserDeviceToken(
            tenant_id=tenant_row.id,
            user_id=actor.user_id,
            token=payload.token,
            platform=payload.platform,
            provider=payload.provider,
            device_label=payload.device_label,
            is_active=True,
        )
        db.add(existing)
    else:
        existing.user_id = actor.user_id
        existing.platform = payload.platform
        existing.provider = payload.provider
        existing.device_label = payload.device_label
        existing.is_active = True
        existing.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/test", response_model=NotificationDispatchResponse)
async def send_test_notification(
    payload: SendTestNotificationRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> NotificationDispatchResponse:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")

    if payload.all_residents:
        target_users = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                User.role == "RESIDENT",
                User.is_active.is_(True),
            )
            .all()
        )
    else:
        target_users = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_row.id,
                User.id == payload.user_id,
                User.is_active.is_(True),
            )
            .all()
        )
    if not target_users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="target resident not found")

    created: AppNotification | None = None
    push_attempted = False
    push_sent = False
    push_error: str | None = None
    push_success_count = 0
    push_partial_failure_count = 0

    for target_user in target_users:
        created_row, push = create_notification(
            db,
            tenant_slug=tenant.tenant_slug,
            user_id=target_user.id,
            type="TEST",
            title=payload.title,
            body=payload.body,
            data=payload.data,
            source="ADMIN_TEST",
            attempt_push=True,
        )
        created = created or created_row
        push_attempted = push_attempted or push.attempted
        push_sent = push_sent or push.sent
        if push.sent:
            push_success_count += 1
        if push.error == "partial_failure":
            push_partial_failure_count += 1
        if push.error and push_error is None:
            push_error = push.error

    db.commit()
    if created is not None:
        db.refresh(created)
    return NotificationDispatchResponse(
        created=NotificationResponse.model_validate(created) if created is not None else None,
        targetCount=len(target_users),
        createdCount=len(target_users),
        pushSuccessCount=push_success_count,
        pushPartialFailureCount=push_partial_failure_count,
        pushAttempted=push_attempted,
        pushSent=push_sent,
        pushError=push_error,
    )
