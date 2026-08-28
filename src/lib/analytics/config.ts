/**
 * Display config + constants for the analytics surface.
 *
 * The event *taxonomy* (which events exist, what they carry) is the iOS
 * repo's `docs/analytics-vocabulary.md`; this is the dashboard-side mapping
 * from wire `event_name` → human label + grouping + one-line description.
 *
 * 2026-08-28 rebuild rules (Tom's brief — "no codenames"):
 *   • RAW EVENT NAMES NEVER RENDER. Every emitted event has a label and a
 *     description here; anything unknown renders through `eventLabel`'s
 *     de-snake fallback, never verbatim wire text.
 *   • Labels are plain English, written for Jack ("Added a course to a
 *     list"), never taxonomy-speak ("Bucketed").
 *   • Property keys and closed dimension values have label maps too
 *     (`propertyLabel`, `valueLabel`) so the live feed and breakdowns read
 *     as sentences, not wire pairs.
 *
 * Regenerated against `AnalyticsEvents.swift` as of the 2026-08-28
 * instrumentation repairs (paywall_restored added; course_bucketed /
 * feed_viewed / session_started / friend_request_* removed).
 */

export type EventGroup =
  | "onboarding"
  | "discovery"
  | "play"
  | "social"
  | "pro"
  | "scout"
  | "lifecycle"
  | "other";

export const GROUP_LABEL: Record<EventGroup, string> = {
  onboarding: "Joining",
  discovery: "Finding courses",
  play: "Playing & collecting",
  social: "Friends & feed",
  pro: "Vestige Pro",
  scout: "Scout",
  lifecycle: "Account",
  other: "Other",
};

type EventMeta = { label: string; group: EventGroup; description: string };

/** Every event the app can emit (or has emitted), with Jack-grade labels. */
export const EVENT_CATALOG: Record<string, EventMeta> = {
  // ── Joining ────────────────────────────────────────────────────────────
  auth_completed: {
    label: "Signed in",
    group: "onboarding",
    description: "Someone finished signing in or creating an account.",
  },
  onboarding_started: {
    label: "Started onboarding",
    group: "onboarding",
    description: "A new account opened the setup flow.",
  },
  onboarding_step_completed: {
    label: "Finished a setup step",
    group: "onboarding",
    description: "One step of account setup done (name, avatar, courses…).",
  },
  onboarding_demographics_set: {
    label: "Answered about-you questions",
    group: "onboarding",
    description: "Age band / handicap / player type answered (or skipped) during setup.",
  },
  onboarding_profile_created: {
    label: "Created their profile",
    group: "onboarding",
    description: "Profile saved during setup — privacy choice, avatar, home club.",
  },
  onboarding_courses_seeded: {
    label: "Marked starting courses",
    group: "onboarding",
    description: "Courses they'd already played, ticked during setup.",
  },
  onboarding_completed: {
    label: "Finished onboarding",
    group: "onboarding",
    description: "Made it through the whole setup flow into the app.",
  },
  // ── Finding courses ────────────────────────────────────────────────────
  course_viewed: {
    label: "Viewed a course",
    group: "discovery",
    description: "Opened a course's detail page, from anywhere in the app.",
  },
  curated_list_viewed: {
    label: "Viewed a curated list",
    group: "discovery",
    description: "Opened one of the editorial lists. (Not wired in the app yet.)",
  },
  course_search_performed: {
    label: "Searched",
    group: "discovery",
    description: "Ran a course search. (Not wired in the app yet.)",
  },
  map_region_explored: {
    label: "Explored the map",
    group: "discovery",
    description: "Browsed into a county on the map. (Not wired in the app yet.)",
  },
  // ── Playing & collecting ───────────────────────────────────────────────
  course_marked_played: {
    label: "Marked a course played",
    group: "play",
    description: "Added a course to their collection as played.",
  },
  course_unmarked_played: {
    label: "Un-marked a course",
    group: "play",
    description: "Removed the played mark from a course.",
  },
  course_added_to_list: {
    label: "Added a course to a list",
    group: "play",
    description: "Put a course on one of their own lists — the want-to-play signal.",
  },
  course_removed_from_list: {
    label: "Removed a course from a list",
    group: "play",
    description: "Took a course off one of their lists.",
  },
  round_logged: {
    label: "Logged a round",
    group: "play",
    description: "The core action — a round entered, with or without a score.",
  },
  round_deleted: {
    label: "Deleted a round",
    group: "play",
    description: "Removed a logged round. (Not wired in the app yet.)",
  },
  // ── Friends & feed ─────────────────────────────────────────────────────
  profile_viewed: {
    label: "Viewed a profile",
    group: "social",
    description: "Opened another player's profile.",
  },
  profile_friend_action: {
    label: "Friend action",
    group: "social",
    description: "Sent, accepted, declined or removed a friend connection.",
  },
  invite_shared: {
    label: "Shared an invite",
    group: "social",
    description: "Shared the app with someone. (Not wired in the app yet.)",
  },
  feedback_submitted: {
    label: "Sent feedback",
    group: "social",
    description: "Filed a bug or suggestion in-app. (Not wired in the app yet.)",
  },
  // ── Vestige Pro ────────────────────────────────────────────────────────
  paywall_shown: {
    label: "Saw the Pro page",
    group: "pro",
    description: "The Vestige Pro page was opened.",
  },
  paywall_purchase_started: {
    label: "Started a Pro purchase",
    group: "pro",
    description: "Tapped through to Apple's purchase sheet.",
  },
  paywall_purchase_completed: {
    label: "Bought Pro",
    group: "pro",
    description: "A real purchase completed (restores are counted separately).",
  },
  paywall_purchase_failed: {
    label: "Pro purchase failed",
    group: "pro",
    description: "The purchase sheet ended without a purchase.",
  },
  paywall_restored: {
    label: "Restored Pro",
    group: "pro",
    description: "An existing purchase restored on a new install — not a sale.",
  },
  promo_code_redeemed: {
    label: "Redeemed a promo code",
    group: "pro",
    description: "A Pro promo code accepted.",
  },
  promo_code_redeem_failed: {
    label: "Promo code failed",
    group: "pro",
    description: "A promo code was rejected (invalid or used).",
  },
  // ── Scout ──────────────────────────────────────────────────────────────
  scout_recs_shown: {
    label: "Scout picks shown",
    group: "scout",
    description: "Scout's recommendations rendered on a surface.",
  },
  scout_rec_opened: {
    label: "Opened a Scout pick",
    group: "scout",
    description: "Tapped into a course Scout recommended.",
  },
  scout_rec_saved: {
    label: "Saved a Scout pick",
    group: "scout",
    description: "(Not wired in the app yet.)",
  },
  scout_rec_dismissed: {
    label: "Dismissed a Scout pick",
    group: "scout",
    description: "(Not wired in the app yet.)",
  },
  scout_rec_converted: {
    label: "Played a Scout pick",
    group: "scout",
    description: "(Not wired in the app yet.)",
  },
  // ── Account ────────────────────────────────────────────────────────────
  analytics_opt_out_toggled: {
    label: "Changed analytics opt-out",
    group: "lifecycle",
    description: "Turned usage analytics off or back on in Privacy settings.",
  },
  data_exported: {
    label: "Exported their data",
    group: "lifecycle",
    description: "(Not wired in the app yet.)",
  },
  account_deleted: {
    label: "Deleted their account",
    group: "lifecycle",
    description: "(Not wired in the app yet.)",
  },
};

/** De-snake fallback so an unknown wire name still never renders raw. */
function humanise(name: string): string {
  const words = name.split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function eventLabel(name: string): string {
  return EVENT_CATALOG[name]?.label ?? humanise(name);
}

export function eventDescription(name: string): string | undefined {
  return EVENT_CATALOG[name]?.description;
}

export function eventGroup(name: string): EventGroup {
  return EVENT_CATALOG[name]?.group ?? "other";
}

// ── Property + value language ─────────────────────────────────────────────

/** Wire property keys → plain words, for the live feed's context line. */
export const PROPERTY_LABEL: Record<string, string> = {
  discovery_source: "found via",
  source: "from",
  step: "step",
  method: "method",
  course_tier: "tier",
  course_type: "type",
  is_home_club: "home club",
  is_on_list: "on a list",
  was_on_list: "was on a list",
  is_played: "already played",
  entry_mode: "entry",
  share_state: "shared",
  privacy_tier: "privacy",
  holes_played: "holes",
  partner_count: "partners",
  photo_count: "photos",
  experience_rating: "rating",
  opted_out: "opted out",
  surface: "on",
  position: "position",
  reason_code: "reason",
  product_id: "product",
  count: "count",
  action: "action",
  age_band: "age band",
  has_age_band: "gave age band",
  has_handicap_band: "gave handicap",
  player_type: "player type",
  skipped: "skipped",
  state: "state",
  storefront: "storefront",
  is_founding: "founding",
};

export function propertyLabel(key: string): string {
  return PROPERTY_LABEL[key] ?? key.split("_").join(" ");
}

/** Closed dimension values → plain words (shared by feed + breakdowns). */
export const VALUE_LABEL: Record<string, string> = {
  // discovery_source
  map_browse: "Map browse",
  search: "Search",
  curated_list: "Curated list",
  user_list: "Own list",
  friend_feed: "Friend feed",
  profile_map: "Profile map",
  notification: "Notification",
  deep_link: "Deep link",
  clubhouse_event: "Clubhouse event",
  unknown: "Unknown",
  // source / surface
  course_detail: "Course page",
  bulk_seed: "Setup seeding",
  round_auto: "With a round",
  onboarding: "Onboarding",
  home_shelf: "Home shelf",
  // methods
  apple: "Apple",
  google: "Google",
  email: "Email",
  // share/privacy
  private: "Private",
  posted: "Posted",
  friends_only: "Friends only",
  everyone: "Everyone",
  friendsOnly: "Friends only", // pre-repair rows
  // friend actions
  request_sent: "Request sent",
  request_accepted: "Request accepted",
  request_declined: "Request declined",
  request_cancelled: "Request cancelled",
  friend_removed: "Friend removed",
};

export function valueLabel(value: string): string {
  return VALUE_LABEL[value] ?? value;
}

/** Onboarding wizard steps in funnel order — the FULL set the app emits
 *  (mirrors `OnboardingStep` in the iOS `AnalyticsEvents.swift`; the old
 *  8-step list silently dropped six steps from the funnel). */
export const ONBOARDING_STEPS = [
  "beta",
  "name",
  "username",
  "avatar",
  "cover",
  "home",
  "demographics",
  "privacy",
  "permissions",
  "courses",
  "collect",
  "founding_badge",
  "pro",
  "recap",
] as const;

export const ONBOARDING_STEP_LABEL: Record<string, string> = {
  beta: "Beta notice",
  name: "Name",
  username: "Username",
  avatar: "Avatar",
  cover: "Cover photo",
  home: "Home club",
  demographics: "About you",
  privacy: "Privacy",
  permissions: "Permissions",
  courses: "Courses played",
  collect: "Collection reveal",
  founding_badge: "Founding badge",
  pro: "Pro gift",
  recap: "Recap",
};

/** Kept as the wire map for older rows; new reads should prefer valueLabel. */
export const DISCOVERY_SOURCE_LABEL: Record<string, string> = VALUE_LABEL;

// ── Navigation ────────────────────────────────────────────────────────────

/** Top-level analytics tabs (2026-08-28 rebuild: the four explorer tabs
 *  collapsed into one Deep dive area with its own sub-tabs). */
export const ANALYTICS_TABS = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/explore", label: "Deep dive" },
  { href: "/analytics/b2b", label: "B2B preview" },
] as const;

/** The Deep dive sub-tabs (Tom's tools; Jack lives on Overview). */
export const DEEP_DIVE_TABS = [
  { href: "/analytics/explore", label: "Explore" },
  { href: "/analytics/funnels", label: "Funnels" },
  { href: "/analytics/paths", label: "Paths" },
  { href: "/analytics/retention", label: "Retention" },
  { href: "/analytics/events", label: "Live events" },
] as const;
