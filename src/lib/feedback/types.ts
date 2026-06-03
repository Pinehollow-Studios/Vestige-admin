/**
 * Feedback / bug-reporting types — shared between the queue page,
 * thread detail page, and any client components that branch on
 * status / kind / severity.
 *
 * These literal-union types mirror the iOS `FeedbackCategory` /
 * `FeedbackStatus` / `FeedbackSeverity` / `FeedbackMessageKind` /
 * `FeedbackMessageAuthorRole` enums (see
 * `Vestige-ios/Vestige/Models/FeedbackReport.swift`) and the SQL
 * enum / CHECK constraints introduced by
 * `20260504210000_feedback_v2_schema.sql`. Any drift here must be
 * matched on both sides.
 */

export type FeedbackKind = "bug" | "dataError" | "featureRequest" | "general";
export type FeedbackStatus =
  | "new"
  | "triaged"
  | "inProgress"
  | "resolved"
  | "wontFix";
export type FeedbackSeverity = "low" | "medium" | "high" | "critical";
export type FeedbackMessageKind = "reply" | "status_change";
export type FeedbackMessageAuthorRole =
  | "moderator"
  | "editor"
  | "super_admin"
  | "system";

/**
 * Row shape returned by `admin_feedback_queue(...)`. One row per
 * report, enriched with reporter handle/avatar + screenshot count
 * + most-recent admin-message preview + duplicate count.
 */
export type FeedbackQueueRow = {
  report_id: string;
  user_id: string | null;
  reporter_username: string | null;
  reporter_display_name: string | null;
  reporter_avatar_photo_id: string | null;
  is_founder: boolean;
  kind: FeedbackKind;
  status: FeedbackStatus;
  severity: FeedbackSeverity | null;
  body_preview: string;
  tags: string[];
  duplicate_of_report_id: string | null;
  duplicate_count: number;
  screenshot_count: number;
  last_admin_message_preview: string | null;
  last_admin_message_at: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

/**
 * Row in the `report` jsonb column returned by
 * `admin_feedback_thread(p_report_id)`. Loose typing for the columns
 * that don't drive UI on slice 1.
 */
export type FeedbackReport = {
  id: string;
  user_id: string | null;
  kind: FeedbackKind;
  status: FeedbackStatus;
  severity: FeedbackSeverity | null;
  body: string;
  expected_behaviour: string | null;
  steps: string | null;
  screen: string | null;
  breadcrumbs: Array<Record<string, unknown>> | null;
  app_version: string | null;
  ios_version: string | null;
  device_model: string | null;
  category_context: Record<string, string> | null;
  tags: string[] | null;
  is_founder: boolean | null;
  duplicate_of_report_id: string | null;
  linked_crash_id: string | null;
  last_admin_message_at: string | null;
  unread_admin_message_for_user: boolean | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type FeedbackReporter = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_photo_id: string | null;
  is_founding_member: boolean | null;
};

export type FeedbackMessage = {
  id: string;
  report_id: string;
  author_user_id: string | null;
  author_role: FeedbackMessageAuthorRole;
  kind: FeedbackMessageKind;
  body: string | null;
  attachment_storage_path: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type FeedbackScreenshot = {
  id: string;
  report_id: string;
  storage_path: string;
  auto_captured: boolean;
  redacted: boolean;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type FeedbackDuplicateLink = {
  id: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  created_at: string;
  body_preview: string;
};

export type FeedbackThread = {
  report: FeedbackReport;
  reporter: FeedbackReporter | null;
  messages: FeedbackMessage[];
  screenshots: FeedbackScreenshot[];
  duplicates: FeedbackDuplicateLink[];
};

// MARK: - UI helpers

/** Display label for a `FeedbackKind` (the user-facing word, not the
 * raw enum). Mirrored on iOS as `FeedbackCategory.displayLabel`. */
export function kindLabel(kind: FeedbackKind): string {
  switch (kind) {
    case "bug":
      return "Bug";
    case "dataError":
      return "Data error";
    case "featureRequest":
      return "Feature request";
    case "general":
      return "General";
  }
}

export function statusLabel(status: FeedbackStatus): string {
  switch (status) {
    case "new":
      return "New";
    case "triaged":
      return "Acknowledged";
    case "inProgress":
      return "In progress";
    case "resolved":
      return "Resolved";
    case "wontFix":
      return "Won't fix";
  }
}

export function severityLabel(severity: FeedbackSeverity | null): string {
  if (!severity) return "Unset";
  return severity[0].toUpperCase() + severity.slice(1);
}

/**
 * Tailwind class fragments matching the four severity colours. We
 * pull these out so the queue table + detail page render
 * consistently.
 */
export function severityChipClasses(
  severity: FeedbackSeverity | null,
): string {
  switch (severity) {
    case "critical":
      return "border-alert/40 bg-alert/15 text-alert";
    case "high":
      return "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "medium":
      return "border-brand/30 bg-brand/10 text-brand-deep dark:text-brand-soft";
    case "low":
      return "border-border bg-paper-sunken/60 text-ink-2";
    default:
      return "border-dashed border-border/70 bg-paper-sunken/40 text-ink-3";
  }
}

export function statusChipClasses(status: FeedbackStatus): string {
  switch (status) {
    case "new":
      return "border-brand/30 bg-brand/10 text-brand-deep dark:text-brand-soft";
    case "triaged":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "inProgress":
      return "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "resolved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "wontFix":
      return "border-border bg-paper-sunken/60 text-ink-2";
  }
}
