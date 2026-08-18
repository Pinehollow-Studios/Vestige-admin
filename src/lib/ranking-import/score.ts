/**
 * Turning published ranking positions into the Vestige Index `ranking` axis.
 *
 * Three sources, each an independent vote (decisions locked with Tom
 * 2026-08-18):
 *
 * · Top100GolfCourses — 100, already in the repo for the curated importer
 * · Golf Empire — 100
 * · Today's Golfer — 200, the only source covering the 100-200 band
 *
 * NCG was considered and deliberately skipped: only 25 of its 100 render
 * without paginated fetches. It can be added later as a fourth source with no
 * change to anything here.
 *
 * The method, and why:
 *
 * 1. **Rank → sub-score per source, not a raw rank average.** The lists are
 *    different lengths, so rank 100 means "last" in two of them and "middling"
 *    in Today's Golfer. Each source's rank is converted to 0-100 first.
 * 2. **The curve is concave, not linear.** The real quality gap between #1 and
 *    #10 is far larger than between #150 and #160, so the top of the list is
 *    stretched and the tail compressed.
 * 3. **The floor is 73, not 0.** Because an unranked course carries a null
 *    ranking (its weight redistributes rather than scoring zero), too low a
 *    floor would mean *being ranked* could drag a course below where it would
 *    have sat unranked. #200 of 1,794 is the top 11% of English golf and the
 *    score says so.
 * 4. **Best rank wins within a club.** Our catalogue holds one row per club
 *    while the sources rank individual courses, so Sunningdale (Old) #2 and
 *    (New) #3 both land on one row — it takes the #2. Averaging them would
 *    rank Sunningdale below plainly inferior single-course clubs.
 * 5. **Plain average across sources, no corroboration bonus** (Tom's call).
 *    Ranking therefore measures *position*, not breadth of agreement: a course
 *    in one list at #150 scores the same as one at #150 in all three.
 */

import type { ImportInputRow } from "@/lib/curated-import/match";
import { TOP100_ENGLAND } from "@/lib/curated-import/top100-england";
import { GOLF_EMPIRE_ENGLAND } from "./golf-empire";
import { TODAYS_GOLFER_ENGLAND } from "./todays-golfer";

export type RankingSource = {
  key: "t100" | "golfEmpire" | "todaysGolfer";
  /** Short label used in the score-source provenance note. */
  short: string;
  label: string;
  publisher: string;
  size: number;
  rows: ImportInputRow[];
};

export const RANKING_SOURCES: RankingSource[] = [
  {
    key: "t100",
    short: "T100",
    label: "Top 100 England",
    publisher: "top100golfcourses.com",
    size: TOP100_ENGLAND.length,
    rows: TOP100_ENGLAND,
  },
  {
    key: "golfEmpire",
    short: "GE",
    label: "Top 100 England",
    publisher: "golfempire.reviews",
    size: GOLF_EMPIRE_ENGLAND.length,
    rows: GOLF_EMPIRE_ENGLAND,
  },
  {
    key: "todaysGolfer",
    short: "TG",
    label: "Top 200 England",
    publisher: "todays-golfer.com",
    size: TODAYS_GOLFER_ENGLAND.length,
    rows: TODAYS_GOLFER_ENGLAND,
  },
];

/** Rank → 0-100, interpolated between anchors and clamped at both ends. */
const RANK_ANCHORS: [rank: number, score: number][] = [
  [1, 100],
  [5, 97],
  [10, 95],
  [25, 90],
  [50, 85],
  [100, 79],
  [150, 76],
  [200, 73],
];

export const RANKING_FLOOR = RANK_ANCHORS[RANK_ANCHORS.length - 1][1];

export function scoreForRank(rank: number): number {
  const first = RANK_ANCHORS[0];
  const last = RANK_ANCHORS[RANK_ANCHORS.length - 1];
  if (rank <= first[0]) return first[1];
  if (rank >= last[0]) return last[1];
  for (let i = 0; i < RANK_ANCHORS.length - 1; i++) {
    const [x0, v0] = RANK_ANCHORS[i];
    const [x1, v1] = RANK_ANCHORS[i + 1];
    if (rank >= x0 && rank <= x1) {
      return Math.round(v0 + ((v1 - v0) * (rank - x0)) / (x1 - x0));
    }
  }
  return last[1];
}

/** One source's contribution to a course: its best rank there, and the score. */
export type SourceHit = { key: RankingSource["key"]; short: string; rank: number; score: number };

/** What the import proposes for one catalogue course. */
export type RankingProposal = {
  courseId: string;
  courseName: string;
  countyName: string | null;
  hits: SourceHit[];
  /** Plain average of the per-source sub-scores, rounded. */
  score: number;
  /** Human-readable provenance, written to `score_source`. */
  sourceNote: string;
};

/** The marker that identifies a `score_source` this importer wrote. */
export const RANKING_SOURCE_PREFIX = "Ranking ·";

/**
 * Collapse per-source matches into one proposal per course: best rank within
 * each source, then a plain average of those sources' sub-scores.
 */
export function buildProposal(
  courseId: string,
  courseName: string,
  countyName: string | null,
  raw: { key: RankingSource["key"]; short: string; rank: number }[],
): RankingProposal | null {
  if (raw.length === 0) return null;

  const bestBySource = new Map<string, { key: RankingSource["key"]; short: string; rank: number }>();
  for (const r of raw) {
    const existing = bestBySource.get(r.key);
    if (!existing || r.rank < existing.rank) bestBySource.set(r.key, r);
  }

  const hits: SourceHit[] = RANKING_SOURCES.flatMap((s) => {
    const hit = bestBySource.get(s.key);
    return hit ? [{ key: s.key, short: s.short, rank: hit.rank, score: scoreForRank(hit.rank) }] : [];
  });

  const score = Math.round(hits.reduce((n, h) => n + h.score, 0) / hits.length);
  const sourceNote = `${RANKING_SOURCE_PREFIX} ${hits.map((h) => `${h.short} #${h.rank}`).join(" · ")}`;

  return { courseId, courseName, countyName, hits, score, sourceNote };
}
