import { getCortiBaseUrl } from "@/lib/env";
import { getCortiAccessToken } from "@/lib/corti/auth";

export async function createCortiInteraction(title?: string) {
  const token = await getCortiAccessToken();
  const response = await fetch(`${getCortiBaseUrl()}/interactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: title || "ShiftSnap Encounter"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create interaction (${response.status}): ${body}`);
  }

  return response.json() as Promise<{ id: string }>;
}

export async function listCortiTemplates() {
  const token = await getCortiAccessToken();
  const response = await fetch(`${getCortiBaseUrl()}/templates`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to list templates (${response.status}): ${body}`);
  }

  return response.json();
}
