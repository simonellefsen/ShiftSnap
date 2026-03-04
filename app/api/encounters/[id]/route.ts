import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getSupabaseSchema } from "@/lib/env";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const encounterId = params.id;
  const schema = getSupabaseSchema();

  const [{ data: encounter, error: encounterError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabaseAdmin
        .schema(schema)
        .from("encounters")
        .select("*")
        .eq("id", encounterId)
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
