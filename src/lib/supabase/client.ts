import { createBrowserClient } from "@supabase/ssr";
import { envConfig, parseEnvCookie } from "./env";

export function createClient() {
  // Browser client picks the active project from the env cookie
  // (document.cookie). Falls back to dev during SSR / when unset.
  const env = envConfig(
    typeof document !== "undefined" ? parseEnvCookie(document.cookie) : "dev",
  );
  return createBrowserClient(env.url, env.anonKey);
}
