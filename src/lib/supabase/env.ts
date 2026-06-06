/**
 * Environment registry for the dev/prod connection switch.
 *
 * The admin dashboard reads/writes against ONE Supabase project at a
 * time, chosen per-request by the `vestige_admin_env` cookie. Editorial
 * authoring happens against dev; live TestFlight user data (feedback,
 * crashes, safeguarding, users, photos) lives in prod, so an admin
 * toggles to prod to triage it. The dev→prod editorial mirror (/sync)
 * is a separate, always-dev→prod flow that ignores this cookie.
 *
 * This module is ISOMORPHIC — it must NOT import `next/headers` because
 * it is pulled into the browser bundle via `supabase/client.ts`. Cookie
 * reading is the caller's job: `server.ts` / `middleware.ts` read the
 * request cookie store; `client.ts` parses `document.cookie`.
 *
 * Anon keys are public + RLS-gated (they already ship inside the iOS
 * binary), so exposing both envs' anon keys as `NEXT_PUBLIC` is safe.
 * Service-role keys are NEVER referenced here — those live only in the
 * server-only sync engine.
 */

export type AdminEnvKey = "dev" | "prod";

export const ADMIN_ENV_COOKIE = "vestige_admin_env";

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

/** Coerce an arbitrary cookie value to a valid env key. Defaults to dev,
 *  and refuses prod when prod isn't configured. */
export function resolveEnvKey(raw: string | null | undefined): AdminEnvKey {
  return raw === "prod" && isEnvConfigured("prod") ? "prod" : "dev";
}

/** The (url, anonKey) pair for an env, falling back to dev when the
 *  requested env isn't configured. */
export function envConfig(key: AdminEnvKey): AdminEnvConfig {
  return isEnvConfigured(key) ? ENVS[key] : ENVS.dev;
}

/** Parse the env cookie out of a raw `document.cookie` string (client). */
export function parseEnvCookie(cookieHeader: string | undefined): AdminEnvKey {
  if (!cookieHeader) return "dev";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_ENV_COOKIE}=([^;]+)`),
  );
  return resolveEnvKey(match ? decodeURIComponent(match[1]) : undefined);
}
