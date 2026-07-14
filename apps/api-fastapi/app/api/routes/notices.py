from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.notifications import create_notification
from app.core.tenant import TenantContext
from app.db.models import Notice, NoticeRead, Tenant, User
from app.schemas.notices import CreateNoticeRequest, NoticeReadReceiptResponse, NoticeResponse


router = APIRouter(prefix="/notices", tags=["notices"])


def require_admin(actor: ActorContext) -> ActorContext:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return actor


@router.get("", response_model=list[NoticeResponse])
async def list_notices(
    q: str | None = None,
    category: str | None = None,
    from_ts: Annotated[str | None, Query(alias="from")] = None,
    to_ts: Annotated[str | None, Query(alias="to")] = None,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[NoticeResponse]:
    _ = actor
    query = (
        db.query(Notice)
        .join(Tenant, Notice.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
    )
    if category:
        query = query.filter(Notice.category == category)
    if from_ts:
        query = query.filter(Notice.published_at >= datetime.fromisoformat(from_ts.replace("Z", "+00:00")))
    if to_ts:
        query = query.filter(Notice.published_at <= datetime.fromisoformat(to_ts.replace("Z", "+00:00")))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Notice.title.ilike(like), Notice.body.ilike(like)))
    rows = query.order_by(desc(Notice.published_at)).all()
    if not rows:
        return []

    ids = [row.id for row in rows]
    counts = {
        notice_id: count
        for notice_id, count in db.query(NoticeRead.notice_id, func.count(NoticeRead.id))
        .filter(NoticeRead.notice_id.in_(ids))
        .group_by(NoticeRead.notice_id)
        .all()
    }
    read_ids = set()
    if actor.user_id:
        read_ids = {
            notice_id
            for (notice_id,) in db.query(NoticeRead.notice_id)
            .filter(NoticeRead.notice_id.in_(ids), NoticeRead.user_id == actor.user_id)
            .all()
        }
    result = []
    for row in rows:
        item = NoticeResponse.model_validate(row)
        item.read_count = int(counts.get(row.id, 0))
        item.read = row.id in read_ids
        result.append(item)
    return result


@router.post("", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
async def create_notice(
    payload: CreateNoticeRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> NoticeResponse:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")
    row = Notice(
        tenant_id=tenant_row.id,
        title=payload.title,
        body=payload.body,
        priority=payload.priority,
        category=payload.category,
        attachment_url=payload.attachment_url,
        attachment_name=payload.attachment_name,
        published_by=actor.user_id or "dev-admin",
        expires_at=datetime.fromisoformat(payload.expires_at.replace("Z", "+00:00")) if payload.expires_at else None,
        published_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    recipients = db.query(User.id).filter(User.tenant_id == tenant_row.id, User.is_active.is_(True), User.role.in_(["RESIDENT", "GUARD"])).all()
    for (user_id,) in recipients:
        create_notification(
            db,
            tenant_slug=tenant.tenant_slug,
            user_id=user_id,
            type="NOTICE",
            title=payload.title,
            body=payload.body[:160],
            data={"noticeId": row.id, "screen": "resident_dashboard"},
            source="NOTICE",
            attempt_push=True,
        )
    db.commit()
    db.refresh(row)
    return NoticeResponse.model_validate(row)


@router.post("/{notice_id}/read")
async def mark_notice_read(
    notice_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> dict[str, bool]:
    if not actor.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")
    notice = (
        db.query(Notice)
        .join(Tenant, Notice.tenant_id == Tenant.id)
        .filter(Notice.id == notice_id, Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    existing = db.query(NoticeRead).filter(NoticeRead.notice_id == notice_id, NoticeRead.user_id == actor.user_id).one_or_none()
    if existing is None:
        db.add(NoticeRead(tenant_id=notice.tenant_id, notice_id=notice_id, user_id=actor.user_id))
        db.commit()
    return {"ok": True}


@router.get("/{notice_id}/reads", response_model=list[NoticeReadReceiptResponse])
async def list_notice_reads(
    notice_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant)] = None,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> list[NoticeReadReceiptResponse]:
    require_admin(actor)
    rows = (
        db.query(NoticeRead.user_id, User.name, NoticeRead.read_at)
        .join(User, User.id == NoticeRead.user_id, isouter=True)
        .join(Tenant, NoticeRead.tenant_id == Tenant.id)
        .filter(NoticeRead.notice_id == notice_id, Tenant.slug == tenant.tenant_slug)
        .order_by(desc(NoticeRead.read_at))
        .all()
    )
    return [NoticeReadReceiptResponse(userId=user_id, name=name, readAt=read_at) for user_id, name, read_at in rows]
