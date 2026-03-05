import { NextResponse } from "next/server";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getCortiAccessToken } from "@/lib/corti/auth";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schema = getSupabaseSchema();
  const encounterId = params.id;

  const { data: encounter, error } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .select("id, corti_interaction_id")
    .eq("id", encounterId)
    .eq("owner_user_id", user.id)
    .single();

  if (error || !encounter) {
    return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  const accessToken = await getCortiAccessToken();
  const env = process.env.CORTI_ENVIRONMENT_ID;
  const tenant = process.env.CORTI_TENANT_NAME;
  const bearerToken = `Bearer ${accessToken}`;
  const wsUrl = `wss://api.${env}.corti.app/audio-bridge/v2/stream?interactionId=${encounter.corti_interaction_id}&tenant-name=${encodeURIComponent(tenant || "")}&token=${encodeURIComponent(bearerToken)}`;

  return NextResponse.json({
    wsUrl,
    interactionId: encounter.corti_interaction_id,
    expiresInSec: 240
  });
}
