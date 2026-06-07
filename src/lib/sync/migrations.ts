import "server-only";
import { createSyncClients, type SyncClients } from "./clients";
import { fetchProdMigrationHold } from "@/lib/github/dispatch";

/**
 * Computes the dev→prod migration gap for the promotion console, using the
 * `admin_applied_migrations()` RPC on each project (via the service-role sync
 * clients) + the hold-list. Read-only.
 */

export type PendingMigration = { version: string; name: string; held: boolean };

export type MigrationStatus = {
  devCount: number;
  prodCount: number | null; // null = prod ledger not readable yet
  prodLedgerAvailable: boolean;
  pending: PendingMigration[]; // dev-applied that prod hasn't, held flagged
  pushableCount: number; // pending minus held
  heldCount: number;
  error?: string;
};

async function appliedVersions(
  client: SyncClients["dev"],
): Promise<Array<{ version: string; name: string }> | null> {
  const { data, error } = await client.rpc("admin_applied_migrations");
  if (error) return null; // RPC missing (prod not bootstrapped) or not permitted
  return (data ?? []) as Array<{ version: string; name: string }>;
}

export async function migrationStatus(): Promise<MigrationStatus> {
  const empty: MigrationStatus = {
    devCount: 0,
    prodCount: null,
    prodLedgerAvailable: false,
    pending: [],
    pushableCount: 0,
    heldCount: 0,
  };

  let clients: SyncClients;
  try {
    clients = createSyncClients();
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) };
  }

  const [dev, prod, held] = await Promise.all([
    appliedVersions(clients.dev),
    appliedVersions(clients.prod),
    fetchProdMigrationHold(),
  ]);

  if (!dev) {
    return { ...empty, error: "Couldn't read the dev migration ledger (admin_applied_migrations)." };
  }

  // Prod ledger unavailable → bootstrap state. Don't list all of dev as
  // "pending" (misleading); the first schema push establishes the ledger.
  if (!prod) {
    return {
      ...empty,
      devCount: dev.length,
      prodCount: null,
      prodLedgerAvailable: false,
    };
  }

  const prodVersions = new Set(prod.map((r) => r.version));
  const pending: PendingMigration[] = dev
    .filter((r) => !prodVersions.has(r.version))
    .map((r) => ({ version: r.version, name: r.name, held: held.has(r.version) }))
    .sort((a, b) => a.version.localeCompare(b.version));

  const heldCount = pending.filter((p) => p.held).length;
  return {
    devCount: dev.length,
    prodCount: prod.length,
    prodLedgerAvailable: true,
    pending,
    pushableCount: pending.length - heldCount,
    heldCount,
  };
}
