import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  transformCounty,
  transformCourse,
  transformCourseToClub,
  slugify,
} from "./transform";
import type {
  CountiesFile,
  CoursesFile,
  CountyRow,
  ClubRow,
  CourseRow,
  ImportResult,
} from "./types";

// Ported from `Vestige-ios/scripts/import-courses/import.ts`, then narrowed to
// **insert-only** (2026-08-04): rows already in the DB are never modified, so
// editorial edits made in the Bunker (par, yardage, description, …) survive
// every pull. Only brand-new counties → clubs → courses are added (parents
// first so the child FK reads resolve). Nothing is ever deleted.
//
// One deliberate exception: courses whose `center_lat`/`center_lng` are still
// NULL get their centre filled from the source polygon's centroid. That only
// writes where the value is missing, so it can't override anything.

const BATCH_SIZE = 100;
const PAGE = 1000;

export async function importDataset(
  supabase: SupabaseClient,
  counties: CountiesFile,
  courses: CoursesFile,
): Promise<ImportResult> {
  const countyRows = counties.features.map(transformCounty);
  const { map: countySlugToId, added: countiesAdded } = await insertNewCounties(
    supabase,
    countyRows,
  );

  const clubRows = courses.features.map(transformCourseToClub);
  const { map: clubFidToId, added: clubsAdded } = await insertNewClubs(supabase, clubRows);

  const courseRows = courses.features.map(transformCourse);
  const { added: coursesAdded, centersBackfilled } = await insertNewCourses(
    supabase,
    courseRows,
    countySlugToId,
    clubFidToId,
  );

  return { countiesAdded, clubsAdded, coursesAdded, centersBackfilled };
}

async function insertNewCounties(
  supabase: SupabaseClient,
  rows: CountyRow[],
): Promise<{ map: Map<string, string>; added: number }> {
  const { data: existing, error: readErr } = await supabase.from("counties").select("id, slug");
  if (readErr || !existing) throw new Error(`read existing counties failed: ${readErr?.message}`);

  const map = new Map<string, string>();
  for (const row of existing as Array<{ id: string; slug: string }>) map.set(row.slug, row.id);

  const fresh = rows.filter((row) => !map.has(row.slug));
  for (const batch of chunk(fresh, BATCH_SIZE)) {
    const { error } = await supabase
      .from("counties")
      .insert(batch.map((row) => ({ name: row.name, slug: row.slug, polygon: row.polygon })));
    if (error) throw new Error(`insert counties failed: ${error.message}`);
  }

  if (fresh.length > 0) {
    const { data, error } = await supabase.from("counties").select("id, slug");
    if (error || !data) throw new Error(`fetch counties for id map failed: ${error?.message}`);
    for (const row of data as Array<{ id: string; slug: string }>) map.set(row.slug, row.id);
  }
  return { map, added: fresh.length };
}

async function insertNewClubs(
  supabase: SupabaseClient,
  rows: ClubRow[],
): Promise<{ map: Map<number, string>; added: number }> {
  // PostgREST caps a plain select at 1000 rows, so page through explicitly -
  // otherwise every club past the first 1000 is missing from the id map and
  // its course silently drops (this bit the 1148-club CLI run).
  const map = await fetchClubIdMap(supabase);

  const fresh = dedupeByFid(rows).filter((row) => !map.has(row.legacyFid));
  for (const batch of chunk(fresh, BATCH_SIZE)) {
    const { error } = await supabase.from("clubs").insert(
      batch.map((row) => ({
        legacy_fid: row.legacyFid,
        name: row.name,
        website: row.website,
        location_name: row.locationName,
      })),
    );
    if (error) throw new Error(`insert clubs failed: ${error.message}`);
  }

  if (fresh.length > 0) {
    const refreshed = await fetchClubIdMap(supabase);
    return { map: refreshed, added: fresh.length };
  }
  return { map, added: 0 };
}

async function fetchClubIdMap(supabase: SupabaseClient): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, legacy_fid")
      .not("legacy_fid", "is", null)
      .order("legacy_fid", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) throw new Error(`fetch clubs for id map failed: ${error?.message}`);
    for (const row of data as Array<{ id: string; legacy_fid: number }>) {
      map.set(row.legacy_fid, row.id);
    }
    if (data.length < PAGE) break;
  }
  return map;
}

/** One club row per legacy_fid (a club with several courses appears once per course). */
function dedupeByFid(rows: ClubRow[]): ClubRow[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    if (seen.has(row.legacyFid)) return false;
    seen.add(row.legacyFid);
    return true;
  });
}

async function insertNewCourses(
  supabase: SupabaseClient,
  rows: CourseRow[],
  countySlugToId: Map<string, string>,
  clubFidToId: Map<number, string>,
): Promise<{ added: number; centersBackfilled: number }> {
  const existing = await fetchExistingCourseCenters(supabase);

  let added = 0;
  const fresh = rows.filter((row) => !existing.has(row.legacyFid));
  for (const batch of chunk(fresh, BATCH_SIZE)) {
    const payload = batch
      .map((row) => {
        const clubId = clubFidToId.get(row.clubLegacyFid);
        if (!clubId) return null; // missing club - skip (shouldn't happen post-insert)
        const countyId = row.countyName ? countySlugToId.get(slugify(row.countyName)) : null;
        return {
          legacy_fid: row.legacyFid,
          name: row.name,
          slug: row.slug,
          club_id: clubId,
          county_id: countyId ?? null,
          area_id: null,
          tier: row.tier,
          // Live column is `type` and holds the layout value (matches the CLI).
          type: row.layout,
          hole_count: row.holeCount,
          polygon: row.polygon,
          center_lat: row.centerLat,
          center_lng: row.centerLng,
          curated_list_ids: [],
          description: row.description,
          par: row.par,
          yards: row.yards,
          style: row.style,
          established: row.established,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (payload.length === 0) continue;
    const { error } = await supabase.from("courses").insert(payload);
    if (error) throw new Error(`insert courses failed: ${error.message}`);
    added += payload.length;
  }

  const centersBackfilled = await backfillMissingCenters(supabase, rows, existing);
  return { added, centersBackfilled };
}

/** legacy_fid → whether the live row already has a centre. */
async function fetchExistingCourseCenters(
  supabase: SupabaseClient,
): Promise<Map<number, { id: string; hasCenter: boolean }>> {
  const map = new Map<number, { id: string; hasCenter: boolean }>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("courses")
      .select("id, legacy_fid, center_lat")
      .not("legacy_fid", "is", null)
      .order("legacy_fid", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) throw new Error(`read existing courses failed: ${error?.message}`);
    for (const row of data as Array<{ id: string; legacy_fid: number; center_lat: number | null }>) {
      map.set(row.legacy_fid, { id: row.id, hasCenter: row.center_lat != null });
    }
    if (data.length < PAGE) break;
  }
  return map;
}

/** Fill `center_lat`/`center_lng` ONLY where the live row has none. */
async function backfillMissingCenters(
  supabase: SupabaseClient,
  rows: CourseRow[],
  existing: Map<number, { id: string; hasCenter: boolean }>,
): Promise<number> {
  let backfilled = 0;
  for (const row of rows) {
    const live = existing.get(row.legacyFid);
    if (!live || live.hasCenter) continue;
    if (row.centerLat == null || row.centerLng == null) continue;
    const { error } = await supabase
      .from("courses")
      .update({ center_lat: row.centerLat, center_lng: row.centerLng })
      .eq("id", live.id)
      .is("center_lat", null);
    if (error) throw new Error(`backfill course centre failed: ${error.message}`);
    backfilled += 1;
  }
  return backfilled;
}

function* chunk<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
