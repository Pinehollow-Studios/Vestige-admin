# Fairways Admin — Changelog

> Long-form decision history. The one-line summary lives in
> `CLAUDE.md §6`. New entries at the top.

---

## 2026-05-22 — Remove round verification surface

Followed the iOS app's 2026-05-19 decision to scrap the four-method
round verification ladder (geotag check-in, attestation, geotagged
photo, admin-verified scorecard). The iOS migration
`20260519110000_drop_verification.sql` dropped the supporting tables,
columns, enums, and RPCs; admin needed to follow suit so it stops
querying tables that no longer exist.

### Removed

- **`/scorecards` page** — entirely deleted. The
  `scorecard_review_queue` table is gone; the
  `admin_claim_scorecard_review` / `admin_approve_scorecard` /
  `admin_reject_scorecard` RPCs are gone. Manual scorecard review is
  no longer a concept.
- **Sidebar** — removed the Scorecards nav item and its
  `ClipboardCheck` icon import.
- **(dashboard)/layout.tsx** — removed the
  `scorecard_review_queue` count query and the `scorecards` key
  from the badge counts object.
- **Overview** — removed the Scorecards `OverviewCard`, the
  `ScorecardRow` type, the `scorecard_review_queue` query, and the
  `scorecards` array.
- **Photos page** — collapsed from two-axis (moderation_state ×
  verification_state) to single-axis. `photos.verification_state`
  was dropped in the same migration. Kept `moderation_state` —
  photo moderation is independent of round verification and stays.
  `photos.kind` enum lost the `scorecard` value (rows converted to
  `roundPhoto`); the page now only displays `roundPhoto` / `avatar`.

### Kept (intentional, do not confuse with round verification)

- **`/lists` + `admin_list_verification_queue()`** — this is
  *list* verification (verifying user-created collections for the
  curated catalogue), a completely separate system that survives.
- **`/safeguarding`** — the explicit replacement for round
  verification per Fairways-ios §4.6 / §6.3. Trust the user, watch
  for abuse server-side, action it out-of-sight via the safeguarding
  queue.

---

## 2026-05-22 — Atlas-aligned visual refresh + dev surfaces

Pulled the admin dashboard into the same visual family as the iOS app
(Atlas dark theme) and the marketing site (mint accent on deep paper),
and lit up the under-surfaced operator workflows so devs can see what's
actually happening in the platform without leaving the browser.

### Theme

- Rewrote `app/globals.css` so the **default palette is the iOS
  Atlas dark theme**: paper `#0E1822`, ink `#F3F0E5`, mint accent
  `#5BE4C3`, lime gradient pair `#8FE85B`, amber `#F4A85C` for
  achievement / safeguarding, claret `#E2664E` for alert.
- Default theme is now `dark` (was `system`); the cream "almanac"
  palette is kept as the `.light` alternative for editors who want
  it. England green still anchors the light mode.
- Added decorative helpers: `.surface-aurora` (mirrors the marketing
  blobs, static), `.surface-glass` (panels-on-paper glass), `.bg-topo`
  (county-fill backdrop), `.pulse-dot` (live indicator pulse), `.kbd`
  (keyboard shortcut chip).

### Navigation

- **Sidebar** picks up two new live sections — `/safeguarding` and
  `/users` — under a "People & safety" group, plus a bottom "Tools"
  shelf with external links (Supabase Studio, Sentry, iOS repo,
  Marketing site, Mapbox). Brand mark redrawn in the dark Atlas
  paint.
- **TopBar** gains the deploy ref (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_*`),
  a quick-tools pill cluster for the two most-used externals, and a
  pulsing env dot.

### Overview

- Hero panel re-skinned in Atlas paper with a triple-pill summary
  (queue / safeguarding flags / feedback) and an editorial serif
  greeting.
- New "Platform health" stats strip — total users (+ this week), total
  rounds (+ last 7 days), courses with polygon-coverage %, accepted
  friendships. Attention-flag if polygon coverage < 90%.
- Queue grid expanded to six cards (List verification, Feedback,
  Safeguarding, Crashes, Scorecards, Photos), each backed by a real
  query with a 4-row preview list.
- New "Operator tools" section: polygon-coverage callout, paste-able
  SQL snippet cards, and a grid of external destinations (Supabase
  SQL editor, Sentry, runbook, iOS repo).

### New pages

- **`/safeguarding`** — read-only queue backed by the existing
  `admin_safeguarding_queue()` RPC. State filter (pending /
  reviewed_clean / reviewed_actioned / auto_expired) + kind filter
  (same_day_excess / impossible_geography / velocity_spike).
  Renders evidence JSON per flag and surfaces user account_status /
  hidden flag inline. Hide / set-status / outreach actions land
  next.
- **`/users`** — directory with `username` / `display_name` search
  (citext + ilike), `account_status` filter, status tiles
  (founding / restricted / suspended / hidden / total). Read-only;
  per-user detail with mutations lands next.

### Lit-up pages (was "Soon")

- **`/photos`** — live two-axis breakdown (moderation_state ×
  verification_state) plus a 50-row pending table. Approve / reject
  controls still gated on the open §16.13 policy decision.
- **`/scorecards`** — live `scorecard_review_queue` state tiles plus
  open-queue table. Claim / approve / reject controls will hook the
  existing `admin_claim_scorecard_review` /
  `admin_approve_scorecard` / `admin_reject_scorecard` RPCs in the
  next slice.
- **`/analytics`** — useful holding page when Metabase isn't wired:
  first-cut counts (users / rounds / photos / friendships / played
  markers / bucket list), six paste-able SQL starter queries, deep
  links to Supabase SQL + table editors. Embeds Metabase when
  `NEXT_PUBLIC_METABASE_DASHBOARD_URL` is set.

### Sidebar badges

- `(dashboard)/layout.tsx` now fetches counts for nine surfaces in
  parallel (verification, curated, courses, feedback, photos,
  scorecards, safeguarding, users, crashes-7d). All independently
  nullable — a failed query hides only the matching pip.

### Notes

- No schema changes — every new query reads existing tables or RPCs
  that already live in `Fairways-ios/supabase/migrations/`.
- TypeScript clean, ESLint clean, `next build` green.
