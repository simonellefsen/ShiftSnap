import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { next?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/encounters");
  }

  const nextPath = searchParams?.next || "/encounters";

  return <LoginForm nextPath={nextPath} />;
}
