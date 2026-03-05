import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NewEncounterForm from "./new-encounter-form";

export default async function NewEncounterPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/encounters/new");
  }

  return (
    <div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <Link href="/encounters">Back to Encounters</Link>
      </div>
      <NewEncounterForm />
    </div>
  );
}
