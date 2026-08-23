/**
 * Deriving "Vestige's Top 100 England" — the ordered club list — from the
 * published source rankings in this folder.
 *
 * This is the generator that `curated-import/top100-england.ts` had been
 * missing. Until 2026-08-23 that file was a hand-committed constant: the order
 * had been worked out once, pasted in, and could not be reproduced, checked, or
 * re-run when a source was recaptured. Two things had gone wrong behind that,
 * both invisible precisely because there was no code to read:
 *
 * · Its own docstring described the method as "Borda-style, normalised 0-100
 *   regardless of source list length". That is not what the committed order
 *   actually looks like, and it is not a method you would want: Golf Empire
 *   stops at 100 and Today's Golfer runs to 200, so length-normalising scores
 *   rank #96 as 5.0 out of Golf Empire but 52.5 out of Today's Golfer. Under
 *   it, Northamptonshire County (in *both* sources, GE #96 + TG #93) scores
 *   29.5 while Berkhamsted (in *one*, TG #91) scores 55.0 — the corroborated
 *   club losing heavily to the uncorroborated one.
 * · Its stated corroboration figures were wrong: it claimed 96 of 100 had 2-3
 *   source agreement with four single-source entries, naming Northamptonshire
 *   County as one. In fact 90 of 100 appear in both sources, 10 rest on one,
 *   and Northamptonshire County is in both.
 *
 * The method here, and why:
 *
 * 1. **Rank directly, not length-normalised.** Both sources rank the same
 *    underlying universe — English golf courses — so "96th" means roughly the
 *    same thing in each regardless of how far down that source chose to
 *    publish. Length-normalising invents a difference that isn't there.
 * 2. **One entry per club, and the ranks re-densified.** Sibling courses
 *    (Sunningdale Old/New, Walton Heath Old/New, Wentworth West/East/
 *    Edinburgh, Woburn's three, The Berkshire Red/Blue, Saunton East/West)
 *    collapse to the club's best position, matching the course catalogue,
 *    which holds one row per club. Crucially the survivors then close ranks:
 *    if Sunningdale absorbs both #2 and #4, the club at #5 becomes #3. Without
 *    that, every club below a multi-course club carries a rank inflated by the
 *    number of vanished siblings — up to 7 places in Golf Empire and 12 in
 *    Today's Golfer. (In practice the inflation accrues smoothly enough to be
 *    very nearly order-preserving, so this changes little; it is done because
 *    the alternative is quietly wrong, not because it moves the list.)
 * 3. **An absence is evidence, weighed less than a presence.** A club missing
 *    from a source of length N is known to rank worse than N there, so it is
 *    imputed at `N * MISSING_IMPUTE_FACTOR` and blended in at
 *    `MISSING_SOURCE_WEIGHT`. This is the piece the old hand-built list did by
 *    eye, and did inconsistently — eight of its ten single-source clubs sat at
 *    #84 or below while two rode high. Weighting rather than ignoring is a
 *    deliberate call (Jack's, 2026-08-23): cross-source corroboration should
 *    count for something.
 *
 *    Note the weight is not 1.0. An absence is genuinely weaker evidence than a
 *    ranking, because a list can omit a club for reasons that have nothing to
 *    do with quality — Queenwood admits no visitors, so raters largely cannot
 *    play it, and Today's Golfer omits it from all 200 while Golf Empire ranks
 *    it 28th. At weight 1.0 that single absence would push it off the list
 *    entirely.
 *
 *    `MISSING_SOURCE_WEIGHT` is effectively a single dial governing where the
 *    ten single-source clubs sit; the other ninety barely move across its whole
 *    plausible range. Queenwood, the most sensitive of them, runs #42 at 0.10,
 *    #57 at 0.20, #85 at 0.40 and off the list at 1.00.
 *
 * This is deliberately the opposite of `score.ts`'s treatment of the same
 * inputs — see the note at the foot of that file's header. There the question
 * is how good a course is, and one credible source saying #40 is evidence of a
 * #40-calibre course. Here the question is which course outranks which, where
 * breadth of agreement is exactly what separates two clubs the sources
 * disagree about.
 */

import type { ImportInputRow } from "@/lib/curated-import/match";
import { RANKING_SOURCES } from "./score";

/** How much an absence from a source counts, relative to a ranking in it. */
export const MISSING_SOURCE_WEIGHT = 0.2;

/** Absent from a list of N clubs => treated as ranking about this far past it. */
export const MISSING_IMPUTE_FACTOR = 1.1;

const STOPWORDS = new Set(["golf", "club", "course", "links", "the", "and", "country", "of", "at"]);

/**
 * The same club published under different names. Keys and values are both
 * already-tokenised forms. Kept explicit rather than fuzzy-matched: a wrong
 * merge silently deletes a club from the list and a wrong split silently
 * duplicates one, and neither is visible in the output.
 */
const CLUB_ALIASES: Record<string, string> = {
  "northants county": "northamptonshire county",
  "west lancs": "west lancashire",
  hollinwell: "notts",
  "notts hollinwell": "notts",
  "berwick upon tweed": "goswick",
  "royal west norfolk brancaster": "royal west norfolk",
  "royal liverpool hoylake": "royal liverpool",
  "west sussex pulborough": "west sussex",
  "silloth on solway": "silloth solway",
  "st georges": "royal st georges",
  // Today's Golfer writes Saunton's East course without parentheses, so the
  // variant-stripping below does not catch it and the club would split in two.
  "saunton east": "saunton",
  "saunton west": "saunton",
};

/**
 * Reduce a published course name to a club identity: drop the parenthetical
 * course variant, lower-case, strip punctuation and generic words, then apply
 * the alias table. Mirrors `curated-import/match.ts`'s tokeniser so the two
 * agree on what counts as the same club.
 */
export function clubKey(name: string): string {
  const base = name
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9()&]+/g, " ")
    .replace(/[()&]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t))
    .join(" ");
  return CLUB_ALIASES[base] ?? base;
}

/** One source's view of one club. */
export type BlendHit = { short: string; rank: number; densifiedRank: number };

export type BlendEntry = {
  rank: number;
  clubKey: string;
  /** Best published name seen for the club, for callers with no directory entry. */
  sourceName: string;
  hits: BlendHit[];
  /** How many sources ranked it — 1 means uncorroborated. */
  sourceCount: number;
  /** Blended rank estimate; lower is better. Not a 0-100 quality score. */
  estimate: number;
};

/**
 * Collapse one source to one row per club, keeping its best position, then
 * re-densify so the surviving clubs occupy consecutive positions.
 */
function collapseSource(rows: ImportInputRow[]): Map<string, BlendHit & { name: string }> {
  const byClub = new Map<string, BlendHit & { name: string }>();
  let position = 0;
  // Sources are published in rank order; iterating in that order means the
  // first sighting of a club is its best position.
  for (const row of [...rows].sort((a, b) => a.rank - b.rank)) {
    const key = clubKey(row.name);
    if (byClub.has(key)) continue;
    position += 1;
    byClub.set(key, { short: "", rank: row.rank, densifiedRank: position, name: row.name });
  }
  return byClub;
}

/**
 * Blend every club appearing in any source into one ordered list.
 * Returns the full ordering; callers take however many they publish.
 */
export function blendClubs(): BlendEntry[] {
  const collapsed = RANKING_SOURCES.map((source) => {
    const byClub = collapseSource(source.rows);
    return { short: source.short, size: byClub.size, byClub };
  });

  const universe = new Set(collapsed.flatMap((s) => [...s.byClub.keys()]));

  return [...universe]
    .map((key) => {
      const hits: BlendHit[] = [];
      let numerator = 0;
      let denominator = 0;
      let sourceName = key;

      for (const source of collapsed) {
        const hit = source.byClub.get(key);
        if (hit) {
          hits.push({ short: source.short, rank: hit.rank, densifiedRank: hit.densifiedRank });
          sourceName = hit.name.length > sourceName.length ? hit.name : sourceName;
          numerator += hit.densifiedRank;
          denominator += 1;
        } else {
          numerator += source.size * MISSING_IMPUTE_FACTOR * MISSING_SOURCE_WEIGHT;
          denominator += MISSING_SOURCE_WEIGHT;
        }
      }

      return {
        rank: 0,
        clubKey: key,
        sourceName,
        hits,
        sourceCount: hits.length,
        estimate: numerator / denominator,
      };
    })
    .sort((a, b) => a.estimate - b.estimate || a.clubKey.localeCompare(b.clubKey))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}
