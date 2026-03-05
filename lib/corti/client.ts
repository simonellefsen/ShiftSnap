import { getCortiBaseUrl } from "@/lib/env";
import { getCortiAccessToken } from "@/lib/corti/auth";

export async function createCortiInteraction(title?: string) {
  const token = await getCortiAccessToken();
  const now = new Date().toISOString();
  const response = await fetch(`${getCortiBaseUrl()}/v2/interactions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Tenant-Name": process.env.CORTI_TENANT_NAME || ""
    },
    body: JSON.stringify({
      encounter: {
        identifier: crypto.randomUUID(),
        status: "planned",
        type: "first_consultation",
        period: {
          startedAt: now,
          endedAt: now
        },
        title: title || "ShiftSnap Encounter"
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create interaction (${response.status}): ${body}`);
  }

  return response.json() as Promise<{
    interactionId: string;
    websocketUrl?: string;
  }>;
}

export async function listCortiTemplates() {
  const token = await getCortiAccessToken();
  const response = await fetch(`${getCortiBaseUrl()}/v2/templates/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Tenant-Name": process.env.CORTI_TENANT_NAME || ""
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to list templates (${response.status}): ${body}`);
  }

  return response.json();
}
