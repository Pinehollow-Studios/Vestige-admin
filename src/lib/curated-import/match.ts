/**
 * Fuzzy name matching for bulk-importing a ranked course list (e.g. a
 * "Top 100") into a curated list, without hand-searching the catalogue
 * 100 times. Pure + framework-free so it runs client-side (parsing pasted
 * text) and server-side (scoring against the live `courses` table) alike.
 *
 * Deliberately a light heuristic, not a fuzzy-match library: it only has to
 * rank candidates well enough for an admin to eyeball and confirm in
 * `BulkImportPanel` - it never writes anything on its own.
 */

export type ImportInputRow = { rank: number; name: string; location: string | null };

export type CourseForMatching = {
  id: string;
  name: string;
  club_name: string | null;
  county_name: string | null;
};

export type MatchCandidate = {
  course_id: string;
  course_name: string;
  club_name: string | null;
  county_name: string | null;
  score: number;
};

export type MatchResult = {
  rank: number;
  input_name: string;
  input_location: string | null;
  candidates: MatchCandidate[];
};

export type MatchConfidence = "auto" | "ambiguous" | "none";

const STOPWORDS = new Set(["golf", "club", "course", "links", "the", "and", "country", "of", "at"]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9()&]+/g, " ")
    .replace(/[()&]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));
}

function extractVariant(name: string): string[] {
  const m = name.match(/\(([^)]+)\)/);
  return m ? tokenize(m[1]) : [];
}

/** Dice coefficient over token sets - 0 (no overlap) to 1 (identical sets). */
function dice(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap++;
  return (2 * overlap) / (setA.size + setB.size);
}

/**
 * Score every course in `catalogue` against one input row. Course-name
 * tokens are weighted extra for the parenthetical variant (e.g. "(Old)"),
 * since that's usually the only thing distinguishing sibling courses at the
 * same club (Sunningdale Old/New, Walton Heath Old/New, ...).
 */
export function matchRow(row: ImportInputRow, catalogue: CourseForMatching[]): MatchResult {
  const inputTokens = tokenize(row.name.replace(/\([^)]*\)/g, ""));
  const variantTokens = extractVariant(row.name);
  const locationTokens = row.location ? tokenize(row.location) : [];

  const scored: MatchCandidate[] = catalogue.map((c) => {
    // Base score ignores each side's parenthetical - a candidate suffixed
    // "(New)" must score identically to an unsuffixed sibling on the base
    // name, otherwise the extra token dilutes its dice score and an
    // unsuffixed candidate can out-rank the *correct* sibling even after
    // the variant bonus below (e.g. "Sunningdale Golf Club" beating
    // "Sunningdale Golf Club (New)" for an input asking for "(New)").
    const courseTokens = tokenize(c.name.replace(/\([^)]*\)/g, ""));
    const courseVariantTokens = extractVariant(c.name);
    const clubTokens = c.club_name ? tokenize(c.club_name) : [];
    let score = dice(inputTokens, [...clubTokens, ...courseTokens]);

    if (variantTokens.length > 0) {
      const hits = variantTokens.filter((t) => courseVariantTokens.includes(t)).length;
      if (hits > 0) score += 0.3 * (hits / variantTokens.length);
    }
    if (locationTokens.length > 0 && c.county_name) {
      const countyTokens = tokenize(c.county_name);
      if (countyTokens.some((t) => locationTokens.includes(t))) score += 0.1;
    }

    return {
      course_id: c.id,
      course_name: c.name,
      club_name: c.club_name,
      county_name: c.county_name,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    rank: row.rank,
    input_name: row.name,
    input_location: row.location,
    candidates: scored.filter((c) => c.score > 0.05).slice(0, 5),
  };
}

export function matchAll(rows: ImportInputRow[], catalogue: CourseForMatching[]): MatchResult[] {
  return rows.map((r) => matchRow(r, catalogue));
}

/** How confident the top candidate is - drives the review panel's default pick + badge. */
export function confidenceFor(candidates: MatchCandidate[]): MatchConfidence {
  const top = candidates[0];
  if (!top || top.score < 0.35) return "none";
  const second = candidates[1]?.score ?? 0;
  if (top.score >= 0.55 && top.score - second >= 0.15) return "auto";
  return "ambiguous";
}

/**
 * Parse pasted text into rows: a CSV with a `name` column (optionally
 * `rank` / `location`, same shape as `top100_england_golf_courses.csv`), or
 * a bare list of one course name per line.
 */
export function parseImportText(text: string): ImportInputRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  if (nameIdx === -1) {
    return lines.map((name, i) => ({ rank: i + 1, name, location: null }));
  }

  const rankIdx = header.indexOf("rank");
  const locIdx = header.indexOf("location");
  return lines
    .slice(1)
    .map((line, i) => {
      const cols = splitCsvLine(line);
      const name = (cols[nameIdx] ?? "").trim();
      return {
        rank: rankIdx !== -1 ? Number(cols[rankIdx]) || i + 1 : i + 1,
        name,
        location: locIdx !== -1 ? (cols[locIdx] ?? "").trim() || null : null,
      };
    })
    .filter((r) => r.name);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
