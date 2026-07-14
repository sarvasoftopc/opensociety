-- 009_tenantize_visitor_entries.sql
-- Run after 001 and before visitor entry backfill.

begin;

alter table public.visitor_entries
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists visitor_entries_tenant_id_idx
  on public.visitor_entries (tenant_id);

create index if not exists visitor_entries_tenant_apartment_status_idx
  on public.visitor_entries (tenant_id, apartment_id, status);

commit;
