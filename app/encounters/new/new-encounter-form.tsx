"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  mode: "ambient" | "dictation";
  title: string;
  patientRef: string;
};

export default function NewEncounterForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    mode: "ambient",
    title: "",
    patientRef: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/encounters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: state.mode,
        title: state.title || undefined,
        patientRef: state.patientRef || undefined
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Unknown error" }));
      setError(body.error || `Request failed (${response.status})`);
      setIsSubmitting(false);
      return;
    }

    const json = (await response.json()) as { encounterId: string };
    router.push(`/encounters/${json.encounterId}`);
  }

  return (
    <form className="card grid" onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <h1 style={{ margin: 0 }}>New Encounter</h1>
      <small>Encounter will be created for your signed-in account.</small>

      <label>
        Mode
        <select
          value={state.mode}
          onChange={(event) =>
            setState((prev) => ({
              ...prev,
              mode: event.target.value as "ambient" | "dictation"
            }))
          }
        >
          <option value="ambient">Ambient</option>
          <option value="dictation">Dictation</option>
        </select>
      </label>

      <label>
        Title (optional)
        <input
          value={state.title}
          onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Ward round - Bed 12"
        />
      </label>

      <label>
        Patient Ref (optional)
        <input
          value={state.patientRef}
          onChange={(event) => setState((prev) => ({ ...prev, patientRef: event.target.value }))}
          placeholder="HOSP-12345"
        />
      </label>

      {error ? <small style={{ color: "#b3261e" }}>{error}</small> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Encounter"}
      </button>
    </form>
  );
}
