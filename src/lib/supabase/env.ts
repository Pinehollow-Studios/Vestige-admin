/**
 * Environment registry.
 *
 * The admin dashboard is a DEV-ONLY tool: it always reads/writes the dev
 * Supabase project (the workshop). Its only relationship to prod is the
 * dev→prod promotion console (`/sync`), which reads prod's state to show
 * whether the two are synced and pushes dev→prod on demand — it never
 * operates against prod as a session. So the main app client is always
 * dev; the `prod` config here exists only for the sync/status layer.
 *
 * This module is ISOMORPHIC — it must NOT import `next/headers` because
 * it is pulled into the browser bundle via `supabase/client.ts`.
 *
 * Anon keys are public + RLS-gated (they already ship inside the iOS
 * binary). Service-role keys are NEVER referenced here — those live only
 * in the server-only sync engine.
 */

export type AdminEnvKey = "dev" | "prod";

export type AdminEnvConfig = {
  key: AdminEnvKey;
  label: string;
  url: string;
  anonKey: string;
};

// Dev falls back to the legacy single-project vars so the dashboard keeps
// working before the _DEV / _PROD vars are set. Prod has no fallback —
// when unset, the prod env reads as "unconfigured" and the switch hides it.
const DEV_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL_DEV ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const DEV_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD ?? "";
const PROD_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD ?? "";

const ENVS: Record<AdminEnvKey, AdminEnvConfig> = {
  dev: { key: "dev", label: "Dev", url: DEV_URL, anonKey: DEV_ANON },
  prod: { key: "prod", label: "Prod", url: PROD_URL, anonKey: PROD_ANON },
};

/** True when both url + anon key are present for the env. */
export function isEnvConfigured(key: AdminEnvKey): boolean {
  const e = ENVS[key];
  return Boolean(e.url && e.anonKey);
}

/** The (url, anonKey) pair for an env, falling back to dev when the
 *  requested env isn't configured. */
export function envConfig(key: AdminEnvKey): AdminEnvConfig {
  return isEnvConfigured(key) ? ENVS[key] : ENVS.dev;
}
