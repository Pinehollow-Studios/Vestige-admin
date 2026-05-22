import { ImageIcon } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PhotoModerationState = "pending" | "approved" | "rejected" | "flagged";
type PhotoKind = "roundPhoto" | "avatar";

type Row = {
  id: string;
  storage_key: string | null;
  kind: PhotoKind;
  moderation_state: PhotoModerationState;
  user_id: string | null;
  taken_at: string | null;
  created_at: string;
};

const MODERATION_BUCKETS: PhotoModerationState[] = [
  "pending",
  "approved",
  "rejected",
  "flagged",
];

/**
 * Photo moderation surface — read-only v1.
 *
 * Single-axis moderation queue. The verification axis on
 * `photos.verification_state` was dropped 2026-05-19 alongside the
 * rest of the round verification system (Fairways-ios migration
 * 20260519110000_drop_verification.sql) — integrity is now an admin
 * concern surfaced via /safeguarding, not a per-photo evidence tag.
 *
 * Approve / reject controls land with the moderation policy slice
 * (open question §16.13).
 */
export default async function PhotosPage() {
  const supabase = await createClient();
  const [modCountsRes, recentRes] = await Promise.all([
    Promise.all(
      MODERATION_BUCKETS.map(async (state) => {
        const { count } = await supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("moderation_state", state);
        return [state, count ?? 0] as const;
      }),
    ),
    supabase
      .from("photos")
      .select("id, storage_key, kind, moderation_state, user_id, taken_at, created_at")
      .eq("moderation_state", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const modCounts = Object.fromEntries(modCountsRes) as Record<PhotoModerationState, number>;
  const pending: Row[] = (recentRes.data as Row[] | null) ?? [];
  const pendingCount = modCounts.pending;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <SectionHeader
        eyebrow="Queues · Photo moderation"
        title="Photo moderation"
        description="Single-axis moderation queue. Approve / reject controls land with the moderation policy slice (open question §16.13). Counts and queue contents are live."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODERATION_BUCKETS.map((state) => {
          const count = modCounts[state];
          const tone =
            state === "pending"
              ? "attention"
              : state === "rejected" || state === "flagged"
                ? "alert"
                : "default";
          return (
            <div
              key={state}
              className="surface-glass flex flex-col gap-2 rounded-2xl p-4"
            >
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                <span
                  aria-hidden
                  className={
                    "size-1.5 rounded-full " +
                    (tone === "attention"
                      ? "bg-brand"
                      : tone === "alert"
                        ? "bg-alert"
                        : "bg-ink-3/60")
                  }
                />
                {prettyMod(state)}
              </p>
              <p
                className={
                  "font-hero text-3xl leading-none tabular-nums " +
                  (tone === "attention" && count > 0
                    ? "text-brand"
                    : tone === "alert" && count > 0
                      ? "text-alert"
                      : "text-ink")
                }
              >
                {count}
              </p>
            </div>
          );
        })}
      </div>

      <section className="space-y-3">
        <header className="flex items-end justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-brand" aria-hidden />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Pending queue
            </h2>
            <span className="text-[10px] tabular-nums text-ink-3">
              {pendingCount === 0 ? "0" : `${pending.length} of ${pendingCount}`}
            </span>
          </div>
          <p className="hidden text-xs text-ink-3 sm:block">
            Read-only — moderation actions ship next.
          </p>
        </header>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 bg-paper-raised/60 px-4 py-10 text-center text-sm text-ink-3">
            No photos awaiting moderation.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-paper-raised">
            <table className="w-full text-xs">
              <thead className="border-b border-border/60 bg-paper-sunken/50 text-left text-[10px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">Storage key</th>
                  <th className="px-3 py-2 font-semibold">Taken</th>
                  <th className="px-3 py-2 text-right font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pending.map((row) => (
                  <tr key={row.id} className="hover:bg-paper-sunken/40">
                    <td className="px-3 py-2 font-medium text-ink">{prettyKind(row.kind)}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-ink-3">
                      {row.storage_key ? truncate(row.storage_key, 48) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-3">
                      {row.taken_at ? relativeTime(row.taken_at) : "no exif"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-3">
                      {relativeTime(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function prettyMod(state: PhotoModerationState): string {
  switch (state) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "flagged":
      return "Flagged";
  }
}

function prettyKind(kind: PhotoKind): string {
  switch (kind) {
    case "roundPhoto":
      return "Round photo";
    case "avatar":
      return "Avatar";
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  return `${Math.round(diffDays / 30)}mo`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : "…" + s.slice(-n + 1);
}
