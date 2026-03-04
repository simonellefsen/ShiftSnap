import { createClient } from "@supabase/supabase-js";
import { assertServerEnv } from "@/lib/env";

assertServerEnv();

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
