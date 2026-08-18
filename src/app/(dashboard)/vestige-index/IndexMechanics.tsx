"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { setVestigeIndexWeights } from "../courses/actions";
import type { IndexWeights } from "./formula";

const WEIGHT_FIELDS: { key: keyof IndexWeights; label: string; hint: string }[] = [
  { key: "age", label: "Age", hint: "How old + pedigreed the course is" },
  { key: "ranking", label: "Ranking", hint: "Encoded external top-100 rankings" },
  { key: "setting", label: "Setting", hint: "The land, views, sense of place" },
];

/**
 * The Vestige Index control panel - the global mechanics, laid bare. Shows the
 * exact blend formula, the three input weights as bound slider+numeric pairs, a
 * live worked example, and a recompute-now action. Built so Jack can see *why*
 * every Index is what it is and tune the blend with full confidence. The axis
 * scores themselves are edited per-course in the table below.
 */
export function IndexWeightsPanel({
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

  const dirty = WEIGHT_FIELDS.some(({ key }) => w[key] !== weights[key]);
  const sum = w.age + w.ranking + w.setting;

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

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {WEIGHT_FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`weight-${key}`}
              title={hint}
              className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3"
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
            ) : updatedAt ? (
              `Last changed ${relativeTime(updatedAt)} ago${updatedByName ? ` by ${updatedByName}` : ""}`
            ) : null}
          </p>
          <Button size="sm" disabled={pending || !dirty || sum <= 0} onClick={() => setConfirmOpen(true)}>
            Apply
          </Button>
        </div>
      </div>

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
          Recomputes the Index for <strong className="text-ink">every course</strong>. Reversible.
        </p>
      </ConfirmDialog>
    </div>
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
