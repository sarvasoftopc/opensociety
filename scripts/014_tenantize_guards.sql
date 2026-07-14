-- 014_tenantize_guards.sql
-- Run after 001 and before guard backfill.

begin;

alter table public.guards
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists guards_tenant_id_idx
  on public.guards (tenant_id);

commit;
