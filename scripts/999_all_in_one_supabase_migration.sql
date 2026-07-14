-- 999_all_in_one_supabase_migration.sql
-- Generated from ordered scripts 001 through 035 for Supabase SQL Editor execution.
-- Replace placeholder tenant values in 006_backfill_default_tenant.sql before running.


-- ======================================================================
-- BEGIN 001_create_multi_tenant_foundation.sql
-- ======================================================================
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

-- ======================================================================
-- END 001_create_multi_tenant_foundation.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 002_tenantize_society_config.sql
-- ======================================================================
-- 002_tenantize_society_config.sql
-- Run after 001. Converts singleton society_config into a tenant-owned record.

begin;

alter table public.society_config
  add column if not exists tenant_id uuid references public.tenants(id);

create unique index if not exists society_config_tenant_id_unique
  on public.society_config (tenant_id);

commit;

-- ======================================================================
-- END 002_tenantize_society_config.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 003_tenantize_apartments.sql
-- ======================================================================
-- 003_tenantize_apartments.sql
-- Run after 001. Adds tenant ownership and tenant-scoped uniqueness to apartments.

begin;

alter table public.apartments
  add column if not exists tenant_id uuid references public.tenants(id);

drop index if exists public.apartments_tower_apartment_no_unique;

create unique index if not exists apartments_tenant_tower_apartment_no_unique
  on public.apartments (tenant_id, tower, apartment_no);

create index if not exists apartments_tenant_id_idx
  on public.apartments (tenant_id);

commit;

-- ======================================================================
-- END 003_tenantize_apartments.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 004_tenantize_users.sql
-- ======================================================================
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

-- ======================================================================
-- END 004_tenantize_users.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 005_tenantize_residencies.sql
-- ======================================================================
-- 005_tenantize_residencies.sql
-- Run after 003 and 004. Makes residencies tenant-scoped for ownership checks.

begin;

alter table public.residencies
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists residencies_tenant_user_id_idx
  on public.residencies (tenant_id, user_id);

create index if not exists residencies_tenant_apartment_id_idx
  on public.residencies (tenant_id, apartment_id);

commit;

-- ======================================================================
-- END 005_tenantize_residencies.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 006_backfill_default_tenant.sql
-- ======================================================================
-- 006_backfill_default_tenant.sql
-- Run after 001-005. Moves a current single-tenant deployment into the shared model.
-- Update the slug/name values below before production execution.

begin;

with inserted as (
  insert into public.tenants (slug, name)
  values ('default-society', 'Default Society')
  on conflict (slug) do update
    set name = excluded.name,
        updated_at = now()
  returning id
)
update public.society_config
set tenant_id = (select id from inserted)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.apartments
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.users
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.residencies
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;

-- ======================================================================
-- END 006_backfill_default_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 007_enforce_not_null_and_fk_guards.sql
-- ======================================================================
-- 007_enforce_not_null_and_fk_guards.sql
-- Run last, only after backfill is verified clean in each environment.

begin;

alter table public.society_config
  alter column tenant_id set not null;

alter table public.apartments
  alter column tenant_id set not null;

alter table public.users
  alter column tenant_id set not null;

alter table public.residencies
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 007_enforce_not_null_and_fk_guards.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 008_tenantize_visitor_pre_approvals.sql
-- ======================================================================
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

-- ======================================================================
-- END 008_tenantize_visitor_pre_approvals.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 009_tenantize_visitor_entries.sql
-- ======================================================================
-- 009_tenantize_visitor_entries.sql
-- Run after 001 and before visitor entry backfill.

begin;

alter table public.visitor_entries
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists visitor_entries_tenant_id_idx
  on public.visitor_entries (tenant_id);

create index if not exists visitor_entries_tenant_apartment_status_idx
  on public.visitor_entries (tenant_id, apartment_id, status);

commit;

-- ======================================================================
-- END 009_tenantize_visitor_entries.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 010_backfill_visitor_tenant.sql
-- ======================================================================
-- 010_backfill_visitor_tenant.sql
-- Run after 008 and 009. Backfills visitor tables to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.visitor_pre_approvals
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.visitor_entries
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;

-- ======================================================================
-- END 010_backfill_visitor_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 011_enforce_visitor_tenant_not_null.sql
-- ======================================================================
-- 011_enforce_visitor_tenant_not_null.sql
-- Run last for visitor tables, after verifying tenant backfill is complete.

begin;

alter table public.visitor_pre_approvals
  alter column tenant_id set not null;

alter table public.visitor_entries
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 011_enforce_visitor_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 012_tenantize_notices.sql
-- ======================================================================
-- 012_tenantize_notices.sql
-- Run after 001 and before notices backfill.

begin;

alter table public.notices
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists notices_tenant_id_idx
  on public.notices (tenant_id);

create index if not exists notices_tenant_published_at_idx
  on public.notices (tenant_id, published_at);

commit;

-- ======================================================================
-- END 012_tenantize_notices.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 013_tenantize_notice_reads.sql
-- ======================================================================
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

-- ======================================================================
-- END 013_tenantize_notice_reads.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 014_tenantize_guards.sql
-- ======================================================================
-- 014_tenantize_guards.sql
-- Run after 001 and before guard backfill.

begin;

alter table public.guards
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists guards_tenant_id_idx
  on public.guards (tenant_id);

commit;

-- ======================================================================
-- END 014_tenantize_guards.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 015_tenantize_guard_devices.sql
-- ======================================================================
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

-- ======================================================================
-- END 015_tenantize_guard_devices.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 016_backfill_notice_and_guard_tenant.sql
-- ======================================================================
-- 016_backfill_notice_and_guard_tenant.sql
-- Run after 012-015. Backfills notice and guard tables to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.notices
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.notice_reads
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.guards
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.guard_devices
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;

-- ======================================================================
-- END 016_backfill_notice_and_guard_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 017_enforce_notice_and_guard_tenant_not_null.sql
-- ======================================================================
-- 017_enforce_notice_and_guard_tenant_not_null.sql
-- Run last for notice/guard tables after backfill verification.

begin;

alter table public.notices
  alter column tenant_id set not null;

alter table public.notice_reads
  alter column tenant_id set not null;

alter table public.guards
  alter column tenant_id set not null;

alter table public.guard_devices
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 017_enforce_notice_and_guard_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 018_tenantize_maintenance_tickets.sql
-- ======================================================================
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

-- ======================================================================
-- END 018_tenantize_maintenance_tickets.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 019_backfill_maintenance_tickets_tenant.sql
-- ======================================================================
-- 019_backfill_maintenance_tickets_tenant.sql
-- Run after 018. Backfills tickets to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.maintenance_tickets
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;

-- ======================================================================
-- END 019_backfill_maintenance_tickets_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 020_enforce_maintenance_tickets_tenant_not_null.sql
-- ======================================================================
-- 020_enforce_maintenance_tickets_tenant_not_null.sql
-- Run last for tickets after backfill verification.

begin;

alter table public.maintenance_tickets
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 020_enforce_maintenance_tickets_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 021_tenantize_vehicles.sql
-- ======================================================================
-- 021_tenantize_vehicles.sql
-- Run after 001 and before vehicle backfill.

begin;

alter table public.vehicles
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists vehicles_tenant_id_idx
  on public.vehicles (tenant_id);

create index if not exists vehicles_tenant_apartment_id_idx
  on public.vehicles (tenant_id, apartment_id);

alter table public.vehicles
  drop constraint if exists vehicles_registration_number_unq;

alter table public.vehicles
  add constraint vehicles_tenant_registration_number_unq
  unique (tenant_id, registration_number);

commit;

-- ======================================================================
-- END 021_tenantize_vehicles.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 022_tenantize_parking_slots.sql
-- ======================================================================
-- 022_tenantize_parking_slots.sql
-- Run after 001 and before parking backfill.

begin;

alter table public.parking_slots
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists parking_slots_tenant_id_idx
  on public.parking_slots (tenant_id);

create index if not exists parking_slots_tenant_apartment_id_idx
  on public.parking_slots (tenant_id, apartment_id);

create index if not exists parking_slots_tenant_is_visitor_idx
  on public.parking_slots (tenant_id, is_visitor);

alter table public.parking_slots
  drop constraint if exists parking_slots_slot_number_unq;

alter table public.parking_slots
  add constraint parking_slots_tenant_slot_number_unq
  unique (tenant_id, slot_number);

commit;

-- ======================================================================
-- END 022_tenantize_parking_slots.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 023_backfill_vehicle_and_parking_tenant.sql
-- ======================================================================
-- 023_backfill_vehicle_and_parking_tenant.sql
-- Run after 021 and 022. Backfills records to the chosen default tenant.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.vehicles
set tenant_id = (select id from tenant_row)
where tenant_id is null;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.parking_slots
set tenant_id = (select id from tenant_row)
where tenant_id is null;

commit;

-- ======================================================================
-- END 023_backfill_vehicle_and_parking_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 024_enforce_vehicle_and_parking_tenant_not_null.sql
-- ======================================================================
-- 024_enforce_vehicle_and_parking_tenant_not_null.sql
-- Run last for vehicles and parking after backfill verification.

begin;

alter table public.vehicles
  alter column tenant_id set not null;

alter table public.parking_slots
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 024_enforce_vehicle_and_parking_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 025_tenantize_bill_config.sql
-- ======================================================================
-- 025_tenantize_bill_config.sql
-- Run after 001 and before finance backfill.

begin;

alter table public.bill_config
  add column if not exists tenant_id uuid references public.tenants(id);

create unique index if not exists bill_config_tenant_id_unq
  on public.bill_config (tenant_id);

commit;

-- ======================================================================
-- END 025_tenantize_bill_config.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 026_tenantize_finance_tables.sql
-- ======================================================================
-- 026_tenantize_finance_tables.sql
-- Run after 001 and before finance backfill.

begin;

alter table public.maintenance_bills
  add column if not exists tenant_id uuid references public.tenants(id);

alter table public.bill_line_items
  add column if not exists tenant_id uuid references public.tenants(id);

alter table public.payments
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists maintenance_bills_tenant_id_idx
  on public.maintenance_bills (tenant_id);

create index if not exists maintenance_bills_tenant_apartment_id_idx
  on public.maintenance_bills (tenant_id, apartment_id);

create index if not exists bill_line_items_tenant_id_idx
  on public.bill_line_items (tenant_id);

create index if not exists payments_tenant_id_idx
  on public.payments (tenant_id);

create index if not exists payments_tenant_bill_id_idx
  on public.payments (tenant_id, bill_id);

create index if not exists payments_tenant_apartment_id_idx
  on public.payments (tenant_id, apartment_id);

commit;

-- ======================================================================
-- END 026_tenantize_finance_tables.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 027_backfill_finance_tenant.sql
-- ======================================================================
-- 027_backfill_finance_tenant.sql
-- Run after 025 and 026.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.bill_config
set tenant_id = (select id from tenant_row)
where tenant_id is null;

update public.maintenance_bills mb
set tenant_id = a.tenant_id
from public.apartments a
where mb.apartment_id = a.id
  and mb.tenant_id is null;

update public.bill_line_items bli
set tenant_id = mb.tenant_id
from public.maintenance_bills mb
where bli.bill_id = mb.id
  and bli.tenant_id is null;

update public.payments p
set tenant_id = mb.tenant_id
from public.maintenance_bills mb
where p.bill_id = mb.id
  and p.tenant_id is null;

commit;

-- ======================================================================
-- END 027_backfill_finance_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 028_enforce_finance_tenant_not_null.sql
-- ======================================================================
-- 028_enforce_finance_tenant_not_null.sql
-- Run last for finance after backfill verification.

begin;

alter table public.bill_config
  alter column tenant_id set not null;

alter table public.maintenance_bills
  alter column tenant_id set not null;

alter table public.bill_line_items
  alter column tenant_id set not null;

alter table public.payments
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 028_enforce_finance_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 029_tenantize_house_help.sql
-- ======================================================================
-- 029_tenantize_house_help.sql
-- Run after 001 and before house-help backfill.

begin;

alter table public.house_help
  add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists house_help_tenant_id_idx
  on public.house_help (tenant_id);

commit;

-- ======================================================================
-- END 029_tenantize_house_help.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 030_tenantize_house_help_children.sql
-- ======================================================================
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

-- ======================================================================
-- END 030_tenantize_house_help_children.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 031_backfill_house_help_tenant.sql
-- ======================================================================
-- 031_backfill_house_help_tenant.sql
-- Run after 029 and 030.

begin;

with tenant_row as (
  select id from public.tenants where slug = 'default-society' limit 1
)
update public.house_help
set tenant_id = (select id from tenant_row)
where tenant_id is null;

update public.house_help_entries hhe
set tenant_id = hh.tenant_id
from public.house_help hh
where hhe.house_help_id = hh.id
  and hhe.tenant_id is null;

update public.house_help_assignments hha
set tenant_id = hh.tenant_id
from public.house_help hh
where hha.house_help_id = hh.id
  and hha.tenant_id is null;

update public.house_help_reviews hhr
set tenant_id = hh.tenant_id
from public.house_help hh
where hhr.house_help_id = hh.id
  and hhr.tenant_id is null;

commit;

-- ======================================================================
-- END 031_backfill_house_help_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 032_enforce_house_help_tenant_not_null.sql
-- ======================================================================
-- 032_enforce_house_help_tenant_not_null.sql
-- Run last for house-help after backfill verification.

begin;

alter table public.house_help
  alter column tenant_id set not null;

alter table public.house_help_entries
  alter column tenant_id set not null;

alter table public.house_help_assignments
  alter column tenant_id set not null;

alter table public.house_help_reviews
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 032_enforce_house_help_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 033_tenantize_guard_duty_sessions.sql
-- ======================================================================
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

-- ======================================================================
-- END 033_tenantize_guard_duty_sessions.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 034_backfill_guard_duty_tenant.sql
-- ======================================================================
-- 034_backfill_guard_duty_tenant.sql
-- Run after 033.

begin;

update public.guard_duty_sessions gds
set tenant_id = g.tenant_id
from public.guards g
where gds.guard_id = g.id
  and gds.tenant_id is null;

commit;

-- ======================================================================
-- END 034_backfill_guard_duty_tenant.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 035_enforce_guard_duty_tenant_not_null.sql
-- ======================================================================
-- 035_enforce_guard_duty_tenant_not_null.sql
-- Run last for guard-duty after backfill verification.

begin;

alter table public.guard_duty_sessions
  alter column tenant_id set not null;

commit;

-- ======================================================================
-- END 035_enforce_guard_duty_tenant_not_null.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 036_mobile_guard_and_visitor_fields.sql
-- ======================================================================
-- 036_mobile_guard_and_visitor_fields.sql
-- Add the extra fields used by the mobile resident and guard workflows.

begin;

alter table if exists public.visitor_entries
  add column if not exists partner_name varchar(120);

alter table if exists public.guard_duty_sessions
  add column if not exists checkpoint varchar(120),
  add column if not exists clock_in_photo_url text;

commit;

-- ======================================================================
-- END 036_mobile_guard_and_visitor_fields.sql
-- ======================================================================


-- ======================================================================
-- BEGIN 037_notifications_and_device_tokens.sql
-- ======================================================================
-- 037_notifications_and_device_tokens.sql
-- Add in-app notification storage and FCM/web-push device token storage.

begin;

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

-- ======================================================================
-- END 037_notifications_and_device_tokens.sql
-- ======================================================================
