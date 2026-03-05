export function assertServerEnv() {
  const missing = [
    "CORTI_CLIENT_ID",
    "CORTI_CLIENT_SECRET",
    "CORTI_TENANT_NAME",
    "CORTI_ENVIRONMENT_ID",
    "SUPABASE_SERVICE_ROLE_KEY"
  ].filter((k) => !process.env[k]);

  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasPublishableKey = Boolean(
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!hasSupabaseUrl) missing.push("SUPABASE_URL");
  if (!hasPublishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getCortiBaseUrl() {
  const env = process.env.CORTI_ENVIRONMENT_ID;
  return `https://api.${env}.corti.app`;
}

export function getCortiAuthUrl() {
  const env = process.env.CORTI_ENVIRONMENT_ID;
  const tenant = process.env.CORTI_TENANT_NAME;
  return `https://auth.${env}.corti.app/realms/${tenant}/protocol/openid-connect/token`;
}

export function getSupabaseSchema() {
  return process.env.SUPABASE_APP_SCHEMA || "shiftsnap";
}

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}
