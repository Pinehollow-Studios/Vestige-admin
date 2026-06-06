import "server-only";
import { cookies } from "next/headers";
import {
  ADMIN_ENV_COOKIE,
  type AdminEnvConfig,
  type AdminEnvKey,
  envConfig,
  resolveEnvKey,
} from "./env";

/**
 * Server-side resolution of the active dev/prod environment.
 *
 * Separated from `env.ts` because this file imports `next/headers` —
 * keeping it out of the isomorphic registry means the browser bundle
 * (via `supabase/client.ts`) never pulls `next/headers` in.
 */

/** The active env key for this request (reads the `vestige_admin_env`
 *  cookie; defaults to dev). */
export async function activeEnvKey(): Promise<AdminEnvKey> {
  const store = await cookies();
  return resolveEnvKey(store.get(ADMIN_ENV_COOKIE)?.value);
}

/** The active env's full config (url + anon key) for this request. */
export async function activeEnvConfig(): Promise<AdminEnvConfig> {
  return envConfig(await activeEnvKey());
}

/** Public-storage base URL for the active env. Pass into the
 *  `@/lib/storage` builders so server-rendered avatar / cover URLs
 *  point at the project the page's data came from. */
export async function activeStorageBase(): Promise<string> {
  return (await activeEnvConfig()).url;
}

export type EditableGuard =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Refuse editorial writes while viewing prod. Prod editorial is a pure
 * downstream mirror of dev (full-mirror via /sync) — nothing is ever
 * authored directly in prod. Call at the top of every editorial write
 * action (curated / badges / courses) as defence-in-depth behind the
 * read-only UI banner. Operational actions (feedback, safeguarding,
 * users, photos) are NOT gated — those act on live prod data by design.
 */
export async function assertEditableEnv(): Promise<EditableGuard> {
  if ((await activeEnvKey()) === "prod") {
    return {
      ok: false,
      message:
        "Prod is a read-only mirror of dev. Switch to dev to edit, then run Sync to publish.",
    };
  }
  return { ok: true };
}
