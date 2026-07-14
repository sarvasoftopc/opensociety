from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db import models  # noqa: F401


def _normalize_sqlite_url(url: str) -> tuple[str, dict[str, object]]:
    if url.startswith("sqlite"):
        return url, {"check_same_thread": False}
    return url, {}


def _normalize_postgres_driver(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _derive_supabase_database_url() -> str | None:
    settings = get_settings()
    if not settings.supabase_db_password:
        return None

    host = settings.supabase_db_host
    if not host and settings.supabase_url:
        parsed = urlparse(settings.supabase_url)
        project_ref = parsed.hostname.split(".")[0] if parsed.hostname else None
        if project_ref:
            host = f"db.{project_ref}.supabase.co"

    if not host:
        return None

    return (
        f"postgresql+psycopg://{settings.supabase_db_user}:{settings.supabase_db_password}"
        f"@{host}:{settings.supabase_db_port}/{settings.supabase_db_name}"
    )


def _resolve_database_url(database_url: str | None = None) -> str:
    settings = get_settings()
    configured_url = database_url or settings.database_url or _derive_supabase_database_url()
    if not configured_url:
        raise RuntimeError(
            "Supabase Postgres configuration is required. Set DATABASE_URL or SUPABASE_DB_PASSWORD "
            "with SUPABASE_URL/SUPABASE_DB_HOST."
        )
    if configured_url.startswith("sqlite"):
        if database_url:
            return configured_url
        raise RuntimeError("SQLite/local fallback is disabled. Configure Supabase Postgres instead.")

    normalized_url = _normalize_postgres_driver(configured_url)
    parsed = urlparse(normalized_url)
    if not database_url and parsed.hostname in {"localhost", "127.0.0.1"}:
        raise RuntimeError("Local Postgres is disabled. Configure a Supabase Postgres DATABASE_URL instead.")
    return normalized_url


def create_session_factory(database_url: str | None = None) -> tuple[object, sessionmaker]:
    configured_url = _resolve_database_url(database_url)
    normalized_url, connect_args = _normalize_sqlite_url(configured_url)
    engine = create_engine(normalized_url, future=True, connect_args=connect_args)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine, factory


engine, SessionLocal = create_session_factory()


def initialize_database() -> None:
    if engine.url.get_backend_name() == "sqlite":
        Base.metadata.create_all(bind=engine)
