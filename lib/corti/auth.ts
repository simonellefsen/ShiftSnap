import { getCortiAuthUrl } from "@/lib/env";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let cache: TokenCache | null = null;

export async function getCortiAccessToken() {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 15_000) {
    return cache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CORTI_CLIENT_ID!,
    client_secret: process.env.CORTI_CLIENT_SECRET!
  });

  const res = await fetch(getCortiAuthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Corti token request failed (${res.status}): ${errorText}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cache = {
    accessToken: json.access_token,
    expiresAt: now + Math.min(json.expires_in, 240) * 1000
  };

  return json.access_token;
}
