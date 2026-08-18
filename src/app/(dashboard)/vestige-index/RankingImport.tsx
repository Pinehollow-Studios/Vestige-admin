"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ListOrdered, Download } from "lucide-react";
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
export function RankingImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<RankingPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runPreview() {
    startTransition(async () => {
      const res = await previewRankingImport();
      if (res.ok && res.data) {
        setPreview(res.data);
        setOpen(true);
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
    <section className="rounded-xl glass-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-brand/10 text-brand">
            <ListOrdered aria-hidden className="size-3.5" />
          </span>
          <h2 className="text-sm font-semibold text-ink">Ranking import</h2>
          <span className="text-xs text-ink-3">
            {preview
              ? `${preview.applying.length} to set · ${preview.exceptions.length} to check`
              : "from the published top-100s"}
          </span>
          <ChevronDown
            aria-hidden
            className={"size-4 text-ink-3 transition-transform " + (open ? "rotate-180" : "")}
          />
        </button>
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

      {open && (
        <div className="space-y-4 border-t border-rule/60 px-5 pb-5 pt-4">
          {!preview ? (
            <p className="text-xs text-ink-2">
              Press <span className="text-ink">Preview</span> to match the published lists against
              the catalogue. Nothing is written until you apply.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Will be set" value={preview.applying.length} tone="brand" />
                <Stat label="Already correct" value={preview.unchangedCount} />
                <Stat label="Yours, untouched" value={preview.protectedCount} />
                <Stat label="Need a look" value={preview.exceptions.length} tone="amber" />
              </div>

              <div className="flex flex-wrap gap-2">
                {preview.sources.map((s) => (
                  <span
                    key={s.short}
                    className="rounded-full border border-rule/70 bg-paper-sunken/50 px-2.5 py-1 text-[11px] text-ink-2"
                  >
                    {s.publisher} · {s.size}
                  </span>
                ))}
              </div>

              {preview.applying.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                    Top of the list
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-rule/50">
                    <table className="w-full min-w-[420px] text-sm">
                      <tbody className="divide-y divide-rule/40">
                        {preview.applying.slice(0, 10).map((p) => (
                          <tr key={p.courseId}>
                            <td className="px-3 py-1.5 text-ink">{p.courseName}</td>
                            <td className="px-3 py-1.5 text-xs text-ink-3">
                              {p.hits.map((h) => `${h.short} #${h.rank}`).join(" · ")}
                            </td>
                            <td className="px-3 py-1.5 text-right font-display font-semibold tabular-nums text-brand">
                              {p.score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.applying.length > 10 && (
                    <p className="mt-1.5 text-[11px] text-ink-3">
                      …and {preview.applying.length - 10} more.
                    </p>
                  )}
                </div>
              )}

              {preview.exceptions.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
                    Couldn&apos;t place these — set them by hand
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
          )}
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
          and recomputes the Vestige Index for every course.
        </p>
        <p className="mt-2 text-ink-3">
          Anything you&apos;ve set by hand is left alone. Re-runnable — safe to do again.
        </p>
      </ConfirmDialog>
    </section>
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
