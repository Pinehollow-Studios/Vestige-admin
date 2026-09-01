/**
 * Live legal/deliverability checks for an email being composed. Pure + synchronous
 * so the composer can re-run it on every keystroke.
 *
 * Marketing email (UK PECR / GDPR + US CAN-SPAM for any US recipients) legally
 * needs: a working unsubscribe, clear sender identity, and a valid postal address.
 * Transactional/"service" messages (the app's bypass-consent mode) are exempt from
 * the marketing-specific rules, so those checks soften to info there.
 */

export type CheckLevel = "pass" | "warn" | "fail";
export type ComplianceCheck = { id: string; label: string; level: CheckLevel; hint: string };

// A UK postcode (loose) or a US ZIP — enough to tell "an address was added".
const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|\d{5}(-\d{4})?)\b/i;
const ADDRESS_PLACEHOLDER = /\[add postal address\]/i;

export function checkEmailCompliance(opts: {
  subject: string;
  html: string;
  preheader: string;
  isServiceMessage: boolean;
}): ComplianceCheck[] {
  const { subject, html, preheader, isServiceMessage } = opts;
  const h = html || "";
  const lower = h.toLowerCase();

  // What the recipient actually reads: conditional comments and <style> blocks
  // out first (they carry Outlook VML and CSS keywords), then tags, then the few
  // entities our templates use. Prose checks run against this, never raw HTML.
  const visibleText = h
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const hasUnsub = h.includes("{{unsubscribe_url}}") || /unsubscribe/i.test(lower);
  const hasSender = /vestige/i.test(lower);
  const hasAddress = POSTCODE.test(h) && !ADDRESS_PLACEHOLDER.test(h);
  const addressPlaceholderLeft = ADDRESS_PLACEHOLDER.test(h);

  const checks: ComplianceCheck[] = [];

  // Subject
  checks.push(
    subject.trim()
      ? { id: "subject", label: "Subject line", level: "pass", hint: "Set." }
      : { id: "subject", label: "Subject line", level: "fail", hint: "Add a subject — it can't be empty." },
  );

  // Content
  checks.push(
    h.trim()
      ? { id: "content", label: "Content", level: "pass", hint: "Written." }
      : { id: "content", label: "Content", level: "fail", hint: "Write the email body." },
  );

  // Unsubscribe — required for marketing, exempt for service messages.
  if (hasUnsub) {
    checks.push({ id: "unsub", label: "Unsubscribe link", level: "pass", hint: "Present — recipients can opt out." });
  } else if (isServiceMessage) {
    checks.push({ id: "unsub", label: "Unsubscribe link", level: "warn", hint: "Service messages are exempt, but include one unless this is strictly transactional." });
  } else {
    checks.push({ id: "unsub", label: "Unsubscribe link", level: "fail", hint: "Legally required. Add {{unsubscribe_url}} (every template's footer has it)." });
  }

  // Sender identity
  checks.push(
    hasSender
      ? { id: "sender", label: "Sender identity", level: "pass", hint: "Vestige is named." }
      : { id: "sender", label: "Sender identity", level: "warn", hint: "Name who it's from (Vestige) somewhere in the email." },
  );

  // Postal address — required by US CAN-SPAM (any US recipients) and best practice
  // everywhere. Surfaced prominently, but a warning not a hard block (UK PECR
  // doesn't mandate it, and a pre-launch list may not have one yet).
  if (hasAddress) {
    checks.push({ id: "address", label: "Postal address", level: "pass", hint: "An address is included." });
  } else {
    checks.push({
      id: "address",
      label: "Postal address",
      level: "warn",
      hint: addressPlaceholderLeft
        ? "Replace “[add postal address]” in the footer — legally required if any recipients are in the US."
        : "Add a physical postal address to the footer — legally required if any recipients are in the US.",
    });
  }

  // Preheader — deliverability best practice, never blocking.
  checks.push(
    preheader.trim()
      ? { id: "preheader", label: "Preview text", level: "pass", hint: "Set." }
      : { id: "preheader", label: "Preview text", level: "warn", hint: "Add a preheader — it's the line shown after the subject in most inboxes." },
  );

  // ── Rendering and design-system checks ────────────────────────────────────
  // Each of these is a failure mode we have actually shipped at least once.

  // Dark appearance must be declared, or Apple Mail and Outlook re-tint the
  // near-blacks and the email arrives as washed-out grey.
  checks.push(
    /color-scheme/i.test(h)
      ? { id: "scheme", label: "Dark declared", level: "pass", hint: "color-scheme is set, so clients render it as authored." }
      : { id: "scheme", label: "Dark declared", level: "warn", hint: "Built from a starter? This should be there. Without color-scheme, Outlook and Apple Mail re-tint the dark surfaces." },
  );

  // Gmail strips CSS gradients. Without the background-image fallback the button
  // arrives as a flat block of colour.
  const gradients = (h.match(/linear-gradient/g) ?? []).length;
  if (gradients === 0) {
    checks.push({ id: "gradient", label: "Gradient button", level: "pass", hint: "No gradient used — flat accent is on-system." });
  } else if (!/background="https?:\/\/[^"]*gradient[^"]*"/i.test(h)) {
    checks.push({ id: "gradient", label: "Gradient button", level: "warn", hint: "The gradient has no image fallback, so Gmail will render it as a solid block. Use the starter's button." });
  } else if (gradients > 2) {
    checks.push({ id: "gradient", label: "Gradient button", level: "warn", hint: "More than one gradient moment. The design system rations it to one per email." });
  } else {
    checks.push({ id: "gradient", label: "Gradient button", level: "pass", hint: "VML, CSS gradient, image fallback and a solid underneath — renders everywhere." });
  }

  // Gmail clips a message over ~102KB and hides everything after the cut,
  // including the unsubscribe link.
  const bytes = new TextEncoder().encode(h).length;
  checks.push(
    bytes < 92_000
      ? { id: "size", label: "Message size", level: "pass", hint: `${Math.round(bytes / 1024)}KB — well under Gmail's clipping point.` }
      : { id: "size", label: "Message size", level: bytes < 102_000 ? "warn" : "fail", hint: `${Math.round(bytes / 1024)}KB. Gmail clips around 102KB and hides everything after the cut, unsubscribe included. Shorten it or drop an embedded image.` },
  );

  // Every image needs an alt attribute: roughly half of recipients see the alt
  // text before they see the picture.
  const imgs = h.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = imgs.filter((t) => !/\balt=/i.test(t)).length;
  if (imgs.length === 0) {
    checks.push({ id: "alt", label: "Image alt text", level: "pass", hint: "No images." });
  } else {
    checks.push(
      missingAlt === 0
        ? { id: "alt", label: "Image alt text", level: "pass", hint: `${imgs.length} image${imgs.length === 1 ? "" : "s"}, all with alt.` }
        : { id: "alt", label: "Image alt text", level: "warn", hint: `${missingAlt} image${missingAlt === 1 ? "" : "s"} without alt. Images are blocked by default in many clients.` },
    );
  }

  // House voice, mechanically checkable. Em dashes are a bug, not a preference.
  // Run against VISIBLE TEXT only — CSS is full of `color`, `!important` and
  // `center`, and matching those would make this warning fire on every email.
  const voice: string[] = [];
  if (/—/.test(visibleText)) voice.push("an em dash (use a spaced hyphen)");
  if (/!/.test(visibleText)) voice.push("an exclamation mark");
  const usSpelling = visibleText.match(/\b(colors?|centers?|personalize\w*|organiz\w+|favorite)\b/i);
  if (usSpelling) voice.push(`a US spelling (“${usSpelling[0]}”)`);
  checks.push(
    voice.length === 0
      ? { id: "voice", label: "House voice", level: "pass", hint: "en-GB, no em dashes, no exclamation marks." }
      : { id: "voice", label: "House voice", level: "warn", hint: `Found ${voice.join(", ")}.` },
  );

  // Colours from the retired 2025 shell, or the dark mint on a light ground.
  const stale = /#3FA889|#F4F6F5|#0E1116/i.test(h);
  checks.push(
    stale
      ? { id: "palette", label: "Palette", level: "warn", hint: "This contains colours from the old email shell (#3FA889 / #F4F6F5). Start from a template to get the current palette." }
      : { id: "palette", label: "Palette", level: "pass", hint: "No retired colours." },
  );

  return checks;
}

/** True when nothing legally blocks a send (no `fail`). Warnings are allowed. */
export function canSend(checks: ComplianceCheck[]): boolean {
  return !checks.some((c) => c.level === "fail");
}

export function complianceSummary(checks: ComplianceCheck[]): { fails: number; warns: number } {
  return {
    fails: checks.filter((c) => c.level === "fail").length,
    warns: checks.filter((c) => c.level === "warn").length,
  };
}
