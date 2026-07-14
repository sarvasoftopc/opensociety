-- 005_tenantize_residencies.sql
-- Run after 003 and 004. Makes residencies tenant-scoped for ownership checks.

begin;

alter table public.residencies
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists residencies_tenant_user_id_idx
  on public.residencies (tenant_id, user_id);

create index if not exists residencies_tenant_apartment_id_idx
  on public.residencies (tenant_id, apartment_id);

commit;
