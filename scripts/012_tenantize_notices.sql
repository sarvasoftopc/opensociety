-- 012_tenantize_notices.sql
-- Run after 001 and before notices backfill.

begin;

alter table public.notices
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists notices_tenant_id_idx
  on public.notices (tenant_id);

create index if not exists notices_tenant_published_at_idx
  on public.notices (tenant_id, published_at);

commit;
