import { NextResponse } from "next/server";
import { z } from "zod";
import { createCortiInteraction } from "@/lib/corti/client";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getSupabaseSchema } from "@/lib/env";

const createEncounterSchema = z.object({
  mode: z.enum(["ambient", "dictation"]),
  title: z.string().min(1).max(120).optional(),
  patientRef: z.string().min(1).max(80).optional(),
  ownerUserId: z.string().uuid()
});

export async function POST(req: Request) {
  const parsed = createEncounterSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, title, patientRef, ownerUserId } = parsed.data;

  const cortiInteraction = await createCortiInteraction(title);

  const schema = getSupabaseSchema();
  const { data, error } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .insert({
      owner_user_id: ownerUserId,
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
  const { searchParams } = new URL(req.url);
  const ownerUserId = searchParams.get("ownerUserId");
  const limit = Number(searchParams.get("limit") ?? "20");

  if (!ownerUserId) {
    return NextResponse.json({ error: "ownerUserId is required" }, { status: 400 });
  }

  const schema = getSupabaseSchema();
  const { data, error } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .select("id, title, status, mode, started_at, ended_at, corti_interaction_id")
    .eq("owner_user_id", ownerUserId)
    .order("started_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ encounters: data });
}
