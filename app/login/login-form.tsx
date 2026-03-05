"use client";

import { useState } from "react";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        nextPath
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Unknown error" }));
      setError(body.error || `Request failed (${response.status})`);
      setSubmitting(false);
      return;
    }

    setStatus("Magic link sent. Open your email and continue from the link.");
    setSubmitting(false);
  }

  return (
    <form className="card grid" onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <h1 style={{ margin: 0 }}>Sign in to ShiftSnap</h1>
      <small>Use your email to receive a magic sign-in link.</small>

      <label>
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@hospital.org"
        />
      </label>

      {status ? <small style={{ color: "#0e8f7a" }}>{status}</small> : null}
      {error ? <small style={{ color: "#b3261e" }}>{error}</small> : null}

      <button type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send Magic Link"}
      </button>
    </form>
  );
}
