/**
 * The Setting draft — a first number for the one Index axis with no data to
 * pull from.
 *
 * Setting is "the land, the views, the sense of place". There is no published
 * ranking for it and no column that encodes it, so rather than have a model
 * invent 1,794 opinions (the course descriptions are themselves AI-generated,
 * so mining them would only launder a guess), this derives a draft from four
 * *measurable* facts about where a course sits:
 *
 * · distance to the coast          — separates links and seaside golf
 * · relief within ~1.1km           — dunes, escarpment and moor vs flat farmland
 * · National Park / National Landscape membership — designated landscape quality
 * · road intrusion                 — the motorway-along-the-fence end
 *
 * Style sets the baseline because it is a strong prior we already hold for
 * every course; geography then pushes it around.
 *
 * **Deliberately conservative** (Tom's call): the output clusters in the
 * mid-range and only unmistakable cases approach the ends. 90+ is reserved for
 * human judgement entirely. A draft that is never badly wrong is worth more
 * than one that is occasionally brilliant, because nobody reviews 1,794 rows.
 *
 * Every number here is a starting point for Jack to overrule, not a verdict.
 */

export type SettingSignals = {
  style: string | null;
  /** Kilometres to the nearest coastline, null if unknown. */
  coastKm: number | null;
  /** Metres between highest and lowest contour within ~1.1km, null if unknown. */
  reliefM: number | null;
  /** National Park name, if the course centre falls inside one. */
  nationalPark: string | null;
  /** National Landscape (AONB) name, if inside one. */
  aonb: string | null;
  /** Motorway / trunk / primary road segments within 700m. */
  bigRoads: number;
  /** Street / secondary / tertiary segments within 700m — a density proxy. */
  streets: number;
};

/** Where each style starts before geography is applied. */
export const STYLE_BASELINE: Record<string, number> = {
  Links: 72,
  Heathland: 70,
  Downland: 68,
  Moorland: 70,
  Parkland: 52,
  "Pitch & Putt": 40,
};

export const DEFAULT_BASELINE = 52;

/** The draft never goes beyond these — the extremes belong to Jack. */
export const DRAFT_MIN = 30;
export const DRAFT_MAX = 88;

export type SettingDraft = { score: number; reasons: string[] };

export function draftSetting(s: SettingSignals): SettingDraft {
  const base = s.style ? (STYLE_BASELINE[s.style] ?? DEFAULT_BASELINE) : DEFAULT_BASELINE;
  let score = base;
  const reasons: string[] = [s.style ?? "unclassified"];

  if (s.coastKm != null) {
    if (s.coastKm < 1.5) { score += 8; reasons.push(`${s.coastKm.toFixed(1)}km to coast`); }
    else if (s.coastKm < 4) { score += 5; reasons.push(`${s.coastKm.toFixed(1)}km to coast`); }
    else if (s.coastKm < 10) { score += 2; reasons.push(`${s.coastKm.toFixed(0)}km to coast`); }
  }

  if (s.reliefM != null) {
    if (s.reliefM >= 200) { score += 8; reasons.push(`${s.reliefM}m relief`); }
    else if (s.reliefM >= 100) { score += 6; reasons.push(`${s.reliefM}m relief`); }
    else if (s.reliefM >= 50) { score += 4; reasons.push(`${s.reliefM}m relief`); }
    else if (s.reliefM >= 20) { score += 2; reasons.push(`${s.reliefM}m relief`); }
    // No flat penalty for links: dune topography is real but sits below the
    // 10m contour resolution, so Sandwich and Birkdale read as "flat" here.
    else if (s.reliefM < 10 && s.style !== "Links") { score -= 3; reasons.push("flat"); }
  }

  if (s.nationalPark) { score += 7; reasons.push(titleCase(s.nationalPark)); }
  else if (s.aonb) { score += 5; reasons.push(titleCase(s.aonb)); }

  // No road penalty (2026-08-18). A trunk road on the far side of a treeline
  // is not an intrusion — this was demoting the Surrey/Berkshire heathland belt
  // (Sunningdale, Swinley, Walton Heath) for roads you cannot hear from the
  // course. Genuine suburban enclosure still counts, softened.
  if (s.streets >= 15) { score -= 2; reasons.push("built up"); }

  return {
    score: Math.max(DRAFT_MIN, Math.min(DRAFT_MAX, Math.round(score))),
    reasons,
  };
}

function titleCase(v: string): string {
  return v
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** The provenance line written to `score_source`. */
export const SETTING_SOURCE_PREFIX = "Setting ·";

export function settingSourceNote(d: SettingDraft): string {
  return `${SETTING_SOURCE_PREFIX} ${d.reasons.join(" · ")}`;
}
