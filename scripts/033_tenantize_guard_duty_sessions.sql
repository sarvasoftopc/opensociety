-- 033_tenantize_guard_duty_sessions.sql
-- Run after 001 and before guard-duty backfill.

begin;

alter table public.guard_duty_sessions
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists guard_duty_sessions_tenant_id_idx
  on public.guard_duty_sessions (tenant_id);

create index if not exists guard_duty_sessions_tenant_guard_id_idx
  on public.guard_duty_sessions (tenant_id, guard_id);

commit;
