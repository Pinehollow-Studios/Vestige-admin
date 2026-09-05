"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Set the minimum-version gate (Vestige-ios CLAUDE.md §3.8.2) for the active
 * environment. `min` is the hard floor (below it → blocking "update required"
 * wall); `recommended` drives the soft nudge; `updateUrl` is where both
 * "Update" buttons point. Since 2026-09-05 each floor carries an optional
 * BUILD number too (`admin_set_app_version_config_v2`): builds are monotonic,
 * so "0.4.4 (25) and up" walls or nudges a 0.4.4 (1) install while leaving
 * 0.4.4 (25) alone - the marketing version alone could not tell them apart.
 * Service-role write (is_admin short-circuits for it), gated by
 * `requireAdmin()`.
 */
export async function setAppVersionConfig(
  min: string,
  minBuild: number | null,
  recommended: string | null,
  recommendedBuild: number | null,
  updateUrl: string | null,
): Promise<ActionResult> {
  const trimmedMin = min.trim();
  if (!/^\d+(\.\d+)*$/.test(trimmedMin)) {
    return { ok: false, message: "Minimum version must be a dotted number like 0.2.3" };
  }
  for (const [label, value] of [
    ["Minimum build", minBuild],
    ["Recommended build", recommendedBuild],
  ] as const) {
    if (value != null && (!Number.isInteger(value) || value < 1)) {
      return { ok: false, message: `${label} must be a whole number like 25` };
    }
  }

  await requireAdmin();

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Service-role not configured" };
  }

  const { error } = await supabase.rpc("admin_set_app_version_config_v2", {
    p_min_supported_version: trimmedMin,
    p_min_supported_build: minBuild,
    p_recommended_version: recommended?.trim() || null,
    p_recommended_build: recommendedBuild,
    p_update_url: updateUrl?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/flags");
  return { ok: true };
}
