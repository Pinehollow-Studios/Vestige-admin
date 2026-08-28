/**
 * Shared types + vocabulary for the feature-flags admin surface.
 *
 * Mirrors the server `feature_flags` table + the `admin_feature_flags_overview`
 * / `admin_upsert_feature_flag` / … RPCs
 * (`Vestige-ios/supabase/migrations/20260712100000_feature_flags.sql`) and the
 * iOS `FeatureFlags` reader. Targeting reuses the Broadcasts/Announcements
 * `target` model verbatim, so the shared {@link AudiencePicker} drives it.
 *
 * The UI splits flags into two plain-language kinds:
 *   • boolean  → a "feature" you switch on / off
 *   • string/number/json → a "setting" whose value you edit
 */

import type {
  BroadcastAudienceKind,
  BroadcastTarget,
} from "@/app/(dashboard)/notifications/types";

export type { BroadcastAudienceKind, BroadcastTarget };

export type FlagValueType = "boolean" | "string" | "number" | "json";

export const VALUE_TYPES: FlagValueType[] = ["boolean", "string", "number", "json"];

/** Plain-language names for the create picker. */
export const VALUE_TYPE_LABELS: Record<FlagValueType, string> = {
  boolean: "On / off feature",
  string: "Text setting",
  number: "Number setting",
  json: "Advanced value (JSON)",
};

/** One flag as returned by `admin_feature_flags_overview()`. `value` is the
 *  jsonb value delivered to in-scope users (bool / number / string / object). */
export type FlagRow = {
  key: string;
  description: string;
  value_type: FlagValueType;
  value: unknown;
  enabled: boolean;
  rollout_percentage: number;
  audience_kind: BroadcastAudienceKind;
  target: BroadcastTarget;
  min_app_version: string | null;
  max_app_version: string | null;
  archived: boolean;
  target_user_count: number;
  updated_at: string;
  created_at: string;
};

/** True for on/off feature switches (vs. an editable setting value). */
export function isFeature(type: FlagValueType): boolean {
  return type === "boolean";
}

/**
 * Is this flag "on"?
 *   • Feature (boolean): on when it's active AND delivering `true`. So a kill
 *     switch on a default-on feature turns it off by actively delivering `false`
 *     (not by going inactive, which would fall back to the on default).
 *   • Copy / Setting: on when the override is active (its value is being used).
 */
export function isOn(row: Pick<FlagRow, "value_type" | "enabled" | "value">): boolean {
  return isFeature(row.value_type) ? row.enabled && row.value === true : row.enabled;
}

/**
 * Is this flag currently changed from how the app ships? A feature that's OFF
 * (hidden from users), or a copy/setting whose override is active. This — not
 * "what's on" — is the signal worth surfacing, since most features are on by
 * default.
 */
export function isChanged(row: Pick<FlagRow, "value_type" | "enabled" | "value">): boolean {
  return isFeature(row.value_type) ? !isOn(row) : row.enabled;
}

/** The three plain-language buckets the panel groups by. */
export type FlagCategory = "Features" | "Copy" | "Settings";

export const FLAG_CATEGORIES: FlagCategory[] = ["Features", "Copy", "Settings"];

export function flagCategory(type: FlagValueType): FlagCategory {
  if (type === "boolean") return "Features";
  if (type === "string") return "Copy";
  return "Settings";
}

export const CATEGORY_BLURB: Record<FlagCategory, string> = {
  Features: "Turn capabilities on or off.",
  Copy: "Edit user-facing text — live.",
  Settings: "Tune numbers without a release.",
};

/** The part of the app a flag belongs to, shown as a small chip on each row.
 *  Prefix map covers every live key (2026-08-28 audit — the old list missed
 *  scout_/apple_/clubhouse/pro keys, which all fell into "Other"). */
export function areaFor(key: string): string {
  const has = (...p: string[]) => p.some((x) => key.startsWith(x));
  if (has("home_")) return "Home";
  if (has("scout_")) return "Scout";
  if (has("feed_", "public_feed", "badge_feed")) return "Feed";
  if (has("boards_")) return "Boards";
  if (has("clubhouse")) return "Clubhouse";
  if (has("compose_")) return "Log a round";
  if (has("friend")) return "Friends";
  if (has("badge")) return "Badges";
  if (has("push", "notification", "realtime", "announcements")) return "Notifications";
  if (has("societ")) return "Societies";
  if (has("community", "curated", "user_list", "lists_")) return "Lists";
  if (has("course_photo")) return "Course photos";
  if (has("pro_")) return "Pro";
  if (has("beta", "auth")) return "Sign-in";
  if (has("apple_")) return "Account";
  if (has("search")) return "Search";
  return "General";
}

/** "Feature" / "Setting" chip label. */
export function kindLabel(type: FlagValueType): string {
  return isFeature(type) ? "Feature" : "Setting";
}

/** A friendly title from the key: `community_lists_enabled` → "Community lists". */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/_(enabled|flag|setting|value)$/i, "")
    .split("_")
    .filter(Boolean);
  if (words.length === 0) return key;
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** The current setting value, shown on the card. Not used for features. */
export function valueSummary(row: Pick<FlagRow, "value_type" | "value">): string {
  switch (row.value_type) {
    case "boolean":
      return row.value === true ? "on" : "off";
    case "number":
      return typeof row.value === "number" ? String(row.value) : "—";
    case "string":
      return typeof row.value === "string" && row.value.length > 0 ? `“${row.value}”` : "(empty)";
    case "json":
      return JSON.stringify(row.value ?? null);
  }
}

/** Plain-language "who sees this" for the card. */
export function whoSummary(
  row: Pick<FlagRow, "audience_kind" | "target_user_count" | "rollout_percentage">,
): string {
  let who: string;
  switch (row.audience_kind) {
    case "everyone":
      who = "Everyone";
      break;
    case "filtered":
      who = "A chosen group";
      break;
    case "individuals":
      who =
        row.target_user_count === 1 ? "1 chosen person" : `${row.target_user_count} chosen people`;
      break;
    case "segment":
      who = "A saved segment";
      break;
  }
  if (row.rollout_percentage < 100) {
    who = who === "Everyone" ? `${row.rollout_percentage}% of people` : `${who} · ${row.rollout_percentage}%`;
  }
  return who;
}

/** "just now" / "3 days ago" from an ISO timestamp. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

/** The default value for a freshly-created flag of each type. */
export function defaultValueFor(type: FlagValueType): unknown {
  switch (type) {
    case "boolean":
      return true;
    case "number":
      return 0;
    case "string":
      return "";
    case "json":
      return {};
  }
}

// ── Change history (feature_flag_history, migration 20260828160000) ─────

export type FlagHistoryAction = "create" | "update" | "archive" | "restore" | "delete";

/** The snapshot shape written by the `_flag_snapshot` trigger helper. */
export type FlagSnapshot = {
  description: string;
  value_type: FlagValueType;
  value: unknown;
  enabled: boolean;
  rollout_percentage: number;
  audience_kind: BroadcastAudienceKind;
  target: BroadcastTarget;
  min_app_version: string | null;
  max_app_version: string | null;
  archived: boolean;
};

export type FlagHistoryRow = {
  id: number;
  flag_key: string;
  changed_at: string;
  changed_by: string | null;
  action: FlagHistoryAction;
  old_row: FlagSnapshot | null;
  new_row: FlagSnapshot | null;
  note: string | null;
};

/** One-line summary of what a history entry changed, for the history list. */
export function describeChange(entry: FlagHistoryRow): string {
  const { old_row: prev, new_row: next, action } = entry;
  if (action === "create") return "Created";
  if (action === "delete") return "Deleted";
  if (action === "archive") return "Archived";
  if (action === "restore") return "Restored";
  if (!prev || !next) return "Changed";
  const bits: string[] = [];
  if (prev.enabled !== next.enabled || JSON.stringify(prev.value) !== JSON.stringify(next.value)) {
    if (next.value_type === "boolean") {
      bits.push(isOn({ value_type: next.value_type, enabled: next.enabled, value: next.value }) ? "Turned on" : "Turned off");
    } else if (prev.enabled !== next.enabled) {
      bits.push(next.enabled ? "Override turned on" : "Override turned off");
    } else {
      bits.push(`Value → ${valueSummary({ value_type: next.value_type, value: next.value })}`);
    }
  }
  if (prev.description !== next.description) bits.push("Description edited");
  if (
    prev.rollout_percentage !== next.rollout_percentage ||
    prev.audience_kind !== next.audience_kind ||
    JSON.stringify(prev.target) !== JSON.stringify(next.target)
  ) {
    bits.push("Audience changed");
  }
  if (prev.min_app_version !== next.min_app_version || prev.max_app_version !== next.max_app_version) {
    bits.push("Version window changed");
  }
  return bits.length > 0 ? bits.join(" · ") : "Changed";
}

/** The propagation truth, stated wherever a change goes live. */
export const PROPAGATION_NOTE =
  "Live phones pick this up the next time the app comes to the foreground (checked at most once a minute). Offline phones keep the old behaviour until they reconnect.";
