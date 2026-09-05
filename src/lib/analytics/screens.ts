/**
 * The app's page vocabulary — a mirror of `AnalyticsScreen` in the iOS repo
 * (`Vestige/Services/AnalyticsScreen.swift`, 2026-09-05 coverage pass). Raw
 * keys are the wire values of `screen_viewed.properties.screen`; the labels are
 * for Jack. The FULL list lives here on purpose: the "pages nobody has opened"
 * read is this list minus what `analytics_screens` returns, so a page missing
 * from here would never show up as unvisited.
 *
 * Keep in step with the Swift enum — a new case there is a new row here.
 */

export type ScreenArea = "Home & map" | "Feed" | "Club" | "Shared pages" | "You";

export type ScreenMeta = { key: string; label: string; area: ScreenArea };

export const ANALYTICS_SCREENS: ScreenMeta[] = [
  // Home & map
  { key: "home", label: "Home", area: "Home & map" },
  { key: "explore_map", label: "Full map", area: "Home & map" },
  { key: "county_view", label: "County page", area: "Home & map" },
  { key: "course_view", label: "Course page", area: "Home & map" },
  { key: "search", label: "Search", area: "Home & map" },
  { key: "collection", label: "Your collection", area: "Home & map" },
  // Feed
  { key: "feed", label: "Feed", area: "Feed" },
  // Club
  { key: "clubhouse", label: "Clubhouse", area: "Club" },
  { key: "boards", label: "Boards", area: "Club" },
  { key: "societies", label: "Societies", area: "Club" },
  { key: "clubhouse_event", label: "Clubhouse event", area: "Club" },
  { key: "clubhouse_list_index", label: "All lists", area: "Club" },
  { key: "clubhouse_info", label: "How the Clubhouse works", area: "Club" },
  { key: "boards_info", label: "How the Boards work", area: "Club" },
  { key: "society", label: "Society pages", area: "Club" },
  // Shared pages
  { key: "notifications_inbox", label: "Notifications", area: "Shared pages" },
  { key: "curated_list", label: "Curated list", area: "Shared pages" },
  { key: "user_list", label: "Personal list", area: "Shared pages" },
  { key: "user_profile", label: "Profile", area: "Shared pages" },
  { key: "user_map", label: "Someone's map", area: "Shared pages" },
  { key: "friends_list", label: "Friends list", area: "Shared pages" },
  { key: "manage_friends", label: "Find friends", area: "Shared pages" },
  { key: "rounds_timeline", label: "All rounds", area: "Shared pages" },
  { key: "tagged_rounds", label: "Tagged rounds", area: "Shared pages" },
  { key: "round_post", label: "Round post", area: "Shared pages" },
  { key: "round_comments", label: "Round comments", area: "Shared pages" },
  { key: "badge_detail", label: "Badge", area: "Shared pages" },
  { key: "log_round", label: "Log a round", area: "Shared pages" },
  // You
  { key: "edit_profile", label: "Edit profile", area: "You" },
  { key: "settings", label: "Settings", area: "You" },
  { key: "settings_notifications", label: "Notification settings", area: "You" },
  { key: "settings_appearance", label: "Appearance", area: "You" },
  { key: "settings_account", label: "Account", area: "You" },
  { key: "settings_privacy_data", label: "Privacy & data", area: "You" },
  { key: "about", label: "About", area: "You" },
  { key: "acknowledgements", label: "Acknowledgements", area: "You" },
  { key: "feedback_options", label: "Feedback options", area: "You" },
  { key: "send_feedback", label: "Send feedback", area: "You" },
  { key: "my_feedback", label: "My feedback", area: "You" },
  { key: "feedback_thread", label: "Feedback thread", area: "You" },
  { key: "help", label: "Help & FAQ", area: "You" },
  { key: "hidden_posts", label: "Hidden posts", area: "You" },
  { key: "blocked_users", label: "Blocked users", area: "You" },
];

export const SCREEN_AREAS: ScreenArea[] = ["Home & map", "Feed", "Club", "Shared pages", "You"];

const BY_KEY = new Map(ANALYTICS_SCREENS.map((s) => [s.key, s]));

/** Plain-English page name; de-snakes an unknown key rather than leaking it. */
export function screenLabel(key: string): string {
  const meta = BY_KEY.get(key);
  if (meta) return meta.label;
  const words = key.split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function screenArea(key: string): ScreenArea | undefined {
  return BY_KEY.get(key)?.area;
}

/** Sub-surface values (`screen_viewed.context`) → words. */
const CONTEXT_LABEL: Record<string, string> = {
  friends: "Friends",
  global: "Global",
  local: "Local",
  curated: "curated",
  personal: "personal",
  self: "own",
  home: "from Home",
  club: "from Club",
  feed: "from Feed",
  sheet: "sheet",
  detail: "hub",
  roster: "roster",
  campaign: "campaign",
  rally: "rally",
  sprint: "sprint",
  challenge: "challenge",
  match: "match",
};

export function screenContextLabel(context: string | null | undefined): string | null {
  if (!context) return null;
  return CONTEXT_LABEL[context] ?? context;
}
