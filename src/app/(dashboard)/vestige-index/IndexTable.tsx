"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCoursesScores } from "../courses/actions";
import { TIER_LABELS, type CourseTier } from "../courses/types";
import { projectIndex, isUnscored, TIER_SEED, type IndexWeights } from "./formula";

export type IndexRow = {
  rank: number;
  id: string;
  name: string;
  clubName: string | null;
  countyName: string | null;
  tier: CourseTier;
  established: number | null;
  age: number | null;
  ranking: number | null;
  setting: number | null;
  scoreSource: string | null;
  vestigeIndex: number | null;
  playCount: number;
};

type Edit = { age: string; ranking: string; setting: string; source: string };

const AXES = ["age", "ranking", "setting"] as const;
type Axis = (typeof AXES)[number];

const AXIS_LABELS: Record<Axis, string> = {
  age: "Age",
  ranking: "Ranking",
  setting: "Setting",
};

/**
 * The ranked Index table as a *batch editor*. The three axis scores (age /
 * ranking / setting; blank = unscored) + the source note stage
 * locally (not autosaved); each edited row previews its projected Index live
 * from the real blend, and a sticky bar commits every change at once via the
 * batch RPC (one recompute, not one per edit). The Index itself is computed,
 * read-only. Expanding a row shows the blend breakdown + the source note.
 */
export function IndexTable({ rows, weights }: { rows: IndexRow[]; weights: IndexWeights }) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editFor = (row: IndexRow): Edit =>
    edits[row.id] ?? {
      age: row.age == null ? "" : String(row.age),
      ranking: row.ranking == null ? "" : String(row.ranking),
      setting: row.setting == null ? "" : String(row.setting),
      source: row.scoreSource ?? "",
    };

  /** Parse one staged axis value: blank = null (unscored); otherwise a number. */
  const axisNum = (row: IndexRow, axis: Axis): number | null => {
    const raw = editFor(row)[axis].trim();
    return raw === "" ? null : Number(raw);
  };
  const axisValid = (row: IndexRow, axis: Axis): boolean => {
    const n = axisNum(row, axis);
    return n === null || (Number.isFinite(n) && n >= 0 && n <= 100);
  };
  const rowValid = (row: IndexRow): boolean => AXES.every((a) => axisValid(row, a));
  const isDirty = (row: IndexRow): boolean => {
    const e = editFor(row);
    const scoreChanged = AXES.some((a) => axisValid(row, a) && axisNum(row, a) !== row[a]);
    const sourceChanged = e.source.trim() !== (row.scoreSource ?? "").trim();
    return scoreChanged || sourceChanged;
  };

  const dirtyRows = useMemo(
    () => rows.filter((r) => isDirty(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, edits],
  );
  const anyInvalid = useMemo(
    () => rows.some((r) => !rowValid(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, edits],
  );

  function patch(id: string, base: Edit, key: keyof Edit, value: string) {
    setEdits((s) => ({ ...s, [id]: { ...base, ...(s[id] ?? base), [key]: value } }));
  }

  function discard() {
    setEdits({});
  }

  function save() {
    if (dirtyRows.length === 0) return;
    if (anyInvalid) {
      toast.error("Some scores are outside 0-100.");
      return;
    }
    const items = dirtyRows.map((r) => ({
      courseId: r.id,
      age: axisNum(r, "age"),
      ranking: axisNum(r, "ranking"),
      setting: axisNum(r, "setting"),
      source: editFor(r).source.trim() || null,
    }));
    startTransition(async () => {
      const res = await setCoursesScores(items);
      if (res.ok) {
        toast.success(`Saved ${res.data?.toLocaleString() ?? items.length} courses · index recomputed`);
        setEdits({});
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  if (rows.length === 0) {
    return <p className="rounded-xl glass-panel p-6 text-center text-sm text-ink-3">No courses match.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl glass-panel">
        {/* Horizontal scroll so the three score columns don't force the page
            wider than the viewport on a phone. */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-rule/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              <th className="px-3 py-2.5 text-right">#</th>
              <th className="px-3 py-2.5">Course</th>
              <th className="hidden px-3 py-2.5 xl:table-cell">Tier</th>
              {AXES.map((a) => (
                <th key={a} className="px-2 py-2.5 text-right">
                  {AXIS_LABELS[a]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right">Index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/40">
            {rows.map((row) => {
              const e = editFor(row);
              const dirty = isDirty(row);
              const valid = rowValid(row);
              const open = expanded === row.id;
              const staged = {
                age: axisNum(row, "age"),
                ranking: axisNum(row, "ranking"),
                setting: axisNum(row, "setting"),
              };
              const projected = valid ? projectIndex(staged, row.tier, row.established, weights) : null;
              const showProjected = dirty && valid && projected !== row.vestigeIndex;
              const provisional = isUnscored({
                age: row.age,
                ranking: row.ranking,
                setting: row.setting,
              });
              return (
                <FragmentRow key={row.id}>
                  <tr className={dirty ? "bg-brand/[0.04] transition-colors" : "transition-colors hover:bg-paper-sunken/30"}>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {dirty && <span aria-hidden className="size-1.5 rounded-full bg-amber" title="Unsaved" />}
                        {row.rank}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : row.id)}
                          className="mt-0.5 text-ink-3 transition-colors hover:text-ink"
                          aria-label={open ? "Hide breakdown" : "Show breakdown"}
                        >
                          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/courses/${row.id}`} className="font-medium text-ink hover:text-brand">
                              {row.name}
                            </Link>
                            {provisional && (
                              <span
                                className="inline-flex shrink-0 items-center rounded-full border border-amber/30 bg-amber/5 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-amber"
                                title="No hand-scored axes yet. Index running on the provisional tier seed"
                              >
                                Seed
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-ink-3">
                            {[row.clubName, row.countyName].filter(Boolean).join(" · ") || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 xl:table-cell">
                      <span className="inline-flex items-center rounded-full border border-rule/70 bg-paper-sunken/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-2">
                        {TIER_LABELS[row.tier]}
                      </span>
                    </td>
                    {AXES.map((axis) => (
                      <td key={axis} className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          placeholder="–"
                          value={e[axis]}
                          onChange={(ev) => patch(row.id, e, axis, ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") ev.currentTarget.blur();
                          }}
                          className={
                            "h-8 w-14 rounded-md border bg-paper-sunken/40 px-1.5 text-right text-sm tabular-nums text-ink outline-none focus:border-brand/50 " +
                            (axisValid(row, axis) ? "border-rule/70" : "border-alert/70 text-alert")
                          }
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {showProjected ? (
                        <span
                          className="font-display text-base font-semibold tabular-nums text-amber"
                          title="Projected from your edits, save to apply"
                        >
                          {projected}
                        </span>
                      ) : (
                        <span className="font-display text-base font-semibold tabular-nums text-brand">
                          {row.vestigeIndex ?? "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-paper-sunken/20">
                      <td />
                      <td colSpan={6} className="px-3 pb-3 pt-0">
                        <div className="space-y-2 rounded-lg border border-rule/50 bg-paper/40 p-3">
                          <p className="font-mono text-xs text-ink-2">
                            A {row.age ?? "seed"} · R {row.ranking ?? "–"} · S {row.setting ?? "seed"} → index{" "}
                            <span className="text-brand">{row.vestigeIndex ?? "-"}</span>
                            <span className="text-ink-3">
                              {" "}
                              (tier seed {TIER_SEED[row.tier]} · {row.playCount}{" "}
                              {row.playCount === 1 ? "play" : "plays"})
                            </span>
                          </p>
                          <label className="block">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                              Score source
                            </span>
                            <input
                              type="text"
                              value={e.source}
                              placeholder="e.g. Top100GolfCourses #42, NCG 2025"
                              onChange={(ev) => patch(row.id, e, "source", ev.target.value)}
                              className="mt-1 h-9 w-full rounded-lg border border-rule/70 bg-paper-sunken/40 px-3 text-sm text-ink outline-none focus:border-brand/50"
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {dirtyRows.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-paper-raised/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-paper-raised/80">
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-ink">{dirtyRows.length}</span>{" "}
            {dirtyRows.length === 1 ? "course" : "courses"} edited
            {anyInvalid && <span className="text-alert"> · fix out-of-range values to save</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={pending} onClick={discard}>
              Discard
            </Button>
            <Button size="sm" disabled={pending || anyInvalid} onClick={save}>
              {pending ? "Saving…" : `Save ${dirtyRows.length} ${dirtyRows.length === 1 ? "change" : "changes"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A keyed fragment so a row + its expansion render as siblings in <tbody>. */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
