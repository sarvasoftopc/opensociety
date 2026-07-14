-- 021_tenantize_vehicles.sql
-- Run after 001 and before vehicle backfill.

begin;

alter table public.vehicles
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists vehicles_tenant_id_idx
  on public.vehicles (tenant_id);

create index if not exists vehicles_tenant_apartment_id_idx
  on public.vehicles (tenant_id, apartment_id);

alter table public.vehicles
  drop constraint if exists vehicles_registration_number_unq;

alter table public.vehicles
  add constraint vehicles_tenant_registration_number_unq
  unique (tenant_id, registration_number);

commit;
