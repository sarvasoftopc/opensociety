-- 019_backfill_maintenance_tickets_tenant.sql
-- Run after 018. Backfills tickets to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.maintenance_tickets
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;
