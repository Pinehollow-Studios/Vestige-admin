"use server";

import { revalidatePath } from "next/cache";
import { createDevClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/admin/fetch-all";
import { matchRow, confidenceFor, type CourseForMatching } from "@/lib/curated-import/match";
import {
  RANKING_SOURCES,
  RANKING_SOURCE_PREFIX,
  buildProposal,
  type RankingProposal,
  type RankingSource,
} from "@/lib/ranking-import/score";
import type { ActionResult } from "../courses/actions";
import { setCoursesScores } from "../courses/actions";

/** A source row that could not be applied, and why. */
export type RankingException = {
  source: string;
  rank: number;
  name: string;
  reason: "ambiguous" | "not-in-catalogue";
  /** Best guesses, for the ambiguous case. */
  suggestions: string[];
};

export type RankingPreview = {
  sources: { short: string; label: string; publisher: string; size: number }[];
  /** Proposals that would be written. */
  applying: RankingProposal[];
  /** Courses already carrying a hand-edited ranking - left untouched. */
  protectedCount: number;
  /** Proposals identical to what is already stored (a no-op re-run). */
  unchangedCount: number;
  exceptions: RankingException[];
  matchedCourses: number;
};

type CourseRow = CourseForMatching & {
  heritage_score: number | null;
  setting_score: number | null;
  consensus_score: number | null;
  score_source: string | null;
};

async function loadCatalogue(): Promise<CourseRow[]> {
  const supabase = await createDevClient();
  const res = await fetchAllRows<{
    id: string;
    name: string;
    heritage_score: number | null;
    setting_score: number | null;
    consensus_score: number | null;
    score_source: string | null;
    clubs: { name: string } | { name: string }[] | null;
    counties: { name: string } | { name: string }[] | null;
  }>((from, to) =>
    supabase
      .from("courses")
      .select(
        "id,name,heritage_score,setting_score,consensus_score,score_source,clubs(name),counties(name)",
      )
      .order("id", { ascending: true })
      .range(from, to),
  );
  const unwrap = (v: unknown): string | null => {
    if (v == null) return null;
    const o = Array.isArray(v) ? v[0] : v;
    return (o as { name?: string } | undefined)?.name ?? null;
  };
  return (res.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    club_name: unwrap(r.clubs),
    county_name: unwrap(r.counties),
    heritage_score: r.heritage_score,
    setting_score: r.setting_score,
    consensus_score: r.consensus_score,
    score_source: r.score_source,
  }));
}

/**
 * Match every source row against the catalogue and work out what would change.
 *
 * Matching is automatic (Tom's call) but deliberately conservative: only
 * `auto`-confidence matches are applied. `ambiguous` and unmatched rows are
 * reported as exceptions rather than guessed at, because a wrong match would
 * silently set a course's Ranking with no one reviewing it.
 */
export async function previewRankingImport(): Promise<ActionResult<RankingPreview>> {
  const catalogue = await loadCatalogue();
  if (catalogue.length === 0) return { ok: false, message: "Course catalogue came back empty." };

  const byCourse = new Map<string, { key: RankingSource["key"]; short: string; rank: number }[]>();
  const exceptions: RankingException[] = [];

  for (const source of RANKING_SOURCES) {
    for (const row of source.rows) {
      const result = matchRow(row, catalogue);
      const confidence = confidenceFor(result.candidates);
      if (confidence === "auto") {
        const top = result.candidates[0];
        const list = byCourse.get(top.course_id) ?? [];
        list.push({ key: source.key, short: source.short, rank: row.rank });
        byCourse.set(top.course_id, list);
        continue;
      }
      exceptions.push({
        source: source.short,
        rank: row.rank,
        name: row.name,
        reason: confidence === "ambiguous" ? "ambiguous" : "not-in-catalogue",
        suggestions: result.candidates.slice(0, 3).map((c) => c.course_name),
      });
    }
  }

  const applying: RankingProposal[] = [];
  let protectedCount = 0;
  let unchangedCount = 0;

  for (const [courseId, raw] of byCourse) {
    const course = catalogue.find((c) => c.id === courseId);
    if (!course) continue;
    const proposal = buildProposal(courseId, course.name, course.county_name, raw);
    if (!proposal) continue;

    // Never overwrite a hand-edited ranking: anything with a ranking already
    // set whose provenance note is not ours belongs to Jack.
    const ours = (course.score_source ?? "").startsWith(RANKING_SOURCE_PREFIX);
    if (course.consensus_score != null && !ours) {
      protectedCount += 1;
      continue;
    }
    if (course.consensus_score === proposal.score && ours) {
      unchangedCount += 1;
      continue;
    }
    applying.push(proposal);
  }

  return {
    ok: true,
    data: {
      sources: RANKING_SOURCES.map((s) => ({
        short: s.short,
        label: s.label,
        publisher: s.publisher,
        size: s.size,
      })),
      applying: applying.sort((a, b) => b.score - a.score),
      protectedCount,
      unchangedCount,
      exceptions,
      matchedCourses: byCourse.size,
    },
  };
}

/**
 * Apply the preview. Writes only the ranking axis - age and setting are read
 * back and passed through unchanged, because `admin_set_courses_scores` is
 * set-explicit and would otherwise clear them. One batch call, one recompute.
 */
export async function applyRankingImport(): Promise<ActionResult<number>> {
  const preview = await previewRankingImport();
  if (!preview.ok) return { ok: false, message: preview.message };
  const proposals = preview.data?.applying ?? [];
  if (proposals.length === 0) return { ok: true, data: 0 };

  const catalogue = await loadCatalogue();
  const current = new Map(catalogue.map((c) => [c.id, c]));

  const items = proposals.flatMap((p) => {
    const c = current.get(p.courseId);
    if (!c) return [];
    return [
      {
        courseId: p.courseId,
        age: c.heritage_score,
        ranking: p.score,
        setting: c.setting_score,
        source: p.sourceNote,
      },
    ];
  });

  const res = await setCoursesScores(items);
  if (!res.ok) return res;
  revalidatePath("/vestige-index");
  revalidatePath("/courses");
  return { ok: true, data: res.data ?? items.length };
}
