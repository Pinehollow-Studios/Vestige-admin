"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDevClient } from "@/lib/supabase/server";
import { eventCoverStorageKey } from "@/lib/storage";
import type { AwardRule, EventKind } from "./types";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

/**
 * Insert a fresh draft event and redirect into its editor. Only the
 * title is asked for up front; the window defaults to the coming
 * calendar month so the editor always opens with a valid range.
 */
export async function createEvent(title: string): Promise<ActionResult<string>> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, message: "Title is required." };

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0, 23, 59, 59));

  const supabase = await createDevClient();
  const { data, error } = await supabase
    .from("clubhouse_events")
    .insert({
      title: trimmed,
      kind: "race",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  redirect(`/events/${data.id}`);
}

/**
 * Patch fields on an event. Empty strings coerce to null for the
 * optional text fields (PostgREST sends '' not null).
 */
export async function updateEvent(
  eventId: string,
  patch: {
    title?: string;
    subtitle?: string | null;
    description?: string | null;
    kind?: EventKind;
    starts_at?: string;
    ends_at?: string;
    target_count?: number | null;
    badge_definition_id?: string | null;
    award_rule?: AwardRule | null;
  },
): Promise<ActionResult> {
  const supabase = await createDevClient();
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { ok: false, message: "Title can't be empty." };
    update.title = t;
  }
  if (patch.subtitle !== undefined) update.subtitle = patch.subtitle?.trim() || null;
  if (patch.description !== undefined) update.description = patch.description?.trim() || null;
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.starts_at !== undefined) update.starts_at = patch.starts_at;
  if (patch.ends_at !== undefined) update.ends_at = patch.ends_at;
  if (patch.target_count !== undefined) update.target_count = patch.target_count;
  if (patch.badge_definition_id !== undefined) update.badge_definition_id = patch.badge_definition_id;
  if (patch.award_rule !== undefined) update.award_rule = patch.award_rule;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("clubhouse_events").update(update).eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Publish (now), schedule-publish, or revert to draft. Publishing
 * clears `is_archived` — un-archiving and publishing are the same
 * intent, matching the curated-lists editor.
 */
export async function setEventPublishState(
  eventId: string,
  publishedAt: string | null,
): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { error } = await supabase
    .from("clubhouse_events")
    .update({ published_at: publishedAt, is_archived: false })
    .eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function archiveEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { error } = await supabase
    .from("clubhouse_events")
    .update({ is_archived: true })
    .eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function unarchiveEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { error } = await supabase
    .from("clubhouse_events")
    .update({ is_archived: false })
    .eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/** Delete a draft outright. Guarded to drafts in the editor UI. */
export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { error } = await supabase.from("clubhouse_events").delete().eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  redirect("/events");
}

/**
 * Close & award — calls `admin_finalize_clubhouse_event`, which
 * mints the prize badge per the event's award rule and stamps
 * `finalized_at`. Returns the number of badges minted.
 */
export async function finalizeEvent(eventId: string): Promise<ActionResult<number>> {
  const supabase = await createDevClient();
  const { data, error } = await supabase.rpc("admin_finalize_clubhouse_event", {
    p_event: eventId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data: (data as number) ?? 0 };
}

/** Add one course to the event's set (idempotent on the PK). */
export async function addEventCourse(eventId: string, courseId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { data: maxRow, error: maxErr } = await supabase
    .from("clubhouse_event_courses")
    .select("position")
    .eq("event_id", eventId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return { ok: false, message: maxErr.message };
  const nextPosition = (maxRow?.position ?? 0) + 1;

  const { error } = await supabase.from("clubhouse_event_courses").insert({
    event_id: eventId,
    course_id: courseId,
    position: nextPosition,
  });
  if (error && !error.message.includes("duplicate key")) {
    return { ok: false, message: error.message };
  }
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function removeEventCourse(eventId: string, courseId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { error } = await supabase
    .from("clubhouse_event_courses")
    .delete()
    .eq("event_id", eventId)
    .eq("course_id", courseId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Bulk-add every course in a county — the "sweep" sugar. Skips
 * courses already on the set via upsert-ignore.
 */
export async function addCountyCourses(eventId: string, countyId: string): Promise<ActionResult<number>> {
  const supabase = await createDevClient();
  const { data: courses, error: coursesErr } = await supabase
    .from("courses")
    .select("id")
    .eq("county_id", countyId);
  if (coursesErr) return { ok: false, message: coursesErr.message };
  if (!courses || courses.length === 0) return { ok: false, message: "That county has no courses." };

  const { data: existing, error: existingErr } = await supabase
    .from("clubhouse_event_courses")
    .select("course_id,position")
    .eq("event_id", eventId);
  if (existingErr) return { ok: false, message: existingErr.message };

  const already = new Set((existing ?? []).map((r) => r.course_id));
  let position = Math.max(0, ...(existing ?? []).map((r) => r.position ?? 0));
  const rows = courses
    .filter((c) => !already.has(c.id))
    .map((c) => ({ event_id: eventId, course_id: c.id, position: ++position }));
  if (rows.length === 0) return { ok: true, data: 0 };

  const { error } = await supabase.from("clubhouse_event_courses").insert(rows);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data: rows.length };
}

export async function clearEventCourses(eventId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { error } = await supabase
    .from("clubhouse_event_courses")
    .delete()
    .eq("event_id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Cover upload — same shape as `uploadCuratedCover`, under the
 * `events/` prefix the admin-write storage policy gates on.
 */
export async function uploadEventCover(
  eventId: string,
  formData: FormData,
): Promise<ActionResult<string>> {
  const file = formData.get("cover");
  if (!(file instanceof File)) return { ok: false, message: "No file provided." };
  if (file.size === 0) return { ok: false, message: "File is empty." };

  const supabase = await createDevClient();
  const { path, key } = eventCoverStorageKey(eventId);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from("list-covers")
    .upload(path, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (uploadErr) return { ok: false, message: `Upload failed: ${uploadErr.message}` };

  const { error: patchErr } = await supabase
    .from("clubhouse_events")
    .update({ cover_storage_key: key })
    .eq("id", eventId);
  if (patchErr) return { ok: false, message: `Save failed: ${patchErr.message}` };

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { ok: true, data: key };
}

export async function removeEventCover(eventId: string): Promise<ActionResult> {
  const supabase = await createDevClient();
  const { path } = eventCoverStorageKey(eventId);
  // Storage 404 (object never existed) is benign — null the row
  // anyway so the UI catches up.
  await supabase.storage.from("list-covers").remove([path]);
  const { error } = await supabase
    .from("clubhouse_events")
    .update({ cover_storage_key: null })
    .eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { ok: true };
}
