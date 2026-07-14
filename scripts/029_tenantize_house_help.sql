-- 029_tenantize_house_help.sql
-- Run after 001 and before house-help backfill.

begin;

alter table public.house_help
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists house_help_tenant_id_idx
  on public.house_help (tenant_id);

commit;
