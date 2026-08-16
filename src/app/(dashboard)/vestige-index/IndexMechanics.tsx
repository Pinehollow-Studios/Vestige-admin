"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { recomputeVestigeIndex, setVestigeIndexWeights } from "../courses/actions";
import { projectIndex, type IndexWeights } from "./formula";

/** A fixed reference course used to show, live, what the current weights do. */
const EXAMPLE = { design: 90, setting: 85, heritage: 95, consensus: 88 } as const;

const WEIGHT_FIELDS: { key: keyof IndexWeights; label: string; hint: string }[] = [
  { key: "design", label: "Design", hint: "The golf itself — routing, variety, strategy" },
  { key: "setting", label: "Setting", hint: "The land, views, sense of place" },
  { key: "heritage", label: "Heritage", hint: "Age, architect, pedigree, cultural weight" },
  { key: "consensus", label: "Consensus", hint: "Encoded external top-100 rankings" },
  { key: "pull", label: "Pull", hint: "Live play demand — dormant until the base is real" },
];

/**
 * The Vestige Index control panel - the global mechanics, laid bare. Shows the
 * exact blend formula, the five input weights as bound slider+numeric pairs, a
 * live worked example, and a recompute-now action. Built so Jack can see *why*
 * every Index is what it is and tune the blend with full confidence. The axis
 * scores themselves are edited per-course in the table below.
 */
export function IndexMechanics({
  weights,
  updatedAt,
  updatedByName,
}: {
  weights: IndexWeights;
  updatedAt: string | null;
  updatedByName: string | null;
}) {
  const router = useRouter();
  const [w, setW] = useState<IndexWeights>(weights);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const dirty = WEIGHT_FIELDS.some(({ key }) => w[key] !== weights[key]);
  const sum = w.design + w.setting + w.heritage + w.consensus + w.pull;
  const exampleIndex = projectIndex(EXAMPLE, "championship", 1895, null, w);

  function setWeight(key: keyof IndexWeights, v: number) {
    if (!Number.isFinite(v)) return;
    setW((s) => ({ ...s, [key]: Math.max(0, Math.min(1, v)) }));
  }

  function pct(v: number) {
    return sum > 0 ? Math.round((v / sum) * 100) : 0;
  }

  function applyWeights() {
    startTransition(async () => {
      const res = await setVestigeIndexWeights(w);
      setConfirmOpen(false);
      if (res.ok) {
        toast.success("Weights applied · index recomputed");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function recompute() {
    startTransition(async () => {
      const res = await recomputeVestigeIndex();
      if (res.ok) {
        toast.success(`Recomputed ${res.data?.toLocaleString() ?? ""} courses`);
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
            <SlidersHorizontal aria-hidden className="size-3.5" />
          </span>
          <h2 className="text-sm font-semibold text-ink">Index mechanics</h2>
          <span className="text-xs tabular-nums text-ink-3">
            D {pct(w.design)} · S {pct(w.setting)} · H {pct(w.heritage)} · C {pct(w.consensus)}
            {w.pull > 0 && <> · P {pct(w.pull)}</>}%
            {dirty && <span className="text-amber"> · unsaved</span>}
          </span>
          <ChevronDown
            aria-hidden
            className={"size-4 text-ink-3 transition-transform " + (open ? "rotate-180" : "")}
          />
        </button>
        <Button size="sm" variant="outline" disabled={pending} onClick={recompute}>
          <RefreshCw aria-hidden className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
          {pending ? "Working…" : "Recompute now"}
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-rule/60 px-5 pb-5 pt-4">
          {/* The formula, written out. */}
          <div className="rounded-lg border border-rule/60 bg-paper-sunken/40 px-4 py-3">
            <p className="font-mono text-[13px] leading-relaxed text-ink-2">
              <span className="text-brand">index</span> = clamp( (<span className="text-ink">wD</span>·design +{" "}
              <span className="text-ink">wS</span>·setting + <span className="text-ink">wH</span>·heritage +{" "}
              <span className="text-ink">wC</span>·consensus + <span className="text-ink">wP</span>·pull) / Σw, 0, 100 )
            </p>
            <p className="mt-1 text-xs text-ink-3">
              Design, setting + heritage are hand-scored 0-100 (blank falls back to consensus, then the tier seed).
              Consensus is the encoded external rankings — when a course has none, its weight redistributes. Pull is
              live play demand, weighted 0 until the user base can carry it.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            {/* Weight controls. */}
            <div className="space-y-3">
              {WEIGHT_FIELDS.map(({ key, label, hint }) => (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor={`weight-${key}`}
                    title={hint}
                    className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3"
                  >
                    {label}
                  </label>
                  <input
                    id={`weight-${key}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={w[key]}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                    className="h-1.5 min-w-24 flex-1 cursor-pointer accent-brand"
                  />
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={w[key]}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                    className="h-9 w-20 rounded-lg border border-rule/70 bg-paper-sunken/40 px-3 text-sm tabular-nums text-ink outline-none focus:border-brand/50"
                  />
                  <span className="w-10 text-right text-xs tabular-nums text-ink-3">{pct(w[key])}%</span>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-ink-3">
                  {sum <= 0 ? (
                    <span className="text-alert">Weights can&apos;t all be zero.</span>
                  ) : (
                    <>
                      Σ {sum.toFixed(2)} (renormalised at compute).{" "}
                      {updatedAt
                        ? `Last tuned ${relativeTime(updatedAt)} ago${updatedByName ? ` by ${updatedByName}` : ""}.`
                        : "Not yet tuned."}{" "}
                      Applying recomputes every course.
                    </>
                  )}
                </p>
                <Button size="sm" disabled={pending || !dirty || sum <= 0} onClick={() => setConfirmOpen(true)}>
                  Apply
                </Button>
              </div>
            </div>

            {/* Live worked example. */}
            <div className="rounded-lg border border-rule/60 bg-paper-sunken/30 px-4 py-3 lg:w-60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Worked example</p>
              <p className="mt-1 text-xs text-ink-3">
                design {EXAMPLE.design} · setting {EXAMPLE.setting}
                <br />
                heritage {EXAMPLE.heritage} · consensus {EXAMPLE.consensus}
              </p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="text-ink-3">→ index</span>
                <span className="font-display text-2xl font-semibold tabular-nums text-brand">{exampleIndex}</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-3">at the staged weights</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Apply blend weights?"
        confirmLabel="Apply weights"
        busy={pending}
        onConfirm={applyWeights}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
      >
        <p>
          Applying these weights recomputes the Vestige Index for{" "}
          <strong className="text-ink">every course</strong> - shifting rankings across the app.
        </p>
        <p className="mt-2 text-ink-3">Reversible: set them back and re-apply.</p>
      </ConfirmDialog>
    </section>
  );
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}
