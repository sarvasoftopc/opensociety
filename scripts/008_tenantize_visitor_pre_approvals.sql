-- 008_tenantize_visitor_pre_approvals.sql
-- Run after 001 and before visitor pre-approval backfill.

begin;

alter table public.visitor_pre_approvals
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists visitor_pre_approvals_tenant_id_idx
  on public.visitor_pre_approvals (tenant_id);

create index if not exists visitor_pre_approvals_tenant_code_idx
  on public.visitor_pre_approvals (tenant_id, code);

commit;
