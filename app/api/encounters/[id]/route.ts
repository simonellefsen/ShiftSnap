import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const encounterId = params.id;
  const schema = getSupabaseSchema();
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: encounter, error: encounterError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabaseAdmin
        .schema(schema)
        .from("encounters")
        .select("*")
        .eq("id", encounterId)
        .eq("owner_user_id", user.id)
        .single(),
      supabaseAdmin
        .schema(schema)
        .from("encounter_events")
        .select("id, event_type, event_payload, created_at")
        .eq("encounter_id", encounterId)
        .order("created_at", { ascending: true })
    ]);

  if (encounterError) {
    return NextResponse.json({ error: encounterError.message }, { status: 404 });
  }

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  return NextResponse.json({ encounter, events });
}
