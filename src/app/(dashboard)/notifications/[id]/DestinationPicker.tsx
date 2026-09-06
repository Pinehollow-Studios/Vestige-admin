"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { searchUsers } from "../actions";
import type { UserPickRow } from "../types";
import type { CourseCatalogRow } from "../../curated/types";
import {
  DESTINATION_KINDS,
  DESTINATION_KIND_LABELS,
  TAB_DESTINATION_MIN_APP_BUILD,
  TAB_TOKENS,
  buildDestination,
  destinationSummary,
  parseDestination,
  type Destination,
  type DestinationKind,
} from "../destinations";

const SELECT_CLS =
  "flex h-9 w-full rounded-lg border border-input bg-paper-sunken/40 px-3 py-1 text-sm transition-colors focus-visible:border-brand/60 focus-visible:bg-paper-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30";

/**
 * "Where does the tap land" — a chooser, not a URL field.
 *
 * Every option maps to something the app actually resolves: a tab token (via
 * `DockTab.init?(deepLinkToken:)`), or an entity shape `DeepLinkHandler` knows.
 * Lists and society links are deliberately absent — `vestige://list/<id>`
 * resolves to a USER list only (`ListReference.user`), so offering "a curated
 * list" would author a link that lands on a not-found page, and societies are
 * shelved behind `societiesEnabled`. Both still round-trip through
 * "Custom link", so an older row keeps its destination untouched.
 */
export function DestinationPicker({
  value,
  initialCourseName,
  disabled,
  onChange,
}: {
  value: string | null;
  initialCourseName: string | null;
  disabled?: boolean;
  onChange: (url: string | null, summary: string) => void;
}) {
  // Parse once. The picker owns the structured state from here; `value` is the
  // serialised view of it, so re-deriving on every render would fight typing.
  const [destination, setDestination] = useState<Destination>(() => parseDestination(value));
  const [courseName, setCourseName] = useState<string | null>(initialCourseName);

  function apply(next: Destination, nextCourseName?: string | null) {
    const name = nextCourseName === undefined ? courseName : nextCourseName;
    setDestination(next);
    if (nextCourseName !== undefined) setCourseName(nextCourseName);
    onChange(buildDestination(next), destinationSummary(next, name));
  }

  function changeKind(kind: DestinationKind) {
    // Carry nothing across kinds: each holds a different sort of value, and a
    // stale `courseId` surviving a hop to Profile and back would silently
    // re-point the notification at a course the admin thought they'd cleared.
    apply({ kind }, kind === "course" ? null : courseName);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tap destination</Label>
        <select
          className={SELECT_CLS}
          value={destination.kind}
          onChange={(e) => changeKind(e.target.value as DestinationKind)}
          disabled={disabled}
        >
          {DESTINATION_KINDS.map((k) => (
            <option key={k} value={k}>
              {DESTINATION_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {destination.kind === "tab" && (
        <div className="space-y-2 rounded-lg border border-rule/70 bg-paper-sunken/30 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Which tab</Label>
            <select
              className={SELECT_CLS}
              value={destination.tab ?? ""}
              onChange={(e) => apply({ kind: "tab", tab: e.target.value || undefined })}
              disabled={disabled}
            >
              <option value="">Select a tab…</option>
              {TAB_TOKENS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs leading-relaxed text-ink-3">
            Lands on the tab from build{" "}
            <span className="font-semibold text-ink-2">{TAB_DESTINATION_MIN_APP_BUILD}</span> onward. On
            0.4.4 (25) and earlier a broadcast tap goes straight to the entity resolver, which has no idea what
            a tab is, so those users still get the notification: it just opens the{" "}
            <span className="font-semibold text-ink-2">inbox</span> instead. That degrades cleanly, so{" "}
            <span className="font-semibold text-ink-2">leave the build fields blank to reach everyone</span>.
          </p>
          <p className="text-xs leading-relaxed text-ink-3">
            Only set <span className="font-semibold text-ink-2">Minimum build</span> if landing on the tab is
            essential, and note it excludes more than you would expect: a build bound also drops anyone we
            have never seen a build number from, which is every user who has not opened the app since builds
            started being recorded.
          </p>
        </div>
      )}

      {destination.kind === "course" && (
        <CourseField
          courseId={destination.courseId}
          courseName={courseName}
          disabled={disabled}
          onPick={(course) =>
            apply({ kind: "course", courseId: course?.course_id }, course?.course_name ?? null)
          }
        />
      )}

      {destination.kind === "profile" && (
        <ProfileField
          username={destination.username}
          disabled={disabled}
          onPick={(username) => apply({ kind: "profile", username })}
        />
      )}

      {destination.kind === "membership" && (
        <p className="rounded-lg border border-rule/70 bg-paper-sunken/30 p-3 text-xs leading-relaxed text-ink-3">
          Opens the Vestige Pro page (the founding-window clock + roadmap). The page is killable, so while
          <span className="font-semibold text-ink-2"> pro_page_enabled</span> is off the tap does nothing, so
          check the flag before sending.
        </p>
      )}

      {destination.kind === "web" && (
        <div className="space-y-1">
          <Input
            value={destination.webURL ?? ""}
            onChange={(e) => apply({ kind: "web", webURL: e.target.value })}
            placeholder="https://vestige.golf/…"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground/80">
            Opens in Safari. Must start with http:// or https://, because the app refuses any other scheme.
          </p>
        </div>
      )}

      {destination.kind === "custom" && (
        <div className="space-y-1">
          <Input
            value={destination.raw ?? ""}
            onChange={(e) => apply({ kind: "custom", raw: e.target.value })}
            placeholder="vestige://list/<id>"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground/80">
            Passed to the app verbatim. Anything it can&apos;t resolve lands on the inbox.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Course ─────────────────────────────────────────────────────────────

function CourseField({
  courseId,
  courseName,
  disabled,
  onPick,
}: {
  courseId: string | undefined;
  courseName: string | null;
  disabled?: boolean;
  onPick: (course: CourseCatalogRow | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseCatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cancel any in-flight debounce on unmount.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      reqRef.current += 1;
    },
    [],
  );

  // Debounced type-ahead, driven from the handler rather than an effect (the
  // house pattern next door in `IndividualsPicker`). Only searches once there
  // is something to search for — an empty query would pull the first 40
  // courses alphabetically, which is browse behaviour the curated picker wants
  // and this one doesn't. The sequence counter drops stale responses.
  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    const seq = ++reqRef.current;
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
          const json = (await res.json()) as { courses?: CourseCatalogRow[] };
          if (seq === reqRef.current) setResults(json.courses ?? []);
        } catch {
          if (seq === reqRef.current) setResults([]);
        } finally {
          if (seq === reqRef.current) setLoading(false);
        }
      })();
    }, 200);
  }

  return (
    <div className="space-y-2 rounded-lg border border-rule/70 bg-paper-sunken/30 p-3">
      {courseId ? (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm text-ink">
            {courseName ?? <span className="text-ink-3">Course {courseId.slice(0, 8)}</span>}
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            disabled={disabled}
            className="shrink-0 text-xs text-ink-3 transition-colors hover:text-alert"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-rule/70 bg-paper-sunken/40 px-3 py-1.5">
            <Search aria-hidden className="size-3.5 text-ink-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Search courses…"
              disabled={disabled}
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
            {loading && <Loader2 aria-hidden className="size-3.5 animate-spin text-ink-3" />}
          </div>
          {results.length > 0 && (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {results.map((c) => (
                <button
                  key={c.course_id}
                  type="button"
                  onClick={() => onPick(c)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-rule/60 bg-paper-sunken/40 px-2.5 py-1.5 text-left text-sm transition-colors hover:border-brand/30"
                >
                  <span className="min-w-0 truncate text-ink">{c.course_name}</span>
                  <span className="shrink-0 text-xs text-ink-3">{c.county_name ?? ""}</span>
                </button>
              ))}
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-ink-3">No matching courses.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────

function ProfileField({
  username,
  disabled,
  onPick,
}: {
  username: string | undefined;
  disabled?: boolean;
  onPick: (username: string | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPickRow[]>([]);
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      seqRef.current += 1;
    },
    [],
  );

  // Same debounced-handler shape as the course field above and
  // `IndividualsPicker` below — `searchUsers` is the service-role search, so it
  // sees the whole roster rather than an RLS-filtered slice.
  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    const seq = ++seqRef.current;
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      void (async () => {
        const r = await searchUsers(q);
        if (seq !== seqRef.current) return;
        setLoading(false);
        if (!r.ok) {
          toast.error(r.message);
          setResults([]);
          return;
        }
        setResults(r.data ?? []);
      })();
    }, 300);
  }

  return (
    <div className="space-y-2 rounded-lg border border-rule/70 bg-paper-sunken/30 p-3">
      {username ? (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm text-ink">@{username}</span>
          <button
            type="button"
            onClick={() => onPick(undefined)}
            disabled={disabled}
            className="shrink-0 text-xs text-ink-3 transition-colors hover:text-alert"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-rule/70 bg-paper-sunken/40 px-3 py-1.5">
            <Search aria-hidden className="size-3.5 text-ink-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Search people…"
              disabled={disabled}
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
            {loading && <Loader2 aria-hidden className="size-3.5 animate-spin text-ink-3" />}
          </div>
          {results.length > 0 && (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  // The link is `vestige://user/<username>`, resolved by handle
                  // server-side — someone who never set one can't be linked to.
                  onClick={() => u.username && onPick(u.username)}
                  disabled={!u.username}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border border-rule/60 bg-paper-sunken/40 px-2.5 py-1.5 text-left text-sm transition-colors hover:border-brand/30",
                    !u.username && "opacity-50",
                  )}
                >
                  <span className="min-w-0 truncate text-ink">
                    {u.display_name ?? (u.username ? `@${u.username}` : u.id.slice(0, 8))}
                  </span>
                  <span className="shrink-0 text-xs text-ink-3">
                    {u.username ? `@${u.username}` : "no handle"}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-ink-3">No matching profiles.</p>
          )}
        </>
      )}
    </div>
  );
}
