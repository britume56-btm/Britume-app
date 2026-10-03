# BRITUME — Real Foundation & Test App

This is the BRITUME mobile app foundation with real Supabase authentication, profile system, and app shell.

## What's Included

✅ **Real Supabase email + password authentication**
✅ **Session persistence with AsyncStorage**
✅ **Email verification with deep-link callback**
✅ **User profile system (username, display name, avatar)**
✅ **Avatar upload to Supabase Storage**
✅ **App shell with bottom tab navigation**
✅ **BRITUME ecosystem sections (LIVING, SOCIAL, CHAT, etc.)**
✅ **Settings screen**
✅ **Security & biometric foundation**
✅ **TypeScript strict mode**

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. Copy `.env.example` to `.env`
3. Fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your public anon key
4. Enable Email authentication in Supabase
5. Add deep-link redirect URL: `britume://auth/callback`
6. Run the SQL from `supabase/schema.sql` in the Supabase SQL Editor
7. Create a storage bucket named `avatars` (private access)

### 3. Create the avatars bucket

In Supabase dashboard:
- Storage → Create bucket
- Name: `avatars`
- Public access: OFF

### 4. Create the profiles table RLS policies

Run this SQL in the Supabase SQL Editor:

```sql
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

create trigger handle_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Profiles are updateable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Profiles are deletable by owner"
on public.profiles
for delete
using (auth.uid() = id);
```

### 5. Start the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web

## Testing the App

1. **Sign up** with your email and a phone number
2. **Check your email** for verification link
3. **Click the link** — it will deep-link to the app and sign you in
4. **Go to PROFILE** — upload an avatar, set your display name
5. **Explore LIVING, SETTINGS** — see the app shell
6. **Sign out** from SETTINGS

## Project Structure

```
src/
  screens/
    Auth/
      AuthGate.tsx       # Welcome, Sign up, Sign in screens
    Main/
      HomeScreen.tsx     # BRITUME ecosystem view
      ProfileScreen.tsx  # Profile + avatar upload
      SettingsScreen.tsx # Settings & sign out
    Security/
      AppLockScreen.tsx  # App lock + biometric foundation
  services/
    authService.ts       # Auth helpers
    profileService.ts    # Profile CRUD
    storageService.ts    # Avatar upload
    avatarService.ts     # Signed URLs (private avatars)
    securityService.ts   # Biometric + PIN storage
  navigation/
    AppNavigator.tsx     # Bottom tab navigation
  constants/
    sections.ts          # BRITUME sections
  types/
    profile.ts           # TypeScript profile type
```

## Next Steps

- Add account settings (email change, password change)
- Add privacy controls
- Add notification preferences
- Add theme switching
- Build individual BRITUME modules (SOCIAL, CHAT, GAMES, etc.)
- Add secure PIN + biometric app lock
- Add payment / subscriptions

## Notes

- **Biometric API** uses official OS APIs — no biometric data stored by the app
- **Secure storage** uses `expo-secure-store` for PIN storage
- **Row Level Security** prevents users from seeing/editing other profiles
- **No fake auth** — real Supabase email verification
- **One unified app** — BRITUME is not separate mini-apps

## Support

For issues, check:
- `.env` file is created and filled
- Supabase project is set up with profiles table and avatars bucket
- Deep-link redirect URL is added: `britume://auth/callback`
- Email verification is enabled in Supabase Auth settings

Run `npx expo doctor` to check your Expo setup.
