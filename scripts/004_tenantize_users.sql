-- 004_tenantize_users.sql
-- Run after 001. Adds tenant ownership plus Supabase identity support.

begin;

alter table public.users
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists supabase_auth_id text;

drop index if exists public.users_clerk_id_unique;
drop index if exists public.users_email_unique;
drop index if exists public.users_phone_unique;

create unique index if not exists users_tenant_clerk_id_unique
  on public.users (tenant_id, clerk_id)
  where clerk_id is not null;

create unique index if not exists users_tenant_supabase_auth_id_unique
  on public.users (tenant_id, supabase_auth_id)
  where supabase_auth_id is not null;

create unique index if not exists users_tenant_email_unique
  on public.users (tenant_id, email)
  where email is not null;

create unique index if not exists users_tenant_phone_unique
  on public.users (tenant_id, phone)
  where phone is not null;

create index if not exists users_tenant_status_idx
  on public.users (tenant_id, status);

commit;
