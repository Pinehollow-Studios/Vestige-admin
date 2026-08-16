"use client";

import { ChevronLeft, Hexagon, Share, Star } from "lucide-react";
import type { CuratedCourseRow } from "../types";

/**
 * App-accurate preview of the iOS curated-list detail screen, mirroring
 * `CuratedListDetailView` as it ships today (2026-08): a full-bleed cover that
 * melts out via an alpha mask (no text on the photo), floating glass back/share
 * chrome, a centred masthead on paper (VESTIGE seal pill → Manrope title →
 * CURATED RANKING/LIST kicker), a centred editorial intro (bio, else summary),
 * a progress ring row, then raised cards per course — name + big mint rank
 * numeral, a divider, the quoted italic editor note (deterministic filler when
 * empty, exactly like the app), county + a TO PLAY status pill. Rendered from
 * live editor values at ~0.6 scale inside a {@link PreviewFrame}.
 */

/** The app's filler notes, verbatim (indexed by position % 6). */
const FILLER_NOTES = [
  "A standing test of nerve and judgement from the first tee to the last.",
  "Heath and pine frame every shot - strategy over strength, always.",
  "Firm, fast and honest; the ground game is the whole game here.",
  "Subtle greens and stout par-4s onboarding the patient, punish the loose.",
  "An out-and-back routing that turns with the wind and never lets up.",
  "Generous from the tee, brutal around the greens - placement is everything.",
];

export function CuratedPreviewContent({
  name,
  summary,
  bio,
  isOrdered,
  coverURL,
  courses,
  region,
  tags,
}: {
  name: string;
  summary: string;
  bio: string;
  isOrdered: boolean;
  coverURL: string | null;
  courses: CuratedCourseRow[];
  region?: string;
  tags?: string[];
}) {
  const shown = courses.slice(0, 6);
  const intro = (bio.trim() || summary.trim()) ?? "";
  // Region + tags line: tags uppercased, leading # stripped, region-dupes dropped.
  const cleanedTags = (tags ?? [])
    .map((t) => t.replace(/^#+/, "").trim())
    .filter((t) => t && t.toLowerCase() !== (region ?? "").trim().toLowerCase());
  const metaLine = [region?.trim() || null, ...cleanedTags].filter(Boolean).map((s) =>
    (s as string).toUpperCase(),
  );

  return (
    <div className="relative bg-paper pb-8 text-ink">
      {/* Atmosphere: the app's blue top glow, faded */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, rgba(62,116,176,0.20) 0%, rgba(27,45,66,0.22) 50%, transparent 100%)",
        }}
      />

      {/* Floating glass chrome (back / share) */}
      <div className="absolute inset-x-3 top-2 z-10 flex items-center justify-between">
        <ChromeButton>
          <ChevronLeft aria-hidden className="size-3.5" />
        </ChromeButton>
        <ChromeButton>
          <Share aria-hidden className="size-3" />
        </ChromeButton>
      </div>

      {/* Cover banner — full-bleed, melts out via an alpha mask; no text on the photo */}
      <div
        className="relative h-48 w-full"
        style={{
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 50%, rgba(0,0,0,0.5) 76%, rgba(0,0,0,0.12) 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 50%, rgba(0,0,0,0.5) 76%, rgba(0,0,0,0.12) 92%, transparent 100%)",
        }}
      >
        {coverURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverURL} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full bg-[rgba(20,46,70,0.5)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(242,239,230,0.05) 0px, rgba(242,239,230,0.05) 1px, transparent 1px, transparent 8px)",
            }}
          />
        )}
      </div>

      <div className="relative -mt-3 space-y-4 px-4">
        {/* Masthead — centred, on paper */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-paper/50 px-2 py-[3px]">
            <Hexagon aria-hidden className="size-2.5 text-brand" strokeWidth={2.75} />
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-brand">Vestige</span>
          </span>
          <h2 className="line-clamp-2 font-display text-[26px] font-medium leading-[1.05] tracking-tight text-ink">
            {name || "Untitled list"}
          </h2>
          <p className="text-[7.5px] font-bold uppercase tracking-[0.2em] text-brand">
            {isOrdered ? "Curated ranking" : "Curated list"}
          </p>
        </div>

        {/* Editorial intro — bio, else summary, centred */}
        {intro && (
          <p className="whitespace-pre-wrap text-center text-[11px] leading-relaxed text-ink-2">
            {intro}
          </p>
        )}

        {/* Progress row — ring + "N of M played" + region · tags */}
        <div className="flex items-center justify-center gap-3">
          <ProgressRing total={courses.length} />
          <div className="space-y-[3px]">
            <p className="text-[11px] font-semibold tabular-nums text-ink">
              0 of {courses.length} played
            </p>
            {metaLine.length > 0 && (
              <p className="line-clamp-1 text-[7.5px] font-bold uppercase tracking-[0.16em] text-ink-3">
                {metaLine.join("  ·  ")}
              </p>
            )}
          </div>
        </div>

        {/* Course cards */}
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <span className="grid size-14 place-items-center rounded-[12px] border border-white/12 bg-white/[0.04]">
              <Star aria-hidden className="size-4.5 text-brand" />
            </span>
            <p className="font-display text-[20px] font-medium text-ink">No courses yet</p>
            <p className="max-w-56 text-[11px] leading-snug text-ink-2">
              The Vestige team is putting the editorial entries together.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {shown.map((c, i) => {
                const position = c.position ?? i + 1;
                const note = c.editor_note?.trim() || FILLER_NOTES[position % 6];
                return (
                  <li
                    key={c.course_id}
                    className="space-y-2 rounded-[14px] border border-white/10 bg-paper-raised p-3 shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 font-display text-[14px] font-medium leading-tight text-ink">
                        {c.course_name}
                      </p>
                      {isOrdered && (
                        <span className="shrink-0 font-display text-[26px] font-medium leading-none tabular-nums text-brand">
                          {position}
                        </span>
                      )}
                    </div>
                    <div className="h-px w-full bg-white/10" />
                    <p className="px-1 py-0.5 text-center font-display text-[11px] italic leading-snug text-ink-2">
                      &ldquo;{note}&rdquo;
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-[7.5px] font-bold uppercase tracking-[0.16em] text-ink-3">
                        {c.county_name?.toUpperCase() ?? ""}
                      </p>
                      <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 px-2 py-[3px] text-[7.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                        To play
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {courses.length > shown.length && (
              <p className="text-center text-[9px] uppercase tracking-[0.14em] text-ink-3">
                +{courses.length - shown.length} more
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The 40pt glass icon circle, at preview scale. */
function ChromeButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-7 place-items-center rounded-full border border-white/12 bg-[rgba(14,24,38,0.72)] text-ink backdrop-blur-sm">
      {children}
    </span>
  );
}

/** The 56pt progress ring at preview scale — 0 played in the admin preview. */
function ProgressRing({ total }: { total: number }) {
  void total;
  return (
    <span className="relative grid size-9 shrink-0 place-items-center">
      <span aria-hidden className="absolute inset-0 rounded-full border-[3px] border-white/12" />
      <span className="text-[8px] font-bold tabular-nums text-ink">0</span>
    </span>
  );
}
