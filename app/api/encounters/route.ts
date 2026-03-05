import { NextResponse } from "next/server";
import { z } from "zod";
import { createCortiInteraction } from "@/lib/corti/client";
import { ensureProfile, supabaseAdmin } from "@/lib/supabase/service";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createEncounterSchema = z.object({
  mode: z.enum(["ambient", "dictation"]),
  title: z.string().min(1).max(120).optional(),
  patientRef: z.string().min(1).max(80).optional()
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createEncounterSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, title, patientRef } = parsed.data;

  const cortiInteraction = await createCortiInteraction(title);
  await ensureProfile(user.id, user.email ?? null);

  const schema = getSupabaseSchema();
  const { data, error } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .insert({
      owner_user_id: user.id,
      mode,
      title: title ?? "Untitled Encounter",
      patient_ref: patientRef ?? null,
      status: "recording",
      started_at: new Date().toISOString(),
      corti_interaction_id: cortiInteraction.id
    })
    .select("id, corti_interaction_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    encounterId: data.id,
    cortiInteractionId: data.corti_interaction_id,
    streamSession: {
      wsUrl: `wss://api.${process.env.CORTI_ENVIRONMENT_ID}.corti.app/audio-bridge/v2/stream?interactionId=${data.corti_interaction_id}`,
      expiresInSec: 240
    }
  });
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  const schema = getSupabaseSchema();
  const { data, error } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .select("id, title, status, mode, started_at, ended_at, corti_interaction_id")
    .eq("owner_user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ encounters: data });
}
