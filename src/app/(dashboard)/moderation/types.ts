/**
 * Moderation word lists (docs/moderation-plan.md §2 in the iOS repo,
 * migration 20260907110000).
 */

export const MODERATION_CATEGORIES = [
  "slur",
  "profanity",
  "sexual",
  "harassment",
  "self_harm",
  "spam",
  "mild",
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

export type ModerationAction = "block" | "flag";

export type ModerationTier = "identity" | "content" | "private";

export type TermRow = {
  term: string;
  category: ModerationCategory;
  /** Opts the term into Pass B — substring matching on the compact form. */
  compound: boolean;
  /** Optional override; only ever softens. `null` = follow the tier policy. */
  action: ModerationAction | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type AllowWordRow = {
  word: string;
  source: "dictionary" | "catalogue" | "term" | "manual";
  created_at: string;
};

export type AllowPhraseRow = {
  phrase: string;
  source: "catalogue" | "manual";
  created_at: string;
};

export type ModerationVerdict = {
  outcome: "clean" | "flag" | "block";
  matches: { term: string; category: ModerationCategory; pass: "bounded" | "compact" }[];
};

export type TestResult = {
  bounded: string;
  compact: string;
  verdict: ModerationVerdict;
};

/** What each category means, in the words an admin needs rather than the schema's. */
export const CATEGORY_BLURB: Record<ModerationCategory, string> = {
  slur: "Racial, homophobic, ableist. Blocked everywhere, including private notes.",
  profanity: "Strong swearing. Blocked in names and content; flagged in private notes.",
  sexual: "Crude or sexual. Blocked in names and content.",
  harassment: "Threats and abuse aimed at a person. Blocked everywhere.",
  self_harm: "Telling someone to hurt themselves. Blocked everywhere.",
  spam: "Scams, ads, link-dropping. Blocked in names and content.",
  mild: "British banter — shite, bloody, arse. Blocked in names only; fine in a round note.",
};

/** What each tier covers, for the test box's tier picker. */
export const TIER_BLURB: Record<ModerationTier, string> = {
  identity: "Usernames, display names, bios, list titles. Strictest — mild words block too.",
  content: "Comments, round notes, captions, partner names. Banter survives.",
  private: "Own-eyes-only notes and feedback threads. Only slurs and abuse block.",
};

export type FlagRow = {
  id: string;
  user_id: string | null;
  surface: string;
  row_id: string | null;
  tier: ModerationTier;
  excerpt: string | null;
  matches: { term: string; category: ModerationCategory; pass: "bounded" | "compact" }[];
  created_at: string;
  resolved_at: string | null;
  resolution: "reviewed_clean" | "reviewed_actioned" | null;
};

/** Who wrote the flagged text, resolved for display. */
export type FlagAuthor = { id: string; username: string; display_name: string | null };

/** One non-clean row found by the retro-sweep. */
export type SweepRow = {
  surface: string;
  row_id: string | null;
  user_id: string | null;
  username: string | null;
  body: string;
  tier: ModerationTier;
  outcome: "flag" | "block";
  matches: { term: string; category: ModerationCategory; pass: "bounded" | "compact" }[];
};
