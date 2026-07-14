-- 013_tenantize_notice_reads.sql
-- Run after 001 and before notice read backfill.

begin;

alter table public.notice_reads
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists notice_reads_tenant_id_idx
  on public.notice_reads (tenant_id);

create unique index if not exists notice_reads_tenant_notice_user_unq
  on public.notice_reads (tenant_id, notice_id, user_id);

commit;
