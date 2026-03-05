const requiredServerVars = [
  "CORTI_CLIENT_ID",
  "CORTI_CLIENT_SECRET",
  "CORTI_TENANT_NAME",
  "CORTI_ENVIRONMENT_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
] as const;

export function assertServerEnv() {
  const missing = requiredServerVars.filter((k) => !process.env[k]);
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
