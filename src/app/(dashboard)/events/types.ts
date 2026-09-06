import type { BadgeEffect, BadgeShape, BadgeTheme, BadgeTier } from "../badges/types";

/**
 * Row + status vocabulary for the Clubhouse events surface
 * (`20260804100000_clubhouse_events.sql`; iOS Club > Clubhouse).
 *
 * Status is derived, mirroring the curated-lists model plus the
 * event-specific tail states:
 *
 *   draft     — published_at null
 *   scheduled — published, window hasn't opened yet
 *   live      — published, now inside [starts_at, ends_at]
 *   ended     — window closed, not yet finalized (needs Close & award)
 *   awarded   — finalized (badges minted, history)
 *   archived  — is_archived (hidden from the app regardless)
 */

export type EventRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  kind: EventKind;
  starts_at: string;
  ends_at: string;
  target_count: number | null;
  cover_storage_key: string | null;
  badge_definition_id: string | null;
  award_rule: AwardRule | null;
  published_at: string | null;
  is_archived: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  course_count: number;
  /** Joined prize spec — present on the index read; null when no prize. */
  badge?: PrizeBadge | null;
};

/**
 * The prize badge as the events surface loads it — everything
 * `BadgeMedallion` needs to draw the real medallion, plus the publish
 * flag the prize picker filters on (event-badges rework, 2026-08-26).
 */
export type PrizeBadge = {
  id: string;
  name: string;
  glyph: string;
  theme: BadgeTheme;
  tint_hex: string | null;
  tier: BadgeTier;
  shape: BadgeShape;
  effect: BadgeEffect;
  is_published: boolean;
};

export type EventKind = "race" | "hunt" | "sweep" | "marker";
export type AwardRule = "winner" | "top_three" | "all_qualifiers";

export type EventStatus = "live" | "scheduled" | "draft" | "ended" | "awarded" | "archived";

export const KIND_LABELS: Record<EventKind, string> = {
  race: "Race: most courses in the window",
  hunt: "Hunt: play courses from a set",
  sweep: "Sweep: a county's courses",
  marker: "Marker: one round, narrow window",
};

export const AWARD_LABELS: Record<AwardRule, string> = {
  winner: "The winner",
  top_three: "The top three",
  all_qualifiers: "Everyone who finishes",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
  draft: "Draft",
  ended: "Ended, needs awarding",
  awarded: "Awarded",
  archived: "Archived",
};

export const STATUS_DOT: Record<EventStatus, string> = {
  live: "bg-emerald-500",
  scheduled: "bg-sky-500",
  draft: "bg-zinc-400",
  ended: "bg-amber-500",
  awarded: "bg-violet-500",
  archived: "bg-zinc-600",
};

export function statusFor(row: EventRow, now: Date = new Date()): EventStatus {
  if (row.is_archived) return "archived";
  if (row.finalized_at) return "awarded";
  if (!row.published_at) return "draft";
  if (new Date(row.ends_at) < now) return "ended";
  if (new Date(row.starts_at) > now) return "scheduled";
  return "live";
}
