import { createClient } from "@supabase/supabase-js";
import { assertServerEnv } from "@/lib/env";
import { getSupabaseSchema } from "@/lib/env";

assertServerEnv();

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function ensureProfile(userId: string, email: string | null) {
  const schema = getSupabaseSchema();
  const displayName = email ? email.split("@")[0] : null;

  await supabaseAdmin.schema(schema).from("profiles").upsert(
    {
      id: userId,
      display_name: displayName
    },
    { onConflict: "id" }
  );
}
