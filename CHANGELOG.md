# Vestige Admin — Changelog

> Long-form decision history. The one-line summary lives in
> `CLAUDE.md §6`. New entries at the top.

---

## 2026-09-05 — Analytics: every tester in a table, every page, and where setup stalls

**Tom:** "Get all of the new data on Bunker on the analytics page … show it in the
same way that you did at the start of this chat, with the courses and return
sessions in a table with all of the different users … have it ready for when
[the update] is pushed." The iOS coverage pass earlier today added
`screen_viewed` on every page, `onboarding_step_failed` / `onboarding_resumed`
with the phone's reachability, an on-device outbox that replays events the
server never saw, and `course_marked_played` from every mark path. None of it
reaches prod until a build ships; the bunker is ready for it now.

**The read layer** is the iOS migration `20260905170000_analytics_coverage_views.sql`
(applied to dev, then to prod on Tom's go the same day): `analytics_testers` (one row per
account — courses, rounds, lists, reactions, friends, return sessions,
active days, last activity, page views, push, public), `analytics_screens`,
`analytics_screen_paths` (every session in 30 days with ordered steps),
`analytics_onboarding_stalls` (unfinished accounts with last step, its
reachability, failure rows, resumes), `analytics_onboarding_failures`,
`analytics_onboarding_funnel_v2` (pinned ordinal + offline completions),
`analytics_marks_by_source`, `analytics_outbox_replays`. Same posture as the
06-25 set: service-role only, revoked from anon/authenticated. `queries.ts`
gains a typed read per view.

**The Overview page** (`/analytics`): the sentence strip is replaced by
**Everyone in the app** — the per-tester table from the launch-night read,
one row per account with Joined · Version · Courses · Rounds · Lists ·
Returns · Days · Friends · Reacts · Public · Last active, rows linking to
`/users/<id>`, unfinished setup badged. Below the existing pulse/activation
sections: **Pages people open** (views + people, Boards cohorts kept
separate), **Pages nobody has opened** (the full 43-page list in
`src/lib/analytics/screens.ts` minus what has been seen, grouped by area —
this is the "what are they not exploring" answer), **Setting up · step by
step** (the v2 funnel with an offline count per step, plus a card per
unfinished account carrying a verdict: *Connection* when a save failed
offline/transient or the last step was finished offline, *Server refused*,
*Walked away* when neither, *No data* for pre-tracking accounts), **Recent
sessions** (each session as a chip sequence of page names and actions, with
the outbox-replay footnote), and **How courses get marked played**.

**Dictionary** (`config.ts`): `screen_viewed`, `onboarding_step_failed`,
`onboarding_resumed` added; the seven "(Not wired in the app yet.)" notes on
now-wired events removed; property labels for the new keys; value labels
for the four failure reasons and ten operations so a stall reads as a
sentence; `ONBOARDING_STEPS` re-synced to the pinned funnel order (it was
missing `friends` and led with `beta`). Page names live in the new
`screens.ts` — a mirror of the Swift `AnalyticsScreen` enum; a new case there
is a new row here, or it can never show as unvisited.

**Until the app update ships** every new section renders its honest empty
state ("arrives with the next app update"); the tester table works today
because it reads the domain tables. Dev already shows real page paths from a
simulator session, so the rendering is exercised.

**Verification:** `tsc --noEmit` clean, `eslint` clean on the four touched
files, `next build` green. Not rendered in a browser against prod (the
sections need the new events); dev views probed by SQL. No git operations.

---

## 2026-09-01 — One email shell, applied to prod and dev

**The problem.** Vestige had three email shells. The twelve rows in
`public.email_templates`, the marketing site's `emailShell.tsx`, and the Bunker's
own `starters.ts` had each been written separately and drifted. Seven stored
templates were on a July dark shell; the four security notices seeded on 21 August
were still on the 2025 white card, using `#3FA889` — a mint in no palette — with a
decorative gradient built from the *dark* lime on a white ground. The fleet
rendered as two different brands, and none of the twelve declared its appearance,
so Outlook and Apple Mail were free to re-tint what was left.

**The shell.** `src/lib/email/shell.ts` is now the single source: both appearances
as named palette tokens, and the content blocks every email is made of — eyebrow,
headings, paragraph, steps, stats, panel, seal, code, divider, button, link
fallback, sign-off. `scripts/email-templates/generate.ts` builds the twelve
automatic emails from it and emits guarded SQL; `starters.ts` builds the eight
composer starters from it. A change to the shell now regenerates both instead of
drifting from one.

**Applied.** The dark set went to prod and dev on 1 September; both projects hold
12 rows with an identical `md5(string_agg(md5(html)))` fingerprint. Backups of the
prior 11 rows per project are in
`~/Documents/VESTIGE/backups/email-templates-2026-09-01/`. A twelfth row,
`account_changed`, was seeded for the first time — it was a permitted key with no
row, so if a phone or MFA notice ever fired it rendered an unstyled white
paragraph. A full light set is generated and held as a standby.

**The gradient, which was the actual complaint.** Tom had seen the mint→lime
gradient arrive as a flat block in Gmail, which strips CSS gradients outright. The
button now carries four independent layers: VML `<v:roundrect>` with a real
gradient fill for Outlook's Word engine (no gradients, no border-radius); a CSS
`linear-gradient` for Apple Mail and iOS Mail; the `background` **attribute**
pointing at a gradient PNG, which is the layer Gmail honours and the one that was
missing; and `bgcolor` solid mint underneath for anything left and for images-off.
The PNGs are generated from the palette and served from `vestige.golf/brand/`.

**Also covered**, each a real failure mode: `color-scheme` +
`supported-color-schemes` so nothing force-inverts; Outlook `data-ogsb`/`data-ogsc`
overrides pinning every surface; the `PixelsPerInch` block for high-DPI Windows;
`x-apple-disable-message-reformatting`; a preheader on every automatic email; and
the button's destination printed in plain text underneath.

**Compliance panel** gained six checks, each for something we have shipped at least
once: dark not declared, a gradient with no image fallback, Gmail's ~102KB clipping
point, images without alt, house voice (em dashes, exclamation marks, US spellings
— matched against visible text only, after the first cut fired on `color-scheme` in
the CSS), and retired palette colours. Negative-tested one case per check.

**Composer preview** was wrong and is fixed: it rendered the stored HTML, but the
senders *inject* the preheader at send time, so the preview was never what landed.
It now runs the same two steps in the same order.

**Postal address, since resolved.** The footer carried `[add postal address]` and
the compliance panel warned on every starter. The real details were already
written down in `vestige-marketing/legal/` — terms of service, privacy policy and
the beta testing agreement all agree, as does the live privacy page. They are now
a `COMPANY_FOOTER` constant in the shell and appear on **every** email, not only
campaigns: a UK limited company's business correspondence carries its trading
disclosures (registered name, number, place of registration, registered office),
and a password reset from Pinehollow is business correspondence. CAN-SPAM's
physical-address rule for commercial mail is covered by the same line. All eight
starters now pass compliance clean, apart from the blank one, which fails on an
empty subject by design.

**Still open.** `send-welcome` and `auth-email-hook` each fall back to hardcoded
light HTML when the template read returns nothing, silently and with no log line —
the most likely explanation for the light welcome email that arrived on 31 August.
Fixing them is an Edge Function deploy, blocked by the iOS freeze until 4 September.
The footer's postal address is still a placeholder in the starters.

---

## 2026-08-28 — Beta-1 prod wipe executed + wipe kit, ghost review account, founding-Pro armed

**The wipe.** Prod was fully reset for beta 1, on Tom's GO after a staged plan.
All five app accounts (Tom's, Jack's, both partners', and the old App Review
login) and every trace of use went: profiles, rounds, markers, badges, personal
lists, societies, friendships, reactions, comments, notifications, device
tokens, pro grants, demographics, leaderboard snapshots — plus the
non-cascading operational history (762 app_events, 98 push_events, 5
announcements + receipts, 2 admin broadcasts, 18 feedback reports with their
22 messages / 14 screenshots / 14 changelog links, 1 crash report, 4 MetricKit
payloads, safeguarding flags + audit log) and 235 storage objects
(photos-original/rendered, avatars, feedback-screenshots, 2 user list-covers).
Kept, guard-verified untouched: all app content (1,795 courses/clubs, curated
lists + covers, badge definitions, clubhouse events + covers, society modes,
scout bundles), the changelog family (21 versions / 174 items — the 14 report
links died with the reports by design), flags + history, notification/email
templates, all configs, dataset imports, and the whole marketing spine
(43 waitlist subscribers, both waitlist campaigns, 3 email campaigns, 295
email_events — Tom chose to keep send history). Kept auth: `tom@` +
`jack@pinehollow.studio` (Bunker logins) and `agent@vestige.golf` (tooling).

**The kit** lives in `scripts/beta1-wipe/` — `01-snapshot.mjs` (per-table JSON
snapshot + storage index via prod service role), `02-wipe.sql` (single
transaction, self-aborting guards: content-table drift check, auth-count
check, per-table zero sweep), `03-storage-cleanup.mjs` (dry-run by default,
`--apply` deletes + re-lists to verify; keeps `curated/*` + `events/*` in
list-covers). One-shots, never to be replayed; README documents order and the
psql channel. Pre-wipe safety net in
`~/Documents/VESTIGE/backups/beta1-wipe-2026-08-28/`: full `pg_dump`
(public + auth, 3.1 MB) + JSON snapshot + auth-users export.

**The near-miss that shaped the kit:** `supabase db query --linked` in
vestige-ios points at DEV, not prod — the entire first analysis pass ran
against the wrong database and was caught only because the service-role
snapshot (guard-pinned to the prod ref) returned different counts. Everything
prod-side now goes through psql to the eu-west-1 session pooler
(`postgres.ujbnupjrbroskzwaeulj`, password file) with an identity probe first.
Memory + MEMORY.md corrected.

**Beta config flips (same day):** `pro_config.founding_pro_enabled` → true
(6-month founding Pro auto-grant armed; fires on the signup founding flip),
then `founding_member_window.is_open` → false so the three pre-beta accounts
(Tom, Jack, App Review) sign up without founding status — reopen after those
three exist. Tom + Jack get their 6 months as manual grants.

**Ghost review account:** `review@pinehollow.studio` / `johnappleseed` /
"John Appleseed" (uuid `7f2e2321…`), created via auth admin API + SQL-seeded
profile, `is_admin_hidden_from_public_leaderboards=true` from birth, no
founding artefacts (window closed), permanent Pro (`comp` grant, no expiry,
`pro_status` verified lifetime). Invisible on boards, event rolls, feed
(no friends) — and on search/suggestions via the iOS-repo migration
`20260828170000` (all four discovery RPCs now exclude admin-hidden users;
also closed a latent leak of *suspended* users via exact-handle lookup and
friend suggestions). Applied dev + prod same day. Credentials → ASC.

**Also diagnosed:** nightly prod-backup Actions have failed since 7 Aug — the
org exhausted its 2,000 free minutes (the old PR gate's macos-15 xcodebuild
job at 10× billing; gate deleted 19 Aug). Not a payment issue; resets Sept 1
and the ubuntu-only residue (~100 min/month) can't re-trigger it. Standing
caution: dispatching `release.yml` (macos-15) a few times a month would.

**Not committed to:** analytics exclusion of the review account's events
(accepted blip, admin-visible only); rounds/badge seeding for the reviewer
(Tom's later); reopening the founding window (waits on the three accounts).

Tom's brief: the page "frequently references events with codenames" and must
be simple enough for Jack. Research (Amplitude/Mixpanel/PostHog governance,
June.so's reports-not-queries, Plausible's ceiling on simplicity) set the
rules: raw event names never render, one hero number per card with a delta,
plain-English titles, no query builder on the landing page.

**The dictionary** (`lib/analytics/config.ts`, fully regenerated against the
repaired iOS vocabulary): every emittable event now carries a Jack-grade label
("Added a course to a list", never "Bucketed") plus a one-line description
that surfaces on hover; property keys and closed dimension values have their
own language maps; unknown wire names de-snake through a fallback instead of
rendering verbatim. The ghost events (course_bucketed/unbucketed) are gone —
they'd been actively breaking the "Browse → save to a list" funnel preset.

**Overview is the report now**: a "This week's testers" strip leads while the
beta is small — each active person's week as a sentence ("Logged a round ·
Viewed a course ×14 · today"), capped at 25 weekly actives after which it
retires itself (Beta 1 lands ~20 users next week; at that scale who-did-what
IS the report). Under it: a three-card pulse (people this week / rounds this
week — weekly, replacing the old lifetime-total-with-weekly-delta mashup /
new accounts), the daily chart, "From signing up to first round", "Where
plays come from", "What people are doing" with hover descriptions, and the
email strip with honest captions (Opens = total opens, one person can open
twice). "Sellable cohort" jargon deleted.

**Navigation collapsed** from seven tabs to Overview · Deep dive · B2B
preview; the four explorers (Explore/Funnels/Paths/Retention) plus the live
feed live as sub-tabs under Deep dive — Tom's tools, off Jack's path.

**Fixes along the way**: the live feed's monospace `key=value` wire pairs
became sentences ("found via: Map browse"); the B2B page now reads the
k-anonymity floor from `analytics_config` instead of hardcoding 5 (the SQL
was tunable while the privacy copy asserted a constant — a lie waiting to
happen on a legal-gated page); the six silently-dropped onboarding steps are
back in the funnel order; Explore breakdowns label their values; the dead
130-line HeroSwitcher is deleted; sparklines stop announcing every series as
"Daily active users" to screen readers; paths' unrounded float fixed.

Data side: iOS repo migration `20260828180000` adds the `app_events
(created_at, user_id)` index (applied dev + prod) — every analytics view
scans that column with no leading index. The instrumentation repairs
(auth_completed actually landing, list events wired, demographics swap) are
the iOS CHANGELOG's sibling entry.

Verified `tsc` + `eslint` + one `next build`.

## 2026-08-28 — Preview fidelity pass: every iOS mirror matched to the shipping app

Tom's brief: the previews had drifted from the app. Two audits ran first — an
inventory of all nine bunker preview surfaces, and a token-level visual spec
extracted from the iOS code (colours, fonts, radii, paddings) — then each
preview was diffed and corrected.

**The app icon was flat-out wrong.** Every notification preview drew a
mint-gradient squircle with a golf flag; the shipping icon is a flat two-tone
globe (#070A10 tile · #1B2D42 sphere · #7DE0B0 land, decoded from
icon-1024.png). `VestigeAppIcon` redrawn; the inbox row's inline duplicate
tile replaced with the correct glyph-tile treatment.

**Notification inbox row** — the app dropped the card style long ago: rows
sit directly on the canvas. The preview now mirrors `NotificationRow` as
shipped: 40pt glyph tile (accent@14%, radius 12), headline with the inline
"now" age suffix, quoted sublines in the Manrope editorial italic, an 8px
mint unread dot with glow, and the 52pt-inset list hairline beneath.

**Curated list preview** — rebuilt twice: the first pass worked from a
second-hand spec and got the roll anatomy wrong (Tom's catch). Second pass
read the SwiftUI source directly (CuratedListDetailView / CuratedListHero /
CuratedListRoll / ListMapCard): rows are a LEFT-STACKED editorial column
("NO. n" eyebrow over the 19pt display-face name over the PLAYED · COUNTY
dateline) with the View pill centred right and the note full-width beneath;
played rows lift onto the mint-washed gradient-edged card that BLEEDS past
the flat rows' margins; the previously-missing "ON THE MAP" plate
(hairline-flanked break, sea-gradient map with glowing played marks, Expand
pill) sits between the progress row and the roll; filter tabs appear only at
≥8 courses, exactly like the app; `FILLER_NOTES` deleted (the app's
filler-quote era is over). Masthead carries the Save capsule, READ MORE
fold, and the real gradient progress ring. First row renders played so both
row states are visible.

**Events finally has app-true previews**: a new `ClubhouseEventCardPreview`
(the 300×128 What's-on card — no poster image, corner glow, diagonal hatch,
status dot + word, Manrope 22 title, gradient progress ring with the days
label) and the prize row restyled to `ClubhouseEventPrizeCard` ("THE PRIZE"
eyebrow, earned medallion — a prize is never locked, award-rule line,
chevron).

**Announcement card** re-scaled to the true `VGlassSheet` spec at 0.72
(radius 17, Manrope 23 title, 37pt gradient capsule CTA with the accent
underglow, top-rim highlight) and its caption no longer apologises with
"Approximate".

**Small trues-ups**: badge medallion locked/impression filter matched to iOS
(`brightness 0.94 · opacity 0.85`, lock chip on #070A10 with the fillSoft
stroke); society crest amber/claret/sea corrected to the Theme tokens the
app actually resolves (#F4A85C / #E2664E / #1B2D42 — the bunker's were
bespoke wrong hexes). Course preview left as-is (verified current).

Verified `tsc` + `eslint` + one `next build`.

## 2026-08-28 — Flags control room: one honest list, history, and the version gate folded in

Full rebuild of /flags (Tom: "super confusing and hard to use" — the audit
agreed, finding six outright bugs). Competitor research (LaunchDarkly, Unleash,
PostHog, Firebase Remote Config) set the shape: at two-person scale, skip
targeting/rollout ceremony and invest in descriptions, who/when, confirms that
state blast radius, and history with revert.

**The new IA** — one flat, searchable page in three honest groups derived from
the value type (Features / Copy / Tuning — the `flagCategory` taxonomy that
shipped in types.ts but was never imported), an area chip per row from a
corrected prefix map (the old heuristic missed scout_/apple_/clubhouse/pro
keys, so the old 12-box area grid was one giant "Other"), and a collapsed
Archived section that finally makes **Restore reachable** (archiving used to be
an undocumented one-way door — every archived flag vanished from the UI
forever). The version gate sits at the bottom of the same page as a fenced
amber panel — it's a different weapon class to a flag, and the /app-version
route now redirects here (nav entry removed).

**One positive toggle per row.** ON = users see it. For features the switch
drives `value` (with `enabled` pinned true — the enabled-vs-value riddle is
gone from the UI); for copy/tuning it reads "Override / Built-in". Rows derive
all state from server props — the old board cached toggle state locally and
drifted after every save.

**Every live change confirms** with the blast radius spelled out, the
propagation truth ("live phones pick this up on next foreground, checked at
most once a minute"), and an optional one-line reason. The old board had this
exactly backwards — boolean flips confirmed, live copy edits and the one-way
Archive fired instantly.

**History with revert** — `feature_flag_history` (iOS migration
`20260828160000`) renders on every row ("Turned off · 2h ago by Tom ·
'incident'") and in a per-flag list with one-click Revert (applied through the
normal upsert, so the revert is itself a logged change — Firebase-style linear
history). The admin RPCs now take `p_actor`/`p_note` (service-role calls have
no auth.uid(), which is why every `updated_by` to date was null) and the
"saved segment" audience finally saves (the RPC guard predated the segment
machinery — picking it has errored since 2026-07-12).

**Also fixed** — the reach counter refuses to run against unsaved audience
edits (it used to silently report the old config); the version-gate page's
hints, written and typed but never rendered, now render; recommended-below-
floor is rejected; six new app kill switches (boards, clubhouse, feed, curated
lists, course photos, Pro page) appear pre-seeded with Jack-grade
descriptions, gated in the 0.4.2 client (iOS CHANGELOG same day).

Verified `tsc` + `eslint` + one `next build`. Not UI-walked (auth-gated;
Tom's standing call).

## 2026-08-28 — Notification copy-pass mirrors: templates-meta sync + missing kind

Bunker side of the full auto-sent copy pass (long-form rationale in
`Vestige-ios` CHANGELOG 2026-08-28). What changed here:

**`notifications/templates-meta.ts`** — re-synced to the new shipped copy and
its conventions documented in the header: a BLANK default is now deliberate on
the fields where the built-in copy is richer than any flat template (comment
pushes quote the comment, reactions roll up "Sarah and 2 others", society
results name the winner) — saving a value into one of those fields flattens
the richness, and the header now says so. Blank push titles on the five
feedback/outreach/account kinds mirror the shipped empty-title convention
(iOS shows the app name; the old "Vestige" titles double-printed it). New
copy mirrored: "New in {county}" grammar, "You earned {badge}" (the token now
resolves the badge's display name server-side), "The team sent you a message",
"We're on it" + note as the feedback-in-progress structure, informative
account-status wording, all "tap to …" instruction copy gone, typographic
apostrophes/dashes. **`comment_mentioned` was missing from the meta entirely**
— Jack could never see or edit the mention notification's copy; added
(Social, with `{name}`/`{comment}` tokens). `scout_weekly` stays deliberately
excluded while the weekly digest is unscheduled.

No other bunker surface needed changes: crash-alert severity copy, email
starters, and the automatic-emails editor were audited in the same pass and
already read correctly (the email templates live in the DB and were updated
by the iOS-repo migration). Verified `tsc` + `eslint` + one `next build`.

## 2026-08-27 — Changelog visual rework: release-feed cards, chip-led items, phone-first

Same-day follow-up to the area-first rebuild. Tom's brief: modern + sleek, and
it must read well on Jack's phone. Four direction calls (all Tom's picks):
release feed over timeline · chips lead each line · read views redesigned with
editor polish only · latest open, older collapsed.

**/changelog** — the timeline rail and the two top banners are gone. Each
version is now a feed card: oversized `font-hero` version number (the current
release wears the mint `--gradient-accent` as clipped text), draft/current
pills, date, title, and item/fixed counts in the header row; sections render
inside. Collapse is native `<details>`/`<summary>` — zero JS, the whole
≥56px header row is the tap target, chevron rotates via `group-open`. The
current release and any draft render `open`; history collapses to header rows.
Counts and the "Edit" text hide on `sm:` breakpoints so a phone row is just
chevron · version · pill · pencil.

**Entry rendering** (`ChangeLinesView`) — section headings sit on a hairline
rule that runs to the card edge; every item leads with its label chip in a
fixed 64px column so text ragged-aligns cleanly on a phone (the column only
exists in sections that use labels at all). Chips move from outlined pills to
tinted fills (`CHANGE_LABEL_CHIP` in types.ts — single source shared with the
editor). Report chips lose their border for a soft brand fill; detail lines
sit under the item inside the same text column.

**View mode** (`VersionView`) — matches the feed card: hero version number
(3xl/4xl), header and body split by a hairline, mobile padding p-4 → sm:p-6.

**Editor polish only** — label chip buttons adopt the shared tinted chip (64px
column, matching read view), hanging indents follow (100→92px), and the
per-item icon buttons grow from p-1 to p-1.5 hit areas. Layout untouched.

**Verified** — `tsc` clean, `eslint` clean on the touched trees, one
`next build` green. Not UI-walked (auth-gated; Tom tests on the deployed
bunker — his standing call from the same-day rebuild).

## 2026-08-27 — Changelog rebuilt area-first: sections, per-item labels, multi-report links

Tom's brief: 0.4.1 (headers per page/area with bullets beneath) is the format
going forward, but the old model fought it — the kind groups (Added/Fixed…)
had stopped carrying meaning, sub-items were newline-encoded inside one text
column, and a whole header could link exactly one feedback report. Research
pass over Linear/Canny/Figma/Slack/GitHub confirmed the instinct: consumer
products group by area, not kind; feedback↔release links are join tables.
Tom picked all four recommendations: headers only · New/Improved/Fixed
(/Removed) per-item chips · many reports per item · every list power.

**Schema** (`Vestige-ios` migration `20260827150000_changelog_sections.sql`,
applied to dev, ledger repaired; **prod pending**): new `app_version_sections`
(free-text heading, ordered, admin-only RLS) + `app_version_changes` grows
`section_id`/`label`/`detail` (each row = one item) + new junction
`app_version_change_reports` (many reports per item, admin-only RLS).
Expand/contract: additive two-phase — `kind` stays not-null (derived from
label on write: new→added, none→improved), legacy `feedback_report_id` frozen
in place, so the deployed bunker keeps working between prod-migration and
bunker-deploy. In-migration data migration splits umbrella rows into a section
plus one row per bullet (original row becomes the first item so its id and
report link survive), groups flat rows into per-kind sections (New /
Improvements / Fixes / Removed — merging into a same-heading section if one
exists), maps labels (bullet text starting "Fixed" overrides to `fixed` even
under an improved umbrella — catches 0.4.1's Map crash-fix), backfills the
junction from the legacy column, renormalises section sort. Probed on dev with
a 0.4.1-shaped fixture (v9.9.9, left on dev as test data — delete from the UI
whenever).

**Editor** (`VersionEditor` rewrite) — a version is now ordered free-text
sections with items beneath. Per item: label chip (click cycles
none→New→Improved→Fixed→Removed), inline text, optional smaller detail line
(AlignLeft toggle), any number of linked reports (Link2 opens the existing
picker; chips with per-report unlink; section header rolls up a distinct-report
count). Entry is keyboard-first: the add-row keeps focus (type → Enter → type),
seeds its label from the section's last item, and a multi-line paste becomes
one item per line (leading bullets stripped). Native HTML5 drag: sections
reorder by their header; items reorder within and across sections (drop on a
row inserts before it, drop on the card body appends —
`reorderItems` claims `section_id` server-side so a cross-drag is two ordered
lists). Section input autocompletes from every heading ever used (datalist).
Legacy section-less rows render read-only under "General" rather than
disappearing.

**Read views** — `ChangeLinesView` renders sections as bold headings with a
left rule, chips per item, detail lines, report chips; shared by /changelog
timeline and the version View mode. The timeline's "N fixed" counter now
counts `label='fixed'`.

**Feedback loop** — junction is the truth everywhere: link picker hides
already-linked reports via the junction; `listReportsForRelease` walks it (one
row per report, first linked item wins) so the release dialog and bulk-resolve
are unchanged in behaviour; `shipReportInVersion` now lands the report as a
Fixed item in the version's "Fixes" section (find-or-create at the end);
thread route + queue `shippedByReport`/`dedupeShippedVersions` read the
junction through a shared two-level unwrap in `lib/feedback/queue.ts` (the
page-local duplicate deleted).

**Deploy ordering** — the new bunker reads the new tables with soft failure
(empty lists, no crash), so there was a window where the deployed changelog
panel would read empty. Closed same day: `20260827150000` applied to prod
(Tom's call) minutes after the Vercel production deploy went Ready. Verified
on prod post-apply: 0.4.1 converted to its six authored sections in order with
the Map report link in the junction and the crash-fix bullet auto-labelled
Fixed; 0.4.0/0.3.x flat rows grouped per kind; migration ledger dry-run clean.

**Verified** — `tsc` clean, `eslint` clean bar the pre-existing VaultGate
warning (untouched line), one `next build` green. Not UI-walked (Tom's call:
ship for his own testing); dev server stopped after boot-check to Sign in.

## 2026-08-18 — Stripping the Index panels back to the numbers

Follow-up to the same-day page simplification. When the guide was first built
the brief was "make sure Jack understands everything", and it over-corrected
into paragraphs. Tom's call: cut the prose, keep the numbers.

**How it works** — rebuilt as tables only. Gone: the intro paragraphs, the
Setting high/low descriptor cards, the "what that means" explainer under each
axis, the calibration write-up. Kept: the axes table (now ordered by weight,
ranking first, so the most important number leads), the Setting rubric, the Age
bands, the rank→score table, and one line for the scale — best ≈99, typical
≈50, unranked capped at 88. Every remaining sentence is a rule you'd need to
score a course, not an explanation of why the rule exists. 240 → 132 lines, and
it's now a server component (the collapse state it needed is owned by
`IndexControls`).

**Weights** — dropped the written-out formula and its paragraph, and the live
worked-example box. What's left is the three sliders and Apply; the footer is a
bare "Last changed 2h ago by Tom" instead of a sentence about renormalisation.

**Ranking import** — dropped the source chips and the "Top of the list" preview
table (ten rows restating what the main table shows after applying). Left: the
four counters, now single-word — To set · Unchanged · Hand-set · To check — and
the exceptions list, which is the only part needing action. Confirm-dialog copy
halved.

Presentation only, no schema/data/dependency change. Verified `tsc`/`eslint`/
`build`; gated behind the admin login, so Tom-to-eyeball.

---

## 2026-08-18 — Simplifying the Index page

The Index surface had grown three stacked collapsible panels — mechanics,
guide, ranking import — above the toolbar, so the actual work (the ranked
list) started a long way down the page and three headers competed for
attention before you saw a single course.

**One control strip instead** (`IndexControls.tsx`): a quiet row of three
toggles — How it works · Weights · Ranking import — opening **one panel at a
time**, with Recompute pulled out to the right of the row where it belongs as
a standalone action. The three panels lost their own collapse chrome and
became plain content components (`IndexGuideContent`, `IndexWeightsPanel`,
`RankingImportPanel`), so the page owns the disclosure rather than each panel
arguing for itself.

**Table**: dropped the separate "Projected" column, which sat next to Index
showing a second number for the same thing. A pending edit now recolours the
Index cell amber in place — one number, one column, and the min-width falls
760px → 680px so it fits more screens without scrolling.

**County landing**: removed the amber "N to rank" chip. It counted courses
with nothing entered on any axis, which was every course when it was written
and is now none of them — it had quietly become a permanent "all ranked" on
every tile. The cards are back to name · count · average Index. The landing
query drops to `county_id, vestige_index` as a result.

Presentation only — no schema, data or dependency change. Verified `tsc` /
`eslint` / `build` + a clean dev boot with no server errors; the page itself
is behind the admin login so it's Tom-to-eyeball.

---

## 2026-08-18 — Calibrating the Index: the best courses finally read 99

The first full-blend result didn't work. Royal St George's read 88, and
Sunningdale — #2 in England by every source — sat at **#85**. Two separate
faults, diagnosed apart:

**The scale.** Averaging compresses. Across the top-30 ranked courses the
inputs average ranking 95, age 80, setting 74, so no weighting could ever
produce 99 — a flawless #1 blended to ~91 because an 1890 course simply isn't
99-old and the conservative Setting draft caps at 88.

**The order.** Sunningdale's problem was a *wrong input*, not weighting. Even
at 55% ranking weight it only reached #25, because its Setting draft was 62.

Three fixes:

1. **Setting's inland bias corrected.** Heathland/downland baselines raised
   (64→70, 62→68) and the **road-intrusion penalty dropped entirely** — a trunk
   road behind a treeline is not an intrusion, and it was demoting the whole
   Surrey/Berkshire heathland belt for roads inaudible from the course. Genuine
   suburban enclosure survives, softened. Sunningdale's Setting: 62 → 74.
2. **Ranking leads at 0.55** (age 0.15, setting 0.30). For the 185 courses with
   a published ranking we hold real external consensus; averaging that down
   with geography proxies was the error. Where ranking is absent its weight
   redistributes and setting leads instead.
3. **A calibration curve on the blend's output**, in SQL — iOS migration
   `20260818100000_vestige_index_calibration.sql`. Frozen piecewise-linear
   anchors fitted to the live distribution: raw 91→99, raw 86→90 (top twenty
   spread across the 90s), raw 61 (median)→50, raw 39→20. Strictly monotonic,
   so it re-labels the scale without reordering anything — and crucially it
   leaves the axes meaning what the guide says they mean, rather than distorting
   them to fake a high average. Plus an **unranked ceiling of 88**: if no panel
   has ever ranked a course it isn't top-20 in England.

Anchors are frozen deliberately; a percentile scale would reshuffle every
course each time the catalogue grows. They'll need re-tuning if the
distribution shifts materially — one edit, documented in the migration header.

**Result** (prod): scale runs **20-99**, median exactly **50**, 18 courses in
the 90s, zero unranked breaching the cap.

| | before | after |
|---|---|---|
| Royal St George's | 88 (#4) | **99 (#1)** |
| Sunningdale | 80 (#85) | **95 (#7)** |
| Swinley Forest | 81 (#50) | 92 (#14) |
| Walton Heath | 81 (#66) | 90 (#17) |
| Axe Cliff (unranked) | 86 (#12) | 88 (#23) — capped |

Migration is `create or replace` on an existing function, signature and return
type unchanged, `vestige_index` still a 0-100 smallint — expand/contract-safe,
no live app version affected. Rollback-probed before applying; applied to dev
and prod with both ledgers repaired. `IndexGuide` gained a section explaining
why the final number isn't the plain average, and its stale road-penalty copy
was removed.

Verified `tsc` / `eslint` / `build`.

---

## 2026-08-18 — Setting: a landscape-derived draft for all 1,794 courses

The third axis, and the one with no number to pull from. Setting is "the land,
the views, the sense of place" — no published ranking encodes it. Decisions
locked with Tom: derive a draft from **measurable geography**, style as the
baseline, conservative, drafted for every course with Jack correcting over time.

**The descriptions were ruled out deliberately.** Every course has a rich
description mentioning its setting, which looked like the cheap route in — but
Tom confirmed they were AI-generated at import. Scoring from them would launder
a model's invention into a 40% axis, so they are untouched.

**Four measured signals**, all validated against known courses before use:

- **Coast distance** — Natural Earth 10m coastline clipped to a GB bbox (70
  linestrings). Sanity check: links land 0.2-3.3km, Sunningdale 64km, and
  Ganton reads 10.6km, correctly identifying it as an *inland* links.
- **Relief** — Mapbox Terrain-RGB contours within 1.1km. **Their contour layer
  carries bathymetry**: Hartlepool returned `[-500, -10, 0, …]`, inflating every
  coastal course's relief to 540m. Caught on review, filtered to `ele >= 0`, and
  the whole terrain pull re-run. Links also get no "flat" penalty — dune
  topography is real but sits below 10m contour resolution.
- **National Park / National Landscape** — Natural England ArcGIS, 10 + 34
  boundaries downloaded once and tested point-in-polygon locally. 58 courses in
  a National Park, 158 in a National Landscape.
- **Road intrusion** — Mapbox Streets tilequery, motorway/trunk/primary counts
  plus street density within 700m.

**The formula** (`lib/setting-draft/formula.ts`) is style baseline — Links 72,
Heathland 64, Downland 62, Parkland 52, Pitch & Putt 40 — plus coast, relief and
designation bonuses, minus road intrusion, clamped **30-88** so the extremes stay
human. Drafts were generated by evaluating that exact module, so stored values
cannot drift from the code. Result clusters as intended: parkland 43/55/71,
links 68/79/88, pitch & putt 33/41/58 (min/median/max).

`score_source` is now composite — `Ranking · … | Setting · …` — so both
provenances survive, and the evidence line is readable per course.

Applied to prod (1,794) and dev (1,773, matched by name to avoid re-running
3,600 geo calls). All three axes are now populated; the Index spans **36-89**
across 54 distinct values.

**Known bias, flagged for review rather than hidden.** Geography systematically
favours the coast: **Sunningdale — ranked #2 in England by every source — sits
at #68 in the Index**, because heathland gets no coast bonus and the nearby
trunk roads trigger the intrusion penalty, even though you cannot hear them from
inside the course. Walton Heath, Swinley, Woodhall Spa and The Berkshire are all
similarly suppressed. The draft is doing what it was built to do; geography just
isn't the same thing as setting quality inland. Candidate fixes for the review
pass: raise the heathland baseline, soften or drop the road penalty, or add a
woodland/heath cover signal.

Verified `tsc` / `eslint` / `build`. No migration.

---

## 2026-08-18 — Ranking: three published top-100s become the second Index axis

The Ranking axis, and the last of the three to be filled. Decisions locked
with Tom question-by-question before any code.

**Three sources, each a vote** — Top100GolfCourses (100, already in the repo
for the curated importer), Golf Empire (100), Today's Golfer (200, the only
one reaching past 100). Stored as typed constants in `lib/ranking-import/`
alongside the existing `TOP100_ENGLAND`, so the import is reproducible,
diffable when the lists are republished, and needs no live scrape at runtime.

**NCG was dropped deliberately** — only 25 of its 100 render without
paginated fetches. Tom first merged Golf Empire into T100 (they share 14 of 16
courses across ranks 11-26, near-identical order) *and* skipped NCG, which
would have left two views; flagged the combined effect and he un-merged Golf
Empire instead. Three votes, no extra extraction. NCG can join later with no
change to `score.ts`. Worth noting for then: Golf Empire republishes NCG's
list at `/magazine-lists/national-club-golfer-england`, which may be a far
easier route in than NCG's own site.

**Scoring.** Rank → sub-score per source (concave: #1→100, #10→95, #50→85,
#100→79, #200→73), then a plain average of the sources a course appears in —
no corroboration bonus, so Ranking measures *position*, not breadth of
agreement. Within a club, **best rank wins**: Sunningdale takes the Old's #2
rather than being averaged down by the New, which matters because the
catalogue holds one row per club while the sources rank individual courses.
The **floor of 73 is load-bearing** — an unranked course carries null and its
weight redistributes, so a low floor would mean *being ranked* could drag a
course below where it would have sat unranked.

**Matching is automatic but conservative.** Reuses `curated-import/match.ts`
untouched. Only `auto`-confidence matches are applied; `ambiguous` and
unmatched rows are reported, never guessed — nobody reviews these row by row,
so a wrong match would silently set a course's Ranking. Trial run over the
live catalogue: **393 of 400 rows matched, 185 distinct courses, 7
exceptions** — and the 7 are real ambiguities (`YORK` ties between "York Golf
Club" and "The York Club"), not bad matches slipping through.

**Never overwrites hand-edits.** `score_source` carries a `Ranking ·` prefix
with the positions used (`Ranking · T100 #2 · GE #2 · TG #4`); anything with a
ranking set whose note isn't ours is skipped and counted. Limitation worth
knowing: `score_source` is one field shared across axes, so this is provenance
by convention rather than by schema — a dedicated column would need an iOS
migration.

Writes go through the existing `setCoursesScores`, reading age + setting back
and passing them through unchanged, because `admin_set_courses_scores` is
set-explicit and would otherwise clear them. One batch, one recompute.

**`IndexGuide` — the page now explains itself.** A "How the Index works" panel
covering all three axes: which of them Jack actually sets (only Setting), the
Age band table, the rank→score table, and a 0-100 rubric for Setting with
high/low descriptors. Deliberately explanatory against the dashboard's
no-helper-text rule — this is the one surface where the scoring model is the
subject, and a wrong score here moves every ranking in the app. `AgeBands`
became a plain table owned by the guide; `IndexMechanics` keeps only tuning.

Verified `tsc` / `eslint` / `build` + the trial match run. No migration.
**Not yet applied to prod** — the panel gates on preview → apply by design.

---

## 2026-08-18 — Every course ranked; the Age bands become readable in the Bunker

Tail end of the Age work: close the four gaps, then put the curve on screen
so Jack never has to ask what a number means.

**The last four courses.** Researched rather than guessed, and the two
outcomes were split:

- **Chichester Golf Club → 1990** and **Sherdons Golf Centre → 1992** are
  properly sourced, so the real founding year went into `established` and the
  curve derived Age from it as normal (44 / 43).
- **Ashton Court** (Bristol municipal) and **Lodmoor Pitch & Putt** (Weymouth
  country park) have no reliable founding date anywhere — the upstream source
  records Ashton Court as "built in 0", which is exactly where our junk `2`
  came from. `established` is therefore left **null** (it is a factual column
  and must not carry an invented year) while `heritage_score` is hand-set to
  **45** — a legitimate editorial override, which is what the axis is for.
  Both are stamped `score_source = "Age estimated - founding year unknown
  (modern municipal facility); confirm"` so they surface for confirmation.

**0 courses now unranked**, out of 1,794.

**The Age bands panel** (`vestige-index/AgeBands.tsx`, collapsible inside
Index mechanics) is a nine-row era table — The originals / Pre-boom /
Victorian pioneers / The great boom / Between the wars / Post-war / Modern
expansion / The nineties boom / Contemporary — against founding years and the
resulting Age score. The **score column is computed by calling
`ageFromYear()`**, not written out, so the table cannot drift from the curve
it documents; `AGE_BANDS` in `formula.ts` carries only the era labels. Copy
tells Jack the thing he actually needs: Age fills itself in, he only touches
it when the year misleads (modern course on a historic site, club that
moved), and the floor is 35 rather than 0.

Verified `tsc` / `eslint` / `build`, band values checked against the curve.
No migration.

---

## 2026-08-18 — Age becomes a derived number; ranking + setting take the lead

Second half of the Index rework. Age is the one axis the catalogue can
populate itself — **1,793 of 1,794 courses carry a founding year** — so it
gets derived rather than hand-scored, and its weight drops behind the two
axes that actually express quality.

**The bad rows, first.** Four courses had no usable year: three mis-parsed
OSM values (Ashton Court `2`, Sherdons Golf Centre `34`, Lodmoor Pitch &
Putt `200`) and one genuine gap (Chichester GC). The three junk values are
**nulled, not guessed** — a fabricated founding year is worse than a known
gap, and null falls back cleanly to ranking → tier seed. All four want a
real year from Jack.

**The curve.** Founding year → 0-100, anchored to eras, interpolated between:

    1766→100  1860→95  1890→85  1910→75  1940→62
    1970→52   1990→44  2010→38  2026→35

A straight line across the real span (1766 Royal Blackheath → 2024 The
Inspiration GC) was rejected on the data: the distribution is strongly
**bimodal** — 52% of courses from the 1880-1939 boom, 37% from 1970-1999,
an almost empty trough between, and only 16 courses before 1880. Linear
would hand one 18th-century outlier the top half of the scale and squash the
Victorian heartland onto the midpoint (1890 → 52). The **floor of 35 is
deliberate**: at a near-zero floor a 2018 course is mathematically barred
from a good Index no matter how it scores elsewhere.

Lives in `vestige-index/formula.ts` as `AGE_ANCHORS` + `ageFromYear()`. The
backfill SQL was **generated by evaluating that exact function**, not
hand-transcribed, so stored values cannot drift from code. Applied to prod
(1,790 scored, 4 null) and dev (1,773). Verified against real courses:
Royal Blackheath 1766→100, Royal Liverpool 1869→92, JCB 2018→37.

**Weights: age 0.20, ranking 0.40, setting 0.40** (Tom's call — ranking and
setting matter more than age). Age now carries half the weight of each of
the others, which is what stops a good modern course being capped by its
founding year.

Every Age value is derived, so `score_source` is stamped "Age derived from
founding year" wherever it was blank — provenance for when Jack starts
overriding individual courses.

**Expect a narrow Index for now**: 39-65 across the catalogue, because
ranking and setting are still empty and fall back to the tier seed, leaving
age to do nearly all the differentiating. The top 10 is currently pure age
order — which is also the clearest possible illustration of the open
problem: age rewards survival, not quality. That resolves as ranking and
setting get populated.

Verified `tsc` / `eslint` + live spot-checks. No migration; no build run
(pure constants + one pure function, and two full builds already ran today).

---

## 2026-08-18 — Vestige Index cut to three equal inputs: Age · Ranking · Setting

Tom + Jack's decision after walking through what each axis actually means
and what it would take to populate 1,773 courses: the 2026-08-16 five-input
model asks for more editorial judgement than the pipeline can feed. **Design
and pull are dropped from the blend**; the three that remain are renamed to
the vocabulary Jack will use — **heritage → Age**, **consensus → Ranking**,
**setting** unchanged — and weighted **equally** to start.

    index = clamp( round( (wA·age + wR·ranking + wS·setting) / Σw ), 0, 100 )

Nothing is lost in the cut: prod had **zero** design scores and `w_pull` was
already 0, so no editorial work was discarded.

**No migration.** The blend is weight-driven — `recompute_vestige_index()`
reads `w_*` off the `vestige_index_config` singleton and renormalises — so
retiring an input is a *config* change, not DDL. Set `w_design = 0`,
`w_pull = 0`, `w_setting = w_heritage = w_consensus = 0.33` and the retired
terms fall out of both numerator and denominator. Applied to **prod and dev**
(recomputed 1,794 / 1,773 courses). Verified after: standard tier now spans
48–53, short 40–45 — exactly seed + half the established-year bonus, which is
what a three-input blend with nothing hand-scored must produce.

**Naming bridge.** The DB columns keep their old names (a rename is an
iOS-repo migration, and `Vestige-ios` owns all schema — CLAUDE.md §4.3), so
the dashboard maps the vocabulary at the boundary and documents it in one
place, `vestige-index/formula.ts`: UI `age` = `heritage_score` / `w_heritage`,
`ranking` = `consensus_score` / `w_consensus`, `setting` = `setting_score`.
The established-year bonus now lands on an axis literally called Age, which
reads better than it did on "heritage". `setVestigeIndexWeights` **pins
`p_design` and `p_pull` to 0 on every Apply** rather than passing through
whatever the config row holds — that's the guard that stops a retired input
drifting back into the server-side blend, since the SQL still reads those
columns. Both score RPCs write `design_score = null`.

**Surfaces.** `formula.ts` rewritten (3 axes, `heritageBonus` → `ageBonus`,
`projectIndex` loses its now-unused rarity argument); `IndexMechanics` down to
three sliders + new formula line + worked example; `IndexTable` to three
score columns; `ScoreEditor` to three fields; `/vestige-index` sort options
become Index · Age · Ranking · Setting · Plays · Name. The county landing's
"N to rank" counter had keyed off `design_score is null` — now correctly
counts courses with **nothing** entered on any of the three.

Verified `tsc` / `eslint` / `build`, plus the live weight + index-spread
check above. Open question, deliberately deferred: how each number actually
gets sourced across 1,773 courses.

---

## 2026-08-16 — The Founder badge + the Obsidian tier

Tom's call: a badge for the two founders, in a rarity tier **above
Legendary** — ultra sleek, dark, moody. Design locked with Tom via the
colour/name pickers: bespoke **Obsidian** (his pick over the nine existing
theme families) — a graphite-black frame gradient (`#C7D0DB → #39434F →
#0B0F16`) whose signature is a **cold white-steel rim light** catching the
outer silhouette from the top-left; the tier is named **Obsidian** too.

**The badge.** Slug `founder` — name "Founder", tagline *"From the very
first marker."*, hexagon shape + hexagon glyph (the Vestige seal echo),
slate theme with a steel `tint_hex` (`#C7D0DB`), manual criteria, in a new
**founders** category, `display_priority` 1000. **Secret** — invisible in
the catalogue to anyone who hasn't earned it — and published. Granted to
the two founder accounts on prod (@tomhatesgolf, @tivs20) via
`_grant_badge_definition` (so both got the real badge-earned notification).

**Schema (iOS migration `20260816120000_founder_badge_obsidian_tier.sql`).**
Widens the `badge_definitions` tier + category CHECKs (add-only), inserts
the definition idempotently, grants guarded on user-row existence (dev has
no founder accounts — 0 grants there, by design). Probed with
`begin…rollback` first; applied to dev + prod; grants verified on prod
(2 rows, obsidian/founders/secret). Expand/contract-safe: live builds
decode unknown tiers/categories tolerantly (`?? .bronze` / `?? .collection`),
so stale builds render it modestly rather than crashing; the next iOS build
renders it properly.

**Renderers (both sides, kept in lockstep).** Obsidian rank 5; drawn rings
cap at `min(rank+1, 5)` so a sixth ring never crowds the glyph — the rim
light is the tier's signature instead; effect guardrail pins obsidian to
**glow** (steel aura — never the legendary rainbow); default shape hexagon.
iOS: `BadgeTier`/`BadgeCategory` cases + `VBadgeMedallion` rim light +
bespoke **ceremony dials** (darker room, longer hold, no aurora — the drama
is restraint). Web: `badges/types.ts` vocab + `BadgeMedallion` rim-light
gradient stroke + Founders category tile (hexagon icon) + hexagon glyph
mapping. Verified web `tsc`/`eslint` + iOS Debug build.

---

## 2026-08-16 — In-app previews resynced to the shipping iOS screens

The editor previews had drifted a full design generation behind the app
(they mirrored the 2026-06-27 iOS templates). Re-derived each from the
current SwiftUI source and rebuilt:

**Course preview (`CoursePreview.tsx` ← `CourseDetailSheet`).** The old
"peek block with mint Par hero + glass detail/About cards" layout is gone
from the app. Today's sheet: full-bleed 200pt hero with **no scrim**
(grabber + camera button overlays; "Add the first photo" empty state),
county eyebrow with an **Unplayed** pill, course name beside the **Vestige
Index as a 44pt mint→lime gradient numeral top-right** (fallback ladder
index → par → holes), a "Log a round" gradient CTA with mint under-glow +
two glass icon buttons, then flat hairline-separated sections — Details
2-up facts grid (yardage/style/par/established only; hole count, tier and
layout deliberately absent), About (prose + "Featured on N curated lists"
star line), Your rounds empty state, and the Mapbox attribution capsule.
New props `vestigeIndex` + `curatedListCount` (from `row`); dead `tier` /
`layout` props dropped.

**Curated list preview (`CuratedPreview.tsx` ← `CuratedListDetailView`).**
The app moved to a magazine masthead: cover **melts out via an alpha mask**
with no text on the photo (title/pills-on-hero is gone), floating glass
back/share chrome, centred masthead (hexagon **VESTIGE seal pill** →
Manrope title → CURATED RANKING/LIST kicker), centred editorial intro
(bio, else summary), a **progress ring row** ("0 of N played" +
region·tags line), then **raised cards** per course — name + big mint rank
numeral, hairline, the editor note as a centred italic pull-quote in curly
quotes (with the app's exact 6-string deterministic filler when empty),
county + a TO PLAY pill. The old stat strip / tier pill / row-list layout
was already retired app-side and is gone here too.

**Announcement pop-up (`AnnouncementEditor` PreviewCard ←
`AnnouncementCardView`).** Scrim corrected to flat 55% black (was a radial),
card to SurfaceGlass (72% `#0E1826`, 12% border, blur, radius-24 scale),
hero moved *inside* the content padding at 16:9/radius-14 scale, highlights
to filled check-circles with primary-colour text, CTA to the 52pt capsule
with mint under-glow. The dismiss-link rule was already right (no action →
dismiss label becomes the gradient CTA).

All three re-derived from the live Swift files, not the old previews.
Verified `tsc`/`eslint`/`build`; visuals are login-gated — Tom to eyeball.

---

## 2026-08-16 — Vestige Index rework: rarity out, editorial axes in

Tom called the rework: rarity — half of the original blend — can't work at
beta/launch user counts. With a handful of users the play-count spread is
noise, and the bootstrap state actively inverted scores (unplayed courses
drifting to ~58, played ones to ~43, the long-flagged "obscurity rewards"
trap). Locked in a design session with Tom before building:

**The new model.** The Index is now a weighted blend of per-course
sub-scores, whole numbers on an honest full 0–100 spread:

```
index = clamp( round( (wD·design + wS·setting + wH·heritage
                        + wC·consensus + wP·pull) / Σw ), 0, 100 )
```

- **Design / Setting / Heritage** — the three hand-scored editorial axes
  (the golf itself; the land + sense of place; age/architect/pedigree).
  Three judgments per course is the deliberate workload ceiling for ~1,150
  courses — more axes would echo axis 1 without adding information.
- **Consensus** — encoded external top-100 ranking positions (0–100).
  Doubles as the pre-seed for the editorial pass; when a course has no
  external ranking its weight redistributes (drops out of numerator and
  denominator both).
- **Pull** — the live slot (play demand, `100 − rarity`, neutral 50),
  weighted **0** at launch and dialled up when the user base is real: the
  "live index that breathes" story kept honest. List demand + photo volume
  are flagged candidates to fold in later.
- **Seeds** — unscored axes fall back axis → consensus → an objective-facts
  tier seed (championship 60 / standard 48 / short 40 / par3 32; the
  heritage seed gains +10 pre-1900, +5 pre-1946), so the unscored long tail
  reads sensibly instead of flat-50. Courses with no hand scores wear a
  provisional "Seed" chip.
- **Weights** — tunable config (default 0.45 / 0.25 / 0.15 / 0.15 / 0),
  renormalised at compute.

**Schema (iOS migration `20260816100000_vestige_index_rework.sql`).** Four
nullable score columns + `score_source` on `courses`; five `w_*` columns on
`vestige_index_config` (`rarity_swing` stays as ignored legacy); rewritten
`recompute_vestige_index()` — same signature, and it **still computes
`play_count` + `vestige_rarity` exactly as before**, because the live iOS
app reads both (CourseDTO, Scout signals): rarity is only decoupled from the
index, never dropped. New self-gating admin RPCs: `admin_set_course_scores`,
`admin_set_courses_scores(jsonb)` (batch, one recompute — the
`admin_set_courses_prestige` pattern), `admin_set_vestige_index_weights`.
Prestige columns + RPCs left intact as legacy. Fully additive /
expand-contract-safe. Verified with a `begin…rollback` probe first
(90/85/95/88 at default weights → 89, exact), then **applied to dev and
prod same-day at Tom's explicit request** (dry-run showed it as the only
pending migration; hold list empty; CLI relinked to dev after). Post-apply
distribution on both: standard tier 48–50, short 40–42 — the seeds, as
designed; the inverted rarity spread is gone.

**Bunker rework.** `formula.ts` mirrors the new blend exactly (weights,
seeds, consensus redistribution, pull) for live projection. `/vestige-index`:
the batch editor (`IndexTable`) now stages all four axis scores per row
(blank = unscored) with dirty pips, live projected Index, a "Seed"
provisional chip, and one batch commit; `IndexMechanics` swaps the rarity
slider for five bound slider+numeric weight controls (normalised % readout,
Σ guard, confirm-recompute) with the formula written out and a live worked
example; county landing "N to rank" now means "no hand-scored axes yet"
(was "prestige still 50"); sort gains Design/Consensus (Prestige removed).
Course detail: `PrestigeEditor` → `ScoreEditor` (`git mv`) — four axis
fields + source with the same debounced autosave, seed-aware breakdown
line. `courses/actions.ts`: `setCourseScores` / `setCoursesScores` /
`setVestigeIndexWeights` replace the prestige/swing actions; recompute
kept. `courses/types.ts` swaps prestige fields for the score columns
(list page + import lib untouched — they have their own row types).

Verified `tsc` / `eslint` / one `next build` (all clean; `/vestige-index`
registered). Live UI is behind the admin login — Tom to eyeball on Vercel.

### What this does not commit to

No consensus source list yet — which rankings count and the rank→0–100
encoding is a Jack+Tom decision before the scoring pass starts. No pull
composition beyond play data. No iOS client change (the app keeps reading
`vestige_index` + `vestige_rarity` untouched — it just gets better values
when scoring starts). The editorial scoring pass itself hasn't begun:
every course currently reads its provisional tier seed.

---

## 2026-08-12 — Bulk course import for curated lists

Jack had England's Top 100 lined up (ranked, from top100golfcourses.com) but
adding 100 courses one at a time through `CoursePicker`'s search would have
been brutal. New `BulkImportPanel` (`curated/[id]/BulkImportPanel.tsx`) sits
below the course list on the curated-list editor: paste a ranked CSV/
plain-text list, or one click **"Use England's Top 100"** (pre-seeded from
`lib/curated-import/top100-england.ts`), and it fuzzy-matches every name
against the live `courses` catalogue.

**Matching (`lib/curated-import/match.ts`)** is a light token-overlap
heuristic, not a fuzzy-match dependency — it only has to rank candidates well
enough for an admin to eyeball, since nothing writes until confirmed. Course
names get extra weight for a parenthetical variant ("(Old)", "(New)", "(Red &
Blue)"...), since that's usually the only thing distinguishing sibling
courses at one club (the two Sunningdale courses, three Woburn courses,
Walton Heath Old/New, etc.); location text gets a smaller bonus toward the
matching county.

**Review, then commit.** The panel renders every input row with a confidence
badge (matched / check this one / no match) and an editable dropdown of the
top 5 candidates, defaulting to the best guess. Rows already on the list are
detected and skipped. Confirming calls two new read/write-split
`curated/actions.ts` server actions: `matchCoursesForImport` (read-only,
paginates the full catalogue in 1,000-row pages since PostgREST caps a single
request) and `bulkAddMatchedCourses` (one batched `upsert` into
`curated_list_courses`, same `onConflict` shape as the existing
`reorderCourses` — idempotent, safe to re-run).

Deliberately generic, not England's-Top-100-specific — the paste path works
for any future ranked list, the bundled data is just a one-click shortcut for
this one. The source `top100_england_golf_courses.csv`/`.json` (the raw
scrape) are kept local and untracked, not committed — the ranked data ships
baked into `top100-england.ts` instead, so no third-party scrape sits in the
repo.

No schema/migration change — reads/writes existing `courses` +
`curated_list_courses`. Verified `tsc`/`eslint`/`build` clean; UI is
login-gated, not headlessly tested.

---

## 2026-08-04 — Course import goes insert-only; expired-token diagnosis

Jack hit two problems on `/courses/import`. First, the "pull" button failed
with `Couldn't read Pinehollow-Studios/vestige-tool@main (401 Unauthorized)`.
Second — the sharper one — an apply **overwrote course details he'd edited in
the Bunker** (par, yardage, description…), because the import was a full
upsert: every source row was re-written over the live row on `legacy_fid`
conflict, exactly as the ported CLI did.

**Insert-only import (`lib/courses-import/import.ts`, rewritten).** The pull
now only *adds*: counties, clubs, and courses already in the DB (matched by
`slug` / `legacy_fid`) are never modified. Each stage reads the existing key
set, filters the source to genuinely-new rows, and plain-`insert`s those —
no `upsert`, no conflict clause. Bunker edits to existing courses now survive
every pull, and polygon/detail changes to *existing* courses in vestige-tool
no longer propagate (accepted trade-off; flagged to Tom). Club rows are
deduped by fid before insert (safe under insert where upsert was forgiving).

**One deliberate exception — centre backfill.** 190 of 1,651 prod courses
still had a NULL `center_lat` (the 2026-06-27 MultiPolygon centroid fix
expected "the next apply" to backfill them, and strict insert-only would have
forfeited that forever). `backfillMissingCenters()` fills `center_lat/lng`
from the source centroid **only where the live value is NULL** (guarded again
with `.is("center_lat", null)` at write time), so it can never override
anything an admin set.

**Follow-through.** `ImportResult` renamed to `countiesAdded` / `clubsAdded` /
`coursesAdded` + `centersBackfilled` (the `dataset_imports` audit columns keep
their historical `_upserted` names but now record adds). Preview's
`updatedCourses` → `skippedCourses`; the console's "refreshed" stat became
"already in app", and the confirm dialog + empty state now say plainly that
existing courses are never touched.

**The 401.** Both `GITHUB_CONTENT_TOKEN` (38d old, takes precedence) and
`GITHUB_DISPATCH_TOKEN` (59d) are *sensitive* Vercel vars (pull back empty, so
not directly testable), but 401 = GitHub rejected the credential itself —
an expired/revoked fine-grained PAT, which fits a 30-day expiry lapsing.
Fix is a Tom-action re-mint (Contents:read on
`Pinehollow-Studios/vestige-tool`) + Vercel env update; code can't help, but
`source.ts` errors now append a `statusHint()` — 401 says "token expired,
mint a new PAT", 403/404 says "token valid but can't see the repo" — so the
next lapse self-diagnoses on screen.

Verified `tsc` + `eslint` clean (build skipped per the light-verify rule; the
surface is login-gated and the GitHub side is down until the token is
re-minted anyway). No schema change; `dataset_imports` semantics shift only.

---

## 2026-07-13 — Crash severity ranking + plain-English translation; email alerts replace Discord

Crash reports came through in raw Sentry jargon (`EXC_BAD_ACCESS: Exception 1,
Code 2`, `WatchdogTermination`, `App Hanging for 2000 ms`), delivered to Discord
+ the Bunker. Tom wanted three things: an at-a-glance **severity** so he can
instantly judge how bad a crash is, **plain English** instead of jargon, and the
notifications moved off Discord onto **email**. "Building something real, not
random technical jargon messages."

Sentry can route (Discord/email) but will never rewrite the language or apply a
Vestige-tuned severity — so we own that. Since we already own the whole pipeline
(`sentry-webhook` → `crash_reports` → this dashboard, plus Resend), we translate
once and both surfaces read the same result.

**Classifier — `src/lib/crashes/severity.ts` (canonical).** A curated
signature→meaning map (not AI: crashes cluster into a handful of shapes, so a
deterministic map is instant, free, predictable). `classifyCrash()` returns a
**severity band** + short **category** + one plain-English **summary**. Severity
is driven by what the *user experienced*, not the error class:
- 🔴 **Critical** — app crashed and the session died (EXC_BAD_ACCESS, NSException,
  main-thread violations, fatal errors, force-unwraps).
- 🟠 **High** — app froze or was force-killed (WatchdogTermination, OOM).
- 🟡 **Medium** — recovered but degraded (short hangs, caught data-layer errors).
- ⚪ **Low / Noise** — handled or not-really-a-bug (cancellations, offline blips,
  WeatherKit/external). Deliberately demoted, *matched before* the broad "fatal"
  rules, so genuine noise doesn't crowd the queue. First matching rule wins;
  unmatched falls back to Sentry `level`. `friendlyLocation()` prettifies the
  culprit into a screen name. Computed at **render** time (no migration, instant
  re-tuning, never stale).

**Bunker rendering.** The queue (`/crashes`) leads each card with the severity
badge + category + plain summary; the raw signature is demoted to a muted mono
line; a severity-count strip sits on top and the page sorts most-severe-first.
The detail page (`/crashes/[id]`) gets a coloured severity hero (badge + summary
+ screen) above a de-emphasised "Technical signature" block; the raw Sentry stack
trace stays below, unchanged.

**Email (Critical + High only) — mirrored into `Vestige-ios`.** The same ruleset
is ported into the `sentry-webhook` Edge Function, which after a successful ingest
classifies the event and, for Critical/High, sends a clean Resend email (severity
badge, summary, screen/release/device, "View in the Bunker" deep-link, raw
signature in the footer) to tom@ + jack@pinehollow.studio. Best-effort — a Resend
failure logs but never fails the ingest. Reuses the project-wide `RESEND_API_KEY`
/ `CAMPAIGN_FROM`; recipients via a `CRASH_ALERT_TO` secret. **The rule list is
duplicated in two runtimes (this dashboard's TS + the Deno function) — keep them
in sync.** Deployed to prod + end-to-end verified (a synthetic Critical event
flowed Sentry→webhook→`crash_reports`→email in ~15s).

**Discord off.** The two Sentry Discord alert rules (`Discord: new issue`,
`fairways-ios`) were deleted (Sentry's API has no clean per-rule disable). The
`Pipe to Supabase (prod)` bridge rule is untouched. (Sentry's native
"high priority issues" email rule was left as-is, flagged to Tom — it re-sends
jargon and may want removing too.)

Presentation + one Edge Function; no schema/migration in this repo. Verified
`tsc`/`eslint` clean.

## 2026-07-13 — Individual email log + per-message view (Resend "Emails" parity)

Tom wanted the other half of Resend's structure: not just the per-campaign
("Broadcasts") aggregate, but a flat **Emails** log of every individual message
you click into for its own history. Built off Resend's dashboard model (a list
filterable by status → a detail page with metadata + an event timeline +
Preview/HTML/Raw content tabs).

Key realisation from prod data: `email_events` is the superset of ALL email —
the `resend-webhook` records events for every email on the account (auth
magic-links, welcome, waitlist, AND campaigns), so prod had 50 events but only 1
campaign recipient. So the log is **event-driven, not campaign-driven**: keyed on
the Resend email id, enriched from `email_campaign_recipients` + `email_campaigns`
when it's a campaign send, otherwise falling back to the recipient/subject/from
carried in the event `meta` (captured since today's webhook change — older events
have empty meta and render "—").

**iOS migration `20260713110000_email_message_log.sql`** (additive):
- `admin_email_log(status, search, limit, offset)` — one row per individual email
  across everything, with last event + engagement flags + `is_campaign`,
  filterable + paginated (total via `count() over()`), keys = `email_events ∪
  email_campaign_recipients` so just-sent campaign emails appear before their
  first webhook lands.
- `admin_email_message(resend_id)` — full header (from/to/subject) + campaign
  `html` (campaigns only) + rollup for one email; works for transactional ids too.

**Bunker:**
- **`/emails/log`** — the flat Emails list: status filter tabs (All / Delivered /
  Opened / Clicked / Bounced / Complained / Failed), search, pagination, status
  chip + engagement per row, click-through. Shared `lib/email/status.ts` (Resend
  event vocabulary → label + tone).
- **`/emails/message/[resendId]`** — the per-email page: metadata card, a vertical
  **event timeline** (delivered/opened/clicked/bounced with device/link/reason
  detail), and **Preview / HTML / Raw** content tabs (`EmailContentTabs`, Preview
  in a sandboxed `srcdoc` iframe with the send-time token substitution).
- Linked from the `/emails` header ("Emails") + each campaign recipient row
  (open-in-full icon → the message page).

Migration applied to prod + dev (idempotent); log validated over real prod data
(51 rows: 50 transactional + 1 campaign). Verified `tsc` / `eslint` / `build`.

## 2026-07-13 — Email analytics parity (make The Bunker the email centre)

Tom + Jack were still reaching for the Resend dashboard because the bunker's
email surface was blind past "we handed it off." The delivery-analytics *spine*
already existed (2026-07-12: `resend-webhook` → `email_events` +
`admin_email_campaign_funnel`), but it (a) **threw away Resend's payload** — the
webhook passed `p_meta: {}`, discarding every bounce reason / open device / click
link — and (b) surfaced only an aggregate funnel: no per-recipient view, no
per-user history, no suppression, no reasons. This slice closes the gap to full
Resend parity so the bunker is strictly better (joined to the Vestige user, never
ages out of a retention window).

**Paired iOS migration `20260713100000_email_analytics_parity.sql`** (additive):
- **`email_suppressions`** — hard bounces + spam complaints recorded and skipped
  on future sends, kept DISTINCT from `users.email_marketing_opt_out` (a bounce
  isn't a user choice). RLS `is_admin()`. `_begin_email_campaign_send` re-created
  to anti-join it at materialise time.
- **`record_email_event` enriched** — same signature (the webhook already calls
  it), now stores the full event payload and, on a *permanent* bounce (soft =
  recorded not suppressed) or a complaint, writes a suppression row (resolving the
  recipient email by `resend_id`).
- **`admin_email_campaign_recipients` widened** from the send-only 8-col shape to
  a per-recipient rollup over `email_events` (delivered / opened ×N / clicked ×N /
  bounced + reason / complained). New `admin_user_email_history` (per user) +
  `admin_email_recipient_events` (raw drill-down timeline).

**iOS `resend-webhook`** — one-line-but-highest-leverage: passes `event.data` as
`meta` instead of `{}`. Redeployed to prod (`--no-verify-jwt`).

**Bunker (this repo):**
- **Campaign page** — delivery/open/click/bounce/complaint **rate stats** + a
  filterable **recipient table** (`RecipientTable`: opened / not-opened / clicked
  / bounced / complained / failed, searchable) with an expandable per-recipient
  **event timeline** (`admin_email_recipient_events`), plus a **"Reconcile from
  Resend"** backfill (`backfillCampaignEvents` — gated on a bunker `RESEND_API_KEY`
  env; Resend's API only exposes `last_event`, so backfill is terminal-state only,
  clearly noted).
- **`/users/[id]`** — an **Email history** card (`admin_user_email_history` via the
  session client, since the RPC self-gates on `is_admin()`).
- **`/analytics`** — an **"Email delivery · 30d"** strip (`getMessageOverview`,
  direct service-role reads of `email_events` + `email_suppressions`).
- **`/emails/suppressions`** — view + remove suppressed addresses (reads via
  service-role, deletes via the session client through the table's `is_admin()`
  RLS). Linked from the `/emails` header + the analytics "Suppressed" tile.

Migration applied directly to prod + dev (surgical `db query -f`, idempotent — the
migration-history row isn't recorded, so a later `db push` re-applies harmlessly).
Suppression + rollup functionally tested on dev (hard-bounce suppresses, soft
doesn't, opens counted, bounce reason captured). Verified `tsc` / `eslint` /
`build`. Forward-only: events already in prod stay meta-empty; capture is full
from the redeploy on.

## 2026-07-11 — QuickCreate refresh + Index mechanics collapsed

- **TopBar "New" up to date.** `QuickCreate` gained the newer create surfaces
  and is now lightly grouped — **Messaging** (Email, Notification, Announcement)
  + **Editorial** (Curated list, Badge, Version). Was missing Email/Notification
  entirely.
- **Index mechanics shrunk.** We're stepping back from the rarity-swing calc for
  now (too few users for rarity to behave), so `IndexMechanics` is now a compact
  one-row disclosure (collapsed by default: icon + "Index mechanics · rarity
  swing ±X%" + Recompute), expanding to the full formula/slider/example only on
  click — instead of a big control block at the top of `/vestige-index`.
Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Pro-console polish, phase 2c: stat tiles, headers, density

Finishing the safe structural consolidation.
- **One stat tile.** New `components/admin/StatTile.tsx` (label + tabular
  numeral, optional `href`/`active`/`tone`, thousands-formatted) replaces three
  near-identical local `StatTile`s (users, safeguarding, photos). `StatsStrip`
  stays as the animated count-up strip for the overview.
- **More empty states + one header.** Folded the crashes `EmptyQueue` onto the
  shared `EmptyState`; the Overview page's hand-rolled header now uses the shared
  `SectionHeader` like every other screen.
- **Table density.** `DataTable` body rows `py-2.5 → py-2` to match the header and
  read denser (courses / announcements / badges).
Deliberately NOT done (behavior risk / already-consistent / needs eyes-on):
toolbar *mechanism* unification (visuals already share `glass-panel`), the
inline error-note blocks (already identical, tag-swap risk), and aggressive
row-height/spacing density tuning. Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Pro-console polish, phase 2b: tabs, eyebrows, empty states

Three cross-cutting consistency fixes the audit flagged.
- **One tab visual.** New `components/admin/Tabs.tsx` (`TAB_LIST_CLASS` +
  `tabItemClass` + `TabLink`) is the single underline-tab look; `PageTabs`
  (state), the feedback queue `ViewTabs` (links), and the analytics `AnalyticsNav`
  (links) all render it now — no more pill-vs-underline split across surfaces.
- **One eyebrow taxonomy.** Every page's `SectionHeader` eyebrow was its own
  phrase ("Queues · review", "People & safety · Users", "Advanced", "Promotion",
  "Insights · Analytics"). Normalised to the two nav groups — **Editorial** /
  **Operations** — matching the sidebar (contextual `· suffix` on scoped detail
  views kept). Also moved Changelog's eyebrow Editorial→Operations to match its
  group.
- **One empty state.** Folded four near-identical local `EmptyState` components
  (changelog, announcements, users, safeguarding) onto the shared
  `admin/EmptyState`.
Presentation only. Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Pro-console polish, phase 2a: one page container + rhythm

Killed the per-page layout drift the audit surfaced — five different max-widths
(`max-w-2xl…6xl`) and five different vertical rhythms (`space-y-4…8`) hand-rolled
across ~30 screens. New `components/admin/PageShell.tsx` is the single container:
a small width vocabulary (**narrow** 3xl · **content** 5xl · **wide** 6xl ·
**full**) and **one rhythm** (`space-y-6`) for every screen. Exposed both as a
`<PageShell>` component and a `pageShell(width)` className recipe. Swept every
top-level sidebar page + the detail/editor pages onto it (widths mapped from
their old values so nothing jumps: 6xl→wide, 5xl/4xl→content, 3xl/2xl→narrow),
so the whole tool now shares one column width per screen-type and one gap.
(Analytics keeps its own `Shell`, and feedback its bespoke full-height two-pane,
for now.) Presentation only. Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Pro-console polish, phase 1: keyboard-first shell

Research-informed pass (Linear / Retool / Notion internal-tool patterns) to make
The Bunker feel like the terminal Jack runs all his Vestige work from. Focused on
the shared frame + interaction model every page inherits, not per-page rewrites.

- **Keyboard-first spine.** New `KeyboardShortcuts` (mounted once in the shell)
  adds Linear-style **`g` then a key** go-to navigation (o/f/e/n/c/l/b/a/p/s/u,
  documented in `lib/nav-shortcuts.ts`), a **`?` shortcuts overlay**, and records
  visited sections for "Recent". Always-visible **`:focus-visible` mint ring** so
  tabbing shows where you are.
- **Command palette elevated** (`CommandPalette`): a **Recent** group (from
  localStorage), a **Create** group (New email / New notification, straight into
  the editor from anywhere), and a `?`-shortcuts hint in the footer.
- **Breadcrumb fixed** (`PageContext`): section label now derives from the nav
  (single source of truth — no more stale "Dashboard" for emails/notifications/
  index/societies), links back to the section, and shows a friendly detail label
  (New / Import / Detail) instead of a literal "Detail".
- **Craft tokens** in `globals.css`: keyboard focus rings + thin, quiet
  scrollbars (instrument, not a document).
- **Shared primitives + robustness**: new `ui/kbd.tsx` (`Kbd`/`KbdChord`),
  `admin/EmptyState.tsx` (canonical empty state), and dashboard-wide `error.tsx`
  + `not-found.tsx` (no blank screens). Fixed a double-encoded `People &amp; safety`
  eyebrow on Users/Safeguarding.

Follow-ups (phase 2, tracked): adopt `EmptyState` + a shared page container
across all routes, unify the three tab/toolbar patterns, per-page density passes.
Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Hand-picked email recipients: roster picker with addresses

The search-only individuals picker felt janky for email — you couldn't see who
you were sending to. Replaced it (in the shared `AudiencePicker`) with a proper
roster browser: a scrollable list of the **whole user base**, live-filterable by
name / username / email, with per-row selection feedback (brand-tinted row +
check), avatars/initials, a live "N selected" count, a removable selected-chips
summary that stays visible while filtering, and — for email — **each user's
address shown inline** so it feels solid. New server-only `lib/users/roster.ts`
`listPickerUsers({ withEmail })` loads `public.users` via the service role and
merges each address from `auth.users` (GoTrue admin API); the email editor loads
it once and passes it in. Small user base, so the full roster loads up front
(pagination is a later concern). The notifications/announcements editors keep
their existing pickers for now (push doesn't need addresses). Verified
`tsc` / `eslint` / `build`.

## 2026-07-11 — Notifications page: same tabs + one-click treatment

Applied the emails-page rework to `/notifications` and factored the tab surface
into a shared `components/admin/PageTabs.tsx` (used by both pages, so they can't
drift). Two tabs split the page's two jobs: **"Notifications you send"**
(compose/queue/send pushes) and **"Automatic notifications"** (the
`SystemNotificationsSection` template editor for the notifications that fire
themselves). New `ComposeBroadcastButton` + `createDraftBroadcast()` give the
one-click "New notification" → straight-into-editor flow (no title prompt); the
broadcast list moved into a `BroadcastsSection` (list / empty-state CTA / inline
error, always rendering the compose button). Removed `NewBroadcastButton`;
refactored the emails page onto `PageTabs` too (deleted the emails-only
`EmailsTabs`). Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Emails page rework: tabs + one-click compose

Same-day follow-up after the first cut buried the compose action (the campaigns
list sat above the transactional-template editor, its "+ New campaign" button
tucked in a header row, and the whole section was hidden entirely if the
overview RPC errored — so it read as "nowhere to write a new email").

- **Two tabs** (`EmailsTabs`) split the page's two distinct jobs: **"Emails you
  send"** (compose/queue/send) and **"Automatic emails"** (edit the wording of
  the system emails that send themselves). Inactive content stays mounted
  (`hidden`) so the template editor keeps in-progress edits across a tab switch.
- **One-click compose** — `ComposeEmailButton` + a new `createDraftEmail()`
  action create a draft named "Untitled email" and drop you straight into the
  editor (renameable there). No up-front "internal name" gate. The button rides
  in the tab bar on the send tab, so writing an email is always one obvious
  click; the empty state carries its own "Write an email" CTA.
- **Robust to load errors** — the send tab (and its compose button) now always
  render; a failed overview load shows an inline error instead of hiding the
  whole surface. The "Automatic emails" tab gained a one-line intro clarifying
  those can't be sent by hand.

Removed `NewCampaignButton`. Verified `tsc` / `eslint` / `build`.

## 2026-07-11 — Email campaigns: send + queue emails to users

Jack can already compose/queue/send **push notifications** from
`/notifications`; `/emails` only let him edit the seven transactional
templates. This slice adds the missing half — composing a one-off **email**
and sending it to a targeted audience — as the email sibling of the
push-broadcast system, one layer down (Resend instead of APNs). Decisions
locked with Tom before building: full marketing build (proper consent +
working unsubscribe, not transactional-only) and a per-recipient delivery
log (bounce/dedupe/resend visibility).

**Schema + delivery (`Vestige-ios`, two migrations + two Edge Functions).**

- `20260711100000_email_marketing_consent.sql` — `users.email_marketing_opt_out`
  (opt-out model, mirrors `analytics_opt_out`), `get/set_email_marketing_opt_out`
  RPCs for a future iOS Settings toggle, and `unsubscribe_email(uuid)`
  (service_role only). Unsubscribe is a **signed link** — no per-user token
  column — verified by HMAC over the user id with a shared secret.
- `20260711110000_email_campaigns.sql` — a near-verbatim clone of the
  `admin_broadcasts` system: `email_campaigns` (+ `preheader`,
  `bypass_marketing_consent` — the email analogue of `is_critical`, for
  service mail), `email_campaign_targets` (individuals), and the
  **per-recipient log** `email_campaign_recipients` (email, status, resend_id,
  error). Targeting resolver `email_campaign_targets_user` is the broadcast
  resolver plus the marketing-consent gate; a send materialises one 'pending'
  recipient row per targeted+consenting user (address captured from
  `auth.users` at send time), then fires ONE pg_net POST to the Edge Function
  (`_email_campaign_fanout`, a clone of `_push_fanout`). Full RPC set
  (`admin_send/schedule/cancel/overview/recipients`, `set_..._targets`) +
  a per-minute pg_cron scheduler, all cloned from broadcasts.
- **Why delivery differs from push:** push fans out entirely in Postgres;
  email can't (Resend rate limits + batch API + bounce semantics). So a
  single fan-out hands the campaign to a new `send-email-campaign` Edge
  Function that service-role-loads the pending rows, renders per recipient
  (`{{first_name}}`, a signed `{{unsubscribe_url}}`), batches to
  `api.resend.com/emails/batch` (100/call, paced under the rate limit, each
  email carrying `List-Unsubscribe` headers), writes each row's outcome, rolls
  `sent_count`/`failed_count`, and flips the campaign to 'sent'. Idempotent on
  'pending', so a re-trigger after a no-op resumes rather than double-sends.
  A public `unsubscribe` Edge Function (HMAC-verified GET + RFC 8058 one-click
  POST) flips the opt-out and renders a branded confirmation. Both registered
  `verify_jwt = false` in `config.toml` (shared-secret / HMAC auth, no user JWT).
- **Graceful degradation:** until the vault rows + `RESEND_API_KEY` /
  `EMAIL_UNSUBSCRIBE_SECRET` / `CAMPAIGN_FROM` secrets land (Tom-action,
  documented in the migration header), a send queues recipient rows but the
  fan-out no-ops — nothing leaves — exactly the push posture. Migrations reach
  prod via the iOS `prod-deploy` action; a real Resend send + unsubscribe
  round-trip is a Tom-action once the secrets are set.

**Dashboard (`vestige-bunker`).** A "Campaigns you send" section on `/emails`
above the transactional template editor (mirroring `/notifications`), a
campaign card + "New campaign" button + empty state, and a
`/emails/campaigns/[id]` editor: compose (internal name, subject, preheader,
HTML with the same live-preview iframe the template editor uses, plus an
optional "start from a template"), a **Service message — bypasses unsubscribe**
toggle, send-now / schedule / cancel, and a lazy-loaded per-recipient delivery
log. New server actions in `campaigns/actions.ts` mirror the broadcast ones.
The audience/targeting UI was **extracted from `BroadcastEditor` into a shared
`components/admin/AudiencePicker.tsx`** (parameterised so each surface injects
its own persist + search actions) — the email editor uses it now; migrating the
broadcast editor onto it is a noted follow-up to close the duplication. No
sidebar change (Emails already routes here); no `/sync` entity (campaigns are
prod operational data). Verified `tsc` / `eslint` / `build` clean; the gated
compose→send UI walk-through is Tom-to-eyeball.

---

## 2026-07-06 — Design-system pass: fonts + palette + atmosphere to spec

Full brand-alignment sweep bringing The Bunker up to the canonical Vestige
design system (`Vestige Design System/DESIGN-SYSTEM.md`, extracted from the
live iOS codebase 2026-07-06). The dashboard is fully token-driven, so the
fix lands centrally in `globals.css` + `layout.tsx` and propagates to every
page; a small sweep then corrects the hand-tuned iOS-preview mockups.

- **Fonts → Manrope, everywhere.** Dropped Inter (UI) and DM Sans (headings)
  — the spec forbids substituting a third typeface and mandates Manrope as
  the single brand face for all web display *and* UI (§7). One `next/font`
  Manrope instance now feeds `--font-display`; `globals.css` aliases
  `--font-sans` / `--font-heading` / `--font-hero` to it, so every surface
  (rows, headings, hero numerals, the wordmark) renders Manrope. JetBrains
  Mono is retained only for tabular technical readouts (kbd chips, status
  lines), not as a text face.
- **Colour tokens → canonical values (§4).** Corrected the surface/ink/brand
  set that had drifted: `Surface #070A10` (was `#0E1822`), `SurfaceRaised
  #0C1220` (was `#131F2B`), `SurfaceSunken #0A1626`; ink `#F2EFE6` /
  secondary `#9DA9B6` / tertiary `#66717E`; `OnAccent #06231C` (was
  `#0A1A22`); `Border` hairline at 12%. Added the missing tokens the spec
  calls for — `--brand-ink` (AccentInk), `--accent-soft`, `--on-bucket`, the
  atmosphere trio, the sea/county-completion ramp, and the elevation-shadow
  colours — and exposed the useful ones as Tailwind utilities. Swapped the
  off-palette "sand" chart stop for ocean `Sea3`.
- **Atmosphere → blue (§6).** Replaced the off-spec **mint** body glow — a
  direct violation of "mint never appears in the atmosphere" — with the
  design system's blue three-layer atmosphere (top glow + floor wash +
  vignette), the blue soul of every Vestige canvas. Vignette dialled back
  from the phone spec (0.55 → 0.42) for a wide, edge-to-edge data tool.
  Calmed `.surface-aurora` from two competing accents (mint + saturated
  info-blue) to a single mint hero moment over the blue atmosphere tone.
- **Preview + BrandMark sweep.** Brought the hand-tuned hardcoded hex in the
  iOS-preview mockups (announcements, badges, notifications) and the login
  `BrandMark` up to spec surface/ink/OnAccent values so they mirror the real
  app. Left correct brand gradient stops and badge duotone theme palettes
  untouched.
- No schema/data/deps change — presentation only. Verified `tsc` + `eslint`
  + `next build` clean.

## 2026-07-02 — Badge "Sigil" renderer + six-axis authoring

The badge preview and editor moved from the June **engraved-seal** look (tier
rim only; theme/shape/effect ignored) to the shared **"Sigil"** system — a flat,
graphic emblem driven by all six axes. One spec drives both this dashboard and
the iOS app: `Vestige-Badge-Sigil-Export/badge-spec.json`, matched
pixel-for-pixel with iOS `BadgeMedallion.swift`.

- `components/badges/BadgeMedallion.tsx` — rewritten as the Sigil SVG: a duotone
  `theme` fill, concentric `tier` rings (ring count = tier index + 1), a
  tier-climbing `shape` (coin → seal → shield → hexagon → rosette), an `effect`
  glow (guardrail-auto-corrected to tier; legendary is always holographic + a
  spectral radial burst), and the glyph in the theme colour. Same component
  props. The dashboard can't render SF Symbols, so the glyph is still previewed
  via the lucide mapping — the real SF Symbol string ships in the record and iOS
  renders it natively.
- `app/(dashboard)/badges/types.ts` — un-deprecates `theme`/`shape`/`effect` and
  adds the shared Sigil palette + guardrail: `SIGIL_THEME`, `SIGIL_FRAME`,
  `SIGIL_HOLO`, `TIER_INDEX`, `TIER_DEFAULT_SHAPE`, the label maps, and
  `resolveEffect(effect, tier)` (identical to iOS + `badge-spec.json`).
- `app/(dashboard)/badges/[id]/BadgeEditor.tsx` — re-adds full authoring:
  theme swatches, a live-preview shape picker (mini medallions), an effect picker
  that shows the guardrail auto-correct, and the tier swatch now previews the
  ring frame. `updateBadge` already persisted all three fields, so no action
  change was needed; fresh drafts now default `shape` to `coin` (bronze).
- No schema change. The DB already carried every axis (the June rework never
  dropped the columns). A companion data-only migration in the iOS repo
  (`20260702120000_badge_sigil_defaults.sql`) seeds category-signature themes +
  tier-default shapes + tier-appropriate effects on existing badges.
- TypeScript clean, ESLint clean, `next build` green.

## 2026-06-27 — Equal admin access + confirm-guards on the foot-guns

The dashboard's two admins (Tom + Jack) are co-founders with identical access.
Rather than thread Jack through role gates, the model is now "all admins equal,
with confirmation pop-ups guarding the genuinely-consequential actions."

- **Perms (DB, not code).** Full parity is one row: elevate Jack's
  `admins.role` to `super_admin`. This is the *complete* fix because several
  gates are enforced in Supabase (e.g. user-suspend's RPC checks role in SQL),
  so dashboard-only code changes would leave a half-state. Per the
  access-control rule the role change is run by a human in Supabase Studio (exact
  SQL handed over) — `update public.admins set role='super_admin' where user_id =
  'cedf42b5-…618'` (Jack). After that, every super_admin gate passes for him.
- **Confirm-guards (code).** With access widened, the two "foot-guns" we'd
  flagged get a double-check via the reusable `ConfirmDialog`:
  - **App-version gate** (`AppVersionForm`): Save now only prompts when the
    **minimum version is being *raised*** (a `cmpVersion` check) — the case that
    walls older apps out. Lowering / editing the recommended version or link
    saves straight through (no nagging). The prompt is `tone="danger"`.
  - **Vestige Index rarity-swing** (`IndexMechanics`): Apply (which recomputes
    every course's Index and shifts rankings app-wide) confirms first. The
    harmless deterministic "Recompute now" stays one-click.

No schema/migrations on the dashboard side. Verified `tsc`/`eslint`/`build`.

## 2026-06-27 — Course import: make Apply fully usable + safe

Follow-up to the import bridge — turns Apply from a gated, untested button into
something Jack can run himself, safely.

- **Equal access.** Apply was super_admin-only; Tom + Jack are co-founders with
  identical access, so the role gate is gone — any admin can apply. The safety is
  a **confirmation pop-up**, not a permission wall (new reusable
  `components/admin/ConfirmDialog.tsx`, portal modal matching `ReleaseDialog`). It
  spells out the live impact ("N new courses added, M refreshed, +K counties …
  upsert-only, reversible") and double-checks before writing.
- **MultiPolygon centres.** ~12% of courses (136/1181) are MultiPolygon (merged
  from several OSM ways); the ported centroid only handled Polygon, so they'd
  import with a null `center_lat/lng` — same as the CLI. Added a MultiPolygon
  branch (`GeoJsonGeometry` union in types); verified against live data that all
  136 now get a real centre (e.g. Thames Ditton & Esher → 51.38, −0.35). The next
  apply backfills them.
- **Timeout headroom.** A full apply re-upserts ~1.2k courses + clubs + counties
  then recomputes the index — `export const maxDuration = 60` on the route so it
  doesn't hit the short serverless default mid-write.

Verified `tsc`/`eslint`/`build` + the centroid fix on real data + route
auth-gates. Note for full parity *elsewhere* (`/sync`, announcement hard-delete
are still super_admin): set Jack's `admins.role` to `super_admin` — a DB change,
not code. Long-form continues in the entry below.

## 2026-06-27 — Course dataset import in the dashboard

Closes Jack's biggest dependency. Course boundary polygons are mapped in the
separate `Pinehollow-Studios/vestige-tool` app (OSM → Overpass → its hidden
AdminReview tool → committed `src/courses.js`), then ingested into live Supabase
by `Vestige-ios/scripts/import-courses` — a terminal step with the service-role
key that only a developer could run. So Jack's mapped courses couldn't reach the
app without Tom. This ports that import into the dashboard as a click-through.

- **`lib/courses-import/`** — ports the CLI's pure logic: `source.ts` fetches
  `src/{counties,courses}.js` from a pinned vestige-tool commit via the GitHub
  Contents API (raw); `parse.ts` evaluates the `export default` module
  server-side (no temp file — strips the export + `new Function`); `transform.ts`
  is copied verbatim (incl. the iOS `slugify`, so `onConflict` upserts match
  existing rows rather than duplicating); `import.ts` is the idempotent
  counties→clubs→courses upsert (batched, with the >1000-row pagination fix);
  `preview.ts` diffs the source against live data by `legacy_fid`.
- **`/courses/import`** (linked from the Courses header) — a status panel
  ("up to date" / "N new commits" / "never imported", last-import audit), a
  **dry-run preview** (new courses w/ names · refreshed · new counties), then
  **apply**. Reuses the existing service-role client + GitHub plumbing.
- **Gating** — status + preview are open to any admin (so **Jack** sees what's
  pending and can dry-run it); **apply is super_admin-only** (it writes live
  course data). Apply writes a `dataset_imports` audit row and calls
  `recompute_vestige_index`. Upsert-only — nothing is deleted, so a bad import
  is undone by re-applying a good commit.
- **Ops dependency**: the existing `GITHUB_DISPATCH_TOKEN` PAT must gain
  **Contents:read on vestige-tool** (today it's scoped to the iOS repo). Until
  then the status panel shows a clear "not configured" notice instead of failing.

No schema/migrations (the `courses`/`counties`/`clubs`/`dataset_imports` tables +
`recompute_vestige_index` already exist from the iOS side). Verified
`tsc`/`eslint`/`build` + slugify parity check + the route auth-gates cleanly.
Full logged-in flow not exercised headlessly (auth + token + prod write).

## 2026-06-27 — Declutter: drop grey helper/description text

Tom + Jack know the tools; the explanatory grey text under section headings and
inputs was just clutter. Stripped it dashboard-wide. Done at the shared-component
level rather than a ~80-site prop sweep — the `hint` / `subtitle` props stay on
the component *types* (so every call site still compiles, and the strings remain
in source if we ever want them back) but are no longer rendered.

- **Shared editor chrome** (`components/admin/editor/EditorShell.tsx`):
  `EditorSection`, `AdvancedSection`, and `Field` no longer render their `hint`.
  This alone clears the helper text across the course, curated, society/modes,
  prestige, and app-version editors.
- **Local editor helpers**: the file-local `Card` + `Field` in
  `announcements/[id]/AnnouncementEditor.tsx` and `badges/[id]/BadgeEditor.tsx`,
  and the bespoke field in `app-version/AppVersionForm.tsx`, stopped rendering
  their hints too. Removed the standalone badge-seal explainer paragraph.
- **Page-level prose**: dropped the App-version gate explainer paragraph and the
  two `Section` subtitles on the Sync page.
- **Kept** (not clutter): the Overview mission quote, analytics stat captions,
  empty-state messages, the sync "not configured yet" setup instructions, and
  TopBar bell counts — all functional, not heading descriptions.

No schema/data/deps. Verified `tsc` / `eslint` / `build` clean + dev boot with no
console errors. Gated UI behind the admin login (Tom to eyeball).

## 2026-06-27 — Preview/polygon/changelog/feedback QoL pass

Four operator-facing quality tweaks to keep the editorial surfaces honest and
the workbench comfortable. No schema, no data, no deps — presentation + layout.

- **In-app preview cards rebuilt on the real iOS templates.** The old course /
  curated previews were loose approximations (title overlaid on the hero, a flat
  3-up stat grid, tiny list rows). Both now mirror the actual SwiftUI screens
  (sourced from `Vestige-ios` `CourseDetailSheet` + `CuratedListDetailView`):
  - **Course** (`courses/[id]/CoursePreview.tsx`): rounded gallery hero → "peek
    block" (mint-dot eyebrow → serif title → club → a stat row led by the **Par
    hero numeral** in the mint→lime gradient, holes/yards secondary, tier pill)
    → glass **details** card (Layout / Style / Established) → glass **About**
    card. Same prop signature, so the editor call is unchanged.
  - **Curated** (`curated/[id]/CuratedPreview.tsx`): full-bleed cover fading to
    paper with a tier pill + serif title + italic summary → editorial **kicker**
    (region · tags) → mint-ruled **bio pull-quote** → glass **stat strip** →
    **course rows** with cover tiles, `01/02`-style position stamps on ordered
    lists, club·county subtitle, editor-note line, chevron. `CuratedEditor` now
    feeds it `region` + `tags` for the kicker.
  - **PreviewFrame** got a more device-true chrome: Dynamic Island, signal/wifi/
    battery glyphs, home indicator, fatter bezel.
- **Course polygon — made reliable + foregrounded** (`PolygonPreview.tsx`). The
  static-map render now fits the polygon with Mapbox `auto` bounds (no more
  guessed centre/zoom that could frame off the shape) over **satellite-streets**
  imagery so the boundary reads against real greens/fairways, in the mint brand
  stroke. Coordinates are rounded to ~5dp so hand-mapped boundaries serialise
  under the ~8 KB static-API URL cap (with a centred-pin fallback past it), and a
  vertex count is surfaced ("Boundary · N points") to credit the mapping work.
  Moved out of the cramped read-only "Reference" two-column grid into its own
  full-width **"Course boundary"** section high in the editor.
- **Changelog spacing** (`changelog/[id]/VersionView.tsx` + `changelog/page.tsx`):
  tightened the oversized gap between the version-meta header and the change
  lines — `space-y-6 → space-y-4` + `pb-4 → pb-3` on the detail view; on the list
  view replaced the free-floating divider div (which sat in ~48 px of stacked
  margin) with a border hugging the header.
- **Feedback is now a fixed two-pane** (`feedback/page.tsx` + `FeedbackInbox.tsx`):
  the page fills the viewport (`lg:h-[calc(100dvh-8rem)]`, `overflow-hidden`) with
  the header/tabs/filters pinned; only the **ticket list** and the **thread
  viewer** scroll, each via its own `min-h-0 flex-1 overflow-y-auto` inside a
  `grid-rows-[minmax(0,1fr)]` row. No more whole-page scroll fighting the sticky
  thread pane. Mobile keeps single-column flow.

Verified `tsc` / `eslint` / `build` clean; dev server boots with no console
errors. The gated editorial/feedback surfaces are behind the admin login (not
driveable headlessly) — Tom to eyeball the logged-in UI.

## 2026-06-27 — Security hardening pass

Full security audit (three parallel sweeps — injection/XSS, secrets/service-role,
auth/session — plus direct review of every security-critical file and a
dependency scan) ahead of storing sensitive data. New `SECURITY.md` records the
model, findings, and tracked follow-ups. The auth foundation was already solid
(real `admin_role` gate, verified `getUser()`, fail-closed middleware, server-
only secrets, gitignored `.env`); this closes the gaps.

- **HTTP security headers** (`next.config.ts`, new `headers()`): a CSP built
  dynamically from the public env (scoped `connect-src` to the Supabase projects
  over https + wss and Mapbox; `frame-ancestors 'none'`, `object-src 'none'`,
  `base-uri`/`form-action 'self'`), plus HSTS, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`.
  Scripts allow `'unsafe-inline'` for now (pragmatic — Next inline bootstrap, no
  `dangerouslySetInnerHTML`); `'unsafe-eval'` is dev-only. Nonce-based strict CSP
  is the tracked follow-up. Verified on the login document (headers present, no
  CSP violations, page renders).
- **Open redirect** in `auth/callback` fixed: new `safeNextPath()`
  (`lib/security/redirect.ts`) rejects non-local `next` (`//host`, `.host`,
  absolute URLs, backslashes) before `${origin}${next}`.
- **PostgREST `.or()` filter injection** closed at every site: new
  `lib/security/postgrest.ts` (`sanitizeFilterValue`, `isUuid`) applied in
  `announcements/actions.ts`, `users/page.tsx`, `crashes/queries.ts` (was only
  stripping `*`), and `users/[id]/page.tsx` (UUID-guards the route id →
  `notFound()`); `api/search` refactored onto the shared helper.
- **Dependencies → 0 vulnerabilities** (from 11; 4 high). `npm audit fix`
  (ws/qs), Next `16.2.4 → ^16.2.9` (closes the App-Router middleware-bypass /
  redirect-cache-poison / nonce-XSS advisories — directly relevant to the auth
  gate), and a `postcss ^8.5.10` override for the build-time CSS CVE.
- **Login brute-force stopgap**: in-memory per-IP+email limiter in
  `login/actions.ts` (8 fails / 15 min), with an honest caveat that it's
  per-instance and Supabase is the real backstop — Vercel KV/Upstash flagged as
  the proper fix. Error stays generic (no account enumeration).
- **Smaller hardening**: `import "server-only"` added to `lib/sentry/client.ts`;
  `robots.ts` disallow-all (the whole app is private).

No schema/data changes. Verified `tsc`/`eslint`/`build` green, `npm audit` clean,
login headers + render confirmed in-browser. Authed-page CSP eyeball + the
nonce-CSP / KV-rate-limit follow-ups are Tom/Jack actions on the live deploy.

## 2026-06-27 — Two-group sidebar + anonymous login

### Sidebar collapsed to two groups

`components/admin/nav.tsx` — the People / Insight / System groups folded into
**Operations**, leaving just **Editorial** (Jack) and **Operations** (Tom) under
the pinned Overview. Operations is now ordered by expected use with **Changelog
at the top**: Changelog · Feedback · Analytics · Photos · Safeguarding · Crashes
· Users · List verification · App version · Sync. No items removed — only
regrouped/reordered; counts still flow to the same `countKey`s.

### Login page made anonymous

The sign-in page leaked the product: branded split-panel, "Vestige Admin",
"Welcome back", "Access is gated against the admins table", a `@pinehollow.studio`
placeholder, and a "Ask Tom or Jack" footer. Redesigned so a passer-by learns
nothing — a single centered, unbranded form with two fields (Email / Password)
and a Sign in button, on the bare app background. New `login/layout.tsx`
overrides the root metadata for the route: generic tab title **"Sign in"**,
empty description, and `robots: noindex/nofollow`. The sign-in action
(`login/actions.ts`) now returns one **generic** error ("Incorrect email or
password.") for every failure path, so it never reveals whether an email exists,
the admin gate, rate limits, or Supabase internals. `BrandMark` stays exported
for the `/unauthorized` page (only reachable by an already-authenticated
non-admin). Verified visually (the one pre-auth screen) + `tsc`/`eslint`/`build`.

## 2026-06-27 — Card-grid redesign of the list screens + Editorial/Operations split

Six older list/table screens were still on the dense row design while Courses,
Index and Badges had moved to the glass-panel card grid. This brings them all
onto the same card language, and re-cuts the sidebar around who does the work.

### List → card grid (six screens)

Each landing now renders a responsive `glass-panel` card grid
(`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` for compact tiles,
`sm:grid-cols-2 lg:grid-cols-3` for richer cards) instead of a `DataTable` /
`<ul>` / `<ol>`:

- **Announcements** — new `AnnouncementCard` (kind + status-dot lead, status
  chip, two-line title, seen/dismissed/acted receipts + priority). Old
  `AnnouncementsTable` deleted.
- **Curated lists** — new `CuratedCard` with a 16:9 cover banner (tinted
  placeholder when none), status chip overlaid, name + status dot, description,
  tier · course-count footer. Old `CuratedTable` deleted.
- **Societies** — new `SocietyCard` (crest + editorial/member chip, county,
  member count). Old `SocietiesTable` deleted.
- **Users** — the `<ul>` directory became a 3-up card grid (avatar, status
  chip, FM/Hidden badges, privacy · joined). Stat tiles, search form and
  pagination unchanged.
- **Crashes** — the divided `<ol>` became a 2-up grid; each `CrashRow` is now a
  self-contained `glass-panel` card (`h-full` so rows align). Filters +
  pagination unchanged.
- **Safeguarding** — the stacked `<ul>` became a 2-up grid (`FlagRow` was
  already a glass-panel card; now `h-full` in a grid). State/kind tiles +
  filters unchanged.

Because the `DataTable` column-header sort goes away with the table, the three
editorial screens gained a **Sort** `TableSelect` in their `TableToolbar`
(name/status/tier/courses/updated etc.) so ordering is still reachable — all
existing server-side sort logic was kept.

### Sidebar: Editorial = Jack, Operations = Tom

`components/admin/nav.tsx` — **Changelog moved from Editorial to Operations**.
Editorial is now Jack's content surfaces (Curated, Courses, Index, Badges,
Announcements, Societies); Operations is Tom's (Feedback, Photos, Safeguarding,
Crashes, List verification, Changelog). People / Insight / System groups kept as
-is.

### Notes

- No schema / data changes — every screen kept its existing query, types and
  helpers; only the presentation layer changed.
- `tsc` / `eslint` / `next build` green. Live UI walk-through is gated behind
  the admin login (not driveable headlessly) — Tom/Jack to eyeball.

## 2026-06-27 — Vestige Index: normalise, county-ify, batch editor + back-nav fix

The Index surface shipped fast (2026-06-26) and didn't fit the rest of the
dashboard: a single flat ranked table, a bare rarity-swing input, twitchy
per-row autosave, and no county structure. It also carried a navigation bug.
This reworks it to the app's house style and gives Jack a deliberate,
fully-transparent control surface — without touching the iOS schema (every
lever already exists).

### Back-nav bug (the actual fix)

The route folder was literally named `index`, so its URL was `/index` — which
Next.js's App Router normalises onto `/`, colliding with the Overview route
(`(dashboard)/page.tsx`). The two pages shared one router-cache entry, so after
visiting the Index you kept seeing it when you clicked Overview. **Renamed the
route `index/` → `vestige-index/`** (`git mv`), repointed the sidebar `href`
(`components/admin/nav.tsx`) and the three `revalidatePath("/index")` calls in
`courses/actions.ts`. The collision is now structurally impossible.

### County structure (mirrors Courses)

`vestige-index/page.tsx` now switches on search params exactly like the Courses
page: no selection → a county **grid** of `glass-panel` tiles (course count,
average Index, and an amber "N to rank" chip = courses still at the seed
prestige of 50); picking a county / searching / filtering → the scoped ranked
table with an "All counties" back-link. Reuses `SectionHeader`,
`TableToolbar`/`TableSelect`, `TablePagination`, the `unwrap<T>()` helper, and
the `NO_COUNTY` sentinel pattern.

### Index mechanics, laid bare (`IndexMechanics`)

Replaces the old `IndexControls`. A serious control panel: the blend formula
written out (`index = clamp(prestige × (1 + swing × (rarity−50)/50), 0, 100)`),
a **live worked example** that recomputes as you drag, the global **rarity
swing** as a slider bound to a numeric input (± echoed, "unsaved" hint, Apply),
"last tuned … by …" from `vestige_index_config.updated_at/updated_by`, and a
recompute-now action. Sits atop both the landing and the scoped view.

### Batch editor (`IndexTable`)

Prestige + source edits are now **staged, not autosaved**. Each edited row
previews its **projected Index** live (client-side `projectIndex()` in
`formula.ts`, the exact per-row formula; tooltip notes other rows can shift a
point on the global recompute), dirty rows get an amber pip, and a sticky
**"Save N changes"** bar commits the whole batch in one shot. Expanding a row
shows its `plays → rarity → index` breakdown and the editorial source note.
Invalid (out-of-range) cells block the save and flag red.

The commit uses the previously-unused batch RPC `admin_set_courses_prestige`
(iOS `20260626250000`) via a new `setCoursesPrestige` server action in
`courses/actions.ts` — one recompute for the whole batch instead of the
per-edit O(n²) the single-row RPC caused. `setCoursePrestige` stays for the
`/courses/[id]` `PrestigeEditor`.

### Notes

- No schema changes / no iOS migration — every lever (per-course prestige +
  source, global rarity swing, recompute, batch set) already shipped. "Full
  control" = full transparency + batch authority over prestige, not new knobs.
- `tsc` / `eslint` / `next build` green; `/vestige-index` registered, `/index`
  gone. Live UI walk-through is gated behind the admin login (not driveable
  headlessly) — Tom/Jack to eyeball.

## 2026-06-26 — Vestige Index: per-course prestige editor + ranked Index tab

The Vestige Index is the app's flagship 0–100 per-course metric — editorial
**prestige** blended with live play-**rarity** (computed in
`Vestige-ios/supabase/migrations/20260626220000_vestige_index_foundation.sql`).
This adds the admin surfaces to manage it.

### Courses

- New **Vestige Index** section in the course editor: edit `prestige` (0–100)
  + a source / justification note, autosaved via `admin_set_course_prestige`
  (which recomputes the whole Index). Read-only Index + rarity readout with a
  `prestige · rarity → index` breakdown.

### Index (new tab)

- Every course **ranked by Vestige Index** with inline prestige editing,
  county / tier / sort filters + search, pagination.
- A **rarity-swing tuner** (how far rarity moves prestige, ±) and a
  **Recalculate now** button — both recompute every course's Index.

### Notes

- Prestige is the only editable value; rarity + the Index are computed.
- Editorial writes use the dev client (promoted to prod via `/sync`).
- No schema changes here — reads/writes the columns + RPCs from the iOS-side
  migration `20260626220000`.
- TypeScript clean, ESLint clean, `next build` green.

---

## 2026-06-13 — Mobile navigation (the dashboard works from a phone)

The dashboard was desktop-only in the most literal sense: the navigation rail is
`position: fixed` at `lg+` and `hidden` below it, so on a phone there was no way
to move between pages at all. Jack works the bar at his course and needs to glance
at how things are going from his phone — open feedback, the latest analytics,
what's in the changelog — without being at a desktop. This makes the app navigable
and readable on a small screen. It is deliberately scoped to *getting around and
seeing things*, not parity of editing power — the heavy editors (course/curated/
version) are unchanged and remain desktop-first.

### Shared nav, two containers

The nav body (brand header, the everyday list, the collapsed **Advanced** group,
the footer) moved out of `Sidebar.tsx` into a new shared `components/admin/nav.tsx`
as `NavContent` — container-agnostic, computes its own active state from the path.
Two thin shells wrap it:

- **`Sidebar`** is now just the `<aside>` chrome (`hidden … lg:fixed lg:flex
  lg:w-64`) around `NavContent`. Same desktop rail as before. `BrandMark` is
  re-exported from here so the `login`/`unauthorized` imports keep working.
- **`MobileNav`** (new) is a hamburger button (`lg:hidden`) in the TopBar that
  opens a slide-in drawer (portalled to `document.body`, `z-50` over everything)
  carrying the same `NavContent`. So the two navs can never drift — one source of
  truth for routes, counts, and active styling.

### Drawer behaviour — built for one-handed phone use

Tapping a link closes the drawer (`onNavigate` threaded into every `NavRow` +
the brand link); the backdrop and **Escape** dismiss it; body scroll locks while
it's open; and a route change (back button, programmatic nav) closes it as a
safety net — done via render-time state adjustment off `usePathname()` rather
than an effect, so it doesn't trip `react-hooks/set-state-in-effect`. Enter
animations use the existing `tw-animate-css` (`fade-in` / `slide-in-from-left`).
Nav rows went from `py-2` to `py-2.5` for ~44px touch targets (a wash on desktop).

### Layout / TopBar responsive tidy

- The TopBar gained the hamburger at the far left (before the dev-only
  `EnvToggle`, which is null in prod). Its `aria-expanded` tracks the drawer.
- TopBar padding `px-6` → `px-4 sm:px-6`; main content `p-6` → `p-4 sm:p-6 lg:p-8`
  — a bit more room on a phone. `counts` now flow layout → TopBar → `MobileNav`
  so the drawer shows the same badge pips as the rail.

Content pages already reflow (responsive `grid-cols-1 sm:grid-cols-2 …`; the one
fixed grid is 2-col on mobile), so no per-page work was needed for the
read-and-navigate goal. No schema changes, no new deps. Verified
`tsc`/`eslint`/`build`. **Not yet eyeballed on a real device** — Tom/Jack to
confirm on a phone.

## 2026-06-12 — Release-driven "Fixed" + reporter notification rewrite

Closes the long-standing mismatch in the feedback→changelog loop and fixes the
reporter-side notifications that rode on top of it. Two coordinated pieces: a
dashboard release flow (here) and a notification rewrite spanning the iOS repo
(migration + Edge Function + Swift).

### The mismatch

"Fixed" had two disconnected triggers. The **Fixed button** on a feedback thread
notified the reporter "Fixed" immediately — regardless of whether anything had
shipped. **Shipping in a version** (tagging a report to a changelog line) was
explicitly link-only: it changed nothing and told the reporter nothing. And
**releasing a version was inert** — `setReleased` only flipped a status column,
ignoring every linked report. So the natural action (ship the fix in a release)
left reporters uninformed, while the button could cry "Fixed" before the fix
existed.

### Release becomes the canonical close

Flipping a version **In development → Released** now opens a confirmation modal
(`ReleaseDialog`, portalled over the editor). It lists every change line linked
to a still-open report, each with an editable message box and a row of clickable
pre-written resolution lines — feature requests lead with "shipped" phrasing, bugs
with "fixed", and one line always carries the version number. Confirm marks each
included report Fixed via the existing `set_work_stage(_, 'fixed', note)` RPC
(notifying its reporter, storing the note as the resolution card) and releases the
version in one gesture. Anonymous reporters (deleted accounts) still resolve, just
without a notification — the SQL skips that itself.

- New actions in `changelog/actions.ts`: `listReportsForRelease(versionId)`
  (linked, non-resolved reports, one row per report, drives the dialog) and
  `releaseVersion(versionId, items)` (bulk-fix selected reports, then flip
  released; returns fixed/failed counts). Idempotent — already-resolved reports
  are filtered out, so re-releasing never double-notifies.
- `VersionEditor` intercepts the draft→released toggle to open the dialog;
  reverting released→draft stays a plain toggle and never un-resolves a report.

### The Fixed button kept as the hotfix exception

The thread's "Fixed" button is relabelled **Fixed (hotfix)** with a hint that
releasing a version is the normal path — it survives for one-off fixes not tracked
in the changelog.

### Queued vs shipped

The thread header split the old "Shipped in vX" chip: a report linked to a **draft**
version now reads **Queued for vX** (amber, clock), and only a **released** version
reads **Shipped in vX** (brand, rocket) — so what's staged for the next release is
visible without implying it already shipped.

### Reporter notification rewrite (iOS repo)

The reporter lifecycle is Sent → Working on it → Fixed, but the 2026-06-10 rework
had culled `feedback_status_changed`, leaving **no notification for the
In-progress step** — marking "Working on it" fired nothing, or a mislabelled
"The team replied to your feedback". New strict-allowlist kind
**`feedback_in_progress`** (twelve kinds now), fired exactly once when a report
transitions into `inProgress`, carrying the operator's optional note as its body.
`set_work_stage` rewritten so every step maps to one unambiguous kind:
inProgress → `feedback_in_progress`, fixed → `feedback_resolved`, a note without a
status change → `feedback_message_posted`, bare internal moves → silent. Mirrored
across the `send-apns` Edge Function (push copy) and iOS (`AppNotification.Kind`
case + decoder + `NotificationPresentation` glyph/headline + `AppState` tap route).
See `Vestige-ios/CHANGELOG.md` + migration
`20260612100000_feedback_inprogress_notification.sql`.

### Notes

- Dashboard: TypeScript clean, ESLint clean, `next build` green.
- iOS: Debug build `BUILD SUCCEEDED`.
- Smart-copy caveat: feature-request resolutions still render iOS's single "Fixed"
  resolved state — the "shipped" wording is delivered through the chosen message,
  not a distinct badge. A separate iOS "Shipped" state is an optional follow-up.
- Migration ships to prod via the iOS `prod-deploy` flow (not applied here);
  reporter notifications degrade gracefully on old builds (unknown kind skipped).

## 2026-06-11 — Changelog workflow streamlining: "In development" badge + faster version↔feedback wiring

Editorial-velocity pass on the version changelog, all dashboard-side (no
schema). Relabels the unreleased lifecycle state and cuts the clicks
between a feedback report and the version it ships in.

**"In development" + orange.** The draft lifecycle state now reads **In
development** (was "In progress") and wears a filled amber/orange badge so
an unreleased version reads as actively worked-on. New shared
`versionStatusBadgeClasses(status)` in `changelog/types.ts` keys the pill
(amber-filled draft / calm-brand released) for the list, detail view, and
anywhere else; the editor's status toggle label moved in step. (Tom's
first instinct was the word "In production" — flagged that it normally
reads as live/shipped and we settled on "In development".)

**Link picker shows open feedback immediately.** `FeedbackLinkPicker` no
longer needs a search to be useful: it loads the open queue on open via
the new `listOpenFeedback(query?)` action, which reuses
`admin_feedback_queue` filtered to `FEEDBACK_ACTIVE_WORK_STAGES` (so
anything **Fixed**/done never appears) and drops any report already tagged
to a changelog line (no double-shipping). The text box now only narrows
the already-visible list. Replaces the old min-2-char `searchFeedback`.

**Tag before saving + rapid entry.** The "Add change" row can now tag a
report *before* the line exists: a "Tag report" affordance stages a report
(chip with "will link on add"), prefills the line text from the report
body if you haven't typed one, and `addChange` takes an optional
`feedbackReportId` so the line is born linked in one insert. After Add the
row clears the text + tag but **keeps the last-used kind and the cursor**,
so a run of lines is type → Enter → type.

**"Ship in version" from the feedback side.** The feedback thread gains a
`ShipInVersionControl` (sidebar) listing versions in development; one click
calls the new `shipReportInVersion(versionId, reportId)` action, which
appends a prefilled "Fixed" line to that version tagged to the report —
the mirror of add-line + link. Versions the report already shipped in are
filtered out; the empty state links to `/changelog`.

**Quick jump to the active draft.** The changelog list shows a prominent
amber "In development — continue editing" banner (→ the draft's editor)
above the log; the overview Changelog card's accent now leads with
`vX in development` when a draft exists.

Verified `tsc` / `eslint` / `build` all clean. No migration — every query
reads existing tables (`app_versions`, `app_version_changes`,
`feedback_reports`) and the existing `admin_feedback_queue` RPC.

---

## 2026-06-11 — Two prod feedback fixes: Near-you → Atlas zoom; first-county badges → safeguarding review

The two prod reports sitting at **In progress** (both Tom, 2026-06-08)
fixed and closed via `set_work_stage('fixed', note)` — reporter notified
with the resolution note on each.

**Report `e99b1fc2` — "clicking on the course should take you to a zoom
in of the course on the atlas".** iOS-side fix (no dashboard change):
Home "Near you" cards (and their per-card "Open atlas" pills) now hand
the Atlas a one-shot `AppState.pendingAtlasCourseFocus` and switch tabs;
the explore tab consumes it through the existing search-handoff path and
flies county → course. Details in `Vestige-ios/CHANGELOG.md` 2026-06-11;
ships with the next TestFlight build.

**Report `c5baa33e` — "first to complete a county should be verified by
us… checking they haven't done 100 courses in 5 days".** Routed into the
safeguarding queue, per Tom's direction that the badges verification
lives on the /safeguarding page:

- iOS migration `20260611100000_first_county_completion_review.sql` —
  new `safeguarding_flags.flag_kind` value **`first_county_completion`**;
  `evaluate_badges_for_user()` re-created so a `first_to_complete: true`
  county-complete mint also raises a pending safeguarding flag with the
  velocity evidence inline (county, badge definition, course count,
  first→last played-marker span, markers in the trailing 7 days). The
  badge still mints immediately — review is post-hoc; a dodgy grant gets
  actioned with the existing safeguarding tools. Insert is
  exception-guarded + idempotent per (user, kind, day), so it can never
  block a mint.
- `/safeguarding` page — `FlagKind` union, kind-filter chips ("First
  county"), `KindBadge` colour + label, and the header description now
  cover the new kind. Everything else (queue RPC, state tabs, evidence
  pretty-print) was already kind-agnostic.
- Migration applied to **dev** (`supabase db push`); reaches prod via
  the normal `prod-deploy` promotion — it is not on the hold-list. Until
  then prod simply raises no flags of the new kind; the page renders it
  fine either way.

Verified `tsc` / `eslint` / `next build` here + iOS Debug build
`BUILD SUCCEEDED`; dev smoke-tested the new flag kind (constraint accepts,
function executes, test row cleaned up). No schema changes in this repo.

## 2026-06-10 — Display font swap: Fraunces → Manrope (all surfaces)

Tom flagged the primary header/display font — the Fraunces serif used for
the dashboard stat numerals (TOTAL USERS / ROUNDS LOGGED / COURSES IN
CATALOGUE / ACCEPTED FRIENDSHIPS) and, app-wide, the iOS announcement
titles + hero numerals — as reading "awful / off", and asked for a modern
sleek sans in its place. The font he liked on the `/announcements`
live-preview card turned out to be DM Sans (`font-heading`, not the
"serif title" its stale comment claimed). From a rendered comparison of
DM Sans / Space Grotesk / Manrope he picked **Manrope** (OFL geometric
sans), to apply **everywhere with no misses**: admin dashboard, iOS app,
and the marketing site.

**Admin (this repo).** `layout.tsx` — the `next/font/google` import swapped
`Fraunces` → `Manrope` on the `--font-display` variable (weights
400/500/600/700; the `font-display` Tailwind utility + `.display-serif`
class flow through unchanged, so the stat numerals and every display-font
callsite repaint with no per-component edits). Updated the `StatsStrip`
doc + inline comments that described the numeral as Fraunces/"editorial
serif". Inter (body) and DM Sans (`--font-heading` / `--font-hero`) are
untouched — only the offending display serif changed.

**Marketing (`vestige-marketing`).** `layout.tsx` — same `next/font` swap on
`--font-display-face`; `globals.css` `--font-display` fallback stack
changed from a serif ladder (`"New York", ui-serif, Georgia, serif`) to a
sans one (`-apple-system, "SF Pro", system-ui, sans-serif`); stale
"Source Serif 4 / Fraunces" header comments corrected. Already upright-only,
so no italic concern.

**iOS (`Vestige-ios`).** The whole display ladder routes through
`Theme.FontName.serif*`, so the swap is three PostScript constants +
assets: instanced 3 static Manrope cuts (`Manrope-Regular/-Medium/-SemiBold`,
wght 400/500/600) from the upstream variable font with `fontTools`, name
tables rewritten so family = `Manrope` + distinct subfamily + PostScript
names; replaced the 5 `Fraunces-*.ttf` (Manrope ships no italic, so the
`editorial` role's `.italic()` now synthesises an oblique on the upright
cut); `Theme.FontName.serif/serifMedium/serifSemibold` → `Manrope-*`;
`VestigeApp.assertFontsRegistered` boot family `["Fraunces"]` → `["Manrope"]`;
`project.yml` `UIAppFonts` swapped (5 Fraunces → 3 Manrope) + `xcodegen
generate` regenerated `Info.plist` + `pbxproj`; added `Manrope-OFL.txt`,
removed `Fraunces-OFL.txt`; swept descriptive Fraunces comments → Manrope
across 13 Swift files + `docs/announcements-concept.md`. Long-form in the
iOS `CHANGELOG.md` 2026-06-10 entry.

**Verification.** Admin + marketing: `tsc` / `eslint` / `next build` all
green. iOS: `xcodegen generate` clean; Debug build `BUILD SUCCEEDED`
(in-build SwiftLint green); built `Vestige.app` confirmed to bundle the 3
Manrope `.ttf` + no Fraunces, and its embedded `Info.plist` `UIAppFonts`
lists the three Manrope files. **iOS not visually confirmed in-simulator**
(same WeatherKit-entitlement SpringBoard launch denial as prior slices) —
Tom-action: run from Xcode and confirm the splash wordmark, headlines,
announcement titles, and hero numerals render Manrope (not a system-sans
fallback) in light + dark + xxxLarge; if the editorial faux-oblique reads
off, dropping `.italic()` is a one-line follow-up. No schema/migration; no
git mutation.

## 2026-06-10 — Analytics: B2B + Events readability pass; nav promoted

Extends the overview redesign to the other two tabs, and makes the surface
easier to reach.

- **B2B preview**: leads with a big conversion-rate `BigStat`; catchment is now
  a `ProportionBar` (player share by county); conversion supporting figures as
  metric cards; tightened the internal-preview banner.
- **Events**: a summary row (events · types · active users · last event) + an
  events-per-day `AreaChart` above the filter chips + feed (new
  `rollupEventsPerDay` helper).
- **Sidebar**: moved the Analytics entry out of the collapsed "Advanced" group
  into the everyday nav (right under Overview) so it's one click for devs.

Verified `tsc` / `eslint` / `next build` clean.

## 2026-06-10 — Analytics dashboard redesign (readability pass)

Same-day rework of the analytics surface for legibility — the first cut was
dense and flat (every section the same small bar-list, no hierarchy). Rebuilt
around what a dev checks first.

- **Persisted hero switcher** atop the overview: a little toggle picks the lens
  — Pulse (DAU trend), Activation (onboarding funnel), Growth (signups), Data
  health (events / last-event / by version) — and the choice sticks via an
  `analytics_hero` cookie the server reads for the first paint (no flash).
- **Real charts, bigger numbers:** a hand-rolled SVG `AreaChart` (trend),
  `BigStat` hero numerals, a `ProportionBar` for the discovery mix, cleaner
  ranked bars. Still no chart library.
- **Simpler IA:** collapsed 4 tabs → 3 (Overview · B2B preview · Events); the
  dense "Product" tab folds into the overview. B2B conversion now surfaces as a
  headline strip on the overview, linking to the full preview.
- New data helpers: `getSignupSeries`, `rollupByVersion`, and active-users
  windowing for the week-over-week delta.

Verified `tsc` / `eslint` / `next build` clean.

## 2026-06-10 — Analytics consumption surface (Phase 3): the dashboard side

Built the full read surface for the app analytics programme — the consumption
half of `Vestige-ios/docs/analytics-vocabulary.md`. The emit side (Phase 0 +
the P1 events) shipped in the iOS repo; this is where that data is read.

- **Four routes under `/analytics`** with a server-rendered tab bar
  (`AnalyticsNav`): **Overview** (platform stats + live event stream + an
  activation snapshot + a B2B headline + Metabase/SQL slots), **Product**
  (engagement — active users / sessions / events-per-user / a hand-rolled SVG
  DAU sparkline; the full activation funnel; feature adoption by event type;
  discovery attribution), **B2B preview** (bucket→played conversion, volume by
  club, catchment by home county), and **Events** (the raw stream, filterable
  by type with a per-row properties preview).
- **Data layer** `src/lib/analytics/{config,queries}.ts` — server-only, reads
  `app_events` + the domain tables (`played_markers`, `bucket_list_items`,
  `logged_rounds`, `users`, `courses`, `clubs`, `counties`) through the
  service-role client (those tables have no admin SELECT policy, so the session
  client reads zero rows). Rollups (funnel / DAU / volume / discovery / B2B)
  computed in code over a bounded window; a `TODO` marks the move to versioned
  `b2b_*` SQL views in the iOS migrations before any external export.
- **B2B privacy contract enforced in the query layer:** every aggregate
  excludes opted-out users *before* aggregation and suppresses any cell
  covering fewer than `MIN_COHORT_N` (= 5) users. The preview is framed
  explicitly as internal-only; external delivery (self-serve / report) is
  Phase 4, legal-gated.
- **Viz** `src/components/admin/analytics/` — `FunnelBars`, `BarList`, a
  no-dependency SVG `Sparkline`, and `EventFeed`, all in the glass-panel / mint
  idiom. No new packages.
- Replaces the old `/analytics` holding page (counts + starter SQL); the
  Metabase embed slot (`NEXT_PUBLIC_METABASE_DASHBOARD_URL`) is preserved for
  the hybrid exploration half.

No schema changes — reads existing tables. Reads the active env (prod by
default; the dev switch points it at the dev project where Debug-build events
land). Mostly empty states until instrumented builds run. Verified
`tsc` / `eslint` / `next build` clean.

## 2026-06-10 — Admin display names moved off public.users (admins aren't users)

The earlier same-day names fix gave the two admin-login accounts `public.users`
rows so a name would render — which dropped them into the user pool. They aren't
app users and shouldn't be. Moved the name to where admin identity belongs.

- iOS migration `20260610120000_admin_display_name.sql`: adds
  `admins.display_name` (Tom / Jack) and **deletes** the two seeded user rows
  (guarded by exact id + username, so a real user is never touched). Idempotent
  and env-safe (a no-op where those accounts don't exist).
- `listAdminOwners` + `requireAdmin` now read the name from the `admins` record,
  preferring a real `users.display_name` when an admin is also a full user
  (coalesce: `users.display_name → admins.display_name → @username → short id`).
  The pre-existing `admins_select` RLS policy already lets an admin session read
  it, so no new RPC was needed.
- The feedback queue owner chip resolves the assignee's name from the loaded
  owners list, so removing the user rows doesn't regress the row display (the
  thread already resolved owner names from that list).

Verified `tsc` / `eslint` / `next build` clean.

## 2026-06-10 — Three operator fixes (open-ticket count, admin names, announcement recipients)

- **Sidebar feedback count = open tickets.** It counted reporter-facing `status`
  (`new`/`triaged`/`inProgress`), which over-counts after the external/internal
  split: a "Won't fix" closes the `work_stage` but deliberately leaves `status`
  untouched, so closed tickets kept counting. Now counts active `work_stage`
  (`FEEDBACK_ACTIVE_WORK_STAGES`) — same definition as the queue's Active tab.
  Admin-only change (`layout.tsx`).
- **Admin accounts show names, not numbers.** Tom + Jack sign in with
  "branded admin login" accounts (both super_admin) that never onboarded, so
  they had no `public.users` row — every admin surface (feedback owner picker,
  owner chips, TopBar greeting) fell back to the short user id, e.g. `30313a69`.
  iOS migration `20260610110000_admin_account_names.sql` inserts a minimal
  `friendsOnly` profile for each (display names Tom / Jack). Env-guarded (only
  where the matching `auth.users` row exists, so it's a no-op on dev) and
  idempotent (`on conflict (id) do nothing`); the protected-columns guard passes
  migration context through. `friendsOnly` + no rounds/friends keeps them out of
  public search / feeds / leaderboards.
- **Announcement "who's seen it" view fixed.** Opening an announcement's
  recipients raised `missing FROM-clause entry for table "t"`: in
  `admin_announcement_recipients`, the `merged` CTE joined/`coalesce`d on `t.uid`
  but the targeted-users CTE is named `tgt` and was never aliased `t`. iOS
  migration `20260610100000_fix_announcement_recipients_alias.sql`
  `create or replace`s the function with `from tgt t` — otherwise verbatim.

Both iOS migrations ship to prod via the `prod-deploy` action. Verified
`tsc` / `eslint` / `next build` clean.

## 2026-06-09 — Changelog view mode (read-only viewing + View/Edit toggle)

The `/changelog` detail surface was edit-only — the only way to read a release's
notes was to stare at the editor's input fields. Added a proper read mode so
viewers (Jack) can actually read the changelog, with editing one toggle away.

- **`/changelog` is now the full read-only release log.** Every version, newest
  first, with its change lines grouped by Added / Changed / Improved / Fixed /
  Removed, the current-version banner on top — the whole history in one scroll.
  Each version links to its View page and carries a small Edit link. (Replaces
  the old compact card list, which only showed counts.)
- **Per-version View/Edit toggle.** `/changelog/[id]` defaults to a read-only
  View (release-notes layout: version, title, status, date, grouped lines); a
  View⇄Edit segmented control flips to the existing editor. Driven by a
  `?mode=edit` URL param so each mode renders server-side with fresh data (no
  stale client state when switching back from an edit). No role gating — any
  admin can edit (per Tom); View is just the default presentation.
- **Shared rendering.** New `ChangeLinesView` (grouped read-only lines, reused by
  both surfaces) + `VersionView` (single-version read). A linked change line
  shows a "report" chip deep-linking to its feedback thread, body in the tooltip.

No schema or data change — pure UI over the prod tables seeded earlier today.
Verified `tsc` / `eslint` / `next build` clean.

## 2026-06-09 — Feedback: external/internal split + attachable notifications + Done area

The work-tracking layer shipped on 2026-06-08 gave operators a finer pipeline,
but the line between *what we track* and *what the reporter is told* was fuzzy:
nine equal-weight stage pills, admin severity + freeform tags + reporter impact
all competing on the row, and several transitions (`Acknowledged`, `Closed`,
every status change) firing reporter notifications. This slice draws a hard
line and trims the noise.

- **Exactly two external indicators.** Only **In progress** and **Fixed** ever
  reach the reporter — they're the only stages that touch the reporter-facing
  `status` and the only ones that notify. Everything else (New / Triaged /
  Won't fix, plus the legacy `backlog`/`needsInfo`/`released`/`resolved`
  values) is internal: it moves `work_stage` only, never changes `status`,
  never notifies. The reporter's experience is now exactly
  **Sent → Working on it → Fixed**. Triaged and Won't fix are invisible to
  them; **Won't fix is a silent internal close** that files the report into the
  dashboard's Done area.

- **Attachable text on either action.** Clicking *In progress* / *Fixed* in the
  side panel opens an inline composer (optional message + send). The note is
  optional. On the In-progress path it's recorded as an admin **reply** (renders
  in the iOS thread + the "LATEST UPDATE" preview); on the Fixed path it's the
  **`resolution_note`** (the iOS "FIXED" card). The note was *required* on
  resolve before — it's optional now.

- **One SQL function, no DDL, no iOS change.** iOS migration
  `20260609120000_feedback_external_internal_split.sql` rewrites `set_work_stage`
  (same signature) to be the single authority for the pipeline. It stops
  delegating to `transition_status` (left intact for `bulk_resolve_reports`),
  remaps `fixed ⇒ resolved` (was `inProgress`), and owns notification policy:
  one notification per surfaceable transition, routed through the
  preference-aware `notify_user(feedback)`. No enum/column changes — it reuses
  existing `work_stage` values, the `resolution_note` column, and the reply
  mechanism. iOS already labels `inProgress` "Working on it" / `resolved`
  "Fixed" and renders reply bodies + the resolution note, so no Swift change.
  Ships via the iOS migration deploy flow (not applied from here);
  coordinated-deploy — the dashboard's `fixed⇒resolved` derivation needs the
  migration present on whichever project it reads/writes.

- **Done area.** `/feedback` gains an **Active / Done / All** segmented control
  (a `view` param mapping to a `work_stage` partition). Active (default) hides
  Fixed + Won't fix; Done is the kept record of completed work. Summary strip
  reworked to active / fixed / closed counts.

- **Rationalized internal indicators.** Side panel regrouped into "Update the
  reporter (sends a notification)" (the two external buttons), "Internal"
  (Stage = New/Triaged/Won't fix, Priority, Owner, Severity, Duplicate-of), and
  "Danger zone". **Freeform tags removed** from the workflow (the `setTags`
  action + the detail-page Tags row + the side-panel control). Queue rows
  calmed to Stage + Priority + Severity (dropped the reporter-impact chip).
  Stage filter limited to the five surfaced stages. `transitionStatus` (dead in
  the UI since the 06-08 slice) removed.

- **Verification.** `tsc` / `eslint` / `next build` green.

## 2026-06-09 — Version changelog (`/changelog`) wired into feedback

What shipped in each build of the app lived only in git + the iOS
`CHANGELOG.md`; Jack had no operator-facing view of it, and there was nothing
tying "we fixed that" to the report that surfaced it. New `/changelog` surface:
an authored, per-version release log whose change lines tag feedback reports, so
a release shows which reported bugs it tackled and a feedback thread shows the
version it shipped in.

Decisions (locked with Tom): **internal only** — no iOS consumer, no user-facing
RPC, not in the dev→prod sync engine (Announcements already covers user-facing
"what's new"); **categorized change lines** (Added / Changed / Improved / Fixed /
Removed), each optionally linking one report; **link-only loop** — tagging records
the association + shows a "Shipped in v0.1.2" badge, it does *not* move the
report's `work_stage` (no reporter notification fires on link).

- **Schema (prod).** iOS migration `20260609100000_app_version_changelog.sql` adds
  two admin-only tables — `app_versions` (semver split into `major/minor/patch`
  for correct ordering + a `draft`/`released` lifecycle; "current" is derived as
  the highest released, never stored) and `app_version_changes` (ordered,
  kind-tagged lines; `feedback_report_id` FK `on delete set null` is the loop;
  indexed for the reverse "shipped in vX" lookup). RLS `is_admin()` on both, CRUD
  direct via RLS (no RPCs — matches Announcements), shared `set_updated_at()`
  trigger. Seeds the three shipped versions (`0.1` / `0.1.1` / `0.1.2`).

- **Targets prod, not dev.** The dashboard's default + primary target is the live
  prod project (`env.ts`: reads + writes prod; `createClient` is the one
  prod-bound session client — `createDevClient` is a deprecated alias). So the
  changelog + its links are prod rows referencing prod feedback reports. Deploy
  is via the iOS-repo `prod-deploy` action (`supabase db push` against
  `vestige-ios-prod`); the migration isn't on `prod-migration-hold.txt`, so it
  applies on the next prod push. Until then every read degrades to a graceful
  "not configured" state (mirrors Announcements' `isMissingRelation`).

- **Dashboard surface.** `/changelog` lists versions newest-first with a
  prominent current-version banner; `/changelog/[id]` is the editor — version
  meta + draft↔released toggle + editable release date, plus a change-line
  manager grouped by kind with inline edit / delete / add. The report picker
  reuses the existing `admin_feedback_queue` RPC (`p_search`); linking shows the
  report inline with a deep link to its thread.

- **Feedback loop (both directions).** The thread page (`/feedback/[id]`) gains a
  brand "Shipped in v0.1.2" chip linking back to the version; the queue page
  overlays a "Shipped in vX" marker on shipped rows via one batch query keyed by
  the visible report ids.

- **Nav + overview.** Sidebar "Changelog" entry (Rocket icon, badge = in-progress
  draft count); a Changelog card on the overview Editorial row showing the
  current version + recent releases. Both counts use the same missing-table
  resilience as every other pill.

- **No sync entity.** Internal admin content authored directly in prod — nothing
  for the editorial dev→prod mirror to carry.

Verified `tsc` / `eslint` / `next build` clean (`/changelog` + `/changelog/[id]`
routes present). Migration deploy to prod is the one remaining step, handed to
Tom via the `prod-deploy` action.

## 2026-06-08 — Feedback work-tracking layer (stage + priority + owner)

The feedback queue (`/feedback`) already shipped read + triage. What was
missing for actually *working through* reports was a finer operator pipeline,
a do-next signal, and an assignee — so the open question "what am I on?" has an
answer in the UI rather than in someone's head.

- **Dev wipe first.** Cleared leftover dev feedback (1 report + 2 messages + 1
  screenshot row + the orphaned `feedback-screenshots` storage object) so dev
  starts from zero. Prod's 10 real beta reports untouched (different project).

- **Admin-only work layer (no iOS change).** `status` is shared with the iOS
  app — the reporter sees it — so the new states do **not** go on that enum.
  iOS migration `20260608120000_feedback_admin_workflow.sql` adds an admin-only
  layer that the iOS DTO never reads:
  - `work_stage` enum — the operator pipeline, a **superset** of `status` with
    four internal states (`backlog` / `needsInfo` / `fixed` / `released`). The
    reporter-facing `status` is **derived** from it:
    `backlog`/`needsInfo` ⇒ `triaged`, `fixed` ⇒ `inProgress`, `released` ⇒
    `resolved`; the five shared labels map 1:1.
  - `priority` enum (`low` / `normal` / `high`) — do-next ordering, distinct
    from admin `severity` and reporter `user_severity`. Queue now sorts
    priority-first.
  - `owner_user_id` — **revived** the column the feedback-v2 slice deprecated
    ("assigned-owner field rejected"); with two operators it earns its place
    back. Constrained to admins by `set_owner`.
  - RPCs: `set_work_stage` (the operator's one control — sets the fine stage
    and, when the *derived* status changes, delegates to `transition_status`
    so the reporter still gets the right notification + timeline entry +
    resolution note; internal-only moves like `inProgress`→`fixed` are silent),
    `set_priority`, `set_owner`. `transition_status` now keeps `work_stage` in
    sync on direct drives (e.g. `bulk_resolve`). `admin_feedback_queue` /
    `admin_feedback_thread` extended to return + filter the new fields (queue
    gains `p_work_stage_filter` / `p_priority_filter` / `p_owner_filter`; thread
    gains a resolved `owner` object). Backfill maps existing `status`→`work_stage`.

- **Dashboard.** `lib/feedback/types.ts` gains `FeedbackWorkStage` /
  `FeedbackPriority` + labels, tones, lists, and the `workStageDerivedStatus`
  mirror of the SQL derivation. New `setWorkStage` / `setPriority` / `setOwner`
  server actions. Side panel: **Stage** replaces the raw Status control (9
  pills, terminal stages prompt the resolution note, caption shows "Reporter
  sees: …"), plus **Priority** and **Owner** pickers. Queue rows show the stage
  + priority chips and the owner; filter bar swaps the redundant Status row for
  **Stage** / **Priority** / **Owner**. Owner roster comes from a new
  server-only `lib/feedback/owners.ts` (service-role read of `admins` ⋈ `users`,
  same pattern as the users directory — RLS hides admin profiles otherwise).

- **Verification.** `tsc` / `eslint` / `build` green. Plus a live end-to-end
  smoke test against dev (minted a real admin session via
  `generateLink`→`verifyOtp`, no email sent): 14/14 assertions — every
  stage→status derivation, silent internal moves, note-required gating,
  `resolved_at` set/clear on release/reopen, priority set/unset, owner
  assign / non-admin-rejection / unassign, and the anon forbidden gate. Test
  report cleaned up; dev back to zero.

- **Coordinated deploy.** Migration is applied to **dev** only and sits in the
  iOS repo for the normal prod promotion. The dashboard sends the new queue
  filters only when active, so it stays compatible with a project that predates
  the migration (e.g. prod / prod-view before its push).

## 2026-06-07 — Users directory: full roster, per-user detail, avatar fix

Three connected bugs on `/users`, all surfaced together ("users aren't being
picked up", "can't click into an account", "pfps don't load").

- **Full roster (RLS).** `public.users` has no admin SELECT policy — its three
  SELECT policies are own-row / `privacy = 'everyone'` / friends (per
  `Vestige-ios` `20260425200001_initial_schema.sql`). The page read users
  through the admin's anon **session** client, so it only ever saw a
  privacy-filtered *slice* (verified: an unauthenticated anon read returns 0 of
  4 prod users). New **server-only service-role** module
  `lib/supabase/admin.ts` (`createServiceClient` / `tryCreateServiceClient`,
  same key source + `server-only` guard as `lib/sync/clients.ts`) reads the
  full roster, bypassing RLS. Safe because every `(dashboard)` route already
  sits behind the layout's `requireAdmin()` gate. The directory + the sidebar
  "Users" count both read through it now (the count was undercounted too).
  Privacy-gated *writes* still go through the session client + `is_admin()`
  RPCs — service-role is reads-only here. No migration.
- **Per-user detail.** New `/users/[id]` — avatar, bio, account status, privacy,
  home club/county (name-resolved), settings (units, default round privacy,
  analytics, shake-to-feedback, onboarding, last-seen version) and a timeline
  (joined / updated / username-changed / hidden-at / id). Read-only; set-status
  / hide / outreach controls land next via the existing RPCs. Directory rows are
  now clickable links into it.
- **Avatars (storage base URL).** `lib/storage.ts` hard-pinned every avatar /
  cover / course / announcement URL to the **dev** project, but the data client
  defaults to **prod** — so every image 404'd on prod data (regression from the
  prod-default switch in #11). `resolveBase` now defaults to the active-env
  default (prod when configured), and the users pages pass an explicit
  `activeStorageBaseUrl()` for exact dev-switch parity. Verified: a prod avatar
  URL now returns `200 image/jpeg`. Fixes avatars across lists/feedback/crashes
  too. The directory also now selects `avatar_photo_id` and renders the avatar
  (it didn't before), with initials fallback.
- **Realtime.** Both pages stay `force-dynamic`, so every load reads the live DB
  fresh. True client-side websocket updates aren't possible for the full roster
  (an anon client is RLS-capped to 0, and service-role can't ship to the
  browser), so server-rendered-fresh is the correct ceiling.

`tsc` / `eslint` / `build` green. No migration.

## 2026-06-07 — Config/seed push (Phase 3) + read-only prod-view mode

- **Phase 3 — config/seed push.** `safeguard_config` (the singleton safeguarding
  thresholds) folded into `lib/sync/engine.ts` as a "Config & seed" entity —
  plain row compare + upsert by id (no UUID remapping). Surfaced in the existing
  editorial dry-run/apply (the console's separate Config stub is gone; the
  Editorial section is now "Editorial & config").
- **Read-only prod-view mode.** A quick way to see live prod data ("what's on
  users' phones") with **no relogin**. A `vestige_prod_view` cookie flips the
  dashboard into read-only prod view: page *reads* come from prod (via the prod
  service-role), while the admin gate + every write stay on dev — so it's gated
  by the existing dev session and can only ever READ prod.
  - `server.ts`: `createClient()` is now prod-view-aware (prod service-role when
    the cookie is set, else the dev session client); new `createDevClient()` is
    always-dev. `requireAdmin` + all nine write/session files
    (curated/badges/courses/feedback/lists/announcements actions, signOut,
    login, auth callback) switched to `createDevClient`.
  - TopBar `View prod` / `Exit prod view` toggle (`ProdViewToggle` +
    `setProdView` action) + a claret "Prod view · read-only" pill; a prominent
    layout banner while active.
  - Covers the direct-table surfaces (users, photos, crashes, and the editorial
    state on prod). The two `is_admin()`-gated queues (feedback, safeguarding)
    don't appear in prod view yet — that needs those read RPCs to also accept
    `service_role` (a follow-up; deliberately not rewriting live RPCs here).

`tsc` / `eslint` / `build` green. No migration.

## 2026-06-07 — Dev-only dashboard + dev→prod promotion console

Reframe (supersedes the 2026-06-06 env toggle): the dashboard is a **dev-only
workshop**. It always reads/writes the dev project — single dev login, no
toggle. Its *only* relationship to prod is the promotion console: show whether
dev and prod are in sync, and push dev→prod on demand. It never operates
against prod as a session.

- **Removed the env switch entirely** — deleted `EnvSwitch`, `MirrorBanner`,
  `env-server.ts`, the `setAdminEnv` action, the `vestige_admin_env` cookie,
  and the `assertEditableEnv` guards on the editorial actions. `server.ts` /
  `client.ts` / `middleware.ts` / `storage.ts` are now hard-wired to dev via
  `envConfig("dev")`. No per-surface routing, no double-login.
- **Promotion console (`/sync`, super_admin)** — three sections:
  - **Schema & functions** — diffs dev vs prod migrations via the
    `admin_applied_migrations` RPC on each project; flags **held** migrations
    (`prod-migration-hold.txt`); pushes via the iOS-repo `prod-deploy` GitHub
    Action (`db push` + `functions deploy`), which excludes held migrations
    server-side. Live run status polled.
  - **Editorial** — the existing curated/badge/course service-role mirror.
  - **Config/seed** — placeholder (next).
- **Sync-status chip** in the TopBar (replaces the toggle): `DEV` + schema sync
  state (in sync / N to push), linking super_admins to `/sync`.
- New libs: `lib/github/dispatch.ts` (workflow_dispatch + run polling +
  hold-list read), `lib/sync/migrations.ts` (the dev↔prod migration diff),
  `lib/sync/status.ts` (the chip summary).

Needs (Tom-actions): `SUPABASE_ACCESS_TOKEN` on the iOS repo (the other two
Supabase secrets are set) + `GITHUB_DISPATCH_TOKEN` in Vercel. `tsc` / `eslint`
/ `build` green.

## 2026-06-06 — Dev/prod env switch + editorial dev→prod mirror (`/sync`)

Two paired features that close the gap between authoring (dev) and live
TestFlight data (prod). Until now the dashboard read/wrote a single
project fixed by `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY` (dev locally), so
live user data (feedback, crashes, safeguarding, users, photos) on prod
was invisible, and editorial authored on dev (curated lists, badges)
had no way to reach prod. The hard constraint throughout: course /
county / club / badge-definition UUIDs **differ across the two
projects** (the import never sets `id`; badge defs were seeded
independently — proven: badge slug `bucket-25` is `01808dbf…` on dev,
`c25ad290…` on prod), so nothing can be copied by UUID.

### Part A — dev/prod connection switch (view/triage)

The dashboard is now environment-aware. A per-request cookie
(`vestige_admin_env`, default `dev`) selects which Supabase project
every client talks to.

- **`lib/supabase/env.ts`** — isomorphic registry (no `next/headers`, so
  it's safe in the browser bundle). Reads `NEXT_PUBLIC_SUPABASE_URL_DEV
  / _ANON_KEY_DEV / _URL_PROD / _ANON_KEY_PROD`; falls back to the
  legacy unsuffixed vars for dev so nothing breaks before the new vars
  are set. `isEnvConfigured` hides prod when it's unconfigured. Anon
  keys are public + RLS-gated, so both are safe as `NEXT_PUBLIC`.
- **`lib/supabase/env-server.ts`** (`server-only`) — `activeEnvKey()`,
  `activeEnvConfig()`, `activeStorageBase()`, and `assertEditableEnv()`
  (the editorial write guard).
- **`server.ts` / `middleware.ts` / `client.ts`** now build their client
  from the active env. Supabase auth tokens are project-ref-scoped
  (`sb-<ref>-auth-token`), so dev + prod sessions coexist — switching
  just activates the other; the first prod switch prompts a prod login.
- **`storage.ts`** — env-aware base URL. Client reads the cookie; server
  callers pass `activeStorageBase()` (added an optional `baseUrl` arg).
- **`components/admin/EnvSwitch.tsx`** + TopBar — replaced the static
  `NODE_ENV` badge with a real dev/prod toggle (claret for prod). Calls
  the new `setAdminEnv` server action and reloads. Sidebar footer +
  `/sync` nav entry are env/role aware (the entry is super_admin-only).
- **Editorial read-only on prod** — `MirrorBanner` on the curated /
  badges / courses surfaces, backed by `assertEditableEnv()` guards at
  the top of every editorial write action (defence-in-depth; prod is a
  mirror so nothing is authored there). Operational actions
  (feedback / safeguarding / users / photos, and badge grant / revoke /
  backfill which act on real users) are deliberately NOT gated.

### Part B — editorial dev→prod mirror (`/sync`, super_admin only)

A new surface that mirrors all editorial content dev→prod, remapping
every reference through natural keys, with a dry-run preview before
apply. Always runs dev→prod regardless of the viewed env.

- **`lib/sync/clients.ts`** — dev + prod **service-role** clients (read
  dev / write prod, bypassing RLS). Keys are server-only
  (`SUPABASE_SERVICE_ROLE_KEY_DEV/_PROD`), never `NEXT_PUBLIC`, never in
  the repo. `syncConfigStatus()` tells the UI what's missing.
- **`lib/sync/engine.ts`** — the mirror, in dependency order:
  1. **Course editorial overlay** — UPDATE-by-key only (matched by
     `legacy_fid` → `slug`); never inserts/deletes (the import owns
     course rows). Mirrors description / par / yards / style /
     established / type / tier / hole_count + first-time hero-photo copy.
  2. **Curated lists** — full mirror by slug (create / update / delete),
     cover blobs re-keyed + copied to the prod list id, membership
     resolved dev course id → slug → prod course id and replaced
     wholesale (unresolvable members skipped + warned).
  3. **Badge definitions** — full mirror by slug; `criteria` jsonb UUIDs
     (`course_id` / `county_id` / `curated_list_id` / `scope.county_id`)
     rewritten via natural keys (unresolvable → skip + warn, never write
     a dangling ref); art re-keyed + copied; audit columns nulled.
     **Earned-safe deletes:** `badges.definition_id` is
     `ON DELETE CASCADE`, so a delete that would wipe earned badges is
     downgraded to an archive (`is_archived = true`) + warning.
  Idempotent: a second run reports zero changes.
- **`/sync`** — super_admin gate, config-needed panel when keys are
  unset, dry-run → diff report (per-entity create / update / delete /
  archive / skip counts + capped detail rows + warnings) → Apply with an
  inline confirm.

**No migrations** — the mirror uses existing tables + service-role
direct writes (per the "iOS owns all schema" rule).

**Verified:** `tsc --noEmit`, `eslint`, and `next build` all green.

**Tom-action before the live sync/switch runs end-to-end:** (1) bootstrap
Tom (+ Jack) into prod's `admins` table as super_admin (else the prod
switch bounces to `/unauthorized`); (2) set `SUPABASE_SERVICE_ROLE_KEY_DEV
/ _PROD` (server-only) + the four `NEXT_PUBLIC_*_DEV/_PROD` URL+anon vars
in Vercel and local `.env.local`; (3) confirm the `list-covers` /
`badge-art` / `course-covers` buckets exist on prod.

## 2026-06-05 — Badges editor (`/badges`)

New editorial surface for designing the badges users earn — paired with
the iOS `badge_catalogue_for_user` work and the
`20260605140000_editorial_badge_system.sql` migration in the iOS repo
(badges moved from hardcoded enum kinds to admin-authored
`badge_definitions`).

- **Index** (`/badges`) — medallion-thumbnail cards grouped by status
  (live / draft / archived), each summarising its criteria, with a
  "+ New badge" inline create flow. Mirrors the curated-lists index.
- **Editor** (`/badges/[id]`) — sticky **live preview** (earned + locked
  + grid sizes) beside the form:
  - **Visual composer** — glyph picker over a curated SF-Symbol set (+
    free-text override for any valid symbol), theme + tier colour
    swatches, shape / effect selects, hex tint override, and optional
    custom-PNG artwork upload to the `badge-art` bucket.
  - **Editorial** — name / slug / tagline / description / how-to-earn /
    category / series key+rank / display priority / secret flag.
  - **Criteria builder** — no raw SQL: pick a type (reach a number ·
    complete a county · complete a list · play a course · manual), then
    a metric + target (+ optional county/tier/style scope) or an entity
    picker.
  - **Lifecycle** — publish / unpublish, archive, delete, an "award to
    everyone who qualifies" backfill (`admin_backfill_badge_definition`),
    and a paste-a-UUID manual grant / revoke (`admin_grant_badge` /
    `admin_revoke_badge`).
- **`components/badges/BadgeMedallion.tsx`** — an SVG medallion mirroring
  the iOS `BadgeMedallion` (same shapes, palette, tier frames, effects;
  lucide glyph map) so what's designed here is what ships.
- Sidebar gains a **Badges** entry under Editorial.
- No schema changes in this repo — the table + RPCs land in the iOS
  repo's migration (per the "iOS owns all schema" rule). That migration
  is **not yet applied** to the dev project — the editor renders but
  reads/writes need it live (Tom-action).
- TypeScript clean (`tsc --noEmit`), ESLint clean.

## 2026-05-23 — Fixed sidebar, personalised greeting, integrated tools registry

Three coupled changes that turn the shell from "static frame" into
"workbench". The sidebar stops drifting with the page, the greeting
addresses the admin by name, and every external destination lives in
one central registry surfaced both compactly in the sidebar and richly
on the overview.

### Fixed-mount sidebar

- Sidebar is `position: fixed` at `lg+`; the right column gets
  `lg:pl-64` to compensate. The nav scrolls independently inside
  `overflow-y-auto`; brand header and footer stay pinned.
- Main content is normal-flow now (no `overflow-y-auto` wrapper on
  `<main>`), so the document scroll drives the page. TopBar's
  `sticky top-0` still pins to the viewport.
- The pattern: shell is fixed furniture, content is a scrolling
  document. Less jank, less re-layout, no flicker.

### Personalised greeting

- `requireAdmin()` now fetches `display_name` + `username` from
  `public.users` (left join, nullable for admin-only auth rows
  that never finished onboarding). New `AdminUser` shape exposes
  both, plus two helpers — `adminDisplayLabel(admin)` and
  `adminInitials(admin)` — with a fallback ladder: display_name →
  @username → email local-part → "admin".
- TopBar avatar pill shows the display label as the primary line,
  with `@username` (or email) as the secondary. The hero greeting
  on the overview ("Welcome back, Tom") uses the same label.

### Central tools registry

- New `src/lib/admin/tools.ts` — typed `TOOL_GROUPS` with four
  categories: **Data**, **Observability**, **Code & docs**,
  **External**. ~20 links total, with descriptions, icons, and
  enough metadata for both compact (sidebar) and rich (overview)
  renderings.
- Sidebar tool shelf now renders the same registry, grouped by
  category, with section headers — replaces the flat 5-link list.
- Overview "Operator console" (renamed from "Operator tools")
  renders one card per group, each with a header + per-link
  description + arrow affordance. New admins discover what tools
  exist without trial and error.
- Adding a new tool now means editing one file — sidebar and
  overview both light it up.

### Categories at a glance

- **Data** — Supabase SQL editor, Table editor, Auth users,
  Storage buckets, Edge functions, Logs explorer.
- **Observability** — Sentry issues / releases / performance,
  Vercel deployments / logs.
- **Code & docs** — iOS repo, Admin repo, Marketing repo, Admin
  runbook, iOS changelog.
- **External** — Marketing site, Mapbox, App Store Connect,
  Resend.

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
  verification per Vestige-ios §4.6 / §6.3. Trust the user, watch
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
  that already live in `Vestige-ios/supabase/migrations/`.
- TypeScript clean, ESLint clean, `next build` green.
