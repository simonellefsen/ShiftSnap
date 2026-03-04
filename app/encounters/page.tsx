import Link from "next/link";

type Encounter = {
  id: string;
  title: string;
  status: string;
  mode: string;
  started_at: string;
};

async function getEncounters() {
  const ownerUserId = process.env.DEMO_OWNER_USER_ID;
  if (!ownerUserId) {
    return { encounters: [] as Encounter[], warning: "Set DEMO_OWNER_USER_ID to view records." };
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/encounters?ownerUserId=${ownerUserId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return { encounters: [] as Encounter[], warning: `Encounter fetch failed (${res.status}).` };
  }

  const data = (await res.json()) as { encounters: Encounter[] };
  return { encounters: data.encounters, warning: null };
}

export default async function EncounterListPage() {
  const { encounters, warning } = await getEncounters();

  return (
    <div className="grid" style={{ marginTop: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Encounters</h1>
          <small>Phone: capture. Desktop: review and generate notes.</small>
        </div>
        <button type="button" disabled title="Wiring form in next step">
          New Encounter
        </button>
      </div>

      {warning ? <div className="card"><small>{warning}</small></div> : null}

      <div className="grid">
        {encounters.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0 }}>No encounters found.</p>
          </div>
        ) : (
          encounters.map((encounter) => (
            <Link className="card" key={encounter.id} href={`/encounters/${encounter.id}`}>
              <strong>{encounter.title}</strong>
              <p style={{ margin: "0.35rem 0" }}>
                {encounter.mode} · {encounter.status}
              </p>
              <small>{new Date(encounter.started_at).toLocaleString()}</small>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
