-- 018_tenantize_maintenance_tickets.sql
-- Run after 001 and before ticket backfill.

begin;

alter table public.maintenance_tickets
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists maintenance_tickets_tenant_id_idx
  on public.maintenance_tickets (tenant_id);

create index if not exists maintenance_tickets_tenant_status_idx
  on public.maintenance_tickets (tenant_id, status);

commit;
