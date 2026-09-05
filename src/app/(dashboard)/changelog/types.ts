// Types + vocabulary for the version changelog surface. Mirrors the shape of
// the `app_versions` / `app_version_sections` / `app_version_changes` /
// `app_version_change_reports` tables (Vestige-ios migrations
// 20260609100000_app_version_changelog.sql + 20260827150000_changelog_sections.sql).
// Internal admin surface only.
//
// Model (area-first, the way 0.4.1 was written): a version is an ordered list
// of free-text SECTIONS ("Map", "Pro", "Fixes"); each section holds ordered
// ITEMS carrying an optional New/Improved/Fixed/Removed label chip, an optional
// smaller detail line, and any number of linked feedback reports (junction).

// ── Per-item labels ─────────────────────────────────────────────────────

export type ChangeLabel = "new" | "improved" | "fixed" | "removed";

/** Chip cycle order in the editor (a fifth click clears the label). */
export const CHANGE_LABELS: readonly ChangeLabel[] = [
  "new",
  "improved",
  "fixed",
  "removed",
];

export const CHANGE_LABEL_TEXT: Record<ChangeLabel, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  removed: "Removed",
};

export type ChipTone = "brand" | "amber" | "alert" | "neutral";

/** Calm single-tone keying, matching the feedback queue's chip palette. */
export const CHANGE_LABEL_TONE: Record<ChangeLabel, ChipTone> = {
  new: "brand",
  improved: "neutral",
  fixed: "amber",
  removed: "alert",
};

/**
 * The label chip itself — tinted fill, no border, fixed small-caps type. One
 * definition shared by the read views and the editor so an item looks the same
 * everywhere it appears.
 */
export const CHANGE_LABEL_CHIP: Record<ChangeLabel, string> = {
  new: "bg-brand/15 text-brand",
  improved: "bg-ink-3/12 text-ink-2",
  fixed: "bg-amber/15 text-amber",
  removed: "bg-alert/15 text-alert",
};

export const CHANGE_LABEL_CHIP_BASE =
  "inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]";

// ── Legacy kind (write-through only) ────────────────────────────────────
// `kind` stays not-null in the DB for the still-deployed old bunker during the
// two-phase window. New writes derive it from the label; nothing renders it.

export type ChangeKind = "added" | "changed" | "improved" | "fixed" | "removed";

export function labelToKind(label: ChangeLabel | null): ChangeKind {
  switch (label) {
    case "new":
      return "added";
    case "fixed":
      return "fixed";
    case "removed":
      return "removed";
    default:
      return "improved";
  }
}

// ── Version lifecycle ───────────────────────────────────────────────────

export type AppVersionStatus = "draft" | "released";

export const VERSION_STATUS_LABELS: Record<AppVersionStatus, string> = {
  draft: "In development",
  released: "Released",
};

/**
 * Badge classes for a version's lifecycle pill. A draft ("In development")
 * wears a filled amber/orange treatment so an unreleased version reads as
 * actively being worked on; a released version stays calm brand. Shared by the
 * list, detail view, and any other surface that renders the status pill.
 */
export function versionStatusBadgeClasses(status: AppVersionStatus): string {
  return status === "released"
    ? "border-brand/35 text-brand"
    : "border-amber/40 bg-amber/15 text-amber";
}

// ── Rows ────────────────────────────────────────────────────────────────

export type AppVersion = {
  id: string;
  version: string;
  major: number;
  minor: number;
  patch: number;
  title: string | null;
  summary: string | null;
  status: AppVersionStatus;
  /**
   * Monotonic `CFBundleVersion` this version shipped as — the build number
   * that never resets across marketing bumps (`20260905190000`). Null while
   * a version is still a draft: nothing has been built yet.
   *
   * 1-24 are reconstructed ordinals for releases before 2026-09-05, which
   * all literally shipped as build 1; they give the history a continuous
   * spine but do not match what App Store Connect shows for those builds.
   * 25 onward are real.
   */
  build_number: number | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppVersionSection = {
  id: string;
  version_id: string;
  heading: string;
  sort_index: number;
  created_at: string;
  updated_at: string;
};

export type AppVersionChange = {
  id: string;
  version_id: string;
  section_id: string | null;
  kind: ChangeKind;
  summary: string;
  label: ChangeLabel | null;
  detail: string | null;
  sort_index: number;
  created_at: string;
  updated_at: string;
};

/** changeId → linked feedback report ids (from app_version_change_reports). */
export type ChangeReportLinks = Record<string, string[]>;

/** Minimal feedback-report summary, hydrated to label a linked change line. */
export type LinkedFeedback = {
  id: string;
  kind: string;
  status: string;
  body: string;
};

/** Index-row counts overlaid on a version for the list page. */
export type AppVersionWithCounts = AppVersion & {
  change_count: number;
  linked_count: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a semver-ish display string into its numeric parts. Accepts two- or
 * three-segment versions ("0.1" → patch 0). Returns null for anything that
 * isn't `N.N` or `N.N.N`, so the create/update actions can reject it.
 */
export function parseVersion(
  input: string,
): { version: string; major: number; minor: number; patch: number } | null {
  const trimmed = input.trim().replace(/^v/i, "");
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] !== undefined ? Number(match[3]) : 0;
  return { version: trimmed, major, minor, patch };
}

/** Sort comparator: newest version first (descending semver). */
export function compareVersionsDesc(a: AppVersion, b: AppVersion): number {
  return b.major - a.major || b.minor - a.minor || b.patch - a.patch;
}

// ── Grouping ────────────────────────────────────────────────────────────

export type SectionGroup = {
  /** Null for the synthetic catch-all holding legacy section-less rows. */
  section: AppVersionSection | null;
  items: AppVersionChange[];
};

/**
 * Arrange a version's sections + items for rendering: sections in sort order,
 * each with its items in sort order. Any row without a section (written by the
 * old bunker during the two-phase window) lands in a trailing "General" group
 * so nothing ever silently disappears.
 */
export function groupIntoSections(
  sections: AppVersionSection[],
  changes: AppVersionChange[],
): SectionGroup[] {
  const bySection = new Map<string, AppVersionChange[]>();
  const orphans: AppVersionChange[] = [];
  for (const c of changes) {
    if (c.section_id) {
      const list = bySection.get(c.section_id) ?? [];
      list.push(c);
      bySection.set(c.section_id, list);
    } else {
      orphans.push(c);
    }
  }
  const groups: SectionGroup[] = [...sections]
    .sort((a, b) => a.sort_index - b.sort_index)
    .map((section) => ({
      section,
      items: (bySection.get(section.id) ?? []).sort(
        (a, b) => a.sort_index - b.sort_index,
      ),
    }));
  if (orphans.length > 0) groups.push({ section: null, items: orphans });
  return groups;
}

/** The current shipped version = highest released. Null when none released. */
export function currentVersion(versions: AppVersion[]): AppVersion | null {
  const released = versions
    .filter((v) => v.status === "released")
    .sort(compareVersionsDesc);
  return released[0] ?? null;
}
