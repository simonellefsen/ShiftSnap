import Link from "next/link";
import NewEncounterForm from "./new-encounter-form";

export default function NewEncounterPage() {
  return (
    <div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <Link href="/encounters">Back to Encounters</Link>
      </div>
      <NewEncounterForm />
    </div>
  );
}
