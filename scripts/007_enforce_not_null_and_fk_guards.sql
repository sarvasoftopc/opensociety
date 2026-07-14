-- 007_enforce_not_null_and_fk_guards.sql
-- Run last, only after backfill is verified clean in each environment.

begin;

alter table public.society_config
  alter column tenant_id set not null;

alter table public.apartments
  alter column tenant_id set not null;

alter table public.users
  alter column tenant_id set not null;

alter table public.residencies
  alter column tenant_id set not null;

commit;
