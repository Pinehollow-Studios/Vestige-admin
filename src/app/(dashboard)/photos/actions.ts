"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true; warning?: string } | { ok: false; message: string };

export type ModerationState = "pending" | "approved" | "rejected" | "flagged";

const ALLOWED: ModerationState[] = ["pending", "approved", "rejected", "flagged"];

/**
 * Set a photo's moderation state.
 *
 * Writes through the service-role client: `photos.moderation_state` (and the
 * sibling `moderation_*` columns) carry an admin-only column GRANT, so the
 * authenticated session can't touch them - service-role bypasses both RLS and
 * the column grant. Gated by `requireAdmin()` (defence in depth; the layout
 * already gates every /photos request).
 *
 * No user-facing side effects: the `handle_photo_moderation_state_change`
 * trigger that once notified uploaders was dropped on 2026-05-19 with the
 * verification teardown (`Vestige-ios` migration 20260519110000), so this is a
 * plain state flip.
 *
 * `moderation_reviewer_user_id` is deliberately left untouched (NULL): it FKs
 * `auth.users`, and the admin's auth uid isn't guaranteed to exist in the
 * project being moderated (dev vs prod are separate auth schemas), so setting
 * it risks an FK violation. Attribution, if needed later, belongs in a note.
 */
export async function setPhotoModeration(
  photoId: string,
  next: ModerationState,
  note?: string,
): Promise<ActionResult> {
  if (!ALLOWED.includes(next)) {
    return { ok: false, message: `Invalid moderation state: ${next}` };
  }

  await requireAdmin();

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Service-role not configured",
    };
  }

  const patch: Record<string, unknown> = {
    moderation_state: next,
    moderation_reviewed_at: new Date().toISOString(),
  };
  const trimmed = note?.trim();
  if (trimmed) patch.moderation_note = trimmed;

  const { error } = await supabase.from("photos").update(patch).eq("id", photoId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/photos");
  return { ok: true };
}

/**
 * Bulk-set moderation state on many photos at once (grid bulk bar). One
 * `.in(...)` update through service-role. Same column-grant rationale as the
 * single setter; `moderation_reviewer_user_id` left NULL for the same FK reason.
 */
export async function setPhotoModerationBulk(
  photoIds: string[],
  next: ModerationState,
): Promise<ActionResult> {
  if (!ALLOWED.includes(next)) {
    return { ok: false, message: `Invalid moderation state: ${next}` };
  }
  await requireAdmin();
  if (photoIds.length === 0) return { ok: true };

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Service-role not configured",
    };
  }

  const { error } = await supabase
    .from("photos")
    .update({ moderation_state: next, moderation_reviewed_at: new Date().toISOString() })
    .in("id", photoIds);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/photos");
  return { ok: true };
}

type RemovableRow = {
  id: string;
  kind: "roundPhoto" | "coursePhoto" | "avatar";
  original_storage_key: string | null;
  variants: {
    thumb_storage_key?: string;
    medium_storage_key?: string;
    large_storage_key?: string;
  } | null;
};

/**
 * Permanently remove photos: soft-delete the rows (`deleted_at = now()`) and
 * purge the bytes from storage. Distinct from Reject, which is a reversible
 * moderation-state flip that keeps the files - Remove is irreversible.
 *
 * Buckets per the iOS storage layout (`20260425200005_storage_buckets.sql` +
 * `20260501170000_avatars_simple_overwrite_pattern.sql`): round / course
 * originals live in `photos-original`, avatars in `avatars` (overwrite-in-
 * place at `<userId>/avatar.jpg`, so removing an avatar photo purges the
 * user's live avatar object), rendered variants in `photos-rendered`.
 *
 * Storage failures don't roll back the soft-delete: the rows are already dead
 * to the app, so a leftover object is an orphan to sweep, not a resurrected
 * photo - partial failures come back as a warning on the ok result.
 */
export async function removePhotos(photoIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  if (photoIds.length === 0) return { ok: true };

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Service-role not configured",
    };
  }

  // 1. Read the storage keys before the rows are touched.
  const { data: rows, error: readErr } = await supabase
    .from("photos")
    .select("id, kind, original_storage_key, variants")
    .in("id", photoIds);
  if (readErr) return { ok: false, message: readErr.message };

  // 2. Soft-delete - the authoritative "this photo is gone" bit.
  const { error: delErr } = await supabase
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", photoIds);
  if (delErr) return { ok: false, message: delErr.message };

  // 3. Purge storage, grouped per bucket. Tolerate partial failures.
  const keysByBucket: Record<string, string[]> = {};
  for (const row of ((rows ?? []) as RemovableRow[])) {
    const originalBucket = row.kind === "avatar" ? "avatars" : "photos-original";
    if (row.original_storage_key) {
      (keysByBucket[originalBucket] ??= []).push(row.original_storage_key);
    }
    const variantKeys = [
      row.variants?.thumb_storage_key,
      row.variants?.medium_storage_key,
      row.variants?.large_storage_key,
    ];
    for (const key of variantKeys) {
      if (key) (keysByBucket["photos-rendered"] ??= []).push(key);
    }
  }

  const failures: string[] = [];
  for (const [bucket, keys] of Object.entries(keysByBucket)) {
    const { error } = await supabase.storage.from(bucket).remove(keys);
    if (error) failures.push(`${bucket}: ${error.message}`);
  }

  revalidatePath("/photos");
  if (failures.length > 0) {
    return {
      ok: true,
      warning: `Photos removed, but some storage objects couldn't be deleted (${failures.join("; ")}).`,
    };
  }
  return { ok: true };
}

/** Single-photo variant of `removePhotos` (tile Remove button). */
export async function removePhoto(photoId: string): Promise<ActionResult> {
  return removePhotos([photoId]);
}
