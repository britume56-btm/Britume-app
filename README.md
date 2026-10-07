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
🟡 **TV, TECHNOLOGIES, STUDIOS, WEAR, and FOUNDATION have authenticated, searchable community posts**
🟡 **TV supports direct video playback and on-device downloads for direct MP4 links**
🟡 **SETTINGS links account/security, reports and clears offline video storage, and shows the app version**
🟡 **Other unbuilt modules remain clearly marked as not built yet**
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
7. Run `supabase/schema.sql` in the Supabase SQL Editor.
8. Run the timestamped SQL migrations in `supabase/migrations` in order. For
   Phase 1 SOCIAL + CHAT, apply
   `supabase/migrations/20261007060000_social_chat_phase1.sql` after the
   profile foundation is present.
9. Apply `supabase/migrations/20261007100000_content_sections.sql` after the
   SOCIAL + CHAT migration for the TV, TECHNOLOGIES, STUDIOS, WEAR, and
   FOUNDATION feeds.

For an **existing** database that still has `profiles.avatar_url`, run
`supabase/migrations/20261005000000_profile_avatar_paths.sql` before deploying
the updated app. It adds `avatar_path`, recovers paths from recognized Supabase
signed avatar URLs, and clears the migrated expiring URLs.

The SOCIAL + CHAT migration is only a repository file until an administrator
applies it to a Supabase project. This work did not connect to or change a live
Supabase database. The migration creates public-safe profile data, follows,
posts, likes, comments, direct conversations, messages, read markers, and
per-user message hides, with RLS enabled. Public profile data deliberately
excludes phone numbers and private avatar paths. No media bucket or push
notification setup is included in this phase.
The content-section migration is also a repository file until an administrator
applies it. Privacy controls, push notification delivery, appearance selection,
and language selection remain outside this launch upgrade.

Only the public Supabase URL and publishable/anon key belong in the app. Values
prefixed with `EXPO_PUBLIC_` are bundled into the client and are **not secrets**;
never put a Supabase `service_role` key in the app, `.env.example`, or source
control.

### 3. Start the App

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
6. **Explore section tiles** — open the TV, TECHNOLOGIES, STUDIOS, WEAR, and
   FOUNDATION content areas
7. **Open SOCIAL** — create/edit/delete a post, search profiles, follow someone,
   like a post, add a comment, and view follower/following lists
8. **Open CHAT** — search for a profile, start a one-to-one conversation, send
   messages from both accounts, check unread state, and remove a sent message
   from one account's history
9. Apply `supabase/migrations/20261007100000_content_sections.sql` after the
   SOCIAL + CHAT migration, then test posting and searching in TV,
   TECHNOLOGIES, STUDIOS, WEAR, and FOUNDATION. TV offline downloads support
   direct MP4 links; HLS links stream but are not downloaded for offline use.
10. **Sign out** from SETTINGS

## SOCIAL + CHAT database tests

`supabase/tests/social_chat_rls.test.sql` is a rollback-only SQL assertion suite
for a **disposable, non-production Supabase-compatible database**. Apply the
foundation schema and Phase 1 migration there first, then run:

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/social_chat_rls.test.sql
```

The test fixtures verify public-profile field boundaries, profile row privacy,
follow/post ownership, idempotent direct conversations, member-only message
access, per-user message hiding, and read/unread behavior. Do not point
`TEST_DATABASE_URL` at production.

## Lightweight checks

```bash
npm test
npm run typecheck
npx expo install --check
```

## Android builds

`eas.json` includes an internal APK profile for device testing and an Android
App Bundle profile for a later Play Console upload. Configure/link the app with
EAS and its Android signing credentials before running `eas build`; these build
profiles do not publish the app. Increase `android.versionCode` in `app.json`
for each Play Console release.

## Project Structure

```
src/
  screens/
    Auth/
      AuthGate.tsx       # Welcome, Sign up, Sign in screens
    Main/
      HomeScreen.tsx     # Navigable BRITUME section tiles
      ModuleScreen.tsx   # Searchable posts for launch content sections
      ProfileScreen.tsx  # Profile + avatar upload
       SettingsScreen.tsx # Account/security, offline storage, app info, sign out
      Social/
        SocialScreen.tsx       # Feed, discovery, post actions
        PublicProfileScreen.tsx
        FollowListScreen.tsx
      Chat/
        ChatScreen.tsx
        ConversationScreen.tsx
    components/social/
      PostCard.tsx
      CommentsModal.tsx
    Security/
      AppLockScreen.tsx  # PIN management, PIN unlock, biometric unlock
  security/
    AppLockContext.tsx   # SecureStore status + app lifecycle locking
  services/
    authService.ts       # Auth helpers
    profileService.ts    # Profile CRUD
    moduleContentService.ts # TV, TECHNOLOGIES, STUDIOS, WEAR, FOUNDATION posts
    contentRules.mjs      # Tested post validation, search, video, and storage rules
    socialService.ts     # Public profiles, follows, feed, posts, comments
    chatService.ts       # Direct conversations, messages, read state
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

## Remaining work

1. Apply and verify the existing Supabase migrations in a non-production project,
   then smoke-test authentication, feeds, and RLS with separate accounts.
2. Link the app to EAS, create the internal Android APK, and test auth/deep links,
   the app lock, video playback/downloads, and storage cleanup on a device.
3. Finish account recovery/password changes and implement privacy/data controls,
   push-notification delivery, appearance, and language settings.
4. Continue the remaining unbuilt sections (including LABS, THEMES, and GALLERY).
   PREMIUM and GAMES were intentionally excluded from this upgrade.

## Notes

- **Biometric API** uses official OS APIs — no biometric data stored by the app
- **Secure storage** uses `expo-secure-store` for PIN storage
- **App lock** is enforced after an authenticated app launch and after returning from the background
- **Avatar records** store `avatar_path`; signed URLs are generated for display and are never saved to profiles
- **Private profile RLS** keeps private profile rows owner-only; the separate
  public profile projection contains no phone or private avatar object path
- **No fake auth** — real Supabase email verification
- **One unified app** — BRITUME is not separate mini-apps

## Support

For issues, check:
- Local `.env` is ignored; hosted builds have both required `EXPO_PUBLIC_` variables configured
- Supabase project is set up with profiles table and avatars bucket
- Deep-link redirect URL is added: `britume://auth/callback`
- Email verification is enabled in Supabase Auth settings

Run `npm run typecheck` and `npx expo install --check` before shipping changes.
