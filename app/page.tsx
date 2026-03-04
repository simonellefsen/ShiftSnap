import Link from "next/link";

export default function Home() {
  return (
    <div className="card" style={{ marginTop: "2rem" }}>
      <h1 style={{ marginTop: 0 }}>ShiftSnap MVP</h1>
      <p>
        Cross-platform encounter capture and documentation workflow powered by
        Corti + Supabase.
      </p>
      <Link href="/encounters">Go to Encounters</Link>
    </div>
  );
}
