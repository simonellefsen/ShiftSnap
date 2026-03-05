import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") || "/encounters";
  const nextPath = next.startsWith("/") ? next : "/encounters";

  const supabase = createSupabaseServerClient();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent"
      }
    }
  });

  if (error || !data.url) {
    const message = encodeURIComponent(error?.message || "Failed to start Google sign-in");
    return NextResponse.redirect(`${origin}/login?error=${message}`);
  }

  return NextResponse.redirect(data.url);
}
