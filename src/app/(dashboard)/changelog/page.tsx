import { pageShell } from "@/components/admin/PageShell";
import { EmptyState } from "@/components/admin/EmptyState";
import Link from "next/link";
import { ChevronRight, Pencil, Rocket } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { cn } from "@/lib/utils";
import { NewVersionButton } from "./NewVersionButton";
import { ChangeLinesView } from "./ChangeLinesView";
import {
  type AppVersion,
  type AppVersionChange,
  type AppVersionSection,
  type ChangeReportLinks,
  type LinkedFeedback,
  compareVersionsDesc,
  currentVersion,
  VERSION_STATUS_LABELS,
  versionStatusBadgeClasses,
} from "./types";

export const dynamic = "force-dynamic";

/**
 * Changelog - the release log as a feed of version cards, newest first. The
 * current release and any draft render fully open; older versions collapse to
 * their header row and expand on tap (native <details> - zero JS, works on
 * Jack's phone). Each card leads with an oversized version number; sections +
 * chip-led items render inside via ChangeLinesView. This is the surface Jack
 * reads to see what's being built, so it's styled to read like a polished
 * public release log, not a raw table.
 *
 * Forward-compat: a missing-relation error (tables not deployed) renders the
 * unconfigured state rather than throwing.
 */
export default async function ChangelogPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [versionsRes, sectionsRes, changesRes, linksRes] = await Promise.all([
    supabase
      .from("app_versions")
      .select("*")
      .order("major", { ascending: false })
      .order("minor", { ascending: false })
      .order("patch", { ascending: false }),
    supabase
      .from("app_version_sections")
      .select("*")
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("app_version_changes")
      .select("*")
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("app_version_change_reports").select("change_id, feedback_report_id"),
  ]);

  const notConfigured =
    !!versionsRes.error && isMissingRelation(versionsRes.error.message);

  const versions = ((versionsRes.data as AppVersion[] | null) ?? [])
    .slice()
    .sort(compareVersionsDesc);
  // One past the highest build already recorded. Build numbers are monotonic
  // for the life of the app and never reset on a marketing bump, so a new
  // entry continues the count — the create form prefills this rather than
  // leaving a blank somebody would fill with "1".
  const suggestedBuild =
    versions.reduce((max, v) => Math.max(max, v.build_number ?? 0), 0) + 1;
  const sections = (sectionsRes.data as AppVersionSection[] | null) ?? [];
  const changes = (changesRes.data as AppVersionChange[] | null) ?? [];

  // Group sections + items by version (already globally sorted by sort_index).
  const sectionsByVersion = new Map<string, AppVersionSection[]>();
  for (const s of sections) {
    const list = sectionsByVersion.get(s.version_id) ?? [];
    list.push(s);
    sectionsByVersion.set(s.version_id, list);
  }
  const changesByVersion = new Map<string, AppVersionChange[]>();
  for (const c of changes) {
    const list = changesByVersion.get(c.version_id) ?? [];
    list.push(c);
    changesByVersion.set(c.version_id, list);
  }

  // Report links (junction) + hydrate the reports for the "report" chips.
  const links: ChangeReportLinks = {};
  for (const row of (linksRes.data as Array<{
    change_id: string;
    feedback_report_id: string;
  }> | null) ?? []) {
    (links[row.change_id] ??= []).push(row.feedback_report_id);
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

  const current = currentVersion(versions);

  return (
    <div className={pageShell("content")}>
      <SectionHeader
        eyebrow="Operations"
        title="Changelog"
        actions={<NewVersionButton suggestedBuild={suggestedBuild} />}
      />

      {versionsRes.error && !notConfigured && (
        <div className="rounded-2xl border border-alert/40 bg-alert/10 p-4 text-sm text-alert">
          Failed to load versions: {versionsRes.error.message}
        </div>
      )}

      {notConfigured && <NotConfigured />}

      {!versionsRes.error && versions.length === 0 && (
        <EmptyState
          icon={Rocket}
          title="No versions yet"
          description="Add your first version to start tracking what ships in each release."
        />
      )}

      {!notConfigured && versions.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {versions.map((version) => (
            <ReleaseCard
              key={version.id}
              version={version}
              sections={sectionsByVersion.get(version.id) ?? []}
              changes={changesByVersion.get(version.id) ?? []}
              links={links}
              linkedFeedback={linkedFeedback}
              isCurrent={current?.id === version.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One version as a feed card. The current release and any draft render open;
 * older versions collapse to their header row and expand on tap - native
 * <details>, so it costs no JS and behaves on a phone. The whole header row is
 * the tap target.
 */
function ReleaseCard({
  version,
  sections,
  changes,
  links,
  linkedFeedback,
  isCurrent,
}: {
  version: AppVersion;
  sections: AppVersionSection[];
  changes: AppVersionChange[];
  links: ChangeReportLinks;
  linkedFeedback: Record<string, LinkedFeedback>;
  isCurrent: boolean;
}) {
  const fixedCount = changes.filter((c) => c.label === "fixed").length;
  const isDraft = version.status === "draft";

  return (
    <details
      open={isCurrent || isDraft}
      className={cn(
        "group overflow-hidden rounded-2xl glass-panel",
        isDraft && "border-amber/35",
        isCurrent && "border-brand/30",
      )}
    >
      <summary className="flex min-h-[56px] cursor-pointer select-none list-none items-center gap-3 p-4 transition-colors hover:bg-paper-sunken/30 sm:p-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-ink-3/70 transition-transform duration-200 group-open:rotate-90"
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cn(
                "font-hero text-2xl leading-none tracking-tight sm:text-3xl",
                isCurrent
                  ? "bg-clip-text text-transparent [background-image:var(--gradient-accent)]"
                  : "text-ink",
              )}
            >
              {version.version}
            </span>
            {isDraft && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  versionStatusBadgeClasses("draft"),
                )}
              >
                {VERSION_STATUS_LABELS.draft}
              </span>
            )}
            {isCurrent && (
              <span className="inline-flex items-center rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
                Current
              </span>
            )}
            {version.build_number != null && (
              <span
                className="rounded bg-ink-3/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-3"
                title="Build number - monotonic for the life of the app, never resets on a version bump"
              >
                build {version.build_number}
              </span>
            )}
            {version.released_at && (
              <span className="text-xs text-ink-3">{formatDate(version.released_at)}</span>
            )}
          </div>
          {version.title && (
            <p className="truncate text-sm font-medium text-ink-2">{version.title}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-2.5 text-[11px] text-ink-3 sm:flex">
            <span>
              <span className="tabular-nums text-ink-2">{changes.length}</span>{" "}
              {changes.length === 1 ? "item" : "items"}
            </span>
            {fixedCount > 0 && (
              <span className="text-amber">
                <span className="tabular-nums">{fixedCount}</span> fixed
              </span>
            )}
          </span>
          <Link
            href={`/changelog/${version.id}?mode=edit`}
            className="inline-flex items-center gap-1 rounded-lg border border-rule/60 px-2.5 py-1.5 text-[11px] text-ink-3 transition-colors hover:border-brand/40 hover:text-brand"
          >
            <Pencil aria-hidden className="size-3" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
        </div>
      </summary>

      <div className="space-y-4 border-t border-rule/40 p-4 sm:p-5 sm:pl-12">
        {version.summary && <p className="text-sm text-ink-2">{version.summary}</p>}
        <ChangeLinesView
          sections={sections}
          changes={changes}
          links={links}
          linkedFeedback={linkedFeedback}
        />
      </div>
    </details>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-xl glass-panel p-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-full bg-paper-sunken text-ink-3">
          <Rocket className="size-5" />
        </span>
        <p className="font-display text-base font-semibold text-ink">Changelog not wired here</p>
        <p className="mx-auto max-w-md text-sm text-ink-2">
          The changelog tables aren&apos;t in this Supabase project yet. Push the
          <span className="font-mono text-xs"> 20260609100000_app_version_changelog.sql</span>{" "}
          migration to prod to enable this surface.
        </p>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** True when a PostgREST error reads like "relation/function does not exist". */
function isMissingRelation(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("schema cache") ||
    m.includes("not found")
  );
}
