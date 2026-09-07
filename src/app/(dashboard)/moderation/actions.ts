"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceClient } from "@/lib/supabase/admin";
import type {
  ModerationAction,
  ModerationCategory,
  ModerationTier,
  PhotoQueueRow,
  ProfileMediaRow,
  SafetyHealth,
  SweepRow,
  TestResult,
  TextScanRow,
} from "./types";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; message: string };

/** Service-role client (is_admin() short-circuits for it), behind requireAdmin.
 *  Returns the acting admin too — service-role calls have no auth.uid(), so the
 *  RPCs take the admin id explicitly and record it as `updated_by`. */
async function adminClient() {
  const admin = await requireAdmin();
  return { supabase: await createServiceClient(), adminId: admin.id };
}

function friendly(message: string): string {
  if (message.includes("term_is_allow_listed")) {
    return "That word is on the allow-list, so a compound term would be disarmed by it. Remove it from the allow-list first, or leave this term non-compound.";
  }
  if (message.includes("word_is_a_compound_term")) {
    return "That word IS a compound term. Allow-listing it would switch the term off entirely.";
  }
  if (message.includes("phrase_must_be_multi_word")) {
    return "Phrases need at least two words. A single word belongs on the allow-list.";
  }
  if (message.includes("invalid_term")) {
    return "A term has to contain letters once punctuation and digits are stripped.";
  }
  if (message.includes("term_not_found")) return "That term is no longer in the list.";
  if (message.includes("not_authorised")) return "Your admin account can't make this change.";
  return message;
}

export type UpsertTermInput = {
  term: string;
  category: ModerationCategory;
  compound: boolean;
  action: ModerationAction | null;
  note: string | null;
};

/**
 * Create or update a term. The server RPC is the real gate — including the
 * refusal to make a term compound while the same word sits on the allow-list,
 * which would silently disarm it.
 */
export async function upsertTerm(input: UpsertTermInput): Promise<ActionResult> {
  const term = input.term.trim().toLowerCase();
  if (!term) return { ok: false, message: "Enter a word or phrase." };
  if (term.length > 80) return { ok: false, message: "That's too long to be a term." };

  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_upsert_moderation_term", {
    p_term: term,
    p_category: input.category,
    p_compound: input.compound,
    p_action: input.action,
    p_note: input.note,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/** Switch a term off without losing it — the reversible option, and the one to
 *  reach for when a term is causing false positives you haven't diagnosed yet. */
export async function setTermActive(term: string, active: boolean): Promise<ActionResult> {
  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_set_moderation_term_active", {
    p_term: term,
    p_active: active,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/** Add or remove an allow-list word — the fix for a false positive on a name
 *  the generated list didn't know about. */
export async function setAllowWord(word: string, allowed: boolean): Promise<ActionResult> {
  const clean = word.trim().toLowerCase();
  if (!clean) return { ok: false, message: "Enter a word." };

  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_set_moderation_allow_word", {
    p_word: clean,
    p_allowed: allowed,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/** Add or remove an allow-phrase — for a club name whose own words trip the
 *  matcher, like Cocks Moors Woods Golf Course. */
export async function setAllowPhrase(phrase: string, allowed: boolean): Promise<ActionResult> {
  const clean = phrase.trim();
  if (!clean) return { ok: false, message: "Enter a phrase." };

  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_set_moderation_allow_phrase", {
    p_phrase: clean,
    p_allowed: allowed,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/**
 * Run a string through the live matcher. The most useful control on the page:
 * it turns "I think this is blocked" into "here is the term and the pass that
 * caught it", against the lists as they are right now.
 */
export async function testText(text: string, tier: ModerationTier): Promise<ActionResult<TestResult>> {
  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { data, error } = await supabase.rpc("admin_test_moderation", {
    p_text: text,
    p_tier: tier,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  return { ok: true, data: data as TestResult };
}

/**
 * Resolve a flag. `reviewed_clean` is a false positive — worth pairing with an
 * allow-list add so the same text stops flagging. `reviewed_actioned` means the
 * content or the account was dealt with elsewhere (safeguarding, a delete).
 */
export async function resolveFlag(
  flagId: string,
  resolution: "reviewed_clean" | "reviewed_actioned",
): Promise<ActionResult> {
  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_resolve_moderation_flag", {
    p_flag_id: flagId,
    p_resolution: resolution,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/**
 * Score everything already stored against the live lists.
 *
 * Read-only — it changes nothing, so it is safe to run against production, and
 * that is when it is most useful: after any term-list change, to see what the
 * change would newly catch. On production as of 2026-09-07 it returns three
 * rows out of seventy-eight, so this is a "read each one" tool, not a bulk one.
 */
export async function runSweep(): Promise<ActionResult<SweepRow[]>> {
  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { data, error } = await supabase.rpc("admin_moderation_sweep");
  if (error) return { ok: false, message: friendly(error.message) };
  return { ok: true, data: (data ?? []) as SweepRow[] };
}

/**
 * Reset a display name or bio, and tell the user why through the feedback
 * thread they already know (§13.3 close the loop). The previous value is kept
 * in `moderation_admin_actions`, so nothing is destroyed.
 */
export async function resetField(
  userId: string,
  field: "display_name" | "bio",
  message: string,
  replacement?: string,
): Promise<ActionResult> {
  if (!message.trim()) return { ok: false, message: "Say why — the user is told." };

  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_reset_moderation_field", {
    p_user_id: userId,
    p_field: field,
    p_message: message,
    p_replacement: replacement?.trim() || null,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/**
 * Hand back the once-per-lifetime username change so the user picks their own
 * new handle. Deliberately not an admin rename: a handle is a permanent, public
 * piece of someone's identity.
 */
export async function grantUsernameRepick(userId: string, message: string): Promise<ActionResult> {
  if (!message.trim()) return { ok: false, message: "Say why — the user is told." };

  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_grant_username_repick", {
    p_user_id: userId,
    p_message: message,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/**
 * Avatars and cover banners, as the review pipeline sees them.
 *
 * `pending` means the verifier has not run yet — usually seconds, but a row
 * stuck there means `process-avatar` is unhealthy, which is worth seeing.
 * `flagged` means the bytes were not a real image, or the re-encode failed:
 * either way a human should look before anything is deleted.
 */
export async function profileMediaQueue(state?: string): Promise<ActionResult<ProfileMediaRow[]>> {
  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { data, error } = await supabase.rpc("admin_profile_media_queue", {
    p_state: state ?? null,
  });
  if (error) return { ok: false, message: friendly(error.message) };
  return { ok: true, data: (data ?? []) as ProfileMediaRow[] };
}

/**
 * Remove a profile picture or cover. Deletes the object, clears the pointer
 * that makes it render, records the act with the path, and tells the user why
 * through their feedback thread.
 */
export async function removeProfileMedia(objectPath: string, message: string): Promise<ActionResult> {
  if (!message.trim()) return { ok: false, message: "Say why — the user is told." };

  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  // The bytes go first, through the Storage API — Postgres refuses a direct
  // DELETE on storage.objects, and doing it in this order means we never tell a
  // user their picture was removed while it is still being served. It matters
  // most for covers, which have no pointer to clear: deleting the object is the
  // only thing that takes one off other people's screens.
  const { error: storageError } = await supabase.storage.from("avatars").remove([objectPath]);
  if (storageError) {
    return { ok: false, message: `Couldn't delete the file: ${storageError.message}` };
  }

  const { error } = await supabase.rpc("admin_remove_profile_media", {
    p_object_path: objectPath,
    p_message: message,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/moderation");
  return { ok: true };
}

/** The classifier's kill switch, thresholds, and how much is waiting. */
export async function safetyHealth(): Promise<ActionResult<SafetyHealth>> {
  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { data, error } = await supabase.rpc("admin_content_safety_health");
  if (error) return { ok: false, message: friendly(error.message) };
  return { ok: true, data: data as SafetyHealth };
}

/**
 * Change a severity threshold.
 *
 * `rejectAt: null` means never auto-remove — which is where every category
 * starts, deliberately, so the first week produces real numbers before anything
 * is taken down automatically. SelfHarm cannot be given a reject threshold at
 * all: the database refuses it, because a self-harm score is a safeguarding
 * signal that should reach a person rather than trigger a takedown.
 */
export async function setThreshold(
  category: string,
  flagAt: number,
  rejectAt: number | null,
): Promise<ActionResult> {
  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_set_moderation_threshold", {
    p_category: category,
    p_flag_at: flagAt,
    p_reject_at: rejectAt,
    p_admin_id: adminId,
  });
  if (error) {
    if (error.message.includes("self_harm_never_rejects")) {
      return { ok: false, message: "Self-harm can never auto-remove — it should reach a person." };
    }
    if (error.message.includes("ordered")) {
      return { ok: false, message: "The remove level has to be at or above the flag level." };
    }
    return { ok: false, message: friendly(error.message) };
  }

  revalidatePath("/moderation");
  return { ok: true };
}

/** Photos the classifier has flagged or rejected, plus anything not yet
 *  scored — an unscored photo is the signal that the pipeline is unhealthy. */
export async function photoQueue(): Promise<ActionResult<PhotoQueueRow[]>> {
  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }
  const { data, error } = await supabase.rpc("admin_photo_classification_queue", { p_limit: 100 });
  if (error) return { ok: false, message: friendly(error.message) };
  return { ok: true, data: (data ?? []) as PhotoQueueRow[] };
}

/**
 * Hide or restore a photo.
 *
 * Rejecting takes it off every surface and requires a message, which the user
 * gets in their feedback thread — a photo vanishing with no explanation is how
 * you lose someone's trust. The file itself is kept, so a mistake is reversible
 * by setting the state back.
 */
export async function setPhotoState(
  photoId: string,
  state: "approved" | "rejected",
  message?: string,
): Promise<ActionResult> {
  if (state === "rejected" && !message?.trim()) {
    return { ok: false, message: "Say why — the user is told." };
  }
  let supabase, adminId;
  try {
    ({ supabase, adminId } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }
  const { error } = await supabase.rpc("admin_set_photo_moderation", {
    p_photo_id: photoId,
    p_state: state,
    p_message: message ?? null,
    p_admin_id: adminId,
  });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath("/moderation");
  return { ok: true };
}

/** Text the classifier flagged, plus anything not yet scanned. */
export async function textScanQueue(): Promise<ActionResult<TextScanRow[]>> {
  let supabase;
  try {
    ({ supabase } = await adminClient());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }
  const { data, error } = await supabase.rpc("admin_text_scan_queue", { p_limit: 100 });
  if (error) return { ok: false, message: friendly(error.message) };
  return { ok: true, data: (data ?? []) as TextScanRow[] };
}
