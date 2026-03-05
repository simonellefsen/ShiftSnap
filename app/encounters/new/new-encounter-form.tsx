"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  ownerUserId: string;
  mode: "ambient" | "dictation";
  title: string;
  patientRef: string;
};

const defaultOwner = process.env.NEXT_PUBLIC_DEMO_OWNER_USER_ID || "";

export default function NewEncounterForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    ownerUserId: defaultOwner,
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
        ownerUserId: state.ownerUserId,
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
      <small>
        Temporary setup until auth is wired: provide the owner user UUID.
      </small>

      <label>
        Owner User ID (UUID)
        <input
          required
          value={state.ownerUserId}
          onChange={(event) => setState((prev) => ({ ...prev, ownerUserId: event.target.value }))}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </label>

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
