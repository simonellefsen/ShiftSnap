import Link from "next/link";

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
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/encounters/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as EncounterDetail;
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
