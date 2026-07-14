from dataclasses import dataclass
import json
from functools import lru_cache
from typing import Any
from urllib.request import urlopen

from jose import JWTError, jwt

from app.core.config import get_settings


@dataclass(slots=True)
class ActorContext:
    subject: str | None
    user_id: str | None
    role: str | None
    status: str | None
    email: str | None
    phone: str | None
    name: str | None
    is_authenticated: bool
    auth_source: str


async def resolve_actor(authorization: str | None, dev_user_id: str | None) -> ActorContext:
    settings = get_settings()

    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        claims = _decode_supabase_token(token, settings.supabase_jwt_secret)
        if claims:
            app_metadata = claims.get("app_metadata") or {}
            user_metadata = claims.get("user_metadata") or {}
            role = app_metadata.get("role") or user_metadata.get("role")
            status = user_metadata.get("status")
            return ActorContext(
                subject=claims.get("sub"),
                user_id=claims.get("sub"),
                role=role,
                status=status,
                email=claims.get("email"),
                phone=claims.get("phone"),
                name=user_metadata.get("full_name") or user_metadata.get("name") or claims.get("email"),
                is_authenticated=True,
                auth_source="supabase",
            )

    if dev_user_id:
        return ActorContext(
            subject=dev_user_id,
            user_id=dev_user_id,
            role="ADMIN",
            status="APPROVED",
            email=None,
            phone=None,
            name="Dev Admin",
            is_authenticated=True,
            auth_source="dev-header",
        )

    return ActorContext(
        subject=None,
        user_id=None,
        role=None,
        status=None,
        email=None,
        phone=None,
        name=None,
        is_authenticated=False,
        auth_source="anonymous",
    )


def _decode_supabase_token(token: str, secret: str | None) -> dict[str, Any] | None:
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg", "HS256")

        if algorithm == "HS256":
            if not secret:
                return None
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        jwk = _get_supabase_jwk(header.get("kid"))
        if jwk is None:
            return None
        return jwt.decode(
            token,
            jwk,
            algorithms=[algorithm],
            options={"verify_aud": False},
        )
    except JWTError:
        return None


@lru_cache(maxsize=1)
def _get_supabase_jwks() -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url:
        return {"keys": []}
    with urlopen(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _get_supabase_jwk(kid: str | None) -> dict[str, Any] | None:
    keys = _get_supabase_jwks().get("keys", [])
    if kid is None:
        return keys[0] if keys else None
    for key in keys:
        if key.get("kid") == kid:
            return key
    return None
