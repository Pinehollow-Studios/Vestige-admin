"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bulkAddMatchedCourses, matchCoursesForImport } from "../actions";
import { splitCourseVariant } from "../../courses/actions";
import {
  confidenceFor,
  parseImportText,
  type ImportInputRow,
  type MatchResult,
} from "@/lib/curated-import/match";
import { TOP100_ENGLAND } from "@/lib/curated-import/top100-england";

type Step = "input" | "review";
type ReviewRow = MatchResult & { chosen: string };

const CONFIDENCE_LABEL = { auto: "Matched", ambiguous: "Check this one", none: "No match" } as const;
const CONFIDENCE_DOT = { auto: "bg-brand", ambiguous: "bg-amber", none: "bg-ink-3/50" } as const;

/**
 * Bulk-add courses to a curated list from a ranked name list, instead of
 * searching the catalogue one-by-one via `CoursePicker`. Matching is a
 * client-reviewed heuristic (`lib/curated-import/match.ts`) - nothing writes
 * until the admin confirms the review table, so a bad guess just means an
 * extra click to fix the row, not a bad write.
 */
export function BulkImportPanel({ listId, alreadyOnList }: { listId: string; alreadyOnList: Set<string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [splitNames, setSplitNames] = useState<Record<number, string>>({});
  const [splittingRow, setSplittingRow] = useState<number | null>(null);

  // Rows whose chosen course collides with an earlier row's choice - the
  // matcher's top pick isn't always unique (e.g. sibling courses at the same
  // club can both default to the same catalogue match). Only the first
  // occurrence is kept on confirm; later ones need a different candidate.
  const duplicateRowIndexes = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<number>();
    rows.forEach((r, i) => {
      if (!r.chosen || alreadyOnList.has(r.chosen)) return;
      if (seen.has(r.chosen)) dupes.add(i);
      else seen.add(r.chosen);
    });
    return dupes;
  }, [rows, alreadyOnList]);

  const summary = useMemo(() => {
    let auto = 0;
    let ambiguous = 0;
    let none = 0;
    let already = 0;
    let toAdd = 0;
    let duplicate = 0;
    rows.forEach((r, i) => {
      if (alreadyOnList.has(r.chosen)) {
        already++;
        return;
      }
      if (duplicateRowIndexes.has(i)) {
        duplicate++;
        return;
      }
      const conf = confidenceFor(r.candidates);
      if (conf === "auto") auto++;
      else if (conf === "ambiguous") ambiguous++;
      else none++;
      if (r.chosen) toAdd++;
    });
    return { auto, ambiguous, none, already, toAdd, duplicate };
  }, [rows, alreadyOnList, duplicateRowIndexes]);

  function close() {
    setOpen(false);
    setStep("input");
    setText("");
    setRows([]);
  }

  function runMatch(inputRows: ImportInputRow[]) {
    if (inputRows.length === 0) {
      toast.error("Nothing to match - paste a list first.");
      return;
    }
    startTransition(async () => {
      const res = await matchCoursesForImport(inputRows);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setRows(
        (res.data ?? []).map((r) => {
          const top = r.candidates[0];
          const conf = confidenceFor(r.candidates);
          return { ...r, chosen: top && conf !== "none" ? top.course_id : "" };
        }),
      );
      setStep("review");
    });
  }

  // Clone the colliding row's chosen course into a new sibling course (same
  // polygon/club/county - just a distinct id + name) so this row can point
  // at its own `course_id` instead of losing to the earlier row's pick.
  async function handleSplit(rowIndex: number, name: string) {
    const row = rows[rowIndex];
    if (!row?.chosen || !name.trim()) return;
    setSplittingRow(rowIndex);
    const res = await splitCourseVariant(row.chosen, name);
    setSplittingRow(null);
    if (!res.ok || !res.data) {
      toast.error(!res.ok ? res.message : "Split failed.");
      return;
    }
    const created = res.data;
    setRows((prev) =>
      prev.map((r, i) =>
        i === rowIndex
          ? {
              ...r,
              chosen: created.id,
              candidates: [
                {
                  course_id: created.id,
                  course_name: created.name,
                  club_name: created.club_name,
                  county_name: created.county_name,
                  score: 1,
                },
                ...r.candidates,
              ],
            }
          : r,
      ),
    );
    toast.success(`Created "${created.name}" as a separate course`);
  }

  function onConfirm() {
    const picks = rows
      .filter((r, i) => r.chosen && !alreadyOnList.has(r.chosen) && !duplicateRowIndexes.has(i))
      .map((r) => ({ course_id: r.chosen, position: r.rank }));
    if (picks.length === 0) {
      toast.error("Nothing selected to add.");
      return;
    }
    startTransition(async () => {
      const res = await bulkAddMatchedCourses(listId, picks);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Added ${res.data?.added ?? picks.length} courses`);
      close();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Bulk import
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-lg glass-panel p-3">
      {step === "input" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-2">
              Paste a ranked list (a <code>name</code> column, optionally <code>rank</code> / <code>location</code>) or
              one course name per line.
            </p>
            <Button variant="ghost" size="sm" onClick={close}>
              Close
            </Button>
          </div>
          <Button size="sm" disabled={pending} onClick={() => runMatch(TOP100_ENGLAND)}>
            {pending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : "Use England's Top 100"}
          </Button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="rank,name,location&#10;1,Royal St George's Golf Club,Kent"
            className="h-32 w-full rounded-md border border-rule/70 bg-paper-sunken/40 px-3 py-2 font-mono text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          />
          <Button size="sm" variant="outline" disabled={pending || !text.trim()} onClick={() => runMatch(parseImportText(text))}>
            {pending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : "Parse & match"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-2">
              {summary.auto} matched · {summary.ambiguous} to check · {summary.none} unmatched
              {summary.already > 0 ? ` · ${summary.already} already on list` : ""}
              {summary.duplicate > 0 ? ` · ${summary.duplicate} duplicate picks` : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setStep("input")}>
                Back
              </Button>
              <Button size="sm" disabled={pending || summary.toAdd === 0} onClick={onConfirm}>
                {pending && <Loader2 aria-hidden className="mr-1.5 size-3.5 animate-spin" />}
                Add {summary.toAdd} courses
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-md border border-rule/70">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-rule/50">
                {rows.map((r, i) => {
                  const conf = confidenceFor(r.candidates);
                  const onList = alreadyOnList.has(r.chosen);
                  const isDuplicate = duplicateRowIndexes.has(i);
                  return (
                    <tr key={`${r.rank}-${r.input_name}`} className={isDuplicate ? "bg-red-500/10" : undefined}>
                      <td className="w-10 px-2 py-1.5 text-ink-3">{r.rank}</td>
                      <td className="min-w-0 max-w-[10rem] truncate px-2 py-1.5" title={r.input_name}>
                        {r.input_name}
                      </td>
                      <td className="px-2 py-1.5">
                        {onList ? (
                          <span className="text-ink-3">Already on list</span>
                        ) : (
                          <select
                            value={r.chosen}
                            onChange={(e) => {
                              const chosen = e.target.value;
                              setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, chosen } : row)));
                            }}
                            className="w-full max-w-xs rounded border border-rule/70 bg-paper-sunken/40 px-1.5 py-1 text-xs text-ink"
                          >
                            <option value="">— skip —</option>
                            {r.candidates.map((c) => (
                              <option key={c.course_id} value={c.course_id}>
                                {c.course_name} · {c.club_name ?? "—"} · {c.county_name ?? "—"} ({Math.round(c.score * 100)}%)
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="w-40 px-2 py-1.5">
                        {isDuplicate ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-red-400">
                              <span aria-hidden className="size-1.5 rounded-full bg-red-400" />
                              Duplicate pick
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                value={splitNames[i] ?? r.input_name}
                                onChange={(e) => setSplitNames((prev) => ({ ...prev, [i]: e.target.value }))}
                                placeholder="New course name"
                                className="w-full min-w-0 rounded border border-rule/70 bg-paper-sunken/40 px-1 py-0.5 text-[10px] text-ink"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 shrink-0 px-1.5 text-[10px]"
                                disabled={splittingRow === i}
                                onClick={() => handleSplit(i, splitNames[i] ?? r.input_name)}
                              >
                                {splittingRow === i ? <Loader2 aria-hidden className="size-3 animate-spin" /> : "Split"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">
                            <span aria-hidden className={cn("size-1.5 rounded-full", CONFIDENCE_DOT[conf])} />
                            {onList ? "On list" : CONFIDENCE_LABEL[conf]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
