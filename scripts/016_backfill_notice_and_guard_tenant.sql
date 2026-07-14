-- 016_backfill_notice_and_guard_tenant.sql
-- Run after 012-015. Backfills notice and guard tables to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.notices
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.notice_reads
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.guards
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.guard_devices
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;
