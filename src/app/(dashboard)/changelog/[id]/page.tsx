import { pageShell } from "@/components/admin/PageShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { VersionEditor } from "./VersionEditor";
import { VersionView } from "./VersionView";
import {
  type AppVersion,
  type AppVersionChange,
  type AppVersionSection,
  type ChangeReportLinks,
  type LinkedFeedback,
} from "../types";

export const dynamic = "force-dynamic";

export default async function VersionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const mode = (await searchParams).mode === "edit" ? "edit" : "view";
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: version, error: versionError } = await supabase
    .from("app_versions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (versionError) {
    return (
      <div className={pageShell("content")}>
        <BackLink />
        <div className="rounded-2xl border border-alert/40 bg-alert/10 p-4 text-sm text-alert">
          Failed to load this version: {versionError.message}
        </div>
      </div>
    );
  }
  if (!version) notFound();

  const [sectionsRes, changesRes] = await Promise.all([
    supabase
      .from("app_version_sections")
      .select("*")
      .eq("version_id", id)
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("app_version_changes")
      .select("*")
      .eq("version_id", id)
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  const sections = (sectionsRes.data as AppVersionSection[] | null) ?? [];
  const changes = (changesRes.data as AppVersionChange[] | null) ?? [];

  // Report links for this version's items (junction), then hydrate the linked
  // feedback reports in one batch (admin RLS permits direct select on
  // feedback_reports - same as the overview page).
  const links: ChangeReportLinks = {};
  if (changes.length > 0) {
    const { data: linkRows } = await supabase
      .from("app_version_change_reports")
      .select("change_id, feedback_report_id")
      .in("change_id", changes.map((c) => c.id));
    for (const row of (linkRows as Array<{
      change_id: string;
      feedback_report_id: string;
    }> | null) ?? []) {
      (links[row.change_id] ??= []).push(row.feedback_report_id);
    }
  }
  const linkedIds = Array.from(new Set(Object.values(links).flat()));
  const linkedFeedback: Record<string, LinkedFeedback> = {};
  if (linkedIds.length > 0) {
    const { data: reports } = await supabase
      .from("feedback_reports")
      .select("id, kind, status, body")
      .in("id", linkedIds);
    for (const r of (reports as LinkedFeedback[] | null) ?? []) {
      linkedFeedback[r.id] = r;
    }
  }

  // Heading autocomplete for the section input: every distinct heading used
  // across all versions, so "Map" / "Pro" / "Fixes" converge on one spelling.
  const { data: headingRows } = await supabase
    .from("app_version_sections")
    .select("heading");
  const headingSuggestions = Array.from(
    new Set(
      ((headingRows as Array<{ heading: string }> | null) ?? []).map((r) =>
        r.heading.trim(),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className={pageShell("content")}>
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <ModeToggle id={id} mode={mode} />
      </div>
      {mode === "edit" ? (
        <VersionEditor
          version={version as AppVersion}
          initialSections={sections}
          initialChanges={changes}
          initialLinks={links}
          initialLinkedFeedback={linkedFeedback}
          headingSuggestions={headingSuggestions}
          isSuperAdmin={admin.role === "super_admin"}
        />
      ) : (
        <VersionView
          version={version as AppVersion}
          sections={sections}
          changes={changes}
          links={links}
          linkedFeedback={linkedFeedback}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/changelog"
      className="inline-flex items-center gap-1 text-xs text-ink-3 transition-colors hover:text-ink-2"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Back to changelog
    </Link>
  );
}

/** View ↔ Edit segmented toggle. View is the default; switching is plain
 *  navigation (?mode=edit), so each mode renders server-side with fresh data. */
function ModeToggle({ id, mode }: { id: string; mode: "view" | "edit" }) {
  const tab = "px-3 py-1.5 text-xs font-medium transition-colors";
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-rule/70">
      <Link
        href={`/changelog/${id}`}
        className={cn(
          tab,
          mode === "view"
            ? "bg-brand text-brand-fg"
            : "bg-paper-sunken/40 text-ink-2 hover:text-ink",
        )}
      >
        View
      </Link>
      <Link
        href={`/changelog/${id}?mode=edit`}
        className={cn(
          tab,
          mode === "edit"
            ? "bg-brand text-brand-fg"
            : "bg-paper-sunken/40 text-ink-2 hover:text-ink",
        )}
      >
        Edit
      </Link>
    </div>
  );
}
