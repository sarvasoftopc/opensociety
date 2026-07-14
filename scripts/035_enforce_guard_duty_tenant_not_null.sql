-- 035_enforce_guard_duty_tenant_not_null.sql
-- Run last for guard-duty after backfill verification.

begin;

alter table public.guard_duty_sessions
  alter column tenant_id set not null;

commit;
