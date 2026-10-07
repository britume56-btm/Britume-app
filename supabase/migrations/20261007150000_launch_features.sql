-- Account preferences, in-app notifications, and read-only premium entitlements.
-- Apply after the existing profile/social/content migrations.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_id text not null default 'midnight'
    check (theme_id in ('midnight', 'ocean', 'dusk', 'nebula', 'custom')),
  custom_theme_name text,
  background_path text,
  notifications_enabled boolean not null default true,
  social_notifications boolean not null default true,
  product_updates boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_preferences_custom_theme_name_length
    check (custom_theme_name is null or char_length(custom_theme_name) <= 40)
);

alter table public.user_preferences enable row level security;
drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
  on public.user_preferences for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users can create their own preferences" on public.user_preferences;
create policy "Users can create their own preferences"
  on public.user_preferences for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke all on public.user_preferences from anon;
grant select, insert, update on public.user_preferences to authenticated;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 1000),
  category text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_user_created_at_idx
  on public.app_notifications (user_id, created_at desc);
alter table public.app_notifications enable row level security;
drop policy if exists "Users can read their own notifications" on public.app_notifications;
create policy "Users can read their own notifications"
  on public.app_notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users can mark their own notifications read" on public.app_notifications;
create policy "Users can mark their own notifications read"
  on public.app_notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke all on public.app_notifications from anon, authenticated;
grant select on public.app_notifications to authenticated;
grant update (read_at) on public.app_notifications to authenticated;

-- Only trusted billing/webhook code should write entitlement rows.
create table if not exists public.premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'grace_period', 'past_due', 'canceled')),
  provider text,
  product_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.premium_entitlements enable row level security;
drop policy if exists "Users can read their own premium entitlement" on public.premium_entitlements;
create policy "Users can read their own premium entitlement"
  on public.premium_entitlements for select to authenticated
  using (user_id = auth.uid());
revoke all on public.premium_entitlements from anon, authenticated;
grant select on public.premium_entitlements to authenticated;

-- Private custom-theme images live under a folder named for the owning user id.
insert into storage.buckets (id, name, public)
values ('theme-backgrounds', 'theme-backgrounds', false)
on conflict (id) do update set public = false;

drop policy if exists "Theme backgrounds are private to owner" on storage.objects;
create policy "Theme backgrounds are private to owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'theme-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
drop policy if exists "Users can upload their own theme backgrounds" on storage.objects;
create policy "Users can upload their own theme backgrounds"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'theme-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
drop policy if exists "Users can update their own theme backgrounds" on storage.objects;
create policy "Users can update their own theme backgrounds"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'theme-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'theme-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
drop policy if exists "Users can delete their own theme backgrounds" on storage.objects;
create policy "Users can delete their own theme backgrounds"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'theme-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
