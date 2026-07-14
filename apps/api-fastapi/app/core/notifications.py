import json
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import AppNotification, Tenant, UserDeviceToken

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except Exception:  # pragma: no cover
    firebase_admin = None
    credentials = None
    messaging = None


@dataclass
class PushResult:
    attempted: bool
    sent: bool
    error: str | None = None


def _notification_link(data: dict | None) -> str:
    settings = get_settings()
    base = (settings.public_app_url or "").rstrip("/")
    if not data:
        return f"{base}/resident" if base else "/resident"
    if isinstance(data.get("url"), str) and data["url"]:
        raw = data["url"]
        if raw.startswith("https://") or raw.startswith("http://"):
            return raw
        return f"{base}{raw}" if base else raw
    screen = str(data.get("screen") or "").lower()
    if screen in {"visitors", "notifications", "notices", "payments", "tickets"}:
        return f"{base}/resident" if base else "/resident"
    if screen in {"gate", "duty", "house-help"}:
        return f"{base}/guard" if base else "/guard"
    return f"{base}/resident" if base else "/resident"


def _firebase_app():
    settings = get_settings()
    if firebase_admin is None:
        return None
    if firebase_admin._apps:
        return firebase_admin.get_app()
    if settings.firebase_service_account_json:
        cert = credentials.Certificate(json.loads(settings.firebase_service_account_json))
        return firebase_admin.initialize_app(cert)
    if settings.firebase_service_account_path:
        cert = credentials.Certificate(settings.firebase_service_account_path)
        return firebase_admin.initialize_app(cert)
    return None


def send_push_to_user(db: Session, tenant_id: str, user_id: str, title: str, body: str, data: dict | None = None) -> PushResult:
    bind = db.get_bind()
    if bind is None or not inspect(bind).has_table("user_device_tokens"):
        return PushResult(attempted=False, sent=False)
    app = _firebase_app()
    tokens = [
        row.token
        for row in db.query(UserDeviceToken)
        .filter(
            UserDeviceToken.tenant_id == tenant_id,
            UserDeviceToken.user_id == user_id,
            UserDeviceToken.is_active.is_(True),
        )
        .all()
    ]
    if not tokens:
        return PushResult(attempted=False, sent=False)
    if app is None or messaging is None:
        return PushResult(attempted=True, sent=False, error="firebase_not_configured")
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(link=_notification_link(data))
            ),
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message, app=app)
        if response.failure_count > 0:
            for token, result in zip(tokens, response.responses, strict=False):
                if result.success:
                    continue
                row = (
                    db.query(UserDeviceToken)
                    .filter(
                        UserDeviceToken.tenant_id == tenant_id,
                        UserDeviceToken.user_id == user_id,
                        UserDeviceToken.token == token,
                    )
                    .one_or_none()
                )
                if row is None:
                    continue
                row.is_active = False
                row.last_seen_at = datetime.now(timezone.utc)
            db.flush()
        return PushResult(attempted=True, sent=response.success_count > 0, error=None if response.failure_count == 0 else "partial_failure")
    except Exception as exc:  # pragma: no cover
        return PushResult(attempted=True, sent=False, error=str(exc))


def create_notification(
    db: Session,
    *,
    tenant_slug: str,
    user_id: str,
    type: str,
    title: str,
    body: str,
    data: dict | None = None,
    source: str | None = None,
    attempt_push: bool = True,
) -> tuple[AppNotification, PushResult]:
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant_slug).one()
    push = send_push_to_user(db, tenant_row.id, user_id, title, body, data) if attempt_push else PushResult(attempted=False, sent=False)
    bind = db.get_bind()
    if bind is None or not inspect(bind).has_table("app_notifications"):
        placeholder = AppNotification(
            tenant_id=tenant_row.id,
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            data=data,
            source=source,
            delivery_status="IN_APP_ONLY",
        )
        return placeholder, push
    row = AppNotification(
        tenant_id=tenant_row.id,
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data,
        source=source,
        delivery_status="PUSH_SENT" if push.sent else ("PUSH_FAILED" if push.attempted else "IN_APP_ONLY"),
    )
    db.add(row)
    db.flush()
    return row, push
