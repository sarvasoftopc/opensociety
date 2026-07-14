-- 015_tenantize_guard_devices.sql
-- Run after 001 and before guard-device backfill.

begin;

alter table public.guard_devices
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists guard_devices_tenant_id_idx
  on public.guard_devices (tenant_id);

create unique index if not exists guard_devices_tenant_guard_device_unq
  on public.guard_devices (tenant_id, guard_id, device_id);

commit;
