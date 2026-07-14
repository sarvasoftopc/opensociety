-- 026_tenantize_finance_tables.sql
-- Run after 001 and before finance backfill.

begin;

alter table public.maintenance_bills
  add column if not exists tenant_id uuid references public.tenants(id);

alter table public.bill_line_items
  add column if not exists tenant_id uuid references public.tenants(id);

alter table public.payments
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists maintenance_bills_tenant_id_idx
  on public.maintenance_bills (tenant_id);

create index if not exists maintenance_bills_tenant_apartment_id_idx
  on public.maintenance_bills (tenant_id, apartment_id);

create index if not exists bill_line_items_tenant_id_idx
  on public.bill_line_items (tenant_id);

create index if not exists payments_tenant_id_idx
  on public.payments (tenant_id);

create index if not exists payments_tenant_bill_id_idx
  on public.payments (tenant_id, bill_id);

create index if not exists payments_tenant_apartment_id_idx
  on public.payments (tenant_id, apartment_id);

commit;
