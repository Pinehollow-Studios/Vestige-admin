# Email templates

Generates every row of `public.email_templates` — the twelve emails the app sends
by itself — from the one shell in [`src/lib/email/shell.ts`](../../src/lib/email/shell.ts).

That shell is also what the composer's starters are built from, so a campaign
written in the Bunker and a password reset from the app are the same email with
different words in it. **Change the shell, regenerate, re-apply.** Do not edit the
stored HTML by hand in Supabase, and do not edit it in the Bunker's Automatic tab
unless you mean to break the link with this generator.

## Why it exists

Until 1 September 2026 there were three separate Vestige email shells: one in the
stored templates, one on the marketing site, one in the Bunker's starters. They
had drifted far enough that the fleet visibly rendered as two different brands —
seven emails on a dark shell, four on a 2025 white card using a mint that is in no
palette. This generator makes that recurrence a merge conflict rather than a
surprise in someone's inbox.

## Generate

```bash
node_modules/.bin/jiti scripts/email-templates/generate.ts
```

Writes `out/{dark,light}/` — one HTML file per template, for opening in a browser,
plus four guarded SQL files. `out/` is gitignored: it is reproducible from the
shell, and the shell is the thing under review.

## Apply

The dark set is what we send. The light set is a standby: applying it swaps all
twelve at once if we ever need light.

Each SQL file carries a guard that aborts the transaction unless it is running
against the project named in the filename, so `apply-dark-prod.sql` physically
cannot write to dev. Run it from the **iOS** repo, which holds `env-guard.sh`:

```bash
cd ../vestige-ios && ./scripts/env-guard.sh prod && supabase db query --linked --project-ref ujbnupjrbroskzwaeulj -f ../vestige-bunker/scripts/email-templates/out/dark/apply-dark-prod.sql
```

Then the same for `dev` / `lztggqifpzpnjwqwigks`. Back up first:

```bash
supabase db query --linked --project-ref <ref> "select key, name, description, subject, html, available_tokens::text as toks from public.email_templates order by key;" --output-format json > before.json
```

To confirm both projects match, compare the fingerprint:

```sql
select md5(string_agg(md5(html), '' order by key)) from public.email_templates;
```

## What the senders add

Two things are deliberately **not** in the stored HTML, because the Edge Functions
add them and it would double up:

- **Campaign preheaders.** `send-email-campaign` and `send-test-email` inject the
  hidden preview line from the campaign row. The twelve automatic templates *do*
  carry their own, because `send-welcome` and `auth-email-hook` do not inject one.
- **Token values.** `{{first_name}}`, `{{unsubscribe_url}}`, `{{confirmation_url}}`,
  `{{new_email}}` and `{{token}}` are substituted at send time, and anything
  unresolved is stripped.

### The welcome's personal tokens

`send-welcome` works out the member's own figures at send time and hands them
to the template as tokens, so the stored HTML never has to branch:

| Token | What the function puts in it |
|---|---|
| `{{first_name}}` | First word of `display_name`, or "there". |
| `{{username}}` | Their handle, for the profile link. |
| `{{app_url}}` | `https://vestige.golf/u/<username>` — a universal link, so it opens the app when installed and the web profile when not. |
| `{{stat1_value}}` / `{{stat1_label}}` | Courses on their map (club-grouped, the same base as the profile's played count). If they marked nothing in onboarding, the England-wide course count labelled "Courses waiting". |
| `{{stat2_value}}` / `{{stat2_label}}` | The size of their home county ("Courses in Surrey", club-grouped like the county sheet). No home county → England's course count; no marks at all → the county count labelled "Counties to fill". |
| `{{founding_number}}` | "#12" from the founding badge's serial, or empty. |

Every figure is best-effort — a failed read degrades to the England-wide pair,
never to a blocked send or a wrong zero.

## The welcome fallback

`send-welcome` falls back to built-in HTML when the `email_templates` read returns
nothing. Since 4 September 2026 that fallback is **generated here**: the dark run
also writes `out/dark/welcome_fallback.ts`, the stored `welcome` row byte-for-byte
as a module. After changing the welcome, copy it over
`vestige-ios/supabase/functions/send-welcome/welcome_fallback.ts` and redeploy the
function, so a failed read is invisible to the recipient rather than a stale
email. (`auth-email-hook` still hand-builds its fallback shell; it carries the
same footer strap and is edited in step.)
