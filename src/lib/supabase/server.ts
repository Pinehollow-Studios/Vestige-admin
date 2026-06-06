import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ADMIN_ENV_COOKIE, envConfig, resolveEnvKey } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  // Pick the active project (dev/prod) from the env cookie. Auth tokens
  // are project-ref-scoped (`sb-<ref>-auth-token`), so dev + prod
  // sessions coexist — switching env just activates the other session.
  const env = envConfig(resolveEnvKey(cookieStore.get(ADMIN_ENV_COOKIE)?.value));

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing the session on every request.
          }
        },
      },
    },
  );
}
