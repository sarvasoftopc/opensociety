-- 011_enforce_visitor_tenant_not_null.sql
-- Run last for visitor tables, after verifying tenant backfill is complete.

begin;

alter table public.visitor_pre_approvals
  alter column tenant_id set not null;

alter table public.visitor_entries
  alter column tenant_id set not null;

commit;
