import { NextResponse } from "next/server";
import { getSupabaseSchema } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

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

  const { data, error } = await supabaseAdmin
    .schema(schema)
    .from("encounters")
    .update({
      status: "draft",
      ended_at: new Date().toISOString()
    })
    .eq("id", encounterId)
    .eq("owner_user_id", user.id)
    .select("id, status, ended_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, encounter: data });
}
