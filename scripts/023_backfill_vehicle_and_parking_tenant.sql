-- 023_backfill_vehicle_and_parking_tenant.sql
-- Run after 021 and 022. Backfills records to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.vehicles
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.parking_slots
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;
