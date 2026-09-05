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
 * feed_viewed / session_started / friend_request_* removed), then again for
 * the 2026-09-05 coverage pass (screen_viewed, onboarding_step_failed,
 * onboarding_resumed; seven formerly call-site-less events now wired).
 * Page names live in `screens.ts`.
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
  onboarding_step_failed: {
    label: "A setup step failed to save",
    group: "onboarding",
    description:
      "Something during setup didn't save — with why (offline, a timeout, cancelled, or the server said no) and whether the phone was online.",
  },
  onboarding_resumed: {
    label: "Came back to setup",
    group: "onboarding",
    description: "Reopened the app mid-setup and picked up where they left off.",
  },
  onboarding_privacy_set: {
    label: "Chose their privacy",
    group: "onboarding",
    description: "The visibility tier picked on the Privacy step (kept-default counts too).",
  },
  app_opened: {
    label: "Opened the app",
    group: "lifecycle",
    description: "The app came to the front — a cold launch or a return from the background.",
  },
  notification_opened: {
    label: "Tapped a notification",
    group: "social",
    description: "Opened a notification inside the app (inbox row or live banner).",
  },
  tutorial_seen: {
    label: "Saw a first-visit tip",
    group: "discovery",
    description: "Dismissed one of the one-time tutorial cards.",
  },
  deep_link_opened: {
    label: "Arrived by link",
    group: "social",
    description: "Opened the app from a vestige.golf or vestige:// link — invites land here.",
  },
  signed_out: {
    label: "Signed out",
    group: "lifecycle",
    description: "Signed out of the app.",
  },
  wall_shown: {
    label: "Hit a wall",
    group: "lifecycle",
    description: "Saw the offline, update-required or suspended screen.",
  },
  round_intent_chosen: {
    label: "Mark or log?",
    group: "play",
    description: "On an unplayed course, chose to just mark it played or to log a full round.",
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
    description: "Opened one of the editorial lists, with how much of it they've played.",
  },
  course_search_performed: {
    label: "Searched",
    group: "discovery",
    description: "Ran a course search (counts only — never the words typed).",
  },
  map_region_explored: {
    label: "Opened a county",
    group: "discovery",
    description: "Browsed into a county on the map, with their completion of it.",
  },
  screen_viewed: {
    label: "Opened a page",
    group: "discovery",
    description: "Landed on a page of the app — the navigation heatmap. Which page is in the details.",
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
    description: "Removed one of their own logged rounds.",
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
    label: "Opened the invite share sheet",
    group: "social",
    description: "Tapped to share their invite link (we can't see whether it was sent).",
  },
  feedback_submitted: {
    label: "Sent feedback",
    group: "social",
    description: "Filed a bug or suggestion in-app.",
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
    description: "Ran the self-service personal-data export.",
  },
  account_deleted: {
    label: "Deleted their account",
    group: "lifecycle",
    description: "Started the in-app account deletion.",
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
  // 2026-09-05 coverage pass
  screen: "page",
  context: "where",
  navigates: "opens a page",
  page: "tip",
  choice: "chose",
  tab: "tab",
  operation: "saving",
  reason: "because",
  is_online: "online",
  had_account: "had an account",
  collected: "collected in setup",
  total: "total",
  completion_pct: "completion",
  completion_fraction: "completion",
  from_full_map: "from the full map",
  outcome: "outcome",
  has_screenshot: "with screenshot",
  kind: "kind",
  played_count: "played",
  total_count: "of",
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
  // failure reasons (onboarding_step_failed.reason)
  offline: "No connection",
  transient: "Connection dropped",
  cancelled: "Left the page",
  server: "Server refused",
  // operations (onboarding_step_failed.operation)
  create_profile: "creating the profile",
  mark_played: "marking a course",
  create_wishlist: "creating the wishlist",
  update_privacy: "saving privacy",
  upload_avatar: "uploading the photo",
  upload_cover: "uploading the cover",
  demographics: "saving about-you",
  seed_mark: "marking a course",
  friend_request: "sending a friend request",
  completion_stamp: "finishing setup",
  // tabs
  shell: "over everything",
  // app_opened.kind / wall_shown.kind / round_intent_chosen.choice
  launch: "Cold launch",
  foreground: "Back from background",
  update_required: "Update required",
  suspended: "Suspended",
  log_round: "Log a round",
  log_chooser: "Log-flow chooser",
  add_to_list: "Add-to-list search",
  onboarding_seeding: "Setup search",
  chrome: "Search icon",
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
  // The pinned funnel order (`Step.analyticsStepIndex`, iOS 2026-08-28),
  // re-synced 2026-09-05: collect leads, friends sits after privacy, beta
  // closes before the recap. Retired steps (username / cover / home) stay
  // at the end so old rows still label.
  "collect",
  "name",
  "avatar",
  "courses",
  "privacy",
  "friends",
  "demographics",
  "permissions",
  "founding_badge",
  "pro",
  "beta",
  "recap",
  "username",
  "cover",
  "home",
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
  friends: "Friends",
  collect: "First courses",
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
