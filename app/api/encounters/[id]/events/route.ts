import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

const eventSchema = z.object({
  eventType: z.string().min(1).max(120),
  eventPayload: z.record(z.unknown()),
  source: z.enum(["corti", "app"]).default("app")
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = eventSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const schema = getSupabaseSchema();
  const encounterId = params.id;

  const { data: encounter } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .select("id")
    .eq("id", encounterId)
    .eq("owner_user_id", user.id)
    .single();

  if (!encounter) {
    return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  const { eventType, eventPayload, source } = parsed.data;

  const [{ data, error }, { error: encounterUpdateError }] = await Promise.all([
    supabaseAdmin
      .schema(schema)
      .from("encounter_events")
      .insert({
        encounter_id: encounterId,
        event_type: eventType,
        event_payload: eventPayload,
        source
      })
      .select("id")
      .single(),
    supabaseAdmin
      .schema(schema)
      .from("encounters")
      .update({ last_event_at: new Date().toISOString() })
      .eq("id", encounterId)
  ]);

  if (error || encounterUpdateError) {
    return NextResponse.json(
      { error: error?.message || encounterUpdateError?.message || "Failed to store event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, eventId: data.id });
}
