-- 024_enforce_vehicle_and_parking_tenant_not_null.sql
-- Run last for vehicles and parking after backfill verification.

begin;

alter table public.vehicles
  alter column tenant_id set not null;

alter table public.parking_slots
  alter column tenant_id set not null;

commit;
