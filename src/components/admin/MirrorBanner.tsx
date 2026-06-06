import { AlertTriangle } from "lucide-react";
import { activeEnvKey } from "@/lib/supabase/env-server";

/**
 * Read-only notice shown at the top of editorial surfaces (curated /
 * badges / courses) while viewing prod. Prod editorial is a pure
 * downstream mirror of dev — nothing is authored directly in prod — so
 * the editor controls below are present but every write is rejected by
 * `assertEditableEnv()`. Renders nothing on dev.
 *
 * Async server component: drop `<MirrorBanner />` near the top of any
 * editorial page; it resolves the active env itself.
 */
export async function MirrorBanner() {
  if ((await activeEnvKey()) !== "prod") return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">
        <strong className="font-semibold">Viewing prod — read-only.</strong>{" "}
        Prod editorial is a mirror of dev. Switch to{" "}
        <span className="font-semibold">Dev</span> to make changes, then run{" "}
        <span className="font-semibold">Sync to prod</span> to publish them.
      </p>
    </div>
  );
}
