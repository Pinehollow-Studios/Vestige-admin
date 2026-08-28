"use client";

import { ChevronRight } from "lucide-react";
import { BadgeMedallion } from "@/components/badges/BadgeMedallion";
import type { EventStatus, PrizeBadge } from "../types";

/**
 * App-true previews for the event editor (2026-08-28 fidelity pass).
 *
 * `ClubhouseEventCardPreview` mirrors `ClubhouseEventCard` as it ships today:
 * a 300×128 raised card (no image, no poster — the 2026-08-04 rework killed
 * that), radius 24, separator border, the emphasised corner glow
 * (radial accent@14% from the top-right), the 45°/14pt diagonal hatch at
 * textPrimary@5%, a status dot + word at 9pt semibold tracking 1, the title
 * at Manrope-Medium 22, a mono data line, and the 56pt gradient progress ring
 * with the days-to-boundary label.
 *
 * `PrizeCardPreview` mirrors `ClubhouseEventPrizeCard`: medallion always
 * earned (a prize isn't locked, it's up for grabs), "THE PRIZE" eyebrow at
 * 10pt bold tracking 1.4 accentInk, name at 15pt semibold, the award rule
 * line, and a trailing chevron.
 */

const STATUS_WORD: Record<EventStatus, { word: string; color: string }> = {
  live: { word: "LIVE", color: "#5BE4C3" },
  scheduled: { word: "SOON", color: "#9DA9B6" },
  ended: { word: "ENDED", color: "#66717E" },
  awarded: { word: "ENDED", color: "#66717E" },
  archived: { word: "ENDED", color: "#66717E" },
  draft: { word: "SOON", color: "#9DA9B6" },
};

export function ClubhouseEventCardPreview({
  title,
  windowLine,
  status,
  daysLabel,
  progress,
}: {
  title: string;
  windowLine: string;
  status: EventStatus;
  daysLabel: string;
  progress: number; // 0..1
}) {
  const s = STATUS_WORD[status];
  return (
    <div
      className="relative h-32 w-[300px] max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0C1220] p-[18px]"
      style={{
        backgroundImage:
          // Emphasised corner glow + the diagonal hatch, over surfaceRaised.
          "radial-gradient(230px at 100% 0%, rgba(91,228,195,0.14), transparent)," +
          "repeating-linear-gradient(45deg, rgba(242,239,230,0.05) 0px, rgba(242,239,230,0.05) 1px, transparent 1px, transparent 14px)",
      }}
    >
      <div className="flex h-full items-center gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-[5px] rounded-full" style={{ background: s.color }} />
            <span
              className="text-[9px] font-semibold uppercase"
              style={{ color: s.color, letterSpacing: 1 }}
            >
              {s.word}
            </span>
          </span>
          <p className="line-clamp-2 font-display text-[22px] font-medium leading-[1.05] text-[#F2EFE6]">
            {title || "Untitled event"}
          </p>
          <p className="line-clamp-1 text-[12px] font-medium tabular-nums text-[#9DA9B6]">
            {windowLine}
          </p>
        </div>
        <ProgressRing progress={progress} label={daysLabel} />
      </div>
    </div>
  );
}

/** VProgressRing at 56pt / lineWidth 5 — track fillSoft, mint→lime sweep. */
function ProgressRing({ progress, label }: { progress: number; label: string }) {
  const r = 25.5; // (56 − 5) / 2
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      <svg width={56} height={56} viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={5} />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="url(#event-ring)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          style={{ filter: "drop-shadow(0 0 6px rgba(91,228,195,0.8))" }}
        />
        <defs>
          <linearGradient id="event-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5BE4C3" />
            <stop offset="1" stopColor="#8FE85B" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[11px] font-bold tabular-nums text-[#F2EFE6]" style={{ letterSpacing: 0.6 }}>
        {label}
      </span>
    </span>
  );
}

const AWARD_RULE_LINE: Record<string, string> = {
  winner: "Goes to the winner",
  top_three: "Goes to the top three",
  all_qualifiers: "For everyone who finishes",
};

export function PrizeCardPreview({
  badge,
  awardRule,
}: {
  badge: PrizeBadge;
  awardRule: string | null;
}) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-[18px] border border-white/10 bg-[#0C1220] p-[18px]"
      style={{
        backgroundImage:
          "radial-gradient(230px at 100% 0%, rgba(91,228,195,0.14), transparent)",
      }}
    >
      {/* A prize isn't locked, it's up for grabs — always the earned artwork. */}
      <BadgeMedallion spec={badge} size={64} earned />
      <div className="min-w-0 flex-1 space-y-[3px]">
        <p className="text-[10px] font-bold uppercase text-[#5BE4C3]" style={{ letterSpacing: 1.4 }}>
          The prize
        </p>
        <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-[#F2EFE6]">
          {badge.name}
        </p>
        <p className="text-[12px] text-[#9DA9B6]">
          {AWARD_RULE_LINE[awardRule ?? ""] ?? "Awarded at the close"}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-3 shrink-0 text-[#66717E]" strokeWidth={2.5} />
    </div>
  );
}
