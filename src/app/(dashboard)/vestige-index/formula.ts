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

/** Equal weight across all three inputs (renormalised at compute). */
export const DEFAULT_WEIGHTS: IndexWeights = {
  age: 0.33,
  ranking: 0.33,
  setting: 0.33,
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
