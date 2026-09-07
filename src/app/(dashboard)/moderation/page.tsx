import { pageShell } from "@/components/admin/PageShell";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { ModerationBoard } from "./ModerationBoard";
import type { AllowPhraseRow, AllowWordRow, FlagAuthor, FlagRow, TermRow } from "./types";

export const dynamic = "force-dynamic";

/**
 * Moderation — the word lists behind the app's text filter
 * (docs/moderation-plan.md §2 in the iOS repo, migration 20260907110000).
 *
 * The point of this page is that the term list is never finished: every week of
 * real use turns up a word nobody thought of. Adding one here reaches the
 * server immediately and phones at their next refresh — no build, no App
 * Review. That loop is why the list lives in a table rather than in the binary.
 *
 * Reads/writes go through the service-role client, gated by the layout's
 * requireAdmin(); the mutation RPCs are SECURITY DEFINER and is_admin()-gated
 * on their own account too.
 */
export default async function ModerationPage() {
  const supabase = await tryCreateServiceClient();

  if (!supabase) {
    return (
      <div className={pageShell("wide")}>
        <SectionHeader eyebrow="Operations" title="Moderation" />
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-ink-2">
          Needs the service-role key for the active environment to read/write the word lists.
        </div>
      </div>
    );
  }

  const [termsRes, allowRes, phrasesRes, flagsRes] = await Promise.all([
    supabase.from("moderation_terms").select("*").order("category").order("term"),
    supabase.from("moderation_allow_list").select("*").order("word"),
    supabase.from("moderation_allow_phrases").select("*").order("phrase"),
    supabase
      .from("moderation_flags")
      .select("*")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // `moderation_flags` ships with the GATE migration (20260907130000), which is
  // deliberately held back until a build that understands the rejection is
  // live. Until then the table does not exist on this environment and the
  // query errors — so say that, rather than rendering an empty queue that
  // looks like "nothing to review".
  const gateDeployed = !flagsRes.error;
  const flags = (flagsRes.data ?? []) as FlagRow[];

  // Resolve the authors in one query rather than per row.
  const authorIds = [...new Set(flags.map((f) => f.user_id).filter(Boolean))] as string[];
  const authorsRes = authorIds.length
    ? await supabase.from("users").select("id, username, display_name").in("id", authorIds)
    : { data: [] };
  const authors: Record<string, FlagAuthor> = {};
  for (const a of (authorsRes.data ?? []) as FlagAuthor[]) authors[a.id] = a;

  return (
    <div className={pageShell("wide")}>
      <SectionHeader eyebrow="Operations" title="Moderation" />
      <p className="-mt-2 text-sm text-ink-3">
        The words the app refuses, the words it deliberately allows, and a box to test either.
      </p>
      <ModerationBoard
        terms={(termsRes.data ?? []) as TermRow[]}
        allowWords={(allowRes.data ?? []) as AllowWordRow[]}
        allowPhrases={(phrasesRes.data ?? []) as AllowPhraseRow[]}
        flags={flags}
        authors={authors}
        gateDeployed={gateDeployed}
      />
    </div>
  );
}
