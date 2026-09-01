/**
 * Ready-made, on-brand email starters for the composer. Jack picks one, it drops
 * into the content box already looking like Vestige, and he edits the words.
 *
 * Every starter is assembled from the blocks in `shell.ts`, which is the same
 * shell the automatic templates in `public.email_templates` are built on. That
 * is the point: an email written here is indistinguishable from the welcome or a
 * password reset. Nothing in this file defines a colour, a size or a font — if a
 * starter needs something new, add a block to `shell.ts` so every email gets it.
 *
 * The rules the blocks encode, so a writer cannot break them by accident:
 *   • Dark, always, with the appearance declared so no client re-tints it.
 *   • One accent, and the mint→lime gradient only on the single primary button.
 *   • en-GB, sentence case, no exclamation marks, no em dashes (spaced hyphen).
 *   • {{first_name}} personalises; {{unsubscribe_url}} is in every marketing footer.
 */

import {
  button,
  divider,
  eyebrow,
  h1,
  h2,
  p,
  panel,
  signoff,
  stats,
  steps,
  wrapEmail,
} from "./shell";

export type EmailStarter = {
  key: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  html: string;
};

/** Marketing footer note — every starter here is a campaign, so all carry it. */
const NOTE =
  "You&rsquo;re getting this because you have a Vestige account.";

function marketing(body: string): string {
  // The sender identity line comes from the shell by default, so a campaign
  // cannot go out without it.
  return wrapEmail({ body, footerNote: NOTE, unsubscribe: true });
}

export const EMAIL_STARTERS: EmailStarter[] = [
  {
    key: "announcement",
    name: "Announcement",
    description: "One clear message with a button.",
    subject: "A quick update from Vestige",
    preheader: "Something new from the team.",
    html: marketing(
      eyebrow("Announcement") +
        h1("Hi {{first_name}}, we&rsquo;ve got news") +
        p("Tell them the one thing you want them to know, in a sentence or two. Keep it human and understated.") +
        p("Add the detail that matters - what&rsquo;s changing, when, and why it&rsquo;s good for them.") +
        button("See what&rsquo;s new", "https://vestige.golf"),
    ),
  },
  {
    key: "product_update",
    name: "Product update",
    description: "A headline and a couple of sections.",
    subject: "What&rsquo;s new in Vestige",
    preheader: "The latest, in brief.",
    html: marketing(
      eyebrow("Product update") +
        h1("Hi {{first_name}}, here&rsquo;s what&rsquo;s new") +
        p("A short line to set up the update.") +
        h2("The first thing") +
        p("Describe the first improvement in a line or two.") +
        h2("The second thing") +
        p("Describe the second improvement.") +
        divider() +
        button("Open Vestige", "https://vestige.golf"),
    ),
  },
  {
    key: "milestone",
    name: "Milestone",
    description: "Big numbers doing the talking.",
    subject: "Your collection so far",
    preheader: "The numbers on your map.",
    html: marketing(
      eyebrow("Where you are") +
        h1("Hi {{first_name}}, here&rsquo;s your year") +
        p("One line of context before the numbers. Keep it dry - the figures carry it.") +
        stats([
          { value: "0", label: "Courses played" },
          { value: "0", label: "Counties started" },
        ]) +
        p("Say what the numbers mean, or what would move them next.") +
        button("Open your map", "https://vestige.golf"),
    ),
  },
  {
    key: "note",
    name: "Personal note",
    description: "Plain and personal - reads like a letter.",
    subject: "A note from Vestige",
    preheader: "Just a quick hello.",
    html: marketing(
      p("Hi {{first_name}},", "dark", true) +
        p("Write this like you&rsquo;re emailing one person. Say the thing you want to say, plainly.") +
        p("Sign off warmly.") +
        signoff("- Jack and Tom"),
    ),
  },
  {
    key: "launch",
    name: "Launch or invite",
    description: "A hero line, a date, and one call to action.",
    subject: "You&rsquo;re in early",
    preheader: "Be among the first in.",
    html: marketing(
      eyebrow("You&rsquo;re on the list") +
        h1("Hi {{first_name}}, it&rsquo;s almost time") +
        p("One line of quiet anticipation - what&rsquo;s coming, and why they&rsquo;ll want it.") +
        panel(
          "<strong>When</strong><br>Add the date here, plainly. A date is a status readout, never a pressure lever.",
        ) +
        button("Get ready", "https://vestige.golf"),
    ),
  },
  {
    key: "service",
    name: "Service notice",
    description: "Something went wrong, or is about to change.",
    subject: "About your Vestige account",
    preheader: "A short service notice.",
    html: marketing(
      eyebrow("Service notice") +
        h1("Something you should know") +
        p("Say what happened, in one sentence, without hedging.") +
        p("Then say what it means for them, and what happens next.") +
        panel(
          "If you need anything, reply to this email or write to support@pinehollow.studio and we&rsquo;ll help.",
          "dark",
          "alert",
        ) +
        signoff("- Jack and Tom"),
    ),
  },
  {
    key: "steps",
    name: "How to",
    description: "A short numbered walkthrough.",
    subject: "Getting the most out of Vestige",
    preheader: "Three things worth doing.",
    html: marketing(
      eyebrow("How to") +
        h1("Hi {{first_name}}, three things worth doing") +
        p("A line to set up why these three.") +
        steps([
          "The first thing to do, and what happens when they do it.",
          "The second thing.",
          "The third thing.",
        ]) +
        button("Open Vestige", "https://vestige.golf"),
    ),
  },
  {
    key: "blank",
    name: "Blank (branded)",
    description: "Just the Vestige shell - write your own.",
    subject: "",
    preheader: "",
    html: marketing(eyebrow("Vestige") + h1("Hi {{first_name}},") + p("Start writing here.")),
  },
];
