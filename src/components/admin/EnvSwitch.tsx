"use client";

import { useTransition } from "react";
import { setAdminEnv } from "@/app/(dashboard)/actions";
import type { AdminEnvKey } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

/**
 * Dev/prod connection switch. Replaces the old static NODE_ENV badge.
 * The selected env drives every Supabase client (read/write) for the
 * session via the `vestige_admin_env` cookie. Prod reads claret so it's
 * unmistakable; clicking the other side calls `setAdminEnv` and reloads.
 *
 * When prod isn't configured (no `NEXT_PUBLIC_SUPABASE_URL_PROD`), the
 * toggle collapses to a static "Dev" badge.
 */
export function EnvSwitch({
  active,
  prodAvailable,
}: {
  active: AdminEnvKey;
  prodAvailable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!prodAvailable) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
        <span aria-hidden className="size-1.5 rounded-full bg-brand pulse-dot" />
        Dev
      </span>
    );
  }

  const isProd = active === "prod";

  function select(env: AdminEnvKey) {
    if (env === active || pending) return;
    startTransition(() => {
      void setAdminEnv(env);
    });
  }

  return (
    <div
      role="group"
      aria-label="Environment"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5 transition-opacity",
        isProd ? "border-alert/40 bg-alert/10" : "border-brand/30 bg-brand/10",
        pending && "opacity-60",
      )}
    >
      {(["dev", "prod"] as AdminEnvKey[]).map((env) => {
        const selected = env === active;
        const prod = env === "prod";
        return (
          <button
            key={env}
            type="button"
            onClick={() => select(env)}
            aria-pressed={selected}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              selected
                ? prod
                  ? "bg-alert text-white"
                  : "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            {selected && (
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full pulse-dot",
                  prod ? "bg-white/80" : "bg-brand-fg/80",
                )}
              />
            )}
            {prod ? "Prod" : "Dev"}
          </button>
        );
      })}
    </div>
  );
}
