"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { AgeBandsTable } from "./AgeBands";
import type { IndexWeights } from "./formula";
import { RANKING_SOURCES, scoreForRank } from "@/lib/ranking-import/score";

/**
 * The plain-English reference for the Vestige Index — written for Jack, so he
 * never has to ask what a number means or where it came from.
 *
 * Deliberately explanatory, against the dashboard's general no-helper-text
 * rule: this is the one surface where the scoring model itself is the subject,
 * and getting a score wrong here moves every ranking in the app.
 */
export function IndexGuide({ weights }: { weights: IndexWeights }) {
  const [open, setOpen] = useState(false);
  const sum = weights.age + weights.ranking + weights.setting;
  const pct = (v: number) => (sum > 0 ? Math.round((v / sum) * 100) : 0);

  const AXES = [
    {
      name: "Age",
      weight: pct(weights.age),
      source: "Automatic",
      detail: "From the founding year. You never normally touch it.",
    },
    {
      name: "Ranking",
      weight: pct(weights.ranking),
      source: "Imported",
      detail: "From the published top-100s. Blank for most courses, which is fine.",
    },
    {
      name: "Setting",
      weight: pct(weights.setting),
      source: "Draft — check it",
      detail: "Started off from the landscape. Yours to correct.",
    },
  ];

  const RUNGS = [
    { band: "90–100", meaning: "World top-100 calibre" },
    { band: "80–89", meaning: "Top of GB&I — a genuine pilgrimage" },
    { band: "70–79", meaning: "Regional standout, worth a long drive" },
    { band: "55–69", meaning: "Good, solid members' course" },
    { band: "40–54", meaning: "Ordinary. Fine, unremarkable" },
    { band: "20–39", meaning: "Weak — only if it's local" },
  ];

  const RANK_ROWS = [1, 10, 25, 50, 100, 200];

  return (
    <section className="rounded-xl glass-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-brand/10 text-brand">
          <BookOpen aria-hidden className="size-3.5" />
        </span>
        <h2 className="text-sm font-semibold text-ink">How the Index works</h2>
        <span className="text-xs text-ink-3">what each number means, and where it comes from</span>
        <ChevronDown
          aria-hidden
          className={"ml-auto size-4 text-ink-3 transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-rule/60 px-5 pb-5 pt-4">
          {/* 1 — the three axes at a glance */}
          <div>
            <SectionLabel>The three numbers</SectionLabel>
            <p className="mb-3 text-xs leading-relaxed text-ink-2">
              Every course gets one Index score out of 100. It&apos;s a blend of three things — and
              only one of them is your job.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-rule/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                    <th className="py-2 pr-3">Number</th>
                    <th className="py-2 pr-3 text-right">Weight</th>
                    <th className="py-2 pr-3">Who sets it</th>
                    <th className="py-2">What that means</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {AXES.map((a) => (
                    <tr key={a.name}>
                      <td className="py-2 pr-3 font-medium text-ink">{a.name}</td>
                      <td className="py-2 pr-3 text-right font-display font-semibold tabular-nums text-brand">
                        {a.weight}%
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                            (a.source === "You"
                              ? "border-amber/30 bg-amber/5 text-amber"
                              : "border-rule/70 bg-paper-sunken/50 text-ink-3")
                          }
                        >
                          {a.source}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-ink-2">{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2 — Setting: the one that needs judgement */}
          <div className="rounded-lg border border-amber/25 bg-amber/[0.04] p-4">
            <SectionLabel>Setting — your judgement</SectionLabel>
            <p className="mb-2 text-xs leading-relaxed text-ink-2">
              The land, the views, the sense of place. Not the condition, not the difficulty, and
              not how good the golf is — just: <em>does standing here feel like somewhere?</em>
            </p>
            <p className="mb-3 rounded-md border border-rule/50 bg-paper/40 px-3 py-2 text-xs leading-relaxed text-ink-2">
              Every course already has a <strong className="text-ink">starting number</strong>,
              worked out from where it sits — how close the sea is, how much the land rises and
              falls, and whether it&apos;s in a National Park or National Landscape. Open a course
              and the note under it shows exactly what it used, e.g.{" "}
              <span className="text-ink-3">&ldquo;Links · 1.4km to coast · Norfolk Coast&rdquo;</span>.
              <br />
              <br />
              These are drafts, not verdicts — geography can only see so much. It still leans
              generous towards anything near the sea, so a fine inland course is more likely to be
              under-scored than over-scored. If you know a course, trust yourself over the number.
            </p>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-rule/50 bg-paper/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">High</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">
                  Dunes, clifftops, moorland, mature parkland. Views that make you stop. You&apos;d
                  know where you were from a photograph. Quiet.
                </p>
              </div>
              <div className="rounded-md border border-rule/50 bg-paper/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Low</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">
                  Flat farmland. Pylons, a motorway, houses along the fence. Could be anywhere in
                  England.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] text-sm">
                <tbody className="divide-y divide-rule/40">
                  {RUNGS.map((r) => (
                    <tr key={r.band}>
                      <td className="w-20 py-1.5 pr-3 font-display font-semibold tabular-nums text-brand">
                        {r.band}
                      </td>
                      <td className="py-1.5 text-xs text-ink-2">{r.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
              50 is average, not half marks. Most courses belong between 40 and 60 — if a whole
              county is scoring 70+, it&apos;s drifted. Leave it blank rather than guessing; blank
              falls back to a sensible default and shows as &ldquo;Seed&rdquo;.
            </p>
          </div>

          {/* 3 — Age */}
          <div>
            <SectionLabel>Age — automatic</SectionLabel>
            <p className="mb-3 text-xs leading-relaxed text-ink-2">
              Worked out from the founding year, so it fills itself in. Only touch it when the year
              misleads — a modern course on a historic site, or a club that moved.
            </p>
            <AgeBandsTable />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
              Scores slide smoothly between the years shown. The floor is 35, not 0, so a fine
              modern course isn&apos;t capped by being new.
            </p>
          </div>

          {/* 4 — Ranking */}
          <div>
            <SectionLabel>Ranking — imported</SectionLabel>
            <p className="mb-3 text-xs leading-relaxed text-ink-2">
              Where the published top-100 lists put a course. Pulled in from{" "}
              {RANKING_SOURCES.length} sources — {RANKING_SOURCES.map((s) => s.publisher).join(", ")}{" "}
              — and averaged. If a course appears in more than one, its best position in each is
              used.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] text-sm">
                <thead>
                  <tr className="border-b border-rule/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                    <th className="py-2 pr-3">Position</th>
                    <th className="py-2 text-right">Ranking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {RANK_ROWS.map((r) => (
                    <tr key={r}>
                      <td className="py-1.5 pr-3 tabular-nums text-ink-2">#{r}</td>
                      <td className="py-1.5 text-right font-display font-semibold tabular-nums text-brand">
                        {scoreForRank(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
              Most courses have no ranking at all, and that&apos;s normal — roughly 1 in 10 English
              courses appears in any list. A blank ranking isn&apos;t a bad score: it drops out
              entirely and the other two numbers share its weight. Even last place scores 73,
              because #200 of 1,794 is still the top tenth of English golf.
            </p>
          </div>
          {/* 5 — the final scale */}
          <div>
            <SectionLabel>Why the final number isn&apos;t just the average</SectionLabel>
            <p className="text-xs leading-relaxed text-ink-2">
              Averaging three numbers always pulls towards the middle, so even England&apos;s very
              best would land in the high 80s. The blend decides the <em>order</em>; a fixed curve
              then stretches it onto the published scale — the best course in the country reads
              about <strong className="text-ink">99</strong>, the top twenty sit in the
              <strong className="text-ink"> 90s</strong>, and a typical course lands near{" "}
              <strong className="text-ink">50</strong>. The curve never changes the order, only the
              labels.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
              One rule on top: a course no published list has ever ranked stops at 88. If no panel
              anywhere has noticed it, it isn&apos;t one of the twenty best in England — so the
              summit is reserved for courses with outside evidence behind them.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
      {children}
    </p>
  );
}
