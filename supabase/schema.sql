create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handle_profiles_updated_at on public.profiles;

create trigger handle_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner"
on public.profiles
for delete
using (auth.uid() = id);

drop policy if exists "Avatar uploads are private to owner" on storage.objects;
create policy "Avatar uploads are private to owner"
on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Avatar files are viewable by owner" on storage.objects;
create policy "Avatar files are viewable by owner"
on storage.objects
for select
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Avatar files are updateable by owner" on storage.objects;
create policy "Avatar files are updateable by owner"
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
