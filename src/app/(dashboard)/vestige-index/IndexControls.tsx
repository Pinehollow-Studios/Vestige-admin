"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, ListOrdered, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recomputeVestigeIndex } from "../courses/actions";
import type { IndexWeights } from "./formula";
import { IndexGuideContent } from "./IndexGuide";
import { IndexWeightsPanel } from "./IndexMechanics";
import { RankingImportPanel } from "./RankingImport";

type PanelKey = "guide" | "weights" | "import";

/**
 * One control strip for everything that isn't the courses themselves.
 *
 * This surface used to stack three separate collapsible panels above the
 * table, so the actual work — the ranked list — started a long way down the
 * page and every panel competed for attention. They're now one row of quiet
 * buttons opening a single panel at a time, which keeps the page about the
 * courses and puts reference material one click away rather than in the way.
 */
export function IndexControls({
  weights,
  updatedAt,
  updatedByName,
}: {
  weights: IndexWeights;
  updatedAt: string | null;
  updatedByName: string | null;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [pending, startTransition] = useTransition();

  const TABS: { key: PanelKey; label: string; icon: typeof BookOpen }[] = [
    { key: "guide", label: "How it works", icon: BookOpen },
    { key: "weights", label: "Weights", icon: SlidersHorizontal },
    { key: "import", label: "Ranking import", icon: ListOrdered },
  ];

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = panel === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPanel(active ? null : key)}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-rule/60 bg-paper-sunken/30 text-ink-2 hover:text-ink")
              }
            >
              <Icon aria-hidden className="size-3.5" />
              {label}
            </button>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={pending}
          onClick={recompute}
        >
          <RefreshCw aria-hidden className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
          {pending ? "Working…" : "Recompute"}
        </Button>
      </div>

      {panel && (
        <section className="rounded-xl glass-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">
              {TABS.find((t) => t.key === panel)?.label}
            </h2>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label="Close"
              className="text-ink-3 transition-colors hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          {panel === "guide" && <IndexGuideContent weights={weights} />}
          {panel === "weights" && (
            <IndexWeightsPanel
              weights={weights}
              updatedAt={updatedAt}
              updatedByName={updatedByName}
            />
          )}
          {panel === "import" && <RankingImportPanel />}
        </section>
      )}
    </div>
  );
}
