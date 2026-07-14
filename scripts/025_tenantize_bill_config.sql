-- 025_tenantize_bill_config.sql
-- Run after 001 and before finance backfill.

begin;

alter table public.bill_config
  add column if not exists tenant_id uuid references public.tenants(id);

create unique index if not exists bill_config_tenant_id_unq
  on public.bill_config (tenant_id);

commit;
