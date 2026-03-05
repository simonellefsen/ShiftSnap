# ShiftSnap MVP

Phase 1 scaffold for ShiftSnap (Corti + Supabase + Vercel).

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Ensure server environment variables are set:
   - `CORTI_CLIENT_ID`
   - `CORTI_CLIENT_SECRET`
   - `CORTI_TENANT_NAME`
   - `CORTI_ENVIRONMENT_ID` (`us` or `eu`)
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLIENT_ID` (for Google One-Tap on login page)
   - `SUPABASE_APP_SCHEMA` (recommended: `shiftsnap`)
   - `SUPABASE_DB_URL` (Postgres connection string for migrations)
   - `NEXT_PUBLIC_SUPABASE_URL` (optional fallback)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional fallback)

## Auth (Google SSO + One-Tap)
1. In Supabase Auth settings:
   - Set **Site URL** to your production URL (e.g. `https://shift-snap.vercel.app`).
   - Add redirect URLs:
     - `https://shift-snap.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
2. In Supabase Auth > Providers:
   - Enable Google provider and configure Google OAuth credentials.
3. In Google Cloud OAuth client settings:
   - Add Authorized JavaScript origins:
     - `https://shift-snap.vercel.app`
     - `http://localhost:3000`
4. Ensure Vercel has:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLIENT_ID`
5. App flow:
   - Sign in at `/login`
   - Google One-Tap may auto-prompt on `/login`
   - Google OAuth returns to `/auth/callback`
   - Protected routes: `/encounters/*`, `/api/encounters/*`

## Database Migrations (Shared Supabase Safe Mode)
This repo uses app-scoped migrations so multiple projects can share one Supabase DB.

- Migration files live in `migrations/shiftsnap/*.sql`.
- Applied migrations are tracked in `shiftsnap_meta.migrations`.
- Run migrations with:
  ```bash
  make migrate
  ```

Important:
- Do not run `supabase db push` from multiple repos against the same remote DB.
- Keep applied migration files immutable; add a new numbered file for changes.
- Keep app objects inside the `shiftsnap` schema only.

## Available Routes
- `POST /api/encounters`
- `GET /api/encounters`
- `GET /api/encounters/:id`
- `POST /api/encounters/:id/stream-session`
- `POST /api/encounters/:id/events`
- `POST /api/encounters/:id/complete`
- `GET /api/auth/google`
- `GET /auth/callback`

## UI
- `/` landing
- `/encounters` list
- `/encounters/[id]` detail workspace shell
