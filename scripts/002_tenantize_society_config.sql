-- 002_tenantize_society_config.sql
-- Run after 001. Converts singleton society_config into a tenant-owned record.

begin;

alter table public.society_config
  add column if not exists tenant_id uuid references public.tenants(id);

create unique index if not exists society_config_tenant_id_unique
  on public.society_config (tenant_id);

commit;
