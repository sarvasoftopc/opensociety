from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8788
    api_cors_origins: str = Field(default="http://localhost:3000,http://localhost:8081")
    api_cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+)(:\d+)?$"
    default_tenant_slug: str = "demo-society"

    database_url: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None
    supabase_db_password: str | None = None
    supabase_db_host: str | None = None
    supabase_db_port: int = 5432
    supabase_db_name: str = "postgres"
    supabase_db_user: str = "postgres"
    uploads_dir: str = ".uploads"
    clerk_webhook_secret: str | None = None
    firebase_project_id: str | None = None
    firebase_service_account_json: str | None = None
    firebase_service_account_path: str | None = None
    public_app_url: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
