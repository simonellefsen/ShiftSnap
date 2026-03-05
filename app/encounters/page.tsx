import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile, supabaseAdmin } from "@/lib/supabase/service";

type Encounter = {
  id: string;
  title: string;
  status: string;
  mode: string;
  started_at: string;
};

async function getEncounters(ownerUserId: string) {
  const schema = getSupabaseSchema();
  const { data } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .select("id, title, status, mode, started_at")
    .eq("owner_user_id", ownerUserId)
    .order("started_at", { ascending: false })
    .limit(100);

  return (data || []) as Encounter[];
}

export default async function EncounterListPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/encounters");
  }

  await ensureProfile(user.id, user.email ?? null);
  const encounters = await getEncounters(user.id);

  return (
    <div className="grid" style={{ marginTop: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Encounters</h1>
          <small>Phone: capture. Desktop: review and generate notes.</small>
        </div>
        <Link href="/encounters/new">
          <button type="button">New Encounter</button>
        </Link>
      </div>

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
