import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envConfig } from "./env";

// Dev-only dashboard: the app always reads/writes the dev project. Prod is
// only ever touched by the /sync promotion console (service-role + the
// prod-deploy workflow), never as an interactive session.
export async function createClient() {
  const cookieStore = await cookies();
  const env = envConfig("dev");

  return createServerClient(env.url, env.anonKey, {
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
  });
}
