from dataclasses import dataclass
import ipaddress

from app.core.config import get_settings


@dataclass(slots=True)
class TenantContext:
    tenant_id: str | None
    tenant_slug: str
    resolution_source: str


def resolve_tenant(tenant_id: str | None, society_slug: str | None, host: str | None) -> TenantContext:
    if tenant_id:
        return TenantContext(tenant_id=tenant_id, tenant_slug=society_slug or tenant_id, resolution_source="x-tenant-id")

    if society_slug:
        return TenantContext(tenant_id=None, tenant_slug=society_slug, resolution_source="x-society-slug")

    if host:
        normalized = host.split(":")[0]
        try:
            ipaddress.ip_address(normalized)
        except ValueError:
            pass
        else:
            fallback_slug = get_settings().default_tenant_slug
            return TenantContext(tenant_id=None, tenant_slug=fallback_slug, resolution_source="default")

        if normalized in {"localhost"}:
            fallback_slug = get_settings().default_tenant_slug
            return TenantContext(tenant_id=None, tenant_slug=fallback_slug, resolution_source="default")

        parts = normalized.split(".")
        if len(parts) > 2 and parts[0] not in {"www", "api"}:
            return TenantContext(tenant_id=None, tenant_slug=parts[0], resolution_source="host-subdomain")

    fallback_slug = get_settings().default_tenant_slug
    return TenantContext(tenant_id=None, tenant_slug=fallback_slug, resolution_source="default")
