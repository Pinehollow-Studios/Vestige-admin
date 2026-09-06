/**
 * Tap-destination vocabulary shared by the two admin-authored surfaces that
 * send a user somewhere: a broadcast's `destination_url` (/notifications) and
 * an announcement CTA's `action_value` (/announcements).
 *
 * The app resolves both the same way (iOS 2026-09-06): a TAB token is tried
 * first via `DockTab.init?(deepLinkToken:)`, and only if that returns nil does
 * the value go to `DeepLinkHandler`, which resolves ENTITIES — profile, list,
 * course, society join, Pro. `parseDestination` below mirrors that order and
 * that token list exactly, so what the picker shows is what the app will do.
 *
 * Keep this file in step with `Vestige/Core/App/DockTab.swift` and
 * `Vestige/Core/Routing/DeepLinkHandler.swift`.
 */

export type DestinationKind =
  | "inbox"
  | "tab"
  | "course"
  | "profile"
  | "membership"
  | "web"
  | "custom";

export const DESTINATION_KIND_LABELS: Record<DestinationKind, string> = {
  inbox: "Opens the notifications inbox",
  tab: "A tab in the app",
  course: "A course page",
  profile: "Someone's profile",
  membership: "The Vestige Pro page",
  web: "A web link",
  custom: "Custom link (advanced)",
};

export const DESTINATION_KINDS: DestinationKind[] = [
  "inbox",
  "tab",
  "course",
  "profile",
  "membership",
  "web",
  "custom",
];

/**
 * The dock tabs, in dock order. Values are the canonical tokens
 * `DockTab.init?(deepLinkToken:)` accepts; the aliases it also honours
 * (`explore`/`map` → Home, `activity` → Feed, `profile`/`myvestige` → You)
 * are parse-only, so an already-published row keeps resolving without this
 * list offering two ways to say the same thing.
 */
export const TAB_TOKENS: { value: string; label: string }[] = [
  { value: "home", label: "Home (the map)" },
  { value: "feed", label: "Feed" },
  { value: "club", label: "Club" },
  { value: "you", label: "You (own profile)" },
];

/**
 * First binary whose BROADCAST router understands a tab token. The announcement
 * router has honoured tab tokens since the surface shipped, but a broadcast tap
 * went straight to `DeepLinkHandler` — which resolves entities only — so
 * `vestige://feed` fell through and dead-ended on the inbox. Fixed in the build
 * after 0.4.4 (25); builds are monotonic (migration `20260905180000`), so 26 is
 * the first that can carry it.
 */
export const TAB_DESTINATION_MIN_APP_BUILD = 26;

const WEB_HOST = "vestige.golf";

/** The parsed shape behind a `destination_url` / `action_value` string. */
export type Destination = {
  kind: DestinationKind;
  /** `kind === "tab"` — one of `TAB_TOKENS`, already canonicalised. */
  tab?: string;
  /** `kind === "course"` — the course UUID. */
  courseId?: string;
  /** `kind === "profile"` — the username, no leading `@`. */
  username?: string;
  /** `kind === "web"` — the http(s) URL as typed. */
  webURL?: string;
  /** `kind === "custom"` — the raw value, preserved verbatim. */
  raw?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canonicalise a value the way `DockTab.init?(deepLinkToken:)` does —
 * percent-decode, lowercase, drop a leading `vestige://`, trim slashes and
 * spaces — and map it to a tab token. Returns null when the value names an
 * entity (or nothing), which is exactly when the app falls through to
 * `DeepLinkHandler`.
 */
export function tabTokenFor(raw: string): string | null {
  let token: string;
  try {
    token = decodeURIComponent(raw);
  } catch {
    // A malformed escape — fall back to the raw value rather than losing it,
    // same as the Swift side's `removingPercentEncoding ?? raw`.
    token = raw;
  }
  token = token.toLowerCase().trim();
  if (token.startsWith("vestige://")) token = token.slice("vestige://".length);
  token = token.replace(/^[/\s]+|[/\s]+$/g, "");
  switch (token) {
    case "home":
    case "explore":
    case "map":
      return "home";
    case "feed":
    case "activity":
      return "feed";
    case "club":
      return "club";
    case "you":
    case "profile":
    case "myvestige":
      return "you";
    default:
      return null;
  }
}

/** Path segments of a `vestige.golf` (or `www.`) URL, or null if it isn't one. */
function vestigeWebSegments(url: URL): string[] | null {
  const host = url.hostname.toLowerCase();
  if (host !== WEB_HOST && host !== `www.${WEB_HOST}`) return null;
  return url.pathname.split("/").filter(Boolean);
}

/**
 * Turn a stored destination string into the picker's shape. Mirrors the app's
 * resolution ORDER: tab token first, then the entity shapes `DeepLinkHandler`
 * knows. Anything else is `custom` and round-trips verbatim — a
 * `vestige://list/<id>` or society-join link authored before this picker
 * existed must survive being opened in the editor untouched.
 */
export function parseDestination(value: string | null | undefined): Destination {
  const raw = (value ?? "").trim();
  if (!raw) return { kind: "inbox" };

  // 1. Tab tokens — the app tries these before anything else.
  const tab = tabTokenFor(raw);
  if (tab) return { kind: "tab", tab };

  // 2. Entity shapes. `URL` throws on a bare token, which the tab branch has
  //    already claimed; anything left that won't parse is custom.
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: "custom", raw };
  }

  const scheme = url.protocol.replace(/:$/, "").toLowerCase();

  if (scheme === "vestige") {
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);
    if (host === "course" && segments[0] && UUID_RE.test(segments[0])) {
      return { kind: "course", courseId: segments[0].toLowerCase() };
    }
    if (host === "user" && segments[0]) {
      return { kind: "profile", username: decodeURIComponent(segments[0]) };
    }
    if (host === "pro") return { kind: "membership" };
    return { kind: "custom", raw };
  }

  if (scheme === "https" || scheme === "http") {
    const segments = vestigeWebSegments(url);
    if (segments) {
      if (segments.length >= 2 && segments[0].toLowerCase() === "course" && UUID_RE.test(segments[1])) {
        return { kind: "course", courseId: segments[1].toLowerCase() };
      }
      if (segments.length >= 2 && segments[0].toLowerCase() === "u") {
        return { kind: "profile", username: decodeURIComponent(segments[1]) };
      }
      if (segments.length === 1 && segments[0].toLowerCase() === "pro") {
        return { kind: "membership" };
      }
    }
    // A vestige.golf URL we don't recognise is still just a web link to the
    // app (it falls through `DeepLinkHandler` to Safari), so it belongs here.
    return { kind: "web", webURL: raw };
  }

  return { kind: "custom", raw };
}

/**
 * Build the string to store. Returns null for "no destination" — including a
 * half-finished pick (a Course kind with nothing chosen yet), so a draft can
 * never be saved pointing at `vestige://course/undefined`.
 */
export function buildDestination(d: Destination): string | null {
  switch (d.kind) {
    case "inbox":
      return null;
    case "tab":
      return d.tab ? `vestige://${d.tab}` : null;
    case "course":
      return d.courseId ? `vestige://course/${d.courseId}` : null;
    case "profile": {
      const name = (d.username ?? "").trim().replace(/^@/, "");
      return name ? `vestige://user/${encodeURIComponent(name)}` : null;
    }
    case "membership":
      return "vestige://pro";
    case "web": {
      const url = (d.webURL ?? "").trim();
      return url || null;
    }
    case "custom": {
      const raw = (d.raw ?? "").trim();
      return raw || null;
    }
  }
}

/**
 * Plain-English "where does the tap land" line for the preview column.
 * `courseName` is resolved by the caller (server-side on load, or from the
 * picker's own search results) — the URL only carries the UUID.
 */
export function destinationSummary(d: Destination, courseName?: string | null): string {
  switch (d.kind) {
    case "inbox":
      return "Tap → opens the inbox";
    case "tab": {
      const label = TAB_TOKENS.find((t) => t.value === d.tab)?.label ?? d.tab;
      return d.tab ? `Tap → the ${label} tab` : "Tap → opens the inbox";
    }
    case "course":
      return d.courseId ? `Tap → ${courseName ?? "a course page"}` : "Tap → opens the inbox";
    case "profile":
      return d.username ? `Tap → @${d.username}` : "Tap → opens the inbox";
    case "membership":
      return "Tap → the Vestige Pro page";
    case "web":
      return d.webURL ? `Tap → ${d.webURL} (opens in Safari)` : "Tap → opens the inbox";
    case "custom":
      return d.raw ? `Tap → ${d.raw}` : "Tap → opens the inbox";
  }
}
