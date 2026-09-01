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

## Known gap

`send-welcome` and `auth-email-hook` each carry hardcoded fallback HTML, used when
the `email_templates` read returns nothing. Both fallbacks are still the retired
light shell, and they fire silently with no log line — which is the most likely
explanation for a light welcome email arriving on 31 August 2026. Replacing them
with this shell needs an Edge Function deploy, which is blocked by the iOS freeze
until 4 September.
