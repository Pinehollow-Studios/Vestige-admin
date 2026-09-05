/**
 * Generate every row of `public.email_templates` from `src/lib/email/shell.ts`.
 *
 * WHY THIS EXISTS. Before 2026-09-01 there were three divergent Vestige email
 * shells — one in the stored templates, one in the marketing site, one in the
 * Bunker's starters — and the fleet visibly rendered as two different brands.
 * This script exists so there is exactly one shell: the twelve automatic emails
 * and the composer's starters are built from the same blocks, and a change to
 * `shell.ts` regenerates both rather than drifting from one.
 *
 * Run:
 *   node_modules/.bin/jiti scripts/email-templates/generate.ts
 *
 * Writes to scripts/email-templates/out/{dark,light}/:
 *   <key>.html                  the stored HTML, for eyeballing in a browser
 *   apply-<theme>-<target>.sql  a guarded upsert for prod or dev
 *
 * Applying is deliberate and separate — see the README in this folder.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Appearance,
  button,
  code,
  divider,
  eyebrow,
  h1,
  h2,
  linkFallback,
  milestones,
  p,
  PALETTE,
  panel,
  seal,
  signoff,
  stats,
  wrapEmail,
} from "../../src/lib/email/shell";

type Template = {
  key: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  tokens: string[];
  body: (a: Appearance) => string;
  unsubscribe?: boolean;
  footerNote: string;
};

const CONFIRM = "{{confirmation_url}}";

/** The security notices differ only in their heading and their one line. */
const SECURITY: Array<[string, string, string, string, string, string]> = [
  ["password_changed", "Password changed",
    "Security notice sent when the account password is changed.",
    "Your Vestige password was changed",
    "Password changed",
    "The password on your Vestige account was just changed. If that was you, there&rsquo;s nothing to do."],
  ["email_changed", "Email changed",
    "Security notice sent to the previous address when the account email is changed.",
    "Your Vestige email address was changed",
    "Email address changed",
    "The email address on your Vestige account was just changed. If that was you, there&rsquo;s nothing to do."],
  ["identity_linked", "Sign-in method linked",
    "Security notice sent when a new sign-in method (Apple, Google or email) is linked to the account.",
    "A new sign-in method was added to your Vestige account",
    "New sign-in method added",
    "A new way of signing in - Apple, Google or an email and password - was just added to your Vestige account. If that was you, there&rsquo;s nothing to do."],
  ["identity_unlinked", "Sign-in method removed",
    "Security notice sent when a sign-in method is removed from the account.",
    "A sign-in method was removed from your Vestige account",
    "Sign-in method removed",
    "A way of signing in was just removed from your Vestige account. If that was you, there&rsquo;s nothing to do."],
  ["account_changed", "Account setting changed",
    "Fallback security notice for phone and MFA changes. Those toggles are off, so it should never fire - seeded so it can never render unstyled.",
    "Your Vestige account was updated",
    "Account setting changed",
    "A sign-in setting on your Vestige account was just changed. If that was you, there&rsquo;s nothing to do."],
];

/** Appearance-aware: the link ink must come from the palette, not a literal. */
const support = (a: Appearance) =>
  "If this wasn&rsquo;t you, change your password from the sign-in screen straight away, " +
  `then email <a href="mailto:support@pinehollow.studio" style="color:${PALETTE[a].ink2};` +
  'text-decoration:underline;">support@pinehollow.studio</a> and we&rsquo;ll help.';

/** A link email: one action, so one gradient button, plus the URL in plain text. */
function action(kicker: string, heading: string, line: string, label: string) {
  return (a: Appearance) =>
    eyebrow(kicker, a) + h1(heading, a) + p(line, a) + button(label, CONFIRM, a) + linkFallback(CONFIRM, a);
}

const TEMPLATES: Template[] = [
  {
    key: "welcome",
    name: "Welcome",
    description: "Sent once when a new member finishes onboarding.",
    subject: "Welcome to Vestige",
    preheader: "Your collection starts here. How Vestige works, and what happens next.",
    // Personal figures come from `send-welcome` at send time (see the token
    // notes in the README). The stats pair is fully tokenised so the function
    // can choose the member's own numbers or the England-wide pair; the
    // template never has to know which.
    tokens: [
      "first_name",
      "username",
      "app_url",
      "stat1_value",
      "stat1_label",
      "stat2_value",
      "stat2_label",
      "founding_number",
      "unsubscribe_url",
    ],
    unsubscribe: true,
    footerNote:
      "You&rsquo;re getting this because you created a Vestige account. It&rsquo;s a one-off welcome, not a mailing list.",
    body: (a) =>
      eyebrow("You&rsquo;re in", a) +
      h1("Welcome, {{first_name}}.", a) +
      p("Ask most golfers how many courses they&rsquo;ve played and you&rsquo;ll get a shrug, maybe a story about a links in Cornwall. What you won&rsquo;t get is a number. Now you will.", a) +
      stats([
        { value: "{{stat1_value}}", label: "{{stat1_label}}" },
        { value: "{{stat2_value}}", label: "{{stat2_label}}" },
      ], a) +
      p("Every course you mark from here fills in a little more of the map, and the counties tick up as you go.", a) +
      button("Open Vestige", "{{app_url}}", a) +
      divider(a) +
      h2("Two things you can do at a course", a) +
      p(`<strong style="color:${PALETTE[a].ink};font-weight:600;">Mark it played.</strong> One tap, and a lifetime fact: you&rsquo;ve been there. This is what fills the map, completes counties and counts towards your collection. One per course, no date needed.`, a) +
      p(`<strong style="color:${PALETTE[a].ink};font-weight:600;">Log a round.</strong> A dated visit, with the holes, a score if you kept one, photos, and who you played with. Log as many as you like at the same course. Tag a friend and the course counts towards their collection too.`, a) +
      p("From here on you mark courses one at a time, from the map or the course page. That&rsquo;s deliberate. A mark should mean you were there, or nobody&rsquo;s collection means much.", a) +
      divider(a) +
      h2("Better with company", a) +
      p("Add a friend and you can see each other&rsquo;s maps, compare collections and settle who&rsquo;s been to more. Your profile is private until you say otherwise, and the link below is how someone finds you.", a) +
      p(`<a href="{{app_url}}" style="color:${PALETTE[a].ink};text-decoration:underline;">vestige.golf/u/{{username}}</a>`, a) +
      // Window-only: pull this panel when the founding programme closes
      // (after the March 2027 launch), and revisit the beta line at each
      // release window - it reads as written to a private-beta tester.
      panel(
        seal("Founding member {{founding_number}}", a) +
          '<p style="margin:0;font-size:14px;line-height:21px;">You&rsquo;re one of the first people using Vestige. A numbered founding badge and six months of Pro are already on your account, and the badge stops being given out at launch.</p>' +
          '<p style="margin:10px 0 0 0;font-size:14px;line-height:21px;">This is a beta, so parts of the app are still being built and some things will move between versions. If something looks wrong, shake your phone anywhere in the app to send us a note. It attaches what you were looking at, and we reply in the app.</p>',
        a,
      ) +
      divider(a) +
      h2("What happens next", a) +
      milestones([
        ["Now", "Beta on TestFlight.", "New builds arrive every week or two, and TestFlight updates them for you."],
        ["Oct 2026", "Public beta.", "Opens to the waiting list at vestige.golf."],
        ["Jan 2027", "Version 1.0.", "Publicly available, and free. The full app, for anyone who wants in early."],
        ["Mar 2027", "Launch day.", "Vestige, out in the world, free for everyone."],
      ], a) +
      p("A vestige is the trace something leaves behind, and every round you play leaves one. This is where you keep them.", a, true) +
      signoff("- Jack and Tom", a),
  },
  {
    key: "password_reset",
    name: "Password reset",
    description: 'Sent when a member taps "Forgot password?".',
    subject: "Reset your Vestige password",
    preheader: "Choose a new password. The link works once and expires shortly.",
    tokens: ["confirmation_url", "unsubscribe_url"],
    footerNote:
      "If you didn&rsquo;t ask to reset your password you can ignore this email, and your account stays exactly as it is. The link works once and expires shortly.",
    body: action("Account", "Reset your password",
      "Tap below to choose a new password. Open it on the device you asked for the reset from, so it can hand you back to the app.",
      "Set a new password"),
  },
  {
    key: "confirm_signup",
    name: "Confirm signup",
    description: "Sent to confirm a new email/password signup (only if email confirmation is turned on).",
    subject: "Confirm your Vestige email",
    preheader: "One tap to confirm your address and finish setting up your account.",
    tokens: ["confirmation_url", "unsubscribe_url"],
    footerNote: "If you didn&rsquo;t create a Vestige account, you can ignore this email.",
    body: action("Account", "Confirm your email",
      "Tap below to confirm your address and finish setting up your Vestige account.",
      "Confirm email"),
  },
  {
    key: "magic_link",
    name: "Magic link",
    description: "Sent when a member requests a one-tap sign-in link.",
    subject: "Your Vestige sign-in link",
    preheader: "Your sign-in link. It works once and expires shortly.",
    tokens: ["confirmation_url", "unsubscribe_url"],
    footerNote: "If you didn&rsquo;t ask to sign in, you can ignore this email.",
    body: action("Sign in", "Sign in to Vestige",
      "Tap below to sign in. The link works once and expires shortly.", "Sign in"),
  },
  {
    key: "email_change",
    name: "Email change",
    description: "Sent to confirm a change of email address.",
    subject: "Confirm your new Vestige email",
    preheader: "Confirm the new address on your Vestige account.",
    tokens: ["confirmation_url", "new_email", "unsubscribe_url"],
    footerNote:
      "If you didn&rsquo;t ask to change your email you can ignore this, and your account keeps the address it has.",
    body: (a) =>
      eyebrow("Account", a) +
      h1("Confirm your new email", a) +
      p(`Confirm <span style="color:${PALETTE[a].ink};">{{new_email}}</span> as the address for your Vestige account.`, a) +
      button("Confirm new email", CONFIRM, a) +
      linkFallback(CONFIRM, a),
  },
  {
    key: "reauthentication",
    name: "Reauthentication code",
    description: "Sent a one-time code to confirm a sensitive change.",
    subject: "Your Vestige verification code",
    preheader: "Your one-time code. It expires shortly.",
    tokens: ["token", "unsubscribe_url"],
    footerNote:
      "If you didn&rsquo;t ask for a code, you can ignore this email. Nobody can use it without your account.",
    body: (a) =>
      eyebrow("Security", a) +
      h1("Your verification code", a) +
      p("Use this code to confirm it&rsquo;s you:", a) +
      code("{{token}}", a),
  },
  {
    key: "invite",
    name: "Invite",
    description: "Sent when someone is invited to Vestige.",
    subject: "You’re invited to Vestige",
    preheader: "An invitation to Vestige - the map of every course you&rsquo;ve played in England.",
    tokens: ["confirmation_url", "unsubscribe_url"],
    footerNote: "If you weren&rsquo;t expecting this, you can ignore this email.",
    body: action("An invitation", "You&rsquo;re invited",
      "Vestige is a map of every golf course you&rsquo;ve played in England. Mark the ones you&rsquo;ve been to, watch the counties fill in, and see how your collection compares with your friends&rsquo;.",
      "Accept invite"),
  },
  ...SECURITY.map(([key, name, description, subject, heading, line]) => ({
    key, name, description, subject,
    preheader: line.replace(/&rsquo;/g, "’").split(". ")[0] + ".",
    tokens: [] as string[],
    footerNote:
      "We send this whenever a sign-in detail changes, so a change you didn&rsquo;t make never goes unnoticed. It isn&rsquo;t a mailing list and you can&rsquo;t turn it off.",
    body: (a: Appearance) =>
      eyebrow("Security", a) + h1(heading, a) + p(line, a) + panel(support(a), a, "alert"),
  })),
];

// ── Emit ─────────────────────────────────────────────────────────────────────

const TARGETS: Record<string, [string, string]> = {
  prod: ["ujbnupjrbroskzwaeulj", "PROD (vestige-ios-prod)"],
  dev: ["lztggqifpzpnjwqwigks", "dev (Vestige-iOS-Dev)"],
};

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

/** The stored HTML: the shell, plus the preheader these senders do NOT inject. */
function build(t: Template, a: Appearance): string {
  const html = wrapEmail({
    body: t.body(a),
    appearance: a,
    footerNote: t.footerNote,
    unsubscribe: t.unsubscribe,
    // No address line: transactional and security mail is exempt, and the
    // placeholder must never reach an inbox.
  });
  const hidden =
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">` +
    `${t.preheader}${"&#8199;&#847;".repeat(30)}</div>`;
  return html.replace(/(<body[^>]*>)/i, `$1\n${hidden}`);
}

const root = join(import.meta.dirname ?? __dirname, "out");

for (const appearance of ["dark", "light"] as Appearance[]) {
  const dir = join(root, appearance);
  mkdirSync(dir, { recursive: true });
  const built = TEMPLATES.map((t) => ({ ...t, html: build(t, appearance) }));

  for (const t of built) writeFileSync(join(dir, `${t.key}.html`), t.html);

  for (const [target, [ref, label]] of Object.entries(TARGETS)) {
    const rows = built
      .map((t) =>
        `(${lit(t.key)}, ${lit(t.name)}, ${lit(t.description)}, ${lit(t.subject)}, ` +
        `${lit(t.html)}, array[${t.tokens.map(lit).join(", ")}]::text[])`)
      .join(",\n");
    writeFileSync(
      join(dir, `apply-${appearance}-${target}.sql`),
      `-- Vestige email templates - the whole set on the ${appearance.toUpperCase()} shell.
-- Target: ${label}, ref ${ref}.
-- GENERATED by scripts/email-templates/generate.ts from src/lib/email/shell.ts.
-- Do not hand-edit: change the shell or the template definitions and regenerate.
--
-- Editorial content only: no schema change, and no app version reads this table,
-- so it ships without a build. The guard aborts unless this is ${target}.

do $guard$ begin
  if (select decrypted_secret from vault.decrypted_secrets
      where name = 'process_photo_url') not like '%${ref}%' then
    raise exception 'GUARD: not ${target} (${ref}) - refusing to write';
  end if;
end $guard$;

insert into public.email_templates (key, name, description, subject, html, available_tokens) values
${rows}
on conflict (key) do update set
    name             = excluded.name,
    description      = excluded.description,
    subject          = excluded.subject,
    html             = excluded.html,
    available_tokens = excluded.available_tokens,
    updated_at       = now();

select key, length(html) as html_len, updated_at from public.email_templates order by key;
`,
    );
  }

  // The send-welcome Edge Function's fallback, as a module it can import: the
  // stored dark 'welcome' row byte-for-byte, so a failed email_templates read
  // is invisible to the recipient. Copy it over
  // vestige-ios/supabase/functions/send-welcome/welcome_fallback.ts and
  // redeploy whenever the welcome changes (README: "What the senders add").
  if (appearance === "dark") {
    const w = built.find((t) => t.key === "welcome");
    if (!w) throw new Error("no welcome template to emit a fallback for");
    writeFileSync(
      join(dir, "welcome_fallback.ts"),
      `// GENERATED by vestige-bunker/scripts/email-templates/generate.ts - do not edit.
// The stored 'welcome' row of public.email_templates, byte-for-byte, for
// send-welcome to fall back on when the table read returns nothing. To change
// the welcome: edit the generator, regenerate, apply the SQL, copy this file
// over supabase/functions/send-welcome/welcome_fallback.ts, redeploy.
export const WELCOME_FALLBACK_SUBJECT = ${JSON.stringify(w.subject)};
export const WELCOME_FALLBACK_TOKENS: readonly string[] = ${JSON.stringify(w.tokens)};
export const WELCOME_FALLBACK_HTML = ${JSON.stringify(w.html)};
`,
    );
  }

  console.log(`${appearance.padEnd(5)} -> ${dir}`);
  for (const t of built) {
    console.log(`  ${t.key.padEnd(20)} ${String(t.html.length).padStart(6)}b  ${t.subject}`);
  }
}
