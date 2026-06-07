import { createBrowserClient } from "@supabase/ssr";
import { envConfig } from "./env";

// Dev-only dashboard — the browser client always uses the dev project.
export function createClient() {
  const env = envConfig("dev");
  return createBrowserClient(env.url, env.anonKey);
}
