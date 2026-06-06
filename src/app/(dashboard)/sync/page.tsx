import { ShieldAlert } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { isEnvConfigured } from "@/lib/supabase/env";
import { syncConfigStatus } from "@/lib/sync/clients";
import { SyncRunner } from "./SyncRunner";

export const dynamic = "force-dynamic";

/**
 * Editorial dev→prod mirror. Always operates dev→prod regardless of the
 * dashboard's currently-viewed env. Super_admin only. The actual writes
 * run server-side via service-role clients (see `lib/sync`).
 */
export default async function SyncPage() {
  const admin = await requireAdmin();

  if (admin.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SectionHeader eyebrow="Editorial" title="Sync to prod" />
        <div className="flex items-start gap-3 rounded-2xl border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>This surface is restricted to super_admins.</p>
        </div>
      </div>
    );
  }

  const status = syncConfigStatus();
  const prodConfigured = isEnvConfigured("prod");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionHeader
        eyebrow="Editorial"
        title="Sync to prod"
        description="Mirror all editorial content — curated lists, badge definitions, and course editorial fields — from dev to prod. Every course / county / list reference is re-resolved by slug, so the differing UUIDs across the two projects line up. Prod is a pure downstream mirror: anything not in dev is removed (earned badges are protected — their definitions are archived, never deleted). Run a dry run first to preview the diff."
      />
      <SyncRunner status={status} prodConfigured={prodConfigured} />
    </div>
  );
}
