"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Field, fieldInputClass } from "@/components/admin/editor/EditorShell";
import { setCourseScores, type AxisScoreInput } from "../actions";
import type { CourseDetailRow } from "../types";
import { TIER_SEED } from "../../vestige-index/formula";

const AXES: { key: keyof AxisScoreInput; label: string; hint: string }[] = [
  { key: "age", label: "Age", hint: "How old + pedigreed the course is." },
  { key: "ranking", label: "Ranking", hint: "Encoded external top-100 rankings." },
  { key: "setting", label: "Setting", hint: "The land, views, sense of place." },
];

/**
 * Per-course Vestige Index editor. The three axis scores (0-100 each, blank =
 * unscored → falls back to ranking, then the tier seed) are the editorial
 * inputs; the Index is computed server-side and shown read-only. Saving fires
 * `admin_set_course_scores`, which recomputes the whole Index - so the rest of
 * the ranking shifts too (visible on the Index tab). Debounced autosave to
 * match the rest of the course editor.
 */
export function ScoreEditor({ row }: { row: CourseDetailRow }) {
  // Column → UI vocabulary: heritage = Age, consensus = Ranking (see
  // `vestige-index/formula.ts`).
  const initial: Record<keyof AxisScoreInput, number | ""> = {
    age: row.heritage_score ?? "",
    ranking: row.consensus_score ?? "",
    setting: row.setting_score ?? "",
  };
  const [scores, setScores] = useState(initial);
  const [source, setSource] = useState(row.score_source ?? "");
  const [index, setIndex] = useState<number | null>(row.vestige_index);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ ...initial, source: row.score_source ?? "" });

  function schedule(next: typeof scores, nextSource: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next, nextSource), 700);
  }

  async function save(next: typeof scores, nextSource: string) {
    const values: AxisScoreInput = {
      age: next.age === "" ? null : next.age,
      ranking: next.ranking === "" ? null : next.ranking,
      setting: next.setting === "" ? null : next.setting,
    };
    const invalid = Object.values(values).some(
      (v) => v !== null && (!Number.isFinite(v) || v < 0 || v > 100),
    );
    if (invalid) {
      setSaveState("error");
      return;
    }
    const unchanged =
      AXES.every(({ key }) => next[key] === lastSaved.current[key]) &&
      nextSource === lastSaved.current.source;
    if (unchanged) return;
    setSaveState("saving");
    const res = await setCourseScores(row.id, values, nextSource || null);
    if (res.ok) {
      lastSaved.current = { ...next, source: nextSource };
      setIndex(res.data ?? null);
      setSaveState("saved");
    } else {
      setSaveState("error");
      toast.error(res.message);
    }
  }

  function setAxis(key: keyof AxisScoreInput, raw: string) {
    const v = raw.trim() === "" ? ("" as const) : Number(raw);
    const next = { ...scores, [key]: v };
    setScores(next);
    schedule(next, source);
  }

  const seed = TIER_SEED[row.tier] ?? 48;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {AXES.map(({ key, label, hint }) => (
          <Field key={key} label={label} hint={hint}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              placeholder="–"
              value={scores[key]}
              onChange={(e) => setAxis(key, e.target.value)}
              className={fieldInputClass}
            />
          </Field>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Vestige Index" hint="Computed - weighted blend of the axis scores.">
          <div className="flex h-9 items-center gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums text-brand">
              {index ?? "-"}
            </span>
            <SaveBadge state={saveState} />
          </div>
        </Field>
        <Field label="Score source" hint="Which rankings or basis - for provenance + re-calibration.">
          <input
            type="text"
            value={source}
            placeholder="e.g. Top100GolfCourses #42, NCG 2025"
            onChange={(e) => {
              setSource(e.target.value);
              schedule(scores, e.target.value);
            }}
            className={fieldInputClass}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-rule/60 bg-paper-sunken/40 px-3 py-2 text-xs text-ink-2">
        <span className="tabular-nums">
          A {scores.age === "" ? "seed" : scores.age} · R{" "}
          {scores.ranking === "" ? "–" : scores.ranking} · S{" "}
          {scores.setting === "" ? `seed ${seed}` : scores.setting}
        </span>
        {" → "}
        <span className="font-medium tabular-nums text-ink">index {index ?? "-"}</span>
        <span className="ml-2 text-ink-3">
          ({row.play_count} {row.play_count === 1 ? "player" : "players"})
        </span>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const label = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "0-100 only";
  const tone =
    state === "error" ? "text-alert" : state === "saved" ? "text-brand" : "text-ink-3";
  return <span className={`text-[11px] ${tone}`}>{label}</span>;
}
