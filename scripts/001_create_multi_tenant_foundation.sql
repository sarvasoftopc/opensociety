-- 001_create_multi_tenant_foundation.sql
-- Run first. Creates the shared tenant registry used by all tenant-scoped tables.

begin;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_slug_idx on public.tenants (slug);

commit;
