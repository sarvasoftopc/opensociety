-- 998_bootstrap_supabase_schema.sql
-- Use this on a blank Supabase/Postgres database.
-- This creates the current multi-tenant OpenSociety schema from scratch.

begin;

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  clerk_id text,
  supabase_auth_id text,
  email text,
  phone text,
  name text not null,
  role text not null default 'RESIDENT',
  status text not null default 'PENDING',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.society_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tower text not null,
  apartment_no text not null,
  floor integer,
  bhk_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apartments_tenant_tower_apartment_no_unique unique (tenant_id, tower, apartment_no)
);

create table if not exists public.residencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  relation text not null default 'OWNER',
  is_primary boolean not null default false,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_pre_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  created_by uuid not null references public.users(id),
  visitor_name text not null,
  visitor_phone text,
  approval_type text not null default 'ONE_TIME',
  code text not null unique,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  pre_approval_id uuid references public.visitor_pre_approvals(id),
  visitor_name text not null,
  visitor_phone text,
  type text not null default 'GUEST',
  status text not null default 'PENDING',
  purpose text,
  vehicle_number text,
  photo_url text,
  approved_by uuid references public.users(id),
  denied_reason text,
  check_in_by text,
  check_out_by text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'NORMAL',
  category text not null default 'GENERAL',
  attachment_url text,
  attachment_name text,
  published_by uuid not null references public.users(id),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notice_reads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz not null default now()
);

create table if not exists public.guards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id),
  name text not null,
  phone text,
  employee_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guard_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  guard_id uuid not null references public.guards(id) on delete cascade,
  device_id text not null,
  model text,
  bound_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.guard_duty_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  guard_id uuid not null references public.guards(id) on delete cascade,
  clock_in_at timestamptz not null default now(),
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_out_at timestamptz,
  clock_out_lat double precision,
  clock_out_lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  raised_by uuid not null references public.users(id),
  title text not null,
  description text not null,
  category text not null default 'OTHER',
  priority text not null default 'NORMAL',
  status text not null default 'OPEN',
  assigned_to uuid references public.users(id),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  registered_by uuid references public.users(id),
  registration_number text not null,
  type text not null default 'CAR',
  make text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_tenant_registration_number_unq unique (tenant_id, registration_number)
);

create table if not exists public.parking_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slot_number text not null,
  type text not null default 'OPEN',
  apartment_id uuid references public.apartments(id),
  is_temporary boolean not null default false,
  assigned_until timestamptz,
  assigned_by uuid references public.users(id),
  assigned_at timestamptz,
  is_visitor boolean not null default false,
  occupied_by_entry_id uuid references public.visitor_entries(id),
  occupied_at timestamptz,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parking_slots_tenant_slot_number_unq unique (tenant_id, slot_number)
);

create table if not exists public.maintenance_bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  type text not null default 'MONTHLY',
  title text not null,
  period_month text,
  subtotal integer not null default 0,
  tax_amount integer not null default 0,
  total_amount integer not null default 0,
  status text not null default 'ISSUED',
  due_date timestamptz,
  issued_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bill_id uuid not null references public.maintenance_bills(id) on delete cascade,
  description text not null,
  amount integer not null,
  tax_rate_pct integer not null default 0,
  tax_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bill_id uuid not null references public.maintenance_bills(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  amount integer not null,
  method text not null,
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bill_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  due_day_of_month integer not null default 10,
  line_items jsonb not null default '[]'::jsonb,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.house_help (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  type text not null default 'OTHER',
  photo_url text,
  id_proof_type text,
  id_proof_number text,
  id_proof_url text,
  id_verified boolean not null default false,
  background_check text not null default 'PENDING',
  incident_count integer not null default 0,
  is_active boolean not null default true,
  registered_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.house_help_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  house_help_id uuid not null references public.house_help(id) on delete cascade,
  apartment_id uuid references public.apartments(id),
  check_in_at timestamptz not null default now(),
  check_in_by uuid references public.users(id),
  check_out_at timestamptz,
  check_out_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.house_help_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  house_help_id uuid not null references public.house_help(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  assigned_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint house_help_assignments_tenant_help_apartment_unq unique (tenant_id, house_help_id, apartment_id)
);

create table if not exists public.house_help_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  house_help_id uuid not null references public.house_help(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint house_help_reviews_tenant_help_reviewer_unq unique (tenant_id, house_help_id, reviewer_id)
);

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

create index if not exists users_tenant_status_idx on public.users (tenant_id, status);
create index if not exists apartments_tenant_id_idx on public.apartments (tenant_id);
create index if not exists residencies_tenant_user_id_idx on public.residencies (tenant_id, user_id);
create index if not exists residencies_tenant_apartment_id_idx on public.residencies (tenant_id, apartment_id);
create index if not exists tenants_slug_idx on public.tenants (slug);
create index if not exists maintenance_tickets_tenant_id_idx on public.maintenance_tickets (tenant_id);
create index if not exists maintenance_tickets_tenant_status_idx on public.maintenance_tickets (tenant_id, status);
create index if not exists vehicles_tenant_apartment_id_idx on public.vehicles (tenant_id, apartment_id);
create index if not exists parking_slots_tenant_apartment_id_idx on public.parking_slots (tenant_id, apartment_id);
create index if not exists parking_slots_tenant_is_visitor_idx on public.parking_slots (tenant_id, is_visitor);
create index if not exists bill_line_items_tenant_id_idx on public.bill_line_items (tenant_id);
create index if not exists payments_tenant_bill_id_idx on public.payments (tenant_id, bill_id);
create index if not exists payments_tenant_apartment_id_idx on public.payments (tenant_id, apartment_id);
create index if not exists house_help_tenant_id_idx on public.house_help (tenant_id);
create index if not exists house_help_entries_tenant_id_idx on public.house_help_entries (tenant_id);
create index if not exists house_help_assignments_tenant_id_idx on public.house_help_assignments (tenant_id);
create index if not exists house_help_reviews_tenant_id_idx on public.house_help_reviews (tenant_id);
create index if not exists guard_duty_sessions_tenant_id_idx on public.guard_duty_sessions (tenant_id);
create index if not exists guard_duty_sessions_tenant_guard_id_idx on public.guard_duty_sessions (tenant_id, guard_id);

alter table if exists public.visitor_entries
  add column if not exists partner_name varchar(120);

alter table if exists public.guard_duty_sessions
  add column if not exists checkpoint varchar(120),
  add column if not exists clock_in_photo_url text;

create table if not exists public.user_device_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform varchar(32) not null default 'UNKNOWN',
  provider varchar(32) not null default 'FCM',
  device_label varchar(255),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_device_tokens_tenant_token_unique unique (tenant_id, token)
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type varchar(64) not null default 'INFO',
  title varchar(255) not null,
  body text not null,
  data jsonb,
  source varchar(64),
  delivery_status varchar(32) not null default 'IN_APP_ONLY',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_device_tokens_tenant_user_idx
  on public.user_device_tokens (tenant_id, user_id);

create index if not exists app_notifications_tenant_user_created_idx
  on public.app_notifications (tenant_id, user_id, created_at);

commit;

-- Optional seed section for a first society:
-- insert into public.tenants (slug, name) values ('demo-society', 'Demo Society');
