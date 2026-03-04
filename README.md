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
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_APP_SCHEMA` (recommended: `shiftsnap`)
   - `SUPABASE_DB_URL` (Postgres connection string for migrations)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Optional local demo helper:
   - `DEMO_OWNER_USER_ID` (UUID to fetch encounters in UI)
   - `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)

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
- `GET /api/encounters?ownerUserId=<uuid>`
- `GET /api/encounters/:id`

## UI
- `/` landing
- `/encounters` list
- `/encounters/[id]` detail workspace shell
