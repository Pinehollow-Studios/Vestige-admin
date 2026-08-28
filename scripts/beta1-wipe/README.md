# Beta-1 prod wipe — 2026-08-28

One-shot reset of the production database ahead of beta 1. Removes every app
user account and all user-generated data, plus operational history (analytics
events, push events, announcements, broadcasts, feedback reports, crash
telemetry); keeps app content (courses, clubs, counties, curated lists, badge
definitions, clubhouse events, society modes, scout bundles), admin fabric
(flags + history, changelog, notification/email templates, configs, promo
codes, dataset imports), and the whole marketing spine — waitlist subscribers,
waitlist + email campaigns, and email send history (per Tom, 2026-08-28).

**These scripts are not migrations and must never be replayed.** They live here
as a record of exactly what was run.

> **Channel warning:** `supabase db query --linked` in vestige-ios points at
> **DEV** (`lztggqifpzpnjwqwigks`). Everything prod-side here goes through
> psql (`/opt/homebrew/opt/libpq/bin/psql`) to the eu-west-1 session pooler as
> `postgres.ujbnupjrbroskzwaeulj`, password in
> `~/Documents/VESTIGE/vestige-prod-db-password.txt`, or through the service
> role key in `.env.local` (the `_PROD` variables).

## Kept auth accounts

- `tom@pinehollow.studio` — Tom's Bunker login (super_admin)
- `jack@pinehollow.studio` — Jack's Bunker login (super_admin)
- `agent@vestige.golf` — vestige-tool editorial scripts login (editor)

Everything else in `auth.users` is deleted — the five app accounts including
both partners and the App Review demo account; `ON DELETE CASCADE` clears all
user-generated tables. None of the three kept accounts has an app profile, so
`public.users` ends at 0.

## Order of operations

1. **Snapshot** (read-only): `node scripts/beta1-wipe/01-snapshot.mjs`
   → JSON per table + storage index in `~/Documents/VESTIGE/backups/beta1-wipe-2026-08-28/`,
   plus a `pg_dump` archive (`prod-pre-wipe.dump`, public + auth schemas) taken
   via the pooler.
2. **Wipe** (destructive, single transaction, self-aborting guards):
   `02-wipe.sql` via psql (exact command in the file header).
   Also resets the founding-member window to open-at-now for beta 1.
3. **Storage cleanup** (destructive): `node scripts/beta1-wipe/03-storage-cleanup.mjs`
   (dry run), then `--apply`. Empties `photos-original`, `photos-rendered`,
   `avatars`, `feedback-screenshots`; in `list-covers` keeps only `curated/*`
   and `events/*`.
4. **Manual (App Store Connect, Tom)**: remove both partners from the internal
   TestFlight group.
5. **Re-onboard**: Tom + Jack sign into the app fresh (new accounts), re-grant
   Pro via the Bunker if wanted.

## Verification after the wipe

- `02-wipe.sql` prints kept auth emails + intact course count on success and
  rolls back entirely on any guard failure (content-table drift, wrong auth
  count, any wiped table non-empty).
- Note: wiping the 18 feedback reports also removes the 14 changelog↔report
  links (`app_version_change_reports`); the changelog entries themselves are
  guarded and survive untouched.
- `03-storage-cleanup.mjs --apply` re-lists each bucket and fails if any doomed
  object survived.
- Bunker: analytics reads zero (correct), flags/changelog/curated/courses intact.
