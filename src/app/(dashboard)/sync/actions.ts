"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSyncClients } from "@/lib/sync/clients";
import { runSync, type SyncReport } from "@/lib/sync/engine";

export type SyncActionResult =
  | { ok: true; report: SyncReport }
  | { ok: false; message: string };

/** Sync writes to prod — super_admin only, regardless of the active env. */
async function gateSuperAdmin(): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") {
    return { ok: false, message: "Editorial sync requires super_admin." };
  }
  return { ok: true };
}

async function run(mode: "dry" | "apply"): Promise<SyncActionResult> {
  const gate = await gateSuperAdmin();
  if (!gate.ok) return gate;
  try {
    const clients = createSyncClients();
    const report = await runSync(clients, mode);
    return { ok: true, report };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/** Compute the dev→prod diff with NO writes. */
export async function dryRunSync(): Promise<SyncActionResult> {
  return run("dry");
}

/** Execute the dev→prod mirror. */
export async function applySync(): Promise<SyncActionResult> {
  return run("apply");
}
