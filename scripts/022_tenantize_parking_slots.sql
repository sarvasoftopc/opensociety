-- 022_tenantize_parking_slots.sql
-- Run after 001 and before parking backfill.

begin;

alter table public.parking_slots
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists parking_slots_tenant_id_idx
  on public.parking_slots (tenant_id);

create index if not exists parking_slots_tenant_apartment_id_idx
  on public.parking_slots (tenant_id, apartment_id);

create index if not exists parking_slots_tenant_is_visitor_idx
  on public.parking_slots (tenant_id, is_visitor);

alter table public.parking_slots
  drop constraint if exists parking_slots_slot_number_unq;

alter table public.parking_slots
  add constraint parking_slots_tenant_slot_number_unq
  unique (tenant_id, slot_number);

commit;
