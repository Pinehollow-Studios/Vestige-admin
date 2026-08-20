"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkSetEditorNotes } from "../actions";
import type { CuratedCourseRow } from "../types";

type ParsedNote = { position: number; note: string };
type ReviewRow = ParsedNote & { course_id: string | null; course_name: string | null };

/**
 * Paste a whole ranking's worth of editor notes in one go, matched by list
 * position (not name-fuzzed - every course here is already on the list, so
 * position is exact and unambiguous). Companion to `BulkImportPanel`, same
 * paste → review → confirm shape, for the notes pass that follows adding
 * the courses themselves.
 */
export function BulkNotesPanel({ listId, courses }: { listId: string; courses: CuratedCourseRow[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const byPosition = useMemo(() => {
    const map = new Map<number, CuratedCourseRow>();
    for (const c of courses) if (c.position != null) map.set(c.position, c);
    return map;
  }, [courses]);

  function close() {
    setOpen(false);
    setText("");
    setRows(null);
  }

  function parse() {
    const parsed = parseNotesText(text);
    if (parsed.length === 0) {
      toast.error('Nothing parsed - use "1. Note text" per line.');
      return;
    }
    setRows(
      parsed.map((p) => {
        const course = byPosition.get(p.position);
        return { ...p, course_id: course?.course_id ?? null, course_name: course?.course_name ?? null };
      }),
    );
  }

  const matched = rows?.filter((r) => r.course_id) ?? [];
  const unmatched = rows?.filter((r) => !r.course_id) ?? [];

  function apply() {
    const entries = matched.map((r) => ({ course_id: r.course_id as string, note: r.note }));
    startTransition(async () => {
      const res = await bulkSetEditorNotes(listId, entries);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Saved ${res.data?.updated ?? entries.length} notes`);
      close();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Bulk editor notes
      </Button>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3 rounded-lg glass-panel p-3">
      {!rows ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-2">
              One line per course: <code>1. Note text</code> - the number is the list position, matched
              against the courses already on this list.
            </p>
            <Button variant="ghost" size="sm" onClick={close}>
              Close
            </Button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"1. Consistently ranked among England's finest heathland courses…\n2. …"}
            className="h-56 w-full rounded-md border border-rule/70 bg-paper-sunken/40 px-3 py-2 font-mono text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          />
          <Button size="sm" disabled={!text.trim()} onClick={parse}>
            Parse & match
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-2">
              {matched.length} matched
              {unmatched.length > 0 ? ` · ${unmatched.length} unmatched position${unmatched.length === 1 ? "" : "s"}` : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setRows(null)}>
                Back
              </Button>
              <Button size="sm" disabled={pending || matched.length === 0} onClick={apply}>
                {pending && <Loader2 aria-hidden className="mr-1.5 size-3.5 animate-spin" />}
                Save {matched.length} notes
              </Button>
            </div>
          </div>
          {/* `table-fixed` is load-bearing: with the default auto layout a long
              note sizes its own column, widening the table past its container
              and pushing the header's Save button off-screen. Fixed layout
              makes `truncate` actually bite. */}
          <div className="max-h-96 overflow-y-auto rounded-md border border-rule/70">
            <table className="w-full table-fixed text-xs">
              <tbody className="divide-y divide-rule/50">
                {rows.map((r, i) => (
                  <tr key={`${r.position}-${i}`} className={!r.course_id ? "bg-red-500/10" : undefined}>
                    <td className="w-10 px-2 py-1.5 align-top text-ink-3">{r.position}</td>
                    <td className="w-40 truncate px-2 py-1.5 align-top" title={r.course_name ?? undefined}>
                      {r.course_name ?? <span className="text-red-400">No course at this position</span>}
                    </td>
                    <td className="truncate px-2 py-1.5 align-top text-ink-2" title={r.note}>
                      {r.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function parseNotesText(text: string): ParsedNote[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\.\s*(.+)$/);
      if (!m) return null;
      return { position: Number(m[1]), note: m[2].trim() };
    })
    .filter((r): r is ParsedNote => r !== null);
}
