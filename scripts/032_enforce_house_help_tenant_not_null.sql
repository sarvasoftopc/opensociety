-- 032_enforce_house_help_tenant_not_null.sql
-- Run last for house-help after backfill verification.

begin;

alter table public.house_help
  alter column tenant_id set not null;

alter table public.house_help_entries
  alter column tenant_id set not null;

alter table public.house_help_assignments
  alter column tenant_id set not null;

alter table public.house_help_reviews
  alter column tenant_id set not null;

commit;
