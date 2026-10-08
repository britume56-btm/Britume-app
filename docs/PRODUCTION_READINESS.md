# BRITUME release and production setup

This checklist describes what is configured in the repository and what still
requires an owner-controlled service account. It does not deploy anything,
apply SQL to a live Supabase project, create store products, or publish an APK.

## Android internal APK

- Expo SDK and package dependencies are declared in `package.json` and locked
  in `package-lock.json`.
- Android application ID: `com.britume.app`. Treat it as permanent after the
  first Play Console release.
- App version: `0.1.0`. Android `versionCode` is `1`, suitable for the first
  internal build; increment it before each later Play Console upload.
- `eas.json` has an `internal` profile and retains the existing `preview`
  profile. Both create an internally distributed APK.
- Link the EAS project and Android signing credentials, set the two public
  Supabase build variables, then run:

  ```bash
  eas build --profile internal --platform android
  ```

- The repo has no approved launcher icon or splash image, so the Expo icon and
  splash fields are intentionally not pointed at substitute artwork. Add the
  supplied BRITUME source assets before calling the APK release-ready.
- Current `main` does not contain an EAS project ID or real Supabase build
  variables. Do not commit those values or a service-role key.

## Supabase schema and migrations

The migration files are repository SQL only; this work does not connect to or
modify a live Supabase project. Apply `supabase/schema.sql` first on a fresh
project, then apply the timestamped migrations in ascending order:

1. `20261005000000_profile_avatar_paths.sql`
2. `20261007060000_social_chat_phase1.sql`
3. `20261007100000_content_sections.sql`
4. `20261007150000_launch_features.sql`
5. `20261007200000_feature_completion.sql`

The migrations received a repository/static review, but no live-database
`db push` or SQL test has been run. Run
`supabase/tests/social_chat_rls.test.sql` only on a disposable
Supabase-compatible database after its documented prerequisites; never point
it at production.

### Account deletion function

`supabase/functions/delete-account/index.ts` validates the caller's Supabase
access token, requires a recent password reauthentication, removes that
account's private avatar and theme-background objects, then deletes the Auth
user so foreign-key cascades can remove account rows. It also removes copied
actor notifications from other users' feeds. Apply the documented schema and
migrations first, then review the function against the target project's actual
storage buckets before deployment:

```bash
supabase functions deploy delete-account
```

The Supabase function runtime must provide `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. These are server-side
function secrets; the service-role key must never be put in the app, EAS
`EXPO_PUBLIC_` variables, or Git. The app requires this function for account
deletion and reports an error if it is not deployed.

## Authentication and privacy

- Password reset emails deep-link to `britume://auth/callback?type=recovery`;
  add that redirect URL to the target Supabase Auth allowlist.
- Password changes and account deletion reauthenticate with the current
  password. Account deletion additionally requires typing the current account
  email.
- Gallery selection uses the system picker rather than requesting broad
  library access. Selected media stays local unless the user explicitly saves
  a photo as a private theme background or uploads it as an avatar.
- The only app-supplied Android runtime permission is biometric unlock.
  Legacy storage, recording-audio, and broad media permissions are blocked.

## Billing, rewarded ads, and push delivery

- Premium entitlement reads are wired to `premium_entitlements`, whose writes
  are not granted to app clients. `billingService.ts` exposes a fail-closed
  provider adapter; no store SDK, product ID, purchase flow, or receipt
  verifier is configured. Do not enable purchase controls until real Google
  Play products and trusted server-side purchase-token verification exist.
- Rewarded ads are disabled unless a real SDK and server-side completion
  verification are installed. A client tap cannot grant a reward.
- The app has working in-app notification records and preferences, but no
  device-token registration or push sender. Before push delivery, choose and
  configure the actual push provider, add an authenticated token lifecycle,
  and set the required EAS/FCM credentials. Do not request notification
  permission or claim delivery until that sender is operational.
- No ad provider, purchase, reward, or push delivery is simulated in this
  release setup.

## Environment variables

Only these client-visible values are currently used:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Anything prefixed `EXPO_PUBLIC_` is included in the client bundle and is not a
secret. Configure these per EAS environment for builds. Keep server-side keys
such as `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Function secrets only.
