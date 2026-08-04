"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export type ActionResult = { ok: true } | { ok: false; message: string };

export type ResolvedFlagState = "reviewed_clean" | "reviewed_actioned";

/**
 * Resolve a safeguarding flag - `reviewed_clean` (false positive) or
 * `reviewed_actioned` (an admin took action on the user). Runs on the SESSION
 * client so the resolution is attributed to the signed-in admin; the SECURITY
 * DEFINER `admin_safeguarding_resolve_flag` RPC (migration
 * 20260519140000_safeguarding_rpcs.sql) enforces the `is_admin()` gate,
 * stamps `reviewed_at` / `reviewed_by_admin_id` / `reviewer_note` and writes
 * the audit log.
 */
export async function resolveFlag(
  flagId: string,
  state: ResolvedFlagState,
  note?: string,
): Promise<ActionResult> {
  if (state !== "reviewed_clean" && state !== "reviewed_actioned") {
    return { ok: false, message: `Invalid resolution state: ${state}` };
  }
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_safeguarding_resolve_flag", {
    p_flag_id: flagId,
    p_state: state,
    p_note: note?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/safeguarding");
  return { ok: true };
}
