# BRITUME — real authentication foundation

This is the first real BRITUME mobile app foundation:
- Expo / React Native / TypeScript
- Supabase Auth
- Email + password accounts
- Phone number stored in user metadata/profile foundation
- Real email confirmation link
- Persistent sessions
- Sign in / sign out
- BRITUME branded authenticated home
- Deep-link callback scheme: `britume://auth/callback`

## Setup

1. Create a Supabase project.
2. In Supabase, enable Email authentication and keep email confirmation enabled.
3. Copy the Project URL and Publishable Key.
4. Copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. In Supabase Authentication URL Configuration, add:
   `britume://auth/callback`
6. Run `supabase/schema.sql` in the Supabase SQL Editor.
7. Install dependencies with:
   `npm install`
8. Start Expo:
   `npx expo start`

The current signup flow uses a real Supabase confirmation email. SMS phone verification is intentionally not faked; it will be added when an SMS provider is configured.
