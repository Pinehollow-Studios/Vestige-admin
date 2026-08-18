import type { CourseTier } from "../courses/types";

/**
 * The Vestige Index blend, mirrored client-side for live projection.
 *
 * Three equally-weighted inputs (2026-08-18 decision — design + pull dropped
 * from the blend; the 2026-08-16 five-input model was more than the editorial
 * pipeline can actually feed):
 *
 *   index = clamp( round( (wA·age + wR·ranking + wS·setting) / Σw ), 0, 100 )
 *
 * · age     — how old / pedigreed the course is (hand-scored 0-100).
 * · ranking — encoded external ranking consensus; when null its weight
 *   redistributes (drops out of both numerator and denominator).
 * · setting — the land, views, sense of place (hand-scored 0-100).
 * · unscored axes fall back axis → ranking → tier seed (+ an
 *   established-year bonus on age) so the long tail gets a sensible
 *   provisional number.
 *
 * **Naming bridge**: the DB columns keep their original names because a rename
 * would be an iOS-repo migration (`Vestige-ios` owns all schema). The mapping is
 * the whole of it — UI `age` = `heritage_score` / `w_heritage`, UI `ranking` =
 * `consensus_score` / `w_consensus`, UI `setting` = `setting_score` /
 * `w_setting`. The retired `design_score` / `w_design` / `w_pull` columns still
 * exist; the dashboard writes 0 to both retired weights on every Apply so the
 * server-side blend in `recompute_vestige_index` matches what's shown here.
 */

export type IndexWeights = {
  age: number;
  ranking: number;
  setting: number;
};

/**
 * Ranking + setting lead; age is the supporting input (2026-08-18, Tom's
 * call). Age carries half the weight of each of the other two, so a genuinely
 * good modern course isn't capped by its founding year. Renormalised at
 * compute, so these needn't sum to 1.
 */
export const DEFAULT_WEIGHTS: IndexWeights = {
  age: 0.2,
  ranking: 0.4,
  setting: 0.4,
};

export type AxisScores = {
  age: number | null;
  ranking: number | null;
  setting: number | null;
};

/** Objective-facts seed: the tier baseline an unscored axis falls back to. */
export const TIER_SEED: Record<CourseTier, number> = {
  championship: 60,
  standard: 48,
  short: 40,
  par3: 32,
};

/**
 * The Age curve: founding year → 0-100, anchored to eras rather than to raw
 * arithmetic.
 *
 * A straight line across the real range (1766 Royal Blackheath → 2024) is a
 * bad fit for this catalogue: the distribution is strongly bimodal — 52% of
 * courses date from the 1880-1939 boom, 37% from the 1970-1999 one, with an
 * almost empty trough between — and only 16 courses predate 1880. Linear
 * would hand a single 18th-century outlier the top half of the scale and
 * squash the Victorian heartland onto the midpoint.
 *
 * The floor (35, not 0) is deliberate: age is one input among three, and a
 * near-zero floor would make a great modern course mathematically incapable
 * of a good Index.
 *
 * Anchors are interpolated linearly between the listed years and clamped at
 * both ends. Stable by construction — adding courses never reshuffles
 * existing scores (a percentile ranking would).
 */
const AGE_ANCHORS: [year: number, score: number][] = [
  [1766, 100],
  [1860, 95],
  [1890, 85],
  [1910, 75],
  [1940, 62],
  [1970, 52],
  [1990, 44],
  [2010, 38],
  [2026, 35],
];

/**
 * Derive an Age score from a founding year. Returns null when the year is
 * unknown or implausible, so the course falls back to ranking → tier seed
 * rather than inheriting a fabricated number.
 */
export function ageFromYear(established: number | null): number | null {
  if (established == null || established < 1700 || established > 2026) return null;
  const first = AGE_ANCHORS[0];
  const last = AGE_ANCHORS[AGE_ANCHORS.length - 1];
  if (established <= first[0]) return first[1];
  if (established >= last[0]) return last[1];
  for (let i = 0; i < AGE_ANCHORS.length - 1; i++) {
    const [x0, v0] = AGE_ANCHORS[i];
    const [x1, v1] = AGE_ANCHORS[i + 1];
    if (established >= x0 && established <= x1) {
      return Math.round(v0 + ((v1 - v0) * (established - x0)) / (x1 - x0));
    }
  }
  return null;
}

/** Established-year bonus applied to the *age* seed only. */
export function ageBonus(established: number | null): number {
  if (established == null) return 0;
  if (established <= 1900) return 10;
  if (established <= 1945) return 5;
  return 0;
}

/** A course is provisional until at least one input has been entered. */
export function isUnscored(scores: AxisScores): boolean {
  return scores.age == null && scores.ranking == null && scores.setting == null;
}

export function projectIndex(
  scores: AxisScores,
  tier: CourseTier,
  established: number | null,
  w: IndexWeights,
): number {
  const seed = TIER_SEED[tier] ?? 48;
  const effAge = scores.age ?? scores.ranking ?? Math.min(100, seed + ageBonus(established));
  const effSetting = scores.setting ?? scores.ranking ?? seed;

  const hasRanking = scores.ranking != null;
  const num =
    w.age * effAge +
    (hasRanking ? w.ranking * (scores.ranking as number) : 0) +
    w.setting * effSetting;
  const den = w.age + (hasRanking ? w.ranking : 0) + w.setting;
  if (den <= 0) return seed;
  return Math.max(0, Math.min(100, Math.round(num / den)));
}
