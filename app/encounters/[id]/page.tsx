import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import LiveCapturePanel from "./live-capture-panel";

type EncounterEvent = {
  id: number;
  event_type: string;
  event_payload: Record<string, unknown>;
  created_at: string;
};

type EncounterDetail = {
  encounter: {
    id: string;
    title: string;
    status: string;
    mode: string;
    corti_interaction_id: string;
    started_at: string;
    ended_at: string | null;
  };
  events: EncounterEvent[];
};

async function getEncounter(id: string): Promise<EncounterDetail | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/encounters/${id}`);
  }

  const schema = getSupabaseSchema();
  const [{ data: encounter }, { data: events }] = await Promise.all([
    supabaseAdmin
      .schema(schema)
      .from("encounters")
      .select("id, title, status, mode, corti_interaction_id, started_at, ended_at")
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .single(),
    supabaseAdmin
      .schema(schema)
      .from("encounter_events")
      .select("id, event_type, event_payload, created_at")
      .eq("encounter_id", id)
      .order("created_at", { ascending: true })
  ]);

  if (!encounter) {
    return null;
  }

  return {
    encounter,
    events: (events || []) as EncounterEvent[]
  };
}

export default async function EncounterDetailPage({
  params
}: {
  params: { id: string };
}) {
  const data = await getEncounter(params.id);

  if (!data) {
    return (
      <div className="card" style={{ marginTop: "1rem" }}>
        <p>Encounter not found.</p>
        <Link href="/encounters">Back</Link>
      </div>
    );
  }

  return (
    <div className="grid" style={{ marginTop: "1rem" }}>
      <div className="card">
        <Link href="/encounters">Back to Encounters</Link>
        <h1 style={{ marginBottom: "0.4rem" }}>{data.encounter.title}</h1>
        <small>
          {data.encounter.mode} · {data.encounter.status} · started{" "}
          {new Date(data.encounter.started_at).toLocaleString()}
        </small>
        <p style={{ marginBottom: 0 }}>
          Corti interaction: <code>{data.encounter.corti_interaction_id}</code>
        </p>
      </div>

      <LiveCapturePanel
        encounterId={data.encounter.id}
        interactionId={data.encounter.corti_interaction_id}
        initialStatus={data.encounter.status}
      />

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Transcript / Facts Events</h2>
          {data.events.length === 0 ? (
            <small>No stream events stored yet.</small>
          ) : (
            data.events.map((event) => (
              <article key={event.id} style={{ marginBottom: "0.9rem" }}>
                <strong>{event.event_type}</strong>
                <small style={{ display: "block" }}>
                  {new Date(event.created_at).toLocaleString()}
                </small>
                <pre
                  style={{
                    overflowX: "auto",
                    background: "#f5f7fa",
                    padding: "0.6rem",
                    borderRadius: "8px"
                  }}
                >
                  {JSON.stringify(event.event_payload, null, 2)}
                </pre>
              </article>
            ))
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Draft Note Workspace</h2>
          <small>Template generation and signing flow will be wired in phase 2/3.</small>
        </section>
      </div>
    </div>
  );
}
