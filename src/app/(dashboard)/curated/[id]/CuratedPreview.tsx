"use client";

import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Hexagon, Share, Star } from "lucide-react";
import type { CuratedCourseRow } from "../types";

/**
 * App-accurate preview of the iOS curated-list detail screen, rebuilt
 * 2026-08-28 directly from the SwiftUI source (CuratedListDetailView +
 * CuratedListHero + CuratedListRoll + ListMapCard) at ~0.6 scale:
 *
 *   cover (melt mask) → masthead (seal pill · h1 title · kicker) →
 *   standfirst + READ MORE → progress ring row → the "ON THE MAP" plate →
 *   filter tabs (only at ≥8 courses, like the app) → the roll.
 *
 * Roll rows are the 2026-08-22 editorial anatomy: a LEFT-STACKED column
 * ("NO. n" eyebrow over the display-face name over the PLAYED · COUNTY
 * dateline) with the View pill centred on the right and Jack's note in the
 * editorial italic full-width beneath. Played rows lift onto a mint-washed
 * card inside the mint→lime gradient edge that BLEEDS past the flat rows'
 * margins; unplayed rows are flat paper with hairlines between neighbours.
 * Notes render only when written — the filler-quote era is over.
 * The first row is drawn in its played state so both looks are visible.
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
  const standfirst = summary.trim();
  const bioText = bio.trim() && bio.trim() !== standfirst ? bio.trim() : "";
  const showsFold = bioText !== "" && (standfirst !== "" || bioText.length > 180);
  const playedCount = courses.length > 0 ? 1 : 0;
  // Region + tags line: tags uppercased, leading # stripped, region-dupes dropped.
  const cleanedTags = (tags ?? [])
    .map((t) => t.replace(/^#+/, "").trim())
    .filter((t) => t && t.toLowerCase() !== (region ?? "").trim().toLowerCase());
  const metaLine = [region?.trim() || null, ...cleanedTags].filter(Boolean).map((s) =>
    (s as string).toUpperCase(),
  );

  return (
    <div className="relative bg-paper pb-8 text-ink">
      {/* VAtmosphere: the blue top glow */}
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

      {/* Cover banner — full-bleed, melts out via the alpha mask */}
      <div
        className="relative h-44 w-full"
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

      {/* Content column: px = s6·0.6, nestled up into the melt (−s4·0.6). */}
      <div className="relative -mt-2 space-y-[13px] px-[13px]">
        {/* Masthead — centred: seal pill · h1 title · kicker */}
        <div className="flex flex-col items-center gap-[7px] text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-paper/50 px-[7px] py-[4px] text-brand">
            <Hexagon aria-hidden className="size-[9px]" strokeWidth={2.75} />
            <span className="text-[6px] font-bold tracking-[0.84px]">VESTIGE</span>
          </span>
          <h2 className="line-clamp-2 font-display text-[26px] font-medium leading-[1.05] tracking-tight text-ink">
            {name || "Untitled list"}
          </h2>
          <p className="text-[6px] font-bold uppercase tracking-[0.84px] text-brand">
            {isOrdered ? "Curated ranking" : "Curated list"}
          </p>
        </div>

        {/* Editorial intro — standfirst (or bio teaser) + READ MORE fold */}
        {(standfirst || bioText) && (
          <div className="flex flex-col items-center gap-[7px]">
            <p className="line-clamp-4 whitespace-pre-wrap text-center text-[9px] leading-relaxed text-ink-2">
              {standfirst || bioText}
            </p>
            {showsFold && (
              <span className="inline-flex items-center gap-1 text-[6px] font-bold uppercase tracking-[0.84px] text-brand">
                Read more
                <ChevronDown aria-hidden className="size-2" />
              </span>
            )}
          </div>
        )}

        {/* Progress row — ring (played count) + "N of M played" + region/tags */}
        <div className="flex items-center justify-center gap-2.5">
          <ProgressRing
            progress={courses.length > 0 ? playedCount / courses.length : 0}
            label={String(playedCount)}
          />
          <div className="space-y-[2px]">
            <p className="text-[9px] font-semibold tabular-nums text-ink">
              {playedCount} of {courses.length} played
            </p>
            {metaLine.length > 0 && (
              <p className="line-clamp-1 text-[6px] font-bold uppercase tracking-[0.72px] text-ink-3">
                {metaLine.join("  ·  ")}
              </p>
            )}
          </div>
        </div>

        {/* ——— ON THE MAP ——— the editorial plate (ListMapCard) */}
        {courses.length > 0 && (
          <div className="space-y-[7px]">
            <div className="flex items-center gap-[7px]">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[6px] font-bold uppercase tracking-[0.96px] text-ink-2">
                On the map
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div
              className="relative h-36 overflow-hidden rounded-[11px] border border-white/10"
              style={{
                background:
                  "radial-gradient(140% 120% at 30% 20%, #26405E 0%, #1B2D42 55%, #070A10 100%)",
              }}
            >
              {/* Course marks — played glows mint, unplayed sit quiet */}
              <MapDot x="22%" y="30%" played />
              <MapDot x="48%" y="52%" played={false} />
              <MapDot x="64%" y="26%" played={false} />
              <MapDot x="76%" y="62%" played={false} />
              <MapDot x="36%" y="70%" played={false} />
              <span className="absolute bottom-1.5 left-1.5 grid size-3.5 place-items-center rounded-full bg-black/40 text-[6px] text-ink-3">
                i
              </span>
              <span className="absolute bottom-1.5 right-1.5 inline-flex items-center rounded-full border border-white/12 bg-[rgba(14,24,38,0.72)] px-[7px] py-[3px] text-[6.5px] font-semibold text-ink backdrop-blur-sm">
                Expand
              </span>
            </div>
          </div>
        )}

        {/* Filter tabs — the app shows them only at ≥8 courses */}
        {courses.length >= 8 && (
          <div className="flex items-center gap-0.5 rounded-[8px] border border-white/12 bg-[rgba(20,46,70,0.5)] p-[2px]">
            <span className="flex-1 rounded-[6px] border border-white/[0.18] bg-paper-raised py-[4px] text-center text-[7px] font-semibold text-ink">
              All
            </span>
            <span className="flex-1 py-[4px] text-center text-[7px] font-medium text-ink-2">
              Played {playedCount}
            </span>
            <span className="flex-1 py-[4px] text-center text-[7px] font-medium text-ink-2">
              To play {courses.length - playedCount}
            </span>
          </div>
        )}

        {/* The roll — CuratedCourseRow anatomy */}
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
            <ul className="space-y-[5px]">
              {shown.map((c, i) => {
                const position = c.position ?? i + 1;
                const note = c.editor_note?.trim();
                // First row renders in its played state so both looks show.
                const played = i === 0;
                const hairlineAfter = !played && i < shown.length - 1;
                return (
                  <li key={c.course_id}>
                    <div
                      className={
                        played ? "-mx-[8px] rounded-[11px] px-[8px] py-[8px]" : "py-[8px]"
                      }
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
                      <div className="flex items-center gap-[7px]">
                        {/* The left-stacked editorial column */}
                        <div className="min-w-0 flex-1 space-y-[2px]">
                          {isOrdered && (
                            <p
                              className={`flex items-baseline gap-[3px] ${played ? "text-brand" : "text-ink-3"}`}
                            >
                              <span className="text-[6px] font-bold tracking-[0.84px]">NO.</span>
                              <span className="font-display text-[10px] font-medium tabular-nums">
                                {position}
                              </span>
                            </p>
                          )}
                          <p className="font-display text-[11.5px] font-medium leading-tight text-ink">
                            {c.course_name}
                          </p>
                          <p className="flex items-center gap-[3px] pt-px text-[6px] font-bold uppercase tracking-[0.72px]">
                            {played && (
                              <>
                                <Check
                                  aria-hidden
                                  className="size-[7px] text-brand"
                                  strokeWidth={3.5}
                                />
                                <span className="text-brand">Played</span>
                                <span className="text-ink-3">·</span>
                              </>
                            )}
                            <span className="line-clamp-1 text-ink-3">
                              {c.county_name?.toUpperCase() ?? ""}
                            </span>
                          </p>
                        </div>
                        {/* The View pill — centred against the column */}
                        <span
                          className={`inline-flex shrink-0 items-center gap-[2px] rounded-full px-[7px] py-[4px] text-[7px] font-semibold ${
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
                          <ChevronRight aria-hidden className="size-2" strokeWidth={3} />
                        </span>
                      </div>
                      {/* Jack's note — full width beneath, only when written */}
                      {note && (
                        <p className="pt-[3px] font-display text-[9.5px] italic leading-relaxed text-ink-2">
                          &ldquo;{note}&rdquo;
                        </p>
                      )}
                    </div>
                    {hairlineAfter && <div className="mt-[5px] h-px bg-white/10" />}
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

/** VProgressRing 56/5 at 0.6 scale — fillSoft track, mint→lime sweep, glow. */
function ProgressRing({ progress, label }: { progress: number; label: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <span className="relative grid size-[34px] shrink-0 place-items-center">
      <svg width={34} height={34} viewBox="0 0 34 34" className="absolute inset-0 -rotate-90">
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
        {p > 0 && (
          <circle
            cx="17"
            cy="17"
            r={r}
            fill="none"
            stroke="url(#curated-ring)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
            style={{ filter: "drop-shadow(0 0 4px rgba(91,228,195,0.8))" }}
          />
        )}
        <defs>
          <linearGradient id="curated-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5BE4C3" />
            <stop offset="1" stopColor="#8FE85B" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[7px] font-bold tabular-nums text-ink" style={{ letterSpacing: 0.4 }}>
        {label}
      </span>
    </span>
  );
}

/** A course mark on the map plate — played glows mint, unplayed sits quiet. */
function MapDot({ x, y, played }: { x: string; y: string; played: boolean }) {
  return (
    <span
      aria-hidden
      className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: x,
        top: y,
        background: played ? "#5BE4C3" : "#D1D1D1",
        opacity: played ? 1 : 0.55,
        boxShadow: played ? "0 0 8px rgba(91,228,195,0.9)" : "none",
      }}
    />
  );
}
