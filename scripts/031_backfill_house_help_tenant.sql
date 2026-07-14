-- 031_backfill_house_help_tenant.sql
-- Run after 029 and 030.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.house_help
set tenant_id = (select id from tenant_row)
where tenant_id is null;

update public.house_help_entries hhe
set tenant_id = hh.tenant_id
from public.house_help hh
where hhe.house_help_id = hh.id
  and hhe.tenant_id is null;

update public.house_help_assignments hha
set tenant_id = hh.tenant_id
from public.house_help hh
where hha.house_help_id = hh.id
  and hha.tenant_id is null;

update public.house_help_reviews hhr
set tenant_id = hh.tenant_id
from public.house_help hh
where hhr.house_help_id = hh.id
  and hhr.tenant_id is null;

commit;
