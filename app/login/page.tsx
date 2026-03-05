import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return (
    <div className="card grid" style={{ marginTop: "1rem" }}>
      <h1 style={{ margin: 0 }}>Sign in to ShiftSnap</h1>
      <small>Continue with Google SSO.</small>

      {error ? <small style={{ color: "#b3261e" }}>{decodeURIComponent(error)}</small> : null}

      <a href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}>
        <button type="button">Continue with Google</button>
      </a>
    </div>
  );
}
