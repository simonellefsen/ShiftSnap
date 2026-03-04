create extension if not exists pgcrypto;
create schema if not exists shiftsnap;

grant usage on schema shiftsnap to anon, authenticated, service_role;
grant all privileges on all tables in schema shiftsnap to anon, authenticated, service_role;
grant all privileges on all sequences in schema shiftsnap to anon, authenticated, service_role;
alter default privileges in schema shiftsnap grant all on tables to anon, authenticated, service_role;
alter default privileges in schema shiftsnap grant all on sequences to anon, authenticated, service_role;

create table if not exists shiftsnap.profiles (
  id uuid primary key,
  display_name text,
  role text not null default 'clinician' check (role in ('clinician', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists shiftsnap.encounters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references shiftsnap.profiles(id),
  patient_ref text,
  status text not null default 'recording' check (status in ('recording', 'draft', 'reviewed', 'signed')),
  mode text not null check (mode in ('ambient', 'dictation')),
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  corti_interaction_id text unique,
  last_event_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shiftsnap.encounter_events (
  id bigint generated always as identity primary key,
  encounter_id uuid not null references shiftsnap.encounters(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null,
  source text not null default 'corti' check (source in ('corti', 'app')),
  created_at timestamptz not null default now()
);

create table if not exists shiftsnap.encounter_documents (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references shiftsnap.encounters(id) on delete cascade,
  template_key text not null,
  corti_document_id text,
  content text,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'signed')),
  version int not null default 1,
  created_by uuid not null references shiftsnap.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists shiftsnap.encounter_codes (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references shiftsnap.encounters(id) on delete cascade,
  coding_system text,
  code text not null,
  description text,
  confidence numeric,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_encounters_owner_started on shiftsnap.encounters(owner_user_id, started_at desc);
create index if not exists idx_encounters_corti_interaction on shiftsnap.encounters(corti_interaction_id);
create index if not exists idx_events_encounter_created on shiftsnap.encounter_events(encounter_id, created_at asc);
create index if not exists idx_documents_encounter_updated on shiftsnap.encounter_documents(encounter_id, updated_at desc);

alter table shiftsnap.profiles enable row level security;
alter table shiftsnap.encounters enable row level security;
alter table shiftsnap.encounter_events enable row level security;
alter table shiftsnap.encounter_documents enable row level security;
alter table shiftsnap.encounter_codes enable row level security;

create policy "profiles_self_select"
on shiftsnap.profiles
for select
using (auth.uid() = id);

create policy "profiles_self_update"
on shiftsnap.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "encounters_owner_read"
on shiftsnap.encounters
for select
using (owner_user_id = auth.uid());

create policy "encounters_owner_write"
on shiftsnap.encounters
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "events_owner_read"
on shiftsnap.encounter_events
for select
using (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
);

create policy "events_owner_write"
on shiftsnap.encounter_events
for all
using (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
);

create policy "documents_owner_read"
on shiftsnap.encounter_documents
for select
using (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
);

create policy "documents_owner_write"
on shiftsnap.encounter_documents
for all
using (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
);

create policy "codes_owner_read"
on shiftsnap.encounter_codes
for select
using (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
);

create policy "codes_owner_write"
on shiftsnap.encounter_codes
for all
using (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from shiftsnap.encounters e
    where e.id = encounter_id
      and e.owner_user_id = auth.uid()
  )
);
