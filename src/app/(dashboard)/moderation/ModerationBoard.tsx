"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, FlaskConical, Plus, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  grantUsernameRepick,
  resetField,
  resolveFlag,
  runSweep,
  setAllowPhrase,
  setAllowWord,
  setTermActive,
  testText,
  upsertTerm,
} from "./actions";
import {
  CATEGORY_BLURB,
  MODERATION_CATEGORIES,
  TIER_BLURB,
  type AllowPhraseRow,
  type AllowWordRow,
  type FlagAuthor,
  type FlagRow,
  type SweepRow,
  type ModerationCategory,
  type ModerationTier,
  type TermRow,
  type TestResult,
} from "./types";

const CATEGORY_TONE: Record<ModerationCategory, string> = {
  slur: "bg-red-500/15 text-red-300 border-red-500/30",
  profanity: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  sexual: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  harassment: "bg-red-500/15 text-red-300 border-red-500/30",
  self_harm: "bg-red-500/15 text-red-300 border-red-500/30",
  spam: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  mild: "bg-ink-3/15 text-ink-2 border-ink-3/30",
};

const OUTCOME_TONE = {
  clean: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  flag: "border-amber/40 bg-amber/10 text-amber",
  block: "border-red-500/40 bg-red-500/10 text-red-300",
} as const;

export function ModerationBoard({
  terms,
  allowWords,
  allowPhrases,
  flags,
  authors,
  gateDeployed,
}: {
  terms: TermRow[];
  allowWords: AllowWordRow[];
  allowPhrases: AllowPhraseRow[];
  flags: FlagRow[];
  authors: Record<string, FlagAuthor>;
  gateDeployed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ModerationCategory | "all">("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (!q) return true;
      return t.term.includes(q) || (t.note ?? "").toLowerCase().includes(q);
    });
  }, [terms, query, categoryFilter]);

  const counts = useMemo(() => {
    const map = new Map<ModerationCategory, number>();
    for (const t of terms) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return map;
  }, [terms]);

  function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.message ?? "That didn't work");
      }
    });
  }

  return (
    <div className="space-y-6">
      <FlagQueue
        flags={flags}
        authors={authors}
        gateDeployed={gateDeployed}
        pending={pending}
        onResolve={(id, resolution) =>
          run(() => resolveFlag(id, resolution), "Flag resolved")
        }
      />

      <TestBox />

      <SweepPanel />

      <AddTermForm
        pending={pending}
        onSubmit={(input) => run(() => upsertTerm(input), `Added "${input.term}"`)}
      />

      {/* Terms ------------------------------------------------------------ */}
      <section className="space-y-3">
        <header className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-sm font-semibold">
            Terms <span className="text-ink-3">({terms.length})</span>
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a term"
                className="h-8 w-48 pl-7 text-xs"
              />
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            label={`All ${terms.length}`}
          />
          {MODERATION_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
              label={`${c.replace("_", " ")} ${counts.get(c) ?? 0}`}
              tone={CATEGORY_TONE[c]}
            />
          ))}
        </div>

        {categoryFilter !== "all" && (
          <p className="text-xs text-ink-3">{CATEGORY_BLURB[categoryFilter]}</p>
        )}

        <ul className="divide-y divide-ink-3/10 rounded-xl border border-ink-3/15">
          {visible.map((t) => (
            <li
              key={t.term}
              className={cn(
                "flex flex-wrap items-center gap-2 px-3 py-2 text-sm",
                !t.is_active && "opacity-45",
              )}
            >
              <span className="font-mono">{t.term}</span>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                  CATEGORY_TONE[t.category],
                )}
              >
                {t.category.replace("_", " ")}
              </span>
              {t.compound && (
                <span
                  className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300"
                  title="Also matched inside run-together words — this is what catches Willylongcock"
                >
                  compound
                </span>
              )}
              {t.action === "flag" && (
                <span className="rounded-full border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-[10px] text-amber">
                  never blocks
                </span>
              )}
              {t.note && <span className="text-xs text-ink-3">{t.note}</span>}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                className="ml-auto h-7 text-xs"
                onClick={() =>
                  run(
                    () => setTermActive(t.term, !t.is_active),
                    t.is_active ? `"${t.term}" switched off` : `"${t.term}" switched back on`,
                  )
                }
              >
                {t.is_active ? "Switch off" : "Switch on"}
              </Button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-ink-3">Nothing matches that.</li>
          )}
        </ul>
      </section>

      {/* Allow-list ------------------------------------------------------- */}
      <WordList
        title="Allow-list"
        count={allowWords.length}
        blurb="Known-good words that contain a compound term. Without these the matcher blocks Cockfosters, Penistone and Scunthorpe. Generated from the dictionary and every club name — add one when a real name slips through."
        placeholder="e.g. cookridge"
        items={allowWords.map((w) => ({ key: w.word, label: w.word, removable: w.source === "manual" }))}
        pending={pending}
        onAdd={(word) => run(() => setAllowWord(word, true), `"${word}" allowed`)}
        onRemove={(word) => run(() => setAllowWord(word, false), `"${word}" removed`)}
      />

      <WordList
        title="Allow-phrases"
        count={allowPhrases.length}
        blurb="Club names whose own words trip the matcher — Cocks Moors Woods Golf Course is a real municipal course. The phrase is stripped before matching, so the club is typable while the bare word stays blocked."
        placeholder="e.g. cocks moors woods golf course"
        items={allowPhrases.map((p) => ({
          key: p.phrase,
          label: p.phrase,
          removable: p.source === "manual",
        }))}
        pending={pending}
        onAdd={(phrase) => run(() => setAllowPhrase(phrase, true), "Phrase allowed")}
        onRemove={(phrase) => run(() => setAllowPhrase(phrase, false), "Phrase removed")}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function FilterChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] capitalize transition",
        active ? (tone ?? "border-ink-1/40 bg-ink-1/10 text-ink-1") : "border-ink-3/20 text-ink-3",
      )}
    >
      {label}
    </button>
  );
}

/** The test box. Type anything, see exactly what the live lists do with it. */
function TestBox() {
  const [text, setText] = useState("");
  const [tier, setTier] = useState<ModerationTier>("content");
  const [result, setResult] = useState<TestResult | null>(null);
  const [pending, startTransition] = useTransition();

  function check() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await testText(text, tier);
      if (res.ok && res.data) setResult(res.data);
      else {
        setResult(null);
        toast.error(res.ok ? "No result" : res.message);
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-ink-3/20 p-4">
      <header className="space-y-0.5">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
          <FlaskConical className="size-3.5" /> Try it
        </h2>
        <p className="text-xs text-ink-3">
          Run any text through the lists as they are right now, and see which term caught it.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Type something a user might type"
          className="h-9 min-w-64 flex-1 text-sm"
        />
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as ModerationTier)}
          className="h-9 rounded-md border border-ink-3/20 bg-transparent px-2 text-xs"
        >
          <option value="identity">Identity</option>
          <option value="content">Content</option>
          <option value="private">Private</option>
        </select>
        <Button size="sm" className="h-9" disabled={pending} onClick={check}>
          Check
        </Button>
      </div>
      <p className="text-xs text-ink-3">{TIER_BLURB[tier]}</p>

      {result && (
        <div className="space-y-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-wide",
              OUTCOME_TONE[result.verdict.outcome],
            )}
          >
            {result.verdict.outcome === "clean" ? (
              <ShieldCheck className="size-3.5" />
            ) : (
              <Ban className="size-3.5" />
            )}
            {result.verdict.outcome}
          </div>

          {result.verdict.matches.length > 0 && (
            <ul className="space-y-1 text-xs">
              {result.verdict.matches.map((m) => (
                <li key={`${m.term}-${m.pass}`} className="text-ink-2">
                  <span className="font-mono">{m.term}</span>{" "}
                  <span className="text-ink-3">
                    ({m.category.replace("_", " ")},{" "}
                    {m.pass === "compact" ? "found inside a word" : "whole word"})
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* The normal forms are the honest explanation of any surprise. */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] text-ink-3">
            <dt>Reads as</dt>
            <dd className="font-mono">{result.bounded || "—"}</dd>
            <dt>Squashed</dt>
            <dd className="font-mono">{result.compact || "—"}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}

function AddTermForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (input: {
    term: string;
    category: ModerationCategory;
    compound: boolean;
    action: "block" | "flag" | null;
    note: string | null;
  }) => void;
}) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<ModerationCategory>("profanity");
  const [compound, setCompound] = useState(true);
  const [softened, setSoftened] = useState(false);

  return (
    <section className="space-y-3 rounded-2xl border border-ink-3/20 p-4">
      <header className="space-y-0.5">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
          <Plus className="size-3.5" /> Add a term
        </h2>
        <p className="text-xs text-ink-3">
          Takes effect on the server immediately, and on phones at their next refresh. No build, no
          App Review.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="word or phrase"
          className="h-9 w-56 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ModerationCategory)}
          className="h-9 rounded-md border border-ink-3/20 bg-transparent px-2 text-xs capitalize"
        >
          {MODERATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          <input type="checkbox" checked={compound} onChange={(e) => setCompound(e.target.checked)} />
          Match inside words
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          <input type="checkbox" checked={softened} onChange={(e) => setSoftened(e.target.checked)} />
          Flag only, never block
        </label>
        <Button
          size="sm"
          className="h-9"
          disabled={pending || !term.trim()}
          onClick={() => {
            onSubmit({
              term: term.trim().toLowerCase(),
              category,
              compound,
              action: softened ? "flag" : null,
              note: null,
            });
            setTerm("");
          }}
        >
          Add
        </Button>
      </div>

      <p className="text-xs text-ink-3">{CATEGORY_BLURB[category]}</p>
      {compound && (
        <p className="text-xs text-ink-3">
          Matching inside words is what catches a run-together name. Leave it off for short stems
          like <span className="font-mono">ass</span> or <span className="font-mono">fag</span>,
          which turn up inside ordinary English.
        </p>
      )}
    </section>
  );
}

function WordList({
  title,
  count,
  blurb,
  placeholder,
  items,
  pending,
  onAdd,
  onRemove,
}: {
  title: string;
  count: number;
  blurb: string;
  placeholder: string;
  items: { key: string; label: string; removable: boolean }[];
  pending: boolean;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((i) => i.label.includes(q)) : items;
    return expanded || q ? base : base.slice(0, 24);
  }, [items, query, expanded]);

  return (
    <section className="space-y-3 rounded-2xl border border-ink-3/20 p-4">
      <header className="space-y-0.5">
        <h2 className="font-heading text-sm font-semibold">
          {title} <span className="text-ink-3">({count})</span>
        </h2>
        <p className="text-xs text-ink-3">{blurb}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              onAdd(value.trim().toLowerCase());
              setValue("");
            }
          }}
          placeholder={placeholder}
          className="h-8 w-64 text-xs"
        />
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          disabled={pending || !value.trim()}
          onClick={() => {
            onAdd(value.trim().toLowerCase());
            setValue("");
          }}
        >
          <Check className="size-3.5" /> Allow
        </Button>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 w-40 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filtered.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1 rounded-full border border-ink-3/20 px-2 py-0.5 font-mono text-[11px] text-ink-2"
          >
            {item.label}
            {item.removable && (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(item.key)}
                className="text-ink-3 transition hover:text-red-300"
                aria-label={`Remove ${item.label}`}
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {filtered.length === 0 && <span className="text-xs text-ink-3">Nothing matches that.</span>}
      </div>

      {!expanded && !query && items.length > filtered.length && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setExpanded(true)}
        >
          Show all {items.length}
        </Button>
      )}
    </section>
  );
}

/**
 * The flag queue — content that was WRITTEN and is worth a human look.
 *
 * Blocks are deliberately not here: the trigger that refuses a write raises,
 * and the raise rolls back anything it might have recorded about itself, so a
 * blocked attempt cannot log itself server-side. Those arrive as the client's
 * `moderation_blocked` analytics event instead (tier and category, never the
 * text). What lands here is the ambiguous middle: an evasion shape that only
 * flagged, or something worse than swearing that did not meet the block bar for
 * its tier. Ordinary banter never reaches this list by design.
 */
function FlagQueue({
  flags,
  authors,
  gateDeployed,
  pending,
  onResolve,
}: {
  flags: FlagRow[];
  authors: Record<string, FlagAuthor>;
  gateDeployed: boolean;
  pending: boolean;
  onResolve: (id: string, resolution: "reviewed_clean" | "reviewed_actioned") => void;
}) {
  if (!gateDeployed) {
    return (
      <section className="rounded-2xl border border-ink-3/20 p-4">
        <h2 className="font-heading text-sm font-semibold">Needs a look</h2>
        <p className="mt-0.5 text-xs text-ink-3">
          The gate migration isn&apos;t deployed on this environment yet, so nothing is being
          flagged. The word lists below are live and editable regardless — they are what the app
          screens against.
        </p>
      </section>
    );
  }

  if (flags.length === 0) {
    return (
      <section className="rounded-2xl border border-ink-3/20 p-4">
        <h2 className="font-heading text-sm font-semibold">Needs a look</h2>
        <p className="mt-0.5 text-xs text-ink-3">
          Nothing queued. Ordinary swearing never lands here — only evasion shapes and
          anything worse than swearing that flagged rather than blocked.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-amber/30 p-4">
      <header className="space-y-0.5">
        <h2 className="font-heading text-sm font-semibold text-amber">
          Needs a look <span className="text-ink-3">({flags.length})</span>
        </h2>
        <p className="text-xs text-ink-3">
          Written content the filter flagged rather than refused. Resolve as a false positive
          (and add the word to the allow-list so it stops), or as actioned once you have dealt
          with it.
        </p>
      </header>

      <ul className="space-y-2">
        {flags.map((flag) => {
          const author = flag.user_id ? authors[flag.user_id] : undefined;
          return (
            <li key={flag.id} className="space-y-1.5 rounded-xl border border-ink-3/15 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span className="font-mono text-ink-2">{flag.surface}</span>
                <span>·</span>
                <span>{flag.tier}</span>
                {author && (
                  <>
                    <span>·</span>
                    <span>@{author.username}</span>
                  </>
                )}
                <span>·</span>
                <span>{new Date(flag.created_at).toLocaleString("en-GB")}</span>
              </div>

              {flag.excerpt && <p className="text-sm text-ink-1">{flag.excerpt}</p>}

              <div className="flex flex-wrap items-center gap-1.5">
                {flag.matches.map((m) => (
                  <span
                    key={`${m.term}-${m.pass}`}
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[10px]",
                      CATEGORY_TONE[m.category],
                    )}
                  >
                    {m.term} · {m.pass === "compact" ? "inside a word" : "whole word"}
                  </span>
                ))}
                <div className="ml-auto flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={pending}
                    onClick={() => onResolve(flag.id, "reviewed_clean")}
                  >
                    False positive
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    disabled={pending}
                    onClick={() => onResolve(flag.id, "reviewed_actioned")}
                  >
                    Actioned
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The retro-sweep — everything ALREADY stored, scored against the live lists.
 *
 * Run it after any term-list change: it answers "what would this newly catch"
 * before you find out from a confused tester. It is read-only, so running it
 * against production is safe. The remedies underneath are not read-only, and
 * are deliberately one row at a time — the production sweep on 2026-09-07
 * returned three rows out of seventy-eight, so there is nothing here worth
 * automating and a lot worth reading.
 */
function SweepPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<SweepRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  function sweep() {
    startTransition(async () => {
      const res = await runSweep();
      if (res.ok) {
        setRows(res.data ?? []);
        toast.success(`${res.data?.length ?? 0} row(s) not clean`);
      } else {
        toast.error(res.message);
      }
    });
  }

  function remedy(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(success);
        const refreshed = await runSweep();
        if (refreshed.ok) setRows(refreshed.data ?? []);
        router.refresh();
      } else {
        toast.error(res.message ?? "That didn't work");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-ink-3/20 p-4">
      <header className="flex flex-wrap items-start gap-2">
        <div className="space-y-0.5">
          <h2 className="font-heading text-sm font-semibold">Existing content</h2>
          <p className="text-xs text-ink-3">
            Scores everything already stored against the lists as they are now. Read-only —
            run it whenever you change a term to see what the change would newly catch.
          </p>
        </div>
        <Button size="sm" className="ml-auto h-8" disabled={pending} onClick={sweep}>
          Run sweep
        </Button>
      </header>

      {rows !== null && rows.length === 0 && (
        <p className="text-xs text-emerald-300">Everything stored is clean.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={`${row.surface}-${row.row_id}-${i}`}
              className="space-y-1.5 rounded-xl border border-ink-3/15 p-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[10px] uppercase",
                    row.outcome === "block"
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-amber/40 bg-amber/10 text-amber",
                  )}
                >
                  {row.outcome}
                </span>
                <span className="font-mono text-ink-2">{row.surface}</span>
                {row.username && <span>· @{row.username}</span>}
              </div>

              <p className="text-sm text-ink-1">{row.body}</p>

              <div className="flex flex-wrap items-center gap-1.5">
                {row.matches.map((m) => (
                  <span
                    key={`${m.term}-${m.pass}`}
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[10px]",
                      CATEGORY_TONE[m.category],
                    )}
                  >
                    {m.term} · {m.pass === "compact" ? "inside a word" : "whole word"}
                  </span>
                ))}

                {/* Remedies exist only for the two fields an admin can put
                    right without deleting someone's content. A flagged
                    comment is a judgement call, not a field to reset. */}
                {row.user_id && row.surface === "users.display_name" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto h-7 text-xs"
                    disabled={pending}
                    onClick={() => {
                      const message = window.prompt(
                        "What should the user be told? They get this in their feedback thread.",
                        "We had to reset your display name — it didn't pass our content rules. You can pick a new one in Edit profile.",
                      );
                      if (!message) return;
                      remedy(
                        () => resetField(row.user_id as string, "display_name", message),
                        "Name reset and the user told",
                      );
                    }}
                  >
                    Reset name
                  </Button>
                )}
                {row.user_id && row.surface === "users.bio" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto h-7 text-xs"
                    disabled={pending}
                    onClick={() => {
                      const message = window.prompt(
                        "What should the user be told?",
                        "We had to clear your bio — it didn't pass our content rules. You can write a new one in Edit profile.",
                      );
                      if (!message) return;
                      remedy(
                        () => resetField(row.user_id as string, "bio", message),
                        "Bio cleared and the user told",
                      );
                    }}
                  >
                    Clear bio
                  </Button>
                )}
                {row.user_id && row.surface === "users.username" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto h-7 text-xs"
                    disabled={pending}
                    onClick={() => {
                      const message = window.prompt(
                        "What should the user be told? They choose their own new handle — you are not renaming them.",
                        "Your handle didn't pass our content rules, so we've given you a one-off change. Pick a new one in Edit profile.",
                      );
                      if (!message) return;
                      remedy(
                        () => grantUsernameRepick(row.user_id as string, message),
                        "Re-pick granted and the user told",
                      );
                    }}
                  >
                    Let them re-pick
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
