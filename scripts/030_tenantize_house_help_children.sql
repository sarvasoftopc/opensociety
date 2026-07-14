-- 030_tenantize_house_help_children.sql
-- Run after 001 and before house-help backfill.

begin;

alter table public.house_help_entries
  add column if not exists tenant_id uuid references public.tenants(id);

alter table public.house_help_assignments
  add column if not exists tenant_id uuid references public.tenants(id);

alter table public.house_help_reviews
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists house_help_entries_tenant_id_idx
  on public.house_help_entries (tenant_id);

create index if not exists house_help_assignments_tenant_id_idx
  on public.house_help_assignments (tenant_id);

create index if not exists house_help_reviews_tenant_id_idx
  on public.house_help_reviews (tenant_id);

alter table public.house_help_assignments
  drop constraint if exists house_help_assignments_help_apartment_unq;

alter table public.house_help_assignments
  add constraint house_help_assignments_tenant_help_apartment_unq
  unique (tenant_id, house_help_id, apartment_id);

alter table public.house_help_reviews
  drop constraint if exists house_help_reviews_help_reviewer_unq;

alter table public.house_help_reviews
  add constraint house_help_reviews_tenant_help_reviewer_unq
  unique (tenant_id, house_help_id, reviewer_id);

commit;
