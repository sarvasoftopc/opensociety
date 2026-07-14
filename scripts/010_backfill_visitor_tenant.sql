-- 010_backfill_visitor_tenant.sql
-- Run after 008 and 009. Backfills visitor tables to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.visitor_pre_approvals
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.visitor_entries
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;
