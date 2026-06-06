"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ENV_COOKIE, type AdminEnvKey, resolveEnvKey } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Flip the active dev/prod connection. Writes the `vestige_admin_env`
 * cookie (not httpOnly — the browser Supabase client reads it from
 * `document.cookie`) and redirects to the overview so every client is
 * rebuilt against the new project and `requireAdmin()` re-runs (which
 * bounces to /login if there's no session for the target env yet).
 */
export async function setAdminEnv(env: AdminEnvKey) {
  const store = await cookies();
  store.set(ADMIN_ENV_COOKIE, resolveEnvKey(env), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
