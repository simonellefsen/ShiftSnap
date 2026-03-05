import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/encounters";
  const nextPath = next.startsWith("/") ? next : "/encounters";

  if (!code) {
    const message = encodeURIComponent("Missing authorization code from provider.");
    return NextResponse.redirect(`${origin}/login?error=${message}`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=${message}`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(user.id, user.email ?? null);
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}
