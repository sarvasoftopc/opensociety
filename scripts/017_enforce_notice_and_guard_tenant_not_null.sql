-- 017_enforce_notice_and_guard_tenant_not_null.sql
-- Run last for notice/guard tables after backfill verification.

begin;

alter table public.notices
  alter column tenant_id set not null;

alter table public.notice_reads
  alter column tenant_id set not null;

alter table public.guards
  alter column tenant_id set not null;

alter table public.guard_devices
  alter column tenant_id set not null;

commit;
