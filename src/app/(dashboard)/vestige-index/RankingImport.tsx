"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { previewRankingImport, applyRankingImport, type RankingPreview } from "./ranking-actions";

/**
 * Pull the Ranking axis in from the published top-100s.
 *
 * Matching runs automatically, but only high-confidence matches are applied —
 * anything ambiguous or absent from the catalogue is reported here instead of
 * guessed at, since nobody reviews these row by row. Preview first, then
 * apply: one batch write, one Index recompute.
 */
export function RankingImportPanel() {
  const router = useRouter();
  const [preview, setPreview] = useState<RankingPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runPreview() {
    startTransition(async () => {
      const res = await previewRankingImport();
      if (res.ok && res.data) {
        setPreview(res.data);
      } else if (!res.ok) {
        toast.error(res.message);
      }
    });
  }

  function apply() {
    startTransition(async () => {
      const res = await applyRankingImport();
      setConfirmOpen(false);
      if (res.ok) {
        toast.success(`Ranking set on ${res.data ?? 0} courses · index recomputed`);
        setPreview(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">
          {preview ? "" : "Nothing is written until you apply."}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={runPreview}>
            <Download aria-hidden className="size-3.5" />
            {pending ? "Working…" : "Preview"}
          </Button>
          {preview && preview.applying.length > 0 && (
            <Button size="sm" disabled={pending} onClick={() => setConfirmOpen(true)}>
              Apply {preview.applying.length}
            </Button>
          )}
        </div>
      </div>
      {preview && (
        <div className="space-y-4">
          <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="To set" value={preview.applying.length} tone="brand" />
                <Stat label="Unchanged" value={preview.unchangedCount} />
                <Stat label="Hand-set" value={preview.protectedCount} />
                <Stat label="To check" value={preview.exceptions.length} tone="amber" />
              </div>

              {preview.exceptions.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
                    Set these by hand
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-amber/25 bg-amber/[0.03]">
                    <table className="w-full min-w-[460px] text-sm">
                      <tbody className="divide-y divide-rule/40">
                        {preview.exceptions.map((e, i) => (
                          <tr key={`${e.source}-${e.rank}-${i}`}>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs tabular-nums text-ink-3">
                              {e.source} #{e.rank}
                            </td>
                            <td className="px-3 py-1.5 text-ink-2">{e.name}</td>
                            <td className="px-3 py-1.5 text-xs text-ink-3">
                              {e.reason === "ambiguous"
                                ? `did you mean ${e.suggestions.join(", or ")}?`
                                : e.suggestions.length > 0
                                  ? `closest: ${e.suggestions[0]}`
                                  : "not in the catalogue"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Apply the rankings?"
        confirmLabel={`Set ${preview?.applying.length ?? 0} rankings`}
        busy={pending}
        onConfirm={apply}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
      >
        <p>
          Sets Ranking on <strong className="text-ink">{preview?.applying.length ?? 0} courses</strong>{" "}
          and recomputes the Index.
        </p>
        <p className="mt-2 text-ink-3">Anything set by hand is left alone.</p>
      </ConfirmDialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "brand" | "amber" }) {
  const colour = tone === "brand" ? "text-brand" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="rounded-lg border border-rule/60 bg-paper-sunken/30 px-3 py-2">
      <p className={`font-display text-xl font-semibold tabular-nums ${colour}`}>{value}</p>
      <p className="text-[11px] text-ink-3">{label}</p>
    </div>
  );
}
