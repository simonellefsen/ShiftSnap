import { redirect } from "next/navigation";
import { getGoogleClientId, getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import GoogleOneTap from "./google-one-tap";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/encounters");
  }

  const nextPath = searchParams?.next || "/encounters";
  const error = searchParams?.error || null;
  const googleClientId = getGoogleClientId();
  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  return (
    <div className="card grid" style={{ marginTop: "1rem" }}>
      <h1 style={{ margin: 0 }}>Sign in to ShiftSnap</h1>
      <small>Continue with Google SSO (One-Tap enabled).</small>

      {error ? <small style={{ color: "#b3261e" }}>{decodeURIComponent(error)}</small> : null}
      {!googleClientId ? (
        <small style={{ color: "#b3261e" }}>
          GOOGLE_CLIENT_ID is missing. One-Tap is disabled until it is configured.
        </small>
      ) : null}

      <a href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}>
        <button type="button">Continue with Google</button>
      </a>

      <GoogleOneTap
        googleClientId={googleClientId}
        supabaseUrl={supabaseUrl}
        supabasePublishableKey={supabasePublishableKey}
        nextPath={nextPath}
      />
    </div>
  );
}
