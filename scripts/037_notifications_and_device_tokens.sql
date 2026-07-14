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
