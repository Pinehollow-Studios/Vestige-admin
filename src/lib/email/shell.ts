/**
 * The Vestige email shell — the single source of truth for how any email we send
 * looks, whoever writes it.
 *
 * This is the same shell the automatic templates in `public.email_templates` are
 * built on (applied to prod + dev 2026-09-01), so a campaign written here is
 * indistinguishable from the welcome or a password reset. If the two ever drift,
 * the stored templates win and this file is stale.
 *
 * Built to the Vestige Design System kit generated 2026-08-30 from iOS 0.4.1
 * (`~/Documents/VESTIGE/Vestige Design System`). Every colour below is a palette
 * token by name. Do not eyedrop, do not invent, and never derive a light value by
 * darkening a dark one — the light family was retuned in August 2026 and is
 * chosen independently (§4.4).
 *
 * WHAT THE SENDERS DO, SO THIS DOESN'T DOUBLE UP
 *   • `send-email-campaign` and `send-test-email` inject the preheader themselves
 *     (`withPreheader`), so `wrapEmail` deliberately does NOT emit one. Use
 *     `previewEmail` to see what actually lands.
 *   • Both replace `{{first_name}}` and `{{unsubscribe_url}}` at send time, and
 *     strip any placeholder that went unresolved.
 */

// ── Palette ──────────────────────────────────────────────────────────────────
// Dark is the brand default for outward-facing work. Light exists as a standby.

export type Appearance = "dark" | "light";

type Palette = {
  surface: string;
  raised: string;
  well: string;
  ink: string;
  ink2: string;
  ink3: string;
  accent: string;
  accentLime: string;
  onAccent: string;
  alert: string;
  border: string;
  separator: string;
  glow: string;
  wash: string;
  step: string;
  cardShadow: string;
  icon: string;
  gradientPng: string;
};

export const PALETTE: Record<Appearance, Palette> = {
  dark: {
    surface: "#070A10", // Theme.Color.surface
    raised: "#0C1220", // Theme.Color.surfaceRaised
    well: "#070A10", // recessed panel ground
    ink: "#F2EFE6", // Theme.Color.textPrimary — warm cream, never white
    ink2: "#9DA9B6", // Theme.Color.textSecondary
    ink3: "#66717E", // Theme.Color.textTertiary
    accent: "#5BE4C3", // Theme.Color.accent / accentInk
    accentLime: "#8FE85B", // Theme.Color.accentLime
    onAccent: "#06231C", // Theme.Color.onAccent (anchored)
    alert: "#E2664E", // Theme.Color.alert
    border: "rgba(255,255,255,0.12)",
    separator: "rgba(255,255,255,0.10)",
    glow: "rgba(62,116,176,0.20)", // Theme.Color.atmosphereGlow
    wash: "rgba(27,45,66,0.22)", // Theme.Color.atmosphereWash
    // accentInk clears AA on dark (12.58:1), so mint may carry small text.
    step: "#5BE4C3",
    cardShadow: "none",
    icon: "https://vestige.golf/brand/icon-192.png",
    gradientPng: "https://vestige.golf/brand/email-gradient-mint-dark.png",
  },
  light: {
    surface: "#ECF1F9",
    raised: "#E7EEFC",
    well: "rgba(14,24,34,0.04)", // Theme.Color.surfaceSunken
    ink: "#0E1822",
    ink2: "#4A5662",
    ink3: "#7E8A96",
    accent: "#14CCA0", // NOT #5BE4C3 — that is the dark mint (§4.4)
    accentLime: "#18DC5A", // steps lighter than accent, deliberately
    onAccent: "#06231C", // anchored — same ink on the gradient in both modes
    alert: "#B83A24",
    border: "rgba(14,24,34,0.10)",
    separator: "rgba(14,24,34,0.10)",
    glow: "rgba(76,134,200,0.18)",
    wash: "rgba(186,212,242,0.55)",
    // accentInk is 1.82:1 on light — a documented AA departure — so mint never
    // carries text here and colour is never the only signal.
    step: "#0E1822",
    cardShadow: "0 6px 12px rgba(20,40,60,0.10)", // Theme.Elevation.s1
    icon: "https://vestige.golf/brand/vestige-appicon-light-192.png",
    gradientPng: "https://vestige.golf/brand/email-gradient-mint-light.png",
  },
};

export const FONT =
  "Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** The footer strap. Kept identical to the automatic templates. */
export const FOOTER_STRAP = "Vestige &middot; Every course in England, tracked.";

/**
 * The sender's legal identity, shown quietly in every footer.
 *
 * Taken verbatim from the registered office in `vestige-marketing/legal/`
 * (terms-of-service.md, privacy-policy.md, beta-testing-agreement.md) and the
 * live privacy page, all of which agree. If the company details ever move, they
 * move there first and this follows.
 *
 * It is on EVERY email, not just campaigns. A UK limited company's business
 * correspondence carries its trading disclosures - registered name, number,
 * place of registration and registered office - and a password reset from
 * Pinehollow is business correspondence. US CAN-SPAM separately requires a
 * physical address on commercial mail, which the campaigns are.
 */
export const COMPANY_FOOTER =
  "Pinehollow Studios Limited &middot; Registered in England and Wales, " +
  "company number 17212889 &middot; 82A James Carter Road, Mildenhall, " +
  "Bury St. Edmunds, IP28 7DE, United Kingdom";

// ── Content blocks ───────────────────────────────────────────────────────────
// Everything a campaign can contain. Each returns a fragment for the card body,
// so a writer never has to touch table markup.

/** §7.3 — a mint dot and a tracked uppercase caption. One per section, at most. */
export function eyebrow(text: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  return (
    `<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;` +
    `text-transform:uppercase;color:${t.ink2};">` +
    `<span style="display:inline-block;width:6px;height:6px;border-radius:999px;` +
    `background-color:${t.accent};margin-right:8px;vertical-align:middle;"></span>` +
    `<span style="vertical-align:middle;">${text}</span></div>`
  );
}

/** The one loud thing. Manrope display, negative tracking. */
export function h1(text: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  return (
    `<h1 style="margin:14px 0 0 0;font-size:30px;line-height:34px;font-weight:500;` +
    `letter-spacing:-0.8px;color:${t.ink};">${text}</h1>`
  );
}

export function h2(text: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  return (
    `<h2 style="margin:28px 0 0 0;font-size:20px;line-height:26px;font-weight:600;` +
    `letter-spacing:-0.3px;color:${t.ink};">${text}</h2>`
  );
}

export function p(text: string, a: Appearance = "dark", lead = false): string {
  const t = PALETTE[a];
  const size = lead ? "16px;line-height:25px" : "15px;line-height:24px";
  return `<p style="margin:16px 0 0 0;font-size:${size};color:${lead ? t.ink : t.ink2};">${text}</p>`;
}

/** A numbered list. Steps are ink on light, where mint as text fails AA. */
export function steps(items: string[], a: Appearance = "dark"): string {
  const t = PALETTE[a];
  const rows = items
    .map(
      (s, i) =>
        `<tr><td style="padding:0 0 ${i < items.length - 1 ? "10px" : "0"} 0;` +
        `font-size:15px;line-height:22px;color:${t.ink2};">` +
        `<span style="color:${t.step};font-weight:700;">${i + 1}</span> &nbsp; ${s}</td></tr>`,
    )
    .join("");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:14px 0 0 0;">${rows}</table>`
  );
}

/** A recessed panel with a coloured rule. `tone` picks the rule colour. */
export function panel(
  inner: string,
  a: Appearance = "dark",
  tone: "accent" | "alert" = "accent",
): string {
  const t = PALETTE[a];
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:26px 0 0 0;"><tr>` +
    `<td class="vs-panel" style="background-color:${t.well};` +
    `border-left:3px solid ${tone === "alert" ? t.alert : t.accent};border-radius:6px;` +
    `padding:16px 18px;font-size:14px;line-height:21px;color:${t.ink2};">${inner}</td>` +
    `</tr></table>`
  );
}

/** Two big honest numbers side by side. §12's "one loud thing". */
export function stats(
  pairs: Array<{ value: string; label: string }>,
  a: Appearance = "dark",
): string {
  const t = PALETTE[a];
  const w = Math.floor(100 / Math.max(1, pairs.length));
  const cells = pairs
    .map(
      (s, i) =>
        `<td width="${w}%" style="padding:0 12px 0 ${i === 0 ? "0" : "12px"};` +
        `${i === 0 ? "" : `border-left:1px solid ${t.separator};`}">` +
        `<div class="vs-num" style="font-size:44px;line-height:46px;font-weight:500;` +
        `letter-spacing:-1.6px;color:${t.ink};">${s.value}</div>` +
        `<div style="margin-top:4px;font-size:10px;font-weight:700;letter-spacing:1.4px;` +
        `text-transform:uppercase;color:${t.ink3};">${s.label}</div></td>`,
    )
    .join("");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:28px 0 0 0;"><tr>${cells}</tr></table>`
  );
}

export function divider(a: Appearance = "dark"): string {
  return (
    `<div style="height:1px;background:${PALETTE[a].separator};margin:28px 0 0 0;` +
    `font-size:0;line-height:0;">&nbsp;</div>`
  );
}

export function signoff(text: string, a: Appearance = "dark"): string {
  return `<p style="margin:22px 0 0 0;font-size:15px;line-height:24px;color:${PALETTE[a].ink};">${text}</p>`;
}

/**
 * A gradient pill carrying a short label. §5's third sanctioned moment — an
 * achievement or completion beat — and the only gradient allowed on an email
 * that has no call to action. Same four render layers as `button`, minus the
 * VML, since it is a label and not a link.
 */
export function seal(label: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tr>` +
    `<td bgcolor="${t.accent}" background="${t.gradientPng}" ` +
    `style="border-radius:999px;background-color:${t.accent};` +
    `background-image:linear-gradient(135deg,${t.accent} 0%,${t.accentLime} 100%);` +
    `background-repeat:no-repeat;background-position:center;background-size:cover;` +
    `padding:6px 14px;font-size:10px;font-weight:700;letter-spacing:1.2px;` +
    `text-transform:uppercase;color:${t.onAccent};">${label}</td>` +
    `</tr></table>`
  );
}

/** The button's destination in plain text, for clients that mangle the button. */
export function linkFallback(href: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  return (
    `<p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:${t.ink3};">` +
    `Or paste this into your browser:<br>` +
    `<a href="${href}" style="color:${t.ink2};word-break:break-all;text-decoration:underline;">${href}</a></p>`
  );
}

/** A one-time code, set large and tracked out in a bordered well. */
export function code(value: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:20px 0 0 0;"><tr>` +
    `<td class="vs-panel" align="center" style="background-color:${t.well};` +
    `border:1px solid ${t.border};border-radius:14px;padding:22px 18px;">` +
    `<div class="vs-ink" style="font-size:38px;line-height:42px;font-weight:600;` +
    `letter-spacing:8px;color:${t.ink};">${value}</div></td>` +
    `</tr></table>`
  );
}

/**
 * The signature gradient on the one sanctioned moment: the hero call to action
 * (§5, moment 1). ONE per email — a second gradient is the fastest way to stop
 * looking like Vestige.
 *
 * Four independent layers, so the gradient survives every client it can and the
 * worst case is still on-system:
 *
 *   1. VML `<v:fill type="gradient">` — Outlook's Word engine renders neither CSS
 *      gradients nor border-radius, and this is the only thing it understands.
 *   2. `background-image: linear-gradient(...)` — a true vector gradient in Apple
 *      Mail, iOS Mail and most modern clients.
 *   3. The `background` ATTRIBUTE pointing at a gradient PNG. **This is the layer
 *      that fixes Gmail**, which strips CSS gradients and is why a button
 *      previously arrived as a flat block of colour.
 *   4. `bgcolor` solid mint under everything, for anything left over and for a
 *      recipient with images turned off. Flat `accent` is a legitimate fill, so
 *      even the last resort is a design-system colour rather than a broken one.
 */
export function button(label: string, href: string, a: Appearance = "dark"): string {
  const t = PALETTE[a];
  // Outlook needs a fixed pixel width; approximate it from the label.
  const width = Math.min(360, Math.max(180, label.length * 10 + 68));
  const vml =
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" ` +
    `xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" ` +
    `style="height:50px;v-text-anchor:middle;width:${width}px;" arcsize="50%" ` +
    `stroke="f" fillcolor="${t.accent}">` +
    `<v:fill type="gradient" color="${t.accent}" color2="${t.accentLime}" angle="135"/>` +
    `<w:anchorlock/>` +
    `<center style="color:${t.onAccent};font-family:Helvetica,Arial,sans-serif;` +
    `font-size:16px;font-weight:bold;">${label}</center>` +
    `</v:roundrect><![endif]-->`;
  return (
    vml +
    `<!--[if !mso]><!-->` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0 0;"><tr>` +
    `<td align="center" bgcolor="${t.accent}" background="${t.gradientPng}" ` +
    `style="border-radius:999px;background-color:${t.accent};` +
    `background-image:linear-gradient(135deg,${t.accent} 0%,${t.accentLime} 100%);` +
    `background-repeat:no-repeat;background-position:center;background-size:cover;">` +
    `<a href="${href}" style="display:inline-block;padding:15px 32px;font-family:${FONT};` +
    `font-size:16px;font-weight:700;letter-spacing:-0.2px;color:${t.onAccent};` +
    `text-decoration:none;border-radius:999px;">${label}</a>` +
    `</td></tr></table>` +
    `<!--<![endif]-->`
  );
}

// ── The shell ────────────────────────────────────────────────────────────────

export type WrapOptions = {
  /** Card content, built from the blocks above. */
  body: string;
  appearance?: Appearance;
  /** Footer line above the unsubscribe. */
  footerNote?: string;
  /** Marketing email: show the visible unsubscribe link. */
  unsubscribe?: boolean;
  /**
   * Overrides the sender identity line. Defaults to COMPANY_FOOTER, which is
   * what every email should carry; pass `null` only for a surface that genuinely
   * must not show it.
   */
  address?: string | null;
};

/**
 * Wrap body content in the Vestige shell. Emits no preheader — the senders
 * inject that — so this is exactly what gets stored on the campaign row.
 */
export function wrapEmail(opts: WrapOptions): string {
  const a = opts.appearance ?? "dark";
  const t = PALETTE[a];
  const unsub = opts.unsubscribe
    ? ` <a href="{{unsubscribe_url}}" style="color:${t.ink2};text-decoration:underline;">Unsubscribe</a>.`
    : "";
  const note = opts.footerNote ?? "";
  const address = opts.address === undefined ? COMPANY_FOOTER : opts.address;
  const addressLine = address
    ? `\n    <p style="margin:8px 0 0 0;font-size:11px;line-height:17px;color:${t.ink3};">${address}</p>`
    : "";

  return `<!doctype html><html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" \
xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8">\
<meta http-equiv="X-UA-Compatible" content="IE=edge">\
<meta name="viewport" content="width=device-width,initial-scale=1">\
<meta name="x-apple-disable-message-reformatting">\
<meta name="color-scheme" content="${a}"><meta name="supported-color-schemes" content="${a}">\
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch>\
</o:OfficeDocumentSettings></xml><![endif]-->\
<style>@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');\
:root{color-scheme:${a};supported-color-schemes:${a};}\
.vs-body,[data-ogsb] .vs-body{background-color:${t.surface}!important;}\
.vs-card,[data-ogsb] .vs-card{background-color:${t.raised}!important;}\
.vs-panel,[data-ogsb] .vs-panel{background-color:${t.raised}!important;}\
[data-ogsc] .vs-ink{color:${t.ink}!important;}[data-ogsc] .vs-ink2{color:${t.ink2}!important;}\
@media (max-width:600px){.vs-pad{padding:28px 22px!important;}.vs-num{font-size:40px!important;}}\
</style></head>\
<body class="vs-body" style="margin:0;padding:32px 0;background-color:${t.surface};\
background-image:radial-gradient(120% 65% at 50% 0%, ${t.glow}, transparent 70%),\
radial-gradient(120% 60% at 50% 100%, ${t.wash}, transparent 70%);font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:0 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;margin:0 auto;">
  <tr><td style="padding:2px 4px 20px 4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="width:40px;padding-right:12px;"><img src="${t.icon}" width="40" height="40" alt="" style="display:block;border:0;border-radius:9px;"></td>
      <td><div class="vs-ink" style="font-size:21px;font-weight:600;letter-spacing:-0.3px;color:${t.ink};">Vestige</div></td>
    </tr></table>
  </td></tr>
  <tr><td class="vs-card vs-pad" style="background-color:${t.raised};border:1px solid ${t.border};border-radius:18px;padding:32px 28px;box-shadow:${t.cardShadow};">
${opts.body}
  </td></tr>
  <tr><td style="padding:18px 4px 0 4px;">
    <div style="height:1px;background:${t.separator};margin:0 0 14px 0;font-size:0;line-height:0;">&nbsp;</div>
    <p style="margin:0;font-size:12px;line-height:18px;color:${t.ink3};">${FOOTER_STRAP}</p>
    <p style="margin:8px 0 0 0;font-size:12px;line-height:18px;color:${t.ink3};">${note}${unsub}</p>${addressLine}
  </td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * What the recipient actually sees: the stored HTML with the preheader prepended
 * exactly as `send-email-campaign` and `send-test-email` do it. Use this for the
 * composer preview so the preview and the send can never disagree.
 */
export function previewEmail(html: string, preheader: string | null | undefined): string {
  if (!preheader || !preheader.trim()) return html;
  const escaped = preheader
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const hidden =
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">` +
    `${escaped}${"&#8199;&#847;".repeat(30)}</div>`;
  return html.replace(/(<body[^>]*>)/i, `$1${hidden}`);
}
