-- 034_backfill_guard_duty_tenant.sql
-- Run after 033.

begin;

update public.guard_duty_sessions gds
set tenant_id = g.tenant_id
from public.guards g
where gds.guard_id = g.id
  and gds.tenant_id is null;

commit;
