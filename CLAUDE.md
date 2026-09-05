
- **2026-09-05** — **Analytics Overview: every tester in a table + coverage-pass
  reads.** `/analytics` now leads with one row per account (courses · rounds ·
  lists · return sessions · days · friends · reacts · public · last active),
  then pages opened, pages NOBODY has opened (43-page mirror in
  `src/lib/analytics/screens.ts`), the setup funnel with a connection-vs-walked-
  away verdict per unfinished account, recent sessions as page sequences, and
  marks by path. Reads the iOS `20260905170000_analytics_coverage_views.sql`
  views (dev + PROD applied 2026-09-05); empty states until the app update that
  emits `screen_viewed` ships. Long-form in `CHANGELOG.md` 2026-09-05.

- **2026-09-01** — **One email shell.** `src/lib/email/shell.ts` is now the single
  source for every Vestige email: both appearances as palette tokens plus the
  content blocks. `scripts/email-templates/generate.ts` builds the twelve
  `email_templates` rows from it (dark set APPLIED to prod + dev, identical
  fingerprints; light set held as a standby; `account_changed` seeded for the
  first time), and `starters.ts` builds the eight composer starters from it — so
  a campaign and a password reset are the same email. Gradient buttons are now
  four-layer (VML / CSS gradient / background-image PNG / solid) because Gmail
  strips CSS gradients and was rendering them flat. Compliance panel gained six
  checks; composer preview now injects the preheader the way the senders do.
  **Open:** both Edge Function fallbacks are still the retired light shell
  (frozen until 4 Sep). Long-form in `CHANGELOG.md` 2026-09-01.

- **2026-08-28** — **Beta-1 prod wipe EXECUTED.** All 5 app accounts + every
  trace of use + operational history + 235 storage files gone; content, admin
  fabric, waitlist/email spine kept (guard-verified). Kit in
  `scripts/beta1-wipe/` (one-shots — never replay); backups in
  `~/Documents/VESTIGE/backups/beta1-wipe-2026-08-28/`. Founding Pro armed,
  window CLOSED until Tom/Jack/review accounts exist. Ghost review account
  `johnappleseed` live (hidden, lifetime Pro; discovery ghosting = iOS
  migration `20260828170000`, dev+prod). **`--linked` = DEV, prod via psql
  pooler only.** Long-form in `CHANGELOG.md` 2026-08-28 (beta-1 wipe).

- **2026-08-28** — **Analytics report rebuild.** One plain-English page:
  testers strip (retires past 25 weekly actives), weekly pulse cards, funnel
  + discovery + doing-now with hover descriptions; dictionary regenerated so
  raw event names never render (feed reads as sentences); nav collapsed to
  Overview · Deep dive · B2B; B2B k-floor read live from `analytics_config`;
  HeroSwitcher deleted. iOS sibling slice fixed the instrumentation. Long-form
  in `CHANGELOG.md` 2026-08-28 (analytics report).

- **2026-08-28** — **Preview fidelity pass.** All iOS mirrors matched to the
  shipping app: app icon is the two-tone globe (was a wrong gradient flag),
  inbox row mirrors on-canvas `NotificationRow`, curated roll rebuilt to the
  0.4.1 `CuratedCourseRow` (filler notes deleted — that era is over), NEW
  app-true event card + prize card previews, announcement card to the true
  glass-sheet spec, medallion lock states + crest colours corrected.
  Long-form in `CHANGELOG.md` 2026-08-28 (preview fidelity).

- **2026-08-28** — **Flags control room rebuild.** /flags is one searchable
  list (Features/Copy/Tuning by value type), positive-only toggles (the
  enabled-vs-value riddle is UI-dead), blast-radius confirms + optional note,
  per-flag history with revert (`feature_flag_history`, iOS `20260828160000`),
  Archive/Restore actually works, reach counter honest, segment audience
  fixed, version gate folded in as a fenced panel (/app-version redirects,
  nav entry gone). Six new kill switches seeded (0.4.2 client gates).
  Long-form in `CHANGELOG.md` 2026-08-28 (control room).

- **2026-08-28** — **Notification copy-pass mirror sync.** `templates-meta.ts`
  re-synced to the shipped copy (blank defaults now deliberately mark fields
  where richer built-ins win — comment quotes, reactor roll-ups, society
  winners — and blank push titles on the five team-voice kinds); missing
  `comment_mentioned` kind added so it's finally editable. DB copy itself
  changed via iOS migration `20260828100000` (dev+prod). Long-form in both
  repos' CHANGELOGs 2026-08-28.

- **2026-08-27** — **Changelog visual rework.** Timeline rail + banners out;
  each version is a feed card — oversized hero version number (current wears
  the mint gradient), native `<details>` collapse (latest + drafts open,
  history collapsed, zero JS), chip-led items in a fixed 64px column on a
  hairline-ruled section heading, tinted chips shared editor↔read via
  `CHANGE_LABEL_CHIP`. Phone-first: 56px tap rows, counts/labels hide below
  `sm:`. `tsc`/`eslint`/`build` green. Long-form in `CHANGELOG.md` 2026-08-27
  (visual rework).

- **2026-08-27** — **Changelog rebuilt area-first.** A version is now ordered
  free-text sections ("Map", "Pro", "Fixes") of items, each with an optional
  New/Improved/Fixed/Removed chip, detail line, and ANY number of linked
  feedback reports (junction `app_version_change_reports`). Editor: Enter-to-add,
  paste-a-list, drag reorder across sections, heading autocomplete. iOS-repo
  migration `20260827150000` applied dev + prod same day (0.4.x content
  converted; verified on prod). `tsc`/`eslint`/`build` green.
  Long-form in `CHANGELOG.md` 2026-08-27.

- **2026-08-18** — **Index panels stripped to the numbers.** The guide is now
  tables only (axes ordered by weight, Setting rubric, Age bands, rank→score,
  one line for the scale) — no intro prose, no high/low cards, no calibration
  write-up; 240→132 lines and back to a server component. Weights loses the
  written formula + worked-example box, keeping sliders + Apply. Ranking import
  loses the source chips and the "Top of the list" table, keeping four
  single-word counters (To set · Unchanged · Hand-set · To check) + the
  exceptions list. Verified `tsc`/`eslint`/`build`. Long-form in `CHANGELOG.md`.
