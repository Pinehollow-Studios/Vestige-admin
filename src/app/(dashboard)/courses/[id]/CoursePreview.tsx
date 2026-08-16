"use client";

import { Camera, Flag, Info, ListChecks, Share, SquarePen, Star } from "lucide-react";

/**
 * App-accurate preview of the iOS course-detail sheet, mirroring
 * `CourseDetailSheet` as it ships today (2026-08), rendered in its expanded
 * map-sheet configuration: full-bleed hero (no scrim) with grabber + camera
 * button, then the peek block — county eyebrow + Unplayed pill, course name
 * with the **Vestige Index as a mint→lime gradient numeral top-right**
 * (fallback ladder index → par → holes) — then the below-fold: "Log a round"
 * CTA + two glass icon buttons, and flat hairline-separated sections
 * (Details 2-up facts grid → About → Your rounds empty state → Mapbox
 * attribution). Deliberately NO glass cards, NO stat strip, NO tier/layout
 * facts — the app dropped those. Rendered from live editor values at ~0.72
 * scale inside a {@link PreviewFrame}.
 */
export function CoursePreviewContent({
  name,
  club,
  county,
  coverURL,
  description,
  par,
  yards,
  holeCount,
  style,
  established,
  vestigeIndex,
  curatedListCount,
}: {
  name: string;
  club: string | null;
  county: string | null;
  coverURL: string | null;
  description: string;
  par: number | null;
  yards: number | null;
  holeCount: number;
  style: string;
  established: number | null;
  vestigeIndex: number | null;
  curatedListCount: number;
}) {
  // Hero-metric fallback ladder, exactly as the app resolves it.
  const hero =
    vestigeIndex != null
      ? { value: String(vestigeIndex), label: "Vestige Index" }
      : par != null
        ? { value: String(par), label: "Par" }
        : holeCount > 0
          ? { value: String(holeCount), label: "Holes" }
          : { value: "-", label: "Vestige Index" };

  const showClub = Boolean(club && club.trim().toLowerCase() !== name.trim().toLowerCase());

  // Details facts in the app's exact order, nils dropped. No holes/tier/layout.
  const facts: { label: string; value: string }[] = [
    ...(yards != null ? [{ label: "Yardage", value: `${yards.toLocaleString("en-GB")} yds` }] : []),
    ...(style.trim() ? [{ label: "Style", value: style.trim() }] : []),
    ...(par != null ? [{ label: "Par", value: String(par) }] : []),
    ...(established != null ? [{ label: "Established", value: String(established) }] : []),
  ];

  const hasAbout = Boolean(description.trim()) || curatedListCount > 0;

  return (
    <div className="bg-paper pb-6 text-ink">
      {/* Hero — full-bleed, no scrim; grabber + camera button overlays */}
      <div className="relative h-36 w-full overflow-hidden bg-[rgba(20,46,70,0.5)]">
        {coverURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverURL} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
            <Camera aria-hidden className="size-4 text-ink-3" />
            <p className="text-[9px] font-medium text-ink-2">Add the first photo</p>
          </div>
        )}
        <span
          aria-hidden
          className="absolute left-1/2 top-1.5 h-1 w-7 -translate-x-1/2 rounded-full bg-ink/40"
        />
        <span className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-black/55">
          <Camera aria-hidden className="size-3 text-[#FBF6E8]" />
        </span>
      </div>

      {/* Peek block — eyebrow + status pill, then name | Index */}
      <div className="space-y-2 px-3.5 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="size-1 rounded-full bg-brand" />
          <span className="text-[7.5px] font-semibold uppercase tracking-[0.14em] text-ink-2">
            {county?.toUpperCase() ?? " "}
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-white/40 bg-paper-raised px-2 py-[3px] text-[9px] font-semibold tracking-[0.02em] text-ink-2">
            Unplayed
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <h2
              className={
                "font-display text-[24px] font-medium leading-[1.05] tracking-[-0.02em] text-ink " +
                (showClub ? "line-clamp-1" : "line-clamp-2")
              }
            >
              {name || "Untitled course"}
            </h2>
            {showClub && (
              <p className="line-clamp-1 font-display text-[15px] font-medium text-ink-2">{club}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="bg-gradient-to-br from-brand to-[#8FE85B] bg-clip-text font-display text-[33px] font-medium leading-none tracking-[-0.03em] tabular-nums text-transparent">
              {hero.value}
            </p>
            <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {hero.label}
            </p>
          </div>
        </div>

        {/* Actions row — Log a round + two glass icon buttons */}
        <div className="flex items-center gap-2 pt-1.5">
          <span
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[13px] text-[11px] font-semibold text-[#06231C] shadow-[0_7px_16px_rgba(91,228,195,0.4)]"
            style={{ background: "linear-gradient(135deg, #5BE4C3, #8FE85B)" }}
          >
            <SquarePen aria-hidden className="size-3.5" />
            Log a round
          </span>
          <GlassIconButton>
            <Share aria-hidden className="size-3.5" />
          </GlassIconButton>
          <GlassIconButton>
            <ListChecks aria-hidden className="size-3.5" />
          </GlassIconButton>
        </div>

        {/* Details — flat 2-up facts grid under a hairline */}
        <Hairline />
        <section className="space-y-2.5">
          <Eyebrow label="Details" />
          {facts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              {facts.map((f) => (
                <div key={f.label} className="space-y-0.5">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                    {f.label}
                  </p>
                  <p className="text-[11.5px] font-semibold text-ink">{f.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] italic text-ink-3">No facts yet.</p>
          )}
        </section>

        {/* About — only with a description or curated placements */}
        {hasAbout && (
          <>
            <Hairline />
            <section className="space-y-2">
              <Eyebrow label="About" />
              {description.trim() && (
                <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink">
                  {description}
                </p>
              )}
              {curatedListCount > 0 && (
                <p className="flex items-center gap-1.5 text-[9px] font-medium text-ink-2">
                  <Star aria-hidden className="size-2.5 fill-brand text-brand" />
                  Featured on {curatedListCount} curated {curatedListCount === 1 ? "list" : "lists"}
                </p>
              )}
            </section>
          </>
        )}

        {/* Your rounds — the unplayed empty state */}
        <Hairline />
        <section className="space-y-2">
          <Eyebrow label="Your rounds" />
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/12">
              <Flag aria-hidden className="size-3 text-brand" />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-ink">No rounds logged here yet</p>
              <p className="text-[9px] font-medium text-ink-2">
                Log a round and it&rsquo;ll live here.
              </p>
            </div>
          </div>
        </section>

        {/* Mapbox attribution capsule (map-sheet configuration) */}
        <div className="pt-3">
          <div
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5"
            style={{ background: "linear-gradient(90deg, #26405E, #070A10)" }}
          >
            <span className="text-[8px] font-bold lowercase tracking-tight text-white">mapbox</span>
            <span className="text-[7px] font-semibold uppercase tracking-[0.06em] text-ink-2">
              · OpenStreetMap
            </span>
            <Info aria-hidden className="ml-auto size-2.5 text-ink-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The 5pt-dot section eyebrow. */
function Eyebrow({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[7.5px] font-semibold uppercase tracking-[0.14em] text-ink-2">
      <span aria-hidden className="size-1 rounded-full bg-brand" />
      {label}
    </p>
  );
}

/** The 1pt hairline rule between sections. */
function Hairline() {
  return <div aria-hidden className="my-3.5 h-px w-full bg-white/10" />;
}

/** A 56pt glass icon button at preview scale. */
function GlassIconButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-[13px] border border-white/12 bg-[rgba(14,24,38,0.72)] text-ink backdrop-blur-sm">
      {children}
    </span>
  );
}
