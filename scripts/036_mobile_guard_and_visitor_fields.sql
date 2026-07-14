begin;

alter table if exists public.visitor_entries
  add column if not exists partner_name varchar(120);

alter table if exists public.guard_duty_sessions
  add column if not exists checkpoint varchar(120),
  add column if not exists clock_in_photo_url text;

commit;
