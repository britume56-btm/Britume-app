# BRITUME — Mobile App Foundation

BRITUME is an Expo + React Native + TypeScript app backed by Supabase. This repository preserves the existing authentication and profile foundation; modules are connected incrementally rather than shipped as placeholders pretending to be complete.

## What's Included

✅ **Real Supabase email + password authentication**
✅ **Session persistence with AsyncStorage**
✅ **Email verification with deep-link callback**
✅ **User profile system (username, display name, avatar)**
✅ **Private avatar upload stores an object path; the app creates short-lived signed URLs for display**
✅ **App shell with bottom tab navigation**
✅ **BRITUME section tiles navigate to their section screens**
✅ **SecureStore PIN setup, change, verification, and app-resume locking**
✅ **Device biometrics through Expo Local Authentication**
🟡 **Account and Security settings work; other settings and BRITUME modules are clearly marked as not built yet**
✅ **TypeScript strict mode**

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. For local development, copy `.env.example` to an ignored local `.env`; for hosted builds, configure the matching environment variables in the project secrets/build environment.
3. Set:
   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your public publishable/anon key
4. Enable Email authentication in Supabase
5. Add deep-link redirect URL: `britume://auth/callback`
6. Create a storage bucket named `avatars` with **Public access off**
7. Run `supabase/schema.sql` in the Supabase SQL Editor

For an **existing** database that still has `profiles.avatar_url`, run
`supabase/migrations/20261005000000_profile_avatar_paths.sql` before deploying
the updated app. It adds `avatar_path`, recovers paths from recognized Supabase
signed avatar URLs, and clears the migrated expiring URLs.

Only the public Supabase URL and publishable/anon key belong in the app. Values
prefixed with `EXPO_PUBLIC_` are bundled into the client and are **not secrets**;
never put a Supabase `service_role` key in the app, `.env.example`, or source
control.

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
5. **Set a PIN** from SETTINGS → Security, then background and reopen the app to verify the lock
6. **Explore section tiles** — unfinished modules open an explicit foundation screen
7. **Sign out** from SETTINGS

## Project Structure

```
src/
  screens/
    Auth/
      AuthGate.tsx       # Welcome, Sign up, Sign in screens
    Main/
      HomeScreen.tsx     # Navigable BRITUME section tiles
      ModuleScreen.tsx   # Honest placeholder for modules not built yet
      ProfileScreen.tsx  # Profile + avatar upload
      SettingsScreen.tsx # Profile/security routes and sign out
    Security/
      AppLockScreen.tsx  # PIN management, PIN unlock, biometric unlock
  security/
    AppLockContext.tsx   # SecureStore status + app lifecycle locking
  services/
    authService.ts       # Auth helpers
    profileService.ts    # Profile CRUD
    storageService.ts    # Private avatar upload (returns object path)
    avatarService.ts     # Fresh signed URLs for private avatars
    securityService.ts   # Biometric APIs + secure PIN storage
  navigation/
    AppNavigator.tsx     # Tab + section/security stack navigation
  constants/
    sections.ts          # BRITUME sections
  types/
    profile.ts           # TypeScript profile type
```

## Recommended build order

1. Finish account recovery and email/password change flows.
2. Build one well-defined module end to end (recommended: SOCIAL) with its own
   data model, RLS policies, screens, and tests.
3. Build CHAT on top of the account/profile foundation, then notifications.
4. Add privacy controls and data export/delete flows before broader social launch.
5. Add appearance, language, storage reporting, and About settings.
6. Continue with GAMES, TECHNOLOGIES, TV, STUDIOS, WEAR, LABS, THEMES, and
   GALLERY one module at a time; introduce payments only when a module needs them.

## Notes

- **Biometric API** uses official OS APIs — no biometric data stored by the app
- **Secure storage** uses `expo-secure-store` for PIN storage
- **App lock** is enforced after an authenticated app launch and after returning from the background
- **Avatar records** store `avatar_path`; signed URLs are generated for display and are never saved to profiles
- **Row Level Security** prevents users from seeing/editing other profiles
- **No fake auth** — real Supabase email verification
- **One unified app** — BRITUME is not separate mini-apps

## Support

For issues, check:
- Local `.env` is ignored; hosted builds have both required `EXPO_PUBLIC_` variables configured
- Supabase project is set up with profiles table and avatars bucket
- Deep-link redirect URL is added: `britume://auth/callback`
- Email verification is enabled in Supabase Auth settings

Run `npm run typecheck` and `npx expo install --check` before shipping changes.
