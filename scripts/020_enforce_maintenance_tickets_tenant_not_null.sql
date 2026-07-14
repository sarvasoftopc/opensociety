-- 020_enforce_maintenance_tickets_tenant_not_null.sql
-- Run last for tickets after backfill verification.

begin;

alter table public.maintenance_tickets
  alter column tenant_id set not null;

commit;
