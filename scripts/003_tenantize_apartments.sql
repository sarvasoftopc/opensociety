-- 003_tenantize_apartments.sql
-- Run after 001. Adds tenant ownership and tenant-scoped uniqueness to apartments.

begin;

alter table public.apartments
  add column if not exists tenant_id uuid references public.tenants(id);

drop index if exists public.apartments_tower_apartment_no_unique;

create unique index if not exists apartments_tenant_tower_apartment_no_unique
  on public.apartments (tenant_id, tower, apartment_no);

create index if not exists apartments_tenant_id_idx
  on public.apartments (tenant_id);

commit;
