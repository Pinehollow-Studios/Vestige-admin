"use client";

import { useState } from "react";
import { ChevronDown, CalendarClock } from "lucide-react";
import { AGE_BANDS, ageFromYear } from "./formula";

/**
 * The Age reference table — the one axis that is *derived* rather than
 * hand-judged, so this explains where its number came from without anyone
 * having to read `formula.ts`.
 *
 * The score column is computed from `ageFromYear()` rather than written out,
 * so the table can never drift from the curve it documents.
 */
export function AgeBands() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-rule/60 bg-paper-sunken/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className="grid size-6 place-items-center rounded-md bg-brand/10 text-brand">
          <CalendarClock aria-hidden className="size-3" />
        </span>
        <span className="text-xs font-semibold text-ink">Age bands</span>
        <span className="text-[11px] text-ink-3">how a founding year becomes a score</span>
        <ChevronDown
          aria-hidden
          className={"ml-auto size-4 text-ink-3 transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="border-t border-rule/60 px-4 pb-4 pt-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="border-b border-rule/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  <th className="py-2 pr-3">Era</th>
                  <th className="py-2 pr-3">Founded</th>
                  <th className="py-2 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/40">
                {AGE_BANDS.map(({ era, from, to }) => {
                  const hi = ageFromYear(from ?? 1766);
                  const lo = ageFromYear(to);
                  const range = hi === lo ? `${lo}` : `${lo}–${hi}`;
                  return (
                    <tr key={era}>
                      <td className="py-1.5 pr-3 text-ink-2">{era}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-ink-3">
                        {from == null ? `before ${to}` : `${from}–${to}`}
                      </td>
                      <td className="py-1.5 text-right font-display font-semibold tabular-nums text-brand">
                        {range}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            Age fills in automatically from the founding year — you only need to touch it when the
            year is wrong or misleading (a modern course on a historic site, or a club that moved).
            Scores slide smoothly between the years shown rather than jumping at each band. The
            floor is 35, not 0, so a fine modern course isn&apos;t capped by its age.
          </p>
        </div>
      )}
    </div>
  );
}
