import type { CourseTier } from "../courses/types";

/**
 * The Vestige Index blend, mirrored client-side for live projection.
 *
 * Canonical definition lives in the iOS migration
 * `20260816100000_vestige_index_rework.sql` (which replaced the 2026-06
 * prestige × rarity blend — rarity didn't work at beta user counts):
 *
 *   index = clamp( round( (wD·design + wS·setting + wH·heritage
 *                           + wC·consensus + wP·pull) / Σw ), 0, 100 )
 *
 * · design / setting / heritage — hand-scored editorial axes (0–100).
 * · consensus — encoded external ranking consensus; when null its weight
 *   redistributes (drops out of both numerator and denominator).
 * · pull — live play-demand signal (100 − rarity, neutral 50), weight 0
 *   until the user base can support it.
 * · unscored axes fall back axis → consensus → tier seed (+ an
 *   established-year bonus on heritage) so the long tail gets a sensible
 *   provisional number.
 *
 * Exact for a single course given its own inputs; `pull` uses the row's
 * last-computed rarity, so a committed value can drift a point if play
 * data moved since the page loaded (irrelevant while w_pull = 0).
 */

export type IndexWeights = {
  design: number;
  setting: number;
  heritage: number;
  consensus: number;
  pull: number;
};

export const DEFAULT_WEIGHTS: IndexWeights = {
  design: 0.45,
  setting: 0.25,
  heritage: 0.15,
  consensus: 0.15,
  pull: 0,
};

export type AxisScores = {
  design: number | null;
  setting: number | null;
  heritage: number | null;
  consensus: number | null;
};

/** Objective-facts seed: the tier baseline an unscored axis falls back to. */
export const TIER_SEED: Record<CourseTier, number> = {
  championship: 60,
  standard: 48,
  short: 40,
  par3: 32,
};

/** Established-year bonus applied to the heritage *seed* only. */
export function heritageBonus(established: number | null): number {
  if (established == null) return 0;
  if (established <= 1900) return 10;
  if (established <= 1945) return 5;
  return 0;
}

/** A course is provisional until its axes have been hand-scored. */
export function isUnscored(scores: AxisScores): boolean {
  return scores.design == null && scores.setting == null && scores.heritage == null;
}

export function projectIndex(
  scores: AxisScores,
  tier: CourseTier,
  established: number | null,
  rarity: number | null,
  w: IndexWeights,
): number {
  const seed = TIER_SEED[tier] ?? 48;
  const effDesign = scores.design ?? scores.consensus ?? seed;
  const effSetting = scores.setting ?? scores.consensus ?? seed;
  const effHeritage =
    scores.heritage ?? scores.consensus ?? Math.min(100, seed + heritageBonus(established));
  const pull = rarity == null ? 50 : 100 - rarity;

  const hasConsensus = scores.consensus != null;
  const num =
    w.design * effDesign +
    w.setting * effSetting +
    w.heritage * effHeritage +
    (hasConsensus ? w.consensus * (scores.consensus as number) : 0) +
    w.pull * pull;
  const den = w.design + w.setting + w.heritage + (hasConsensus ? w.consensus : 0) + w.pull;
  if (den <= 0) return seed;
  return Math.max(0, Math.min(100, Math.round(num / den)));
}
