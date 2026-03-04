# ShiftSnap MVP Spec (Corti + Vercel + Supabase)

## 1) Product Goal
Build a cross-platform (phone + desktop) clinical handoff copilot that captures encounter audio, produces transcript + facts in real time, and generates structured documentation for clinician review/sign-off.

Primary value:
- Phone: fast capture during or right after an encounter.
- Desktop: efficient review, correction, and final note generation.

## 2) MVP Scope
In scope:
- Secure sign-in.
- Start/stop live encounter capture (streaming).
- Real-time transcript and fact timeline view.
- Encounter list and detail page.
- Generate one note from a selected template.
- Manual edit + status workflow (`draft` -> `reviewed` -> `signed`).
- Basic suggested codes display (if enabled in tenant).

Out of scope (phase 2):
- EHR write-back.
- Multi-audio-device orchestration.
- Team-level permissions beyond basic roles.
- Advanced analytics dashboard.

## 3) Users and Core Flows
User roles (MVP):
- `clinician`
- `admin`

Core flows:
1. Clinician opens app on phone, taps "New Encounter", starts live capture.
2. App opens Corti WSS `/stream`, sends config, streams PCM chunks.
3. Transcript and facts render live; encounter metadata saved in Supabase.
4. Clinician ends session, then on desktop opens encounter detail.
5. Clinician picks template (SOAP, discharge, referral), generates document.
6. Clinician edits document, marks as `reviewed` or `signed`.

## 4) Platform and Architecture
Frontend:
- Next.js (App Router), TypeScript, responsive PWA UI.
- Deployed on Vercel.

Backend:
- Next.js Route Handlers as BFF (backend-for-frontend).
- Corti token management server-side only.
- Server issues short-lived session token for app user and proxies Corti calls.

Database/Auth:
- Supabase Auth for user accounts.
- Supabase Postgres for app state.
- Supabase Realtime for live encounter UI updates.

Storage:
- Supabase Storage optional for user-uploaded recordings (if not fully delegated to Corti recordings API).

## 5) Corti Integration Design
Auth:
- Use OAuth2 client credentials from backend only.
- Token endpoint pattern: `https://auth.{env}.corti.app/realms/{tenant}/protocol/openid-connect/token`
- Cache token in server memory/Redis for <= 240s, refresh before expiry.

Streaming modes:
- `ambient` mode: Corti `/stream` WSS for live conversational fact extraction.
- `dictation` mode: Corti `/transcribe` WSS for quick stateless dictation.

REST resources used:
- `POST /interactions` (create encounter interaction in Corti)
- `POST /recordings` (optional upload fallback)
- `POST /transcripts` (batch transcript fallback)
- `POST /documents` (generate note from template)
- `GET /templates` (template list)
- `POST /codes` (generate codes, tenant feature-dependent)

Design principle:
- Store Corti IDs in Supabase and avoid duplicating PHI text unless necessary for UX.

## 6) Data Model (Supabase)
Minimal tables:

### `profiles`
- `id uuid pk` (matches auth.users.id)
- `display_name text`
- `role text check (role in ('clinician','admin'))`
- `created_at timestamptz default now()`

### `encounters`
- `id uuid pk default gen_random_uuid()`
- `owner_user_id uuid not null` -> `profiles.id`
- `patient_ref text` (external reference; avoid direct identifiers if possible)
- `status text check (status in ('recording','draft','reviewed','signed')) default 'recording'`
- `mode text check (mode in ('ambient','dictation'))`
- `title text`
- `started_at timestamptz`
- `ended_at timestamptz`
- `corti_interaction_id text unique`
- `last_event_at timestamptz`
- `created_at timestamptz default now()`

### `encounter_events`
- `id bigint generated always as identity pk`
- `encounter_id uuid not null` -> `encounters.id`
- `event_type text` (e.g. `transcript.partial`, `transcript.final`, `fact.upsert`, `session.ended`)
- `event_payload jsonb not null`
- `source text check (source in ('corti','app')) default 'corti'`
- `created_at timestamptz default now()`

### `encounter_documents`
- `id uuid pk default gen_random_uuid()`
- `encounter_id uuid not null` -> `encounters.id`
- `template_key text not null`
- `corti_document_id text`
- `content text` (editable working copy)
- `status text check (status in ('draft','reviewed','signed')) default 'draft'`
- `version int not null default 1`
- `created_by uuid not null` -> `profiles.id`
- `updated_at timestamptz default now()`

### `encounter_codes`
- `id uuid pk default gen_random_uuid()`
- `encounter_id uuid not null` -> `encounters.id`
- `coding_system text` (e.g. CPT/ICD10)
- `code text not null`
- `description text`
- `confidence numeric`
- `selected boolean default false`
- `created_at timestamptz default now()`

Recommended indexes:
- `encounters(owner_user_id, started_at desc)`
- `encounters(corti_interaction_id)`
- `encounter_events(encounter_id, created_at asc)`
- `encounter_documents(encounter_id, updated_at desc)`

RLS baseline:
- Clinicians can read/write rows where `owner_user_id = auth.uid()`.
- Admin can read all, write constrained by policy.

## 7) Backend API Contract (Next.js BFF)
All routes are app-internal and require authenticated Supabase user.

1. `POST /api/encounters`
- Creates local encounter + Corti interaction.
- Request:
```json
{
  "mode": "ambient",
  "title": "Ward Round - Bed 12",
  "patientRef": "HOSP-12345"
}
```
- Response:
```json
{
  "encounterId": "uuid",
  "cortiInteractionId": "string",
  "streamSession": {
    "wsUrl": "wss://api.us.corti.app/audio-bridge/v2/stream?...",
    "expiresInSec": 240
  }
}
```

2. `POST /api/encounters/:id/stream-token`
- Returns fresh short-lived Corti token + composed WSS URL for reconnect.

3. `POST /api/encounters/:id/events`
- Ingests normalized stream events from client/WebSocket worker.
- Persists compact event record in `encounter_events`.

4. `POST /api/encounters/:id/complete`
- Marks encounter ended, updates status to `draft`.

5. `GET /api/templates`
- Proxies Corti templates list and optionally caches per tenant.

6. `POST /api/encounters/:id/documents:generate`
- Calls Corti generate document using selected template.
- Stores generated content in `encounter_documents`.

7. `PATCH /api/documents/:id`
- Saves clinician edits and status transitions.

8. `POST /api/encounters/:id/codes:generate`
- Calls Corti codes generation endpoint when available.
- Upserts `encounter_codes`.

9. `GET /api/encounters`
- Paged encounter list for current user.

10. `GET /api/encounters/:id`
- Returns encounter metadata + events + latest document + codes.

## 8) Frontend Screens (Responsive)
1. Sign In
- Email magic link (Supabase Auth).

2. Encounter List
- Filters: status, date.
- CTA: New Encounter.

3. Live Encounter (Phone-first)
- Big Start/Stop controls.
- Live transcript stream.
- Facts timeline cards.
- Connectivity + mic state indicators.

4. Encounter Workspace (Desktop-first)
- Left: transcript/facts tabs.
- Right: generated note editor.
- Top actions: Generate Note, Generate Codes, Mark Reviewed, Sign.

5. Admin Settings (basic)
- Corti environment (`eu`/`us`) display.
- Tenant name read-only confirmation.
- Template defaults.

## 9) Security and Compliance Baseline
- Never expose Corti client secret or machine token to browser.
- All Corti API calls made server-side (or signed short-lived ws params issued by server).
- Encrypt sensitive columns at rest if policy requires.
- Minimal PHI retention in app DB; prefer Corti resource IDs.
- Add audit entries for status transitions and signatures.

## 10) Observability
- Structured logs with `encounter_id`, `corti_interaction_id`, request IDs.
- Error classes:
  - auth/token failures
  - ws disconnect/config timeout
  - template/doc generation failures
- Basic metrics:
  - encounter completion rate
  - median note generation time
  - % encounters signed within 24h

## 11) Build Plan (Execution Order)
Phase 1 (Week 1):
1. Scaffold Next.js + Supabase Auth + base layout.
2. Implement DB schema + RLS.
3. Implement `/api/encounters` and list/detail pages.

Phase 2 (Week 2):
1. Add Corti auth service and token cache.
2. Add live encounter page with `/stream` integration.
3. Persist normalized events and replay in workspace.

Phase 3 (Week 3):
1. Template list + document generation.
2. Editor + status workflow.
3. Optional codes generation and selection.

Phase 4 (Week 4):
1. Hardening: error handling, retries, reconnect logic.
2. QA on iPhone/Android + desktop browsers.
3. Deployment, env setup, and demo script.

## 12) Environment Variables
Server-only:
- `CORTI_ENV=us` (or `eu`)
- `CORTI_TENANT=base` (or custom)
- `CORTI_CLIENT_ID=...`
- `CORTI_CLIENT_SECRET=...`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

Client:
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## 13) Definition of Done (MVP)
- Clinician can complete one encounter end-to-end on phone + desktop:
  1) start recording/stream
  2) view transcript/facts
  3) generate note from template
  4) edit and mark signed
- Encounter data persisted and reloadable.
- Auth and RLS enforced.
- Deployed on Vercel with production Supabase project.
