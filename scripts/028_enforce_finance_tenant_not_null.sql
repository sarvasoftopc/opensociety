-- 028_enforce_finance_tenant_not_null.sql
-- Run last for finance after backfill verification.

begin;

alter table public.bill_config
  alter column tenant_id set not null;

alter table public.maintenance_bills
  alter column tenant_id set not null;

alter table public.bill_line_items
  alter column tenant_id set not null;

alter table public.payments
  alter column tenant_id set not null;

commit;
