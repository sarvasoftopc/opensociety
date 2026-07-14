-- 006_backfill_default_tenant.sql
-- Run after 001-005. Moves a current single-tenant deployment into the shared model.
-- Update the slug/name values below before production execution.

begin;

with inserted as (
  insert into public.tenants (slug, name)
  values ('default-society', 'Default Society')
  on conflict (slug) do update
    set name = excluded.name,
        updated_at = now()
  returning id
)
update public.society_config
set tenant_id = (select id from inserted)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.apartments
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.users
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.residencies
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;
