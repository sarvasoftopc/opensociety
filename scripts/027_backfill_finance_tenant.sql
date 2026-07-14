-- 027_backfill_finance_tenant.sql
-- Run after 025 and 026.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.bill_config
set tenant_id = (select id from tenant_row)
where tenant_id is null;

update public.maintenance_bills mb
set tenant_id = a.tenant_id
from public.apartments a
where mb.apartment_id = a.id
  and mb.tenant_id is null;

update public.bill_line_items bli
set tenant_id = mb.tenant_id
from public.maintenance_bills mb
where bli.bill_id = mb.id
  and bli.tenant_id is null;

update public.payments p
set tenant_id = mb.tenant_id
from public.maintenance_bills mb
where p.bill_id = mb.id
  and p.tenant_id is null;

commit;
