"use client";

import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Hexagon, Share, Star } from "lucide-react";
import type { CuratedCourseRow } from "../types";

/**
 * App-accurate preview of the iOS curated-list detail screen, mirroring
 * `CuratedListDetailView` + `CuratedListRoll` as rebuilt in 0.4.1: a
 * full-bleed cover that melts out via an alpha mask (no text on the photo),
 * floating chrome (back · Save capsule · share), a centred masthead
 * (VESTIGE seal pill → Manrope title → CURATED RANKING/LIST kicker), the
 * centred editorial intro with its READ MORE fold, the progress-ring row,
 * a segmented All / Played / To play filter, then the roll — played rows as
 * mint-washed gradient-bordered cards, unplayed rows flat with hairlines,
 * each with the "NO." rank cluster, PLAYED dateline and View pill. Editor
 * notes render at full length only when written (the filler-quote era is
 * over — ListCourseRow.swift). ~0.6 scale inside a {@link PreviewFrame};
 * the first row is drawn in its played state so both looks are visible.
 */

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

      {/* Floating chrome: back · (Save capsule · share) */}
      <div className="absolute inset-x-3 top-2 z-10 flex items-center justify-between">
        <ChromeButton>
          <ChevronLeft aria-hidden className="size-3.5" />
        </ChromeButton>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-6 items-center gap-1 rounded-full border border-white/12 bg-[rgba(14,24,38,0.72)] px-2 text-[8.5px] font-semibold text-ink backdrop-blur-sm">
            <Bookmark aria-hidden className="size-2.5" />
            Save
          </span>
          <ChromeButton>
            <Share aria-hidden className="size-3" />
          </ChromeButton>
        </div>
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

        {/* Editorial intro — standfirst + READ MORE fold, centred */}
        {intro && (
          <div className="flex flex-col items-center gap-2">
            <p className="line-clamp-4 whitespace-pre-wrap text-center text-[9px] leading-relaxed text-ink-2">
              {intro}
            </p>
            {(bio.trim().length > 180 || (bio.trim() && summary.trim())) && (
              <span className="inline-flex items-center gap-1 text-[6px] font-bold uppercase tracking-[0.84px] text-brand">
                Read more
                <ChevronDown aria-hidden className="size-2" />
              </span>
            )}
          </div>
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

        {/* Segmented filter — All · Played · To play (VSegmentedPicker) */}
        {courses.length > 0 && (
          <div className="mx-auto flex w-fit items-center gap-0.5 rounded-[8px] border border-white/12 bg-[rgba(20,46,70,0.5)] p-[2px]">
            <span className="rounded-[6px] border border-white/[0.18] bg-paper-raised px-2 py-[3px] text-[7px] font-semibold text-ink">
              All
            </span>
            <span className="px-2 py-[3px] text-[7px] font-medium text-ink-2">Played 1</span>
            <span className="px-2 py-[3px] text-[7px] font-medium text-ink-2">
              To play {Math.max(courses.length - 1, 0)}
            </span>
          </div>
        )}

        {/* The roll — CuratedCourseRow */}
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
            <ul className="space-y-1">
              {shown.map((c, i) => {
                const position = c.position ?? i + 1;
                const note = c.editor_note?.trim();
                // First row renders in its played state so both looks show.
                const played = i === 0;
                const nextUnplayed = !played && i < shown.length - 1;
                return (
                  <li key={c.course_id}>
                    <div
                      className={played ? "rounded-[11px] px-2.5 py-2.5" : "py-2.5"}
                      style={
                        played
                          ? {
                              border: "1px solid transparent",
                              background:
                                "linear-gradient(rgba(91,228,195,0.084), rgba(91,228,195,0.084)) padding-box," +
                                "linear-gradient(to bottom right, #5BE4C3, #8FE85B) border-box",
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2">
                        {isOrdered && (
                          <span
                            className={`flex shrink-0 items-baseline gap-[2px] ${played ? "text-brand" : "text-ink-3"}`}
                          >
                            <span className="text-[6px] font-bold tracking-[0.84px]">NO.</span>
                            <span className="font-display text-[10px] font-medium tabular-nums">
                              {position}
                            </span>
                          </span>
                        )}
                        <p className="min-w-0 flex-1 font-display text-[11.5px] font-medium leading-tight text-ink">
                          {c.course_name}
                        </p>
                        <span
                          className={`inline-flex shrink-0 items-center gap-[2px] rounded-full px-[7px] py-1 text-[7px] font-semibold ${
                            played
                              ? "text-[#06231C]"
                              : "border border-white/10 bg-[rgba(14,24,38,0.72)] text-ink"
                          }`}
                          style={
                            played
                              ? { background: "linear-gradient(to bottom right, #5BE4C3, #8FE85B)" }
                              : undefined
                          }
                        >
                          View
                          <ChevronRight aria-hidden className="size-2" />
                        </span>
                      </div>
                      <div className="mt-[3px] flex items-center gap-1 text-[6px] font-bold uppercase tracking-[0.72px]">
                        {played && (
                          <>
                            <Check aria-hidden className="size-[7px] text-brand" strokeWidth={3.5} />
                            <span className="text-brand">Played</span>
                            <span className="text-ink-3">·</span>
                          </>
                        )}
                        <span className="line-clamp-1 text-ink-3">
                          {c.county_name?.toUpperCase() ?? ""}
                        </span>
                      </div>
                      {note && (
                        <p className="pt-1 font-display text-[9.5px] italic leading-snug text-ink-2">
                          &ldquo;{note}&rdquo;
                        </p>
                      )}
                    </div>
                    {nextUnplayed && <div className="mt-1 h-px bg-white/10" />}
                  </li>
                );
              })}
            </ul>
            {courses.length > shown.length && (
              <p className="text-center text-[9px] uppercase tracking-[0.14em] text-ink-3">
                +{courses.length - shown.length} more
              </p>
            )}
            <p className="text-center text-[7px] text-ink-3/70">
              First row shown in its played state.
            </p>
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
