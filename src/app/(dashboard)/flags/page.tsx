import { pageShell } from "@/components/admin/PageShell";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { listPickerUsers } from "@/lib/users/roster";
import { listAdminOwners } from "@/lib/feedback/owners";
import type { CountyOption } from "@/app/(dashboard)/notifications/types";
import { AppVersionForm } from "@/app/(dashboard)/app-version/AppVersionForm";
import { FlagsBoard } from "./FlagsBoard";
import type { FlagHistoryRow, FlagRow } from "./types";

export const dynamic = "force-dynamic";

/**
 * Feature flags — the control room (rebuilt 2026-08-28). Everything that
 * changes the app without a release, on one page: kill switches, copy
 * overrides, tuning values, and the app-version gate folded in at the bottom
 * as its own clearly-fenced panel (the old /app-version page redirects here).
 * Change history + who/when come from feature_flag_history (migration
 * 20260828160000). Reads/writes go through the service-role client, gated by
 * the layout's requireAdmin().
 */
export default async function FlagsPage() {
  const supabase = await tryCreateServiceClient();

  if (!supabase) {
    return (
      <div className={pageShell("wide")}>
        <SectionHeader eyebrow="Operations" title="Feature flags" />
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-ink-2">
          Needs the service-role key for the active environment to read/write flags.
        </div>
      </div>
    );
  }

  const [flagsRes, countiesRes, targetsRes, historyRes, versionRes, allUsers, admins] =
    await Promise.all([
      supabase.rpc("admin_feature_flags_overview"),
      supabase.from("counties").select("id, name").order("name"),
      supabase.from("feature_flag_targets").select("flag_key, user_id"),
      supabase
        .from("feature_flag_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(400),
      supabase
        .from("app_version_config")
        .select("min_supported_version, min_supported_build, recommended_version, recommended_build, update_url")
        .eq("id", 1)
        .maybeSingle(),
      listPickerUsers(),
      listAdminOwners(),
    ]);

  const targetsByFlag: Record<string, string[]> = {};
  for (const t of (targetsRes.data ?? []) as { flag_key: string; user_id: string }[]) {
    (targetsByFlag[t.flag_key] ??= []).push(t.user_id);
  }

  const version = versionRes.data as {
    min_supported_version: string;
    min_supported_build: number | null;
    recommended_version: string | null;
    recommended_build: number | null;
    update_url: string | null;
  } | null;

  return (
    <div className={pageShell("wide")}>
      <SectionHeader eyebrow="Operations" title="Feature flags" />
      <FlagsBoard
        flags={(flagsRes.data ?? []) as FlagRow[]}
        counties={(countiesRes.data ?? []) as CountyOption[]}
        allUsers={allUsers}
        targetsByFlag={targetsByFlag}
        history={(historyRes.data ?? []) as FlagHistoryRow[]}
        admins={admins}
      />

      {/* The version gate is a different weapon class to a flag - it locks
          people out of the app entirely - so it sits fenced at the bottom
          rather than mixed into the list. */}
      <section id="version-gate" className="space-y-2 rounded-2xl border border-amber/30 p-4">
        <header className="space-y-0.5">
          <h2 className="font-heading text-sm font-semibold text-amber">Version gate</h2>
          <p className="text-xs text-ink-3">
            Not a flag — the hard floor below which the app refuses to run, and the soft
            update nudge. Applies on next app launch.
          </p>
        </header>
        <AppVersionForm
          initial={{
            min: version?.min_supported_version ?? "0.0.0",
            minBuild: version?.min_supported_build != null ? String(version.min_supported_build) : "",
            recommended: version?.recommended_version ?? "",
            recommendedBuild:
              version?.recommended_build != null ? String(version.recommended_build) : "",
            updateUrl: version?.update_url ?? "",
          }}
        />
      </section>
    </div>
  );
}
