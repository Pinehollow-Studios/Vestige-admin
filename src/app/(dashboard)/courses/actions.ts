"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDevClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { courseCoverStorageKey } from "@/lib/storage";
import { slugify } from "@/lib/courses-import/transform";
import type { CourseLayout, CourseTier } from "./types";
import type { IndexWeights } from "../vestige-index/formula";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

/**
 * Patch fields on a course. Empty strings get coerced to null for
 * the optional text fields (description, style) because PostgREST
 * sends `''` not `null`. `style` is normalised to Title Case before
 * write so the autocomplete combobox doesn't drift between
 * "Heathland" and "heathland".
 *
 * Audit: every successful patch stamps `last_edited_by_admin_id =
 * auth.uid()` and `last_edited_at = now()` so the index page can
 * render "Edited by Jack 2d ago".
 *
 * **Bridge** (Option β): the schema column is still named `type`
 * pre-M6; the patch writes `type` until the rename migration lands.
 * UI dropdowns surface this as `layout`, but the DB write keeps the
 * legacy name. Once M6 applies, swap `type` → `layout` here.
 */
export async function updateCourse(
  courseId: string,
  patch: {
    description?: string | null;
    par?: number | null;
    yards?: number | null;
    style?: string | null;
    established?: number | null;
    layout?: CourseLayout;
    tier?: CourseTier;
    hole_count?: number;
  },
): Promise<ActionResult> {
  const supabase = await createDevClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, message: "Not signed in." };
  }

  const update: Record<string, unknown> = {};
  if (patch.description !== undefined) {
    update.description = patch.description?.trim() || null;
  }
  if (patch.par !== undefined) {
    update.par = patch.par;
  }
  if (patch.yards !== undefined) {
    update.yards = patch.yards;
  }
  if (patch.style !== undefined) {
    update.style = normaliseStyle(patch.style);
  }
  if (patch.established !== undefined) {
    update.established = patch.established;
  }
  if (patch.layout !== undefined) {
    // Bridge: column is still `type` pre-M6.
    update.type = patch.layout;
  }
  if (patch.tier !== undefined) {
    update.tier = patch.tier;
  }
  if (patch.hole_count !== undefined) {
    update.hole_count = patch.hole_count;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true };
  }

  update.last_edited_by_admin_id = user.id;
  update.last_edited_at = new Date().toISOString();

  const { error } = await supabase.from("courses").update(update).eq("id", courseId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

/**
 * Cover-image upload. The browser POSTs the file via FormData;
 * the Storage object is uploaded with content-type `image/jpeg`
 * (the cropper outputs JPEG). After upload, patches
 * `courses.hero_photo_storage_key` with a `?v=<UUID>` cache-
 * buster suffix so iOS Nuke + browsers refetch.
 *
 * Path: `<course_id>/cover.jpg` (matches the admin-write RLS on
 * `course-covers` from `20260504200300_course_covers_admin_writes.sql`).
 */
export async function uploadCourseCover(
  courseId: string,
  formData: FormData,
): Promise<ActionResult<string>> {
  const file = formData.get("cover");
  if (!(file instanceof File)) return { ok: false, message: "No file provided." };
  if (file.size === 0) return { ok: false, message: "File is empty." };

  const supabase = await createDevClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, message: "Not signed in." };
  }

  const { path, key } = courseCoverStorageKey(courseId);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from("course-covers")
    .upload(path, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (uploadErr) return { ok: false, message: `Upload failed: ${uploadErr.message}` };

  const { error: patchErr } = await supabase
    .from("courses")
    .update({
      hero_photo_storage_key: key,
      last_edited_by_admin_id: user.id,
      last_edited_at: new Date().toISOString(),
    })
    .eq("id", courseId);
  if (patchErr) return { ok: false, message: `Save failed: ${patchErr.message}` };

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  return { ok: true, data: key };
}

/**
 * Delete a course row outright - for cleaning up stray/mistaken entries
 * (e.g. an accidental `splitCourseVariant`), not for real catalogue
 * management. Refuses when there's any real user data attached (a played
 * round, or a community photo) so it can never destroy something a user
 * created; membership rows on curated/user lists are cascade-removed since
 * a list can't sensibly keep pointing at a deleted course.
 */
export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const session = await createDevClient();
  const {
    data: { user },
    error: userErr,
  } = await session.auth.getUser();
  if (userErr || !user) return { ok: false, message: "Not signed in." };

  const supabase = await createServiceClient();

  const { data: course, error: fetchErr } = await supabase
    .from("courses")
    .select("play_count")
    .eq("id", courseId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (!course) return { ok: false, message: "Course not found." };
  if ((course.play_count ?? 0) > 0) {
    return {
      ok: false,
      message: `${course.play_count} round${course.play_count === 1 ? "" : "s"} logged here - can't delete a course with real play data.`,
    };
  }

  const { count: photoCount, error: photoErr } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .is("deleted_at", null);
  if (photoErr) return { ok: false, message: photoErr.message };
  if ((photoCount ?? 0) > 0) {
    return { ok: false, message: "This course has community photos attached - can't delete it." };
  }

  await supabase.from("curated_list_courses").delete().eq("course_id", courseId);
  await supabase.from("user_list_courses").delete().eq("course_id", courseId);

  const { path } = courseCoverStorageKey(courseId);
  await supabase.storage.from("course-covers").remove([path]);

  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/courses");
  return { ok: true };
}

export async function removeCourseCover(courseId: string): Promise<ActionResult> {
  const supabase = await createDevClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, message: "Not signed in." };
  }

  const { path } = courseCoverStorageKey(courseId);
  // Storage 404 (object never existed) is benign - null the row
  // anyway so the UI catches up. Mirrors `removeCuratedCover`.
  await supabase.storage.from("course-covers").remove([path]);
  const { error } = await supabase
    .from("courses")
    .update({
      hero_photo_storage_key: null,
      last_edited_by_admin_id: user.id,
      last_edited_at: new Date().toISOString(),
    })
    .eq("id", courseId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  return { ok: true };
}

/**
 * One course's stageable axis scores: null = unscored (cleared).
 *
 * UI vocabulary → DB columns (see `vestige-index/formula.ts`): `age` =
 * `heritage_score`, `ranking` = `consensus_score`, `setting` = `setting_score`.
 * The retired `design_score` is written null on every save so it can't drift
 * back into the (server-side) blend.
 */
export type AxisScoreInput = {
  age: number | null;
  ranking: number | null;
  setting: number | null;
};

function validAxis(v: number | null): boolean {
  return v === null || (Number.isFinite(v) && v >= 0 && v <= 100);
}

function validScores(s: AxisScoreInput): boolean {
  return validAxis(s.age) && validAxis(s.ranking) && validAxis(s.setting);
}

const round = (v: number | null) => (v === null ? null : Math.round(v));

/**
 * Set one course's editorial axis scores (age/ranking/setting, null =
 * unscored) + optional provenance note via `admin_set_course_scores`,
 * which writes the values, stamps the audit columns, and recomputes the whole
 * Vestige Index in one atomic call. Returns the course's new index for an
 * immediate optimistic readout.
 */
export async function setCourseScores(
  courseId: string,
  scores: AxisScoreInput,
  source: string | null,
): Promise<ActionResult<number | null>> {
  if (!validScores(scores)) {
    return { ok: false, message: "Every score must be 0-100 (or blank)." };
  }
  const supabase = await createDevClient();
  const { data, error } = await supabase.rpc("admin_set_course_scores", {
    p_course: courseId,
    p_design: null,
    p_setting: round(scores.setting),
    p_heritage: round(scores.age),
    p_consensus: round(scores.ranking),
    p_source: source?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/vestige-index");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true, data: (data as number | null) ?? null };
}

/**
 * Batch-set axis scores (+ optional source) for many courses in one call via
 * `admin_set_courses_scores(jsonb)`, which applies every edit then recomputes
 * the Vestige Index **once** (vs the per-course RPC, which recomputes the
 * whole table on every single edit). Powers the Index batch editor's
 * "Save N changes". Validated all-or-nothing: any out-of-range value rejects
 * the whole batch before it touches the DB. Returns the number of rows updated.
 */
export async function setCoursesScores(
  items: ({ courseId: string; source?: string | null } & AxisScoreInput)[],
): Promise<ActionResult<number>> {
  if (items.length === 0) return { ok: true, data: 0 };
  for (const it of items) {
    if (!validScores(it)) {
      return { ok: false, message: "Every score must be 0-100 (or blank)." };
    }
  }
  const supabase = await createDevClient();
  const payload = items.map((it) => ({
    course_id: it.courseId,
    design: null,
    setting: round(it.setting),
    heritage: round(it.age),
    consensus: round(it.ranking),
    source: it.source?.trim() || null,
  }));
  const { data, error } = await supabase.rpc("admin_set_courses_scores", {
    p_items: payload,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/vestige-index");
  revalidatePath("/courses");
  return { ok: true, data: (data as number | null) ?? 0 };
}

/** Recompute every course's Vestige Index now (admin "recalculate" button). */
export async function recomputeVestigeIndex(): Promise<ActionResult<number>> {
  const supabase = await createDevClient();
  const { data, error } = await supabase.rpc("admin_recompute_vestige_index");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/vestige-index");
  revalidatePath("/courses");
  return { ok: true, data: (data as number | null) ?? 0 };
}

/**
 * Tune the global blend weights via `admin_set_vestige_index_weights`, which
 * also recomputes every index. Each weight is 0-1; they're renormalised at
 * compute so they needn't sum to exactly 1 (but must sum > 0).
 *
 * The retired inputs (design, pull) are pinned to 0 here rather than left at
 * whatever the config row holds — the server-side blend still reads those
 * columns, so this is what keeps `recompute_vestige_index` in agreement with
 * the three-input formula the dashboard shows.
 */
export async function setVestigeIndexWeights(w: IndexWeights): Promise<ActionResult> {
  const all = [w.age, w.ranking, w.setting];
  if (all.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) {
    return { ok: false, message: "Every weight must be 0-1." };
  }
  if (all.reduce((a, b) => a + b, 0) <= 0) {
    return { ok: false, message: "Weights can't all be zero." };
  }
  const supabase = await createDevClient();
  const { error } = await supabase.rpc("admin_set_vestige_index_weights", {
    p_design: 0,
    p_setting: w.setting,
    p_heritage: w.age,
    p_consensus: w.ranking,
    p_pull: 0,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/vestige-index");
  revalidatePath("/courses");
  return { ok: true };
}

export type CourseVariant = {
  id: string;
  name: string;
  club_name: string | null;
  county_name: string | null;
};

/**
 * Split a sibling course (e.g. "Old"/"New" at a club still mapped as one
 * merged polygon) off an existing course row. Clones the source's geo +
 * club/county/layout fields as-is - both variants point at the same
 * boundary until a real one gets mapped separately in `vestige-tool` and
 * pulled in via `/courses/import` - and takes only the new `name` (+ the
 * slug derived from it). Lets a curated-list entry that needs two distinct
 * `course_id`s (e.g. two Top 100 ranks for the same club) exist without
 * waiting on real boundary data.
 */
export async function splitCourseVariant(
  sourceCourseId: string,
  newName: string,
): Promise<ActionResult<CourseVariant>> {
  const trimmedName = newName.trim();
  if (!trimmedName) return { ok: false, message: "Name is required." };

  const session = await createDevClient();
  const {
    data: { user },
    error: userErr,
  } = await session.auth.getUser();
  if (userErr || !user) return { ok: false, message: "Not signed in." };

  // `courses` has no admin INSERT policy - only the import pipeline writes
  // new rows, through the service-role client. Match that here; the session
  // client (RLS) can UPDATE courses but not INSERT them.
  const supabase = await createServiceClient();

  const { data: source, error: sourceErr } = await supabase
    .from("courses")
    .select("club_id,county_id,tier,type,hole_count,polygon,center_lat,center_lng,style,established,par,yards")
    .eq("id", sourceCourseId)
    .maybeSingle();
  if (sourceErr) return { ok: false, message: sourceErr.message };
  if (!source) return { ok: false, message: "Source course not found." };

  const slug = await uniqueCourseSlug(supabase, slugify(trimmedName));

  const { data: created, error: insertErr } = await supabase
    .from("courses")
    .insert({
      name: trimmedName,
      slug,
      club_id: source.club_id,
      county_id: source.county_id,
      tier: source.tier,
      type: source.type,
      hole_count: source.hole_count,
      polygon: source.polygon,
      center_lat: source.center_lat,
      center_lng: source.center_lng,
      style: source.style,
      established: source.established,
      par: source.par,
      yards: source.yards,
      curated_list_ids: [],
      last_edited_by_admin_id: user.id,
      last_edited_at: new Date().toISOString(),
    })
    .select("id,name,clubs(name),counties(name)")
    .single();
  if (insertErr) return { ok: false, message: insertErr.message };

  const clubName = unwrapJoinName(created.clubs);
  const countyName = unwrapJoinName(created.counties);

  revalidatePath("/courses");
  return {
    ok: true,
    data: { id: created.id, name: created.name, club_name: clubName, county_name: countyName },
  };
}

function unwrapJoinName(value: { name: string }[] | { name: string } | null): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0]?.name ?? null) : value.name;
}

async function uniqueCourseSlug(
  supabase: SupabaseClient,
  base: string,
): Promise<string> {
  const candidate = base || crypto.randomUUID().slice(0, 8);
  const { data } = await supabase.from("courses").select("id").eq("slug", candidate).maybeSingle();
  if (!data) return candidate;
  return `${candidate}-${crypto.randomUUID().slice(0, 6)}`;
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

/**
 * Title Case normalisation for free-text style values. Matches the
 * autocomplete pattern: admins type "heathland" or "Heathland" or
 * "HEATHLAND" interchangeably; the canonical stored form is
 * "Heathland" so the distinct-values list doesn't drift.
 *
 * Multi-word styles ("Pitch & Putt") get every word capitalised; the
 * `&` and connectives stay as typed. We don't try to be clever about
 * articles ("of the") - editorial vocabulary doesn't have any.
 */
function normaliseStyle(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Preserve all-caps single chars like "&".
      if (word.length === 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
