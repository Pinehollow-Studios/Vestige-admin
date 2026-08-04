import Link from "next/link";
import { pageShell } from "@/components/admin/PageShell";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { createClient } from "@/lib/supabase/server";
import { listCoverURL } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { NewEventButton } from "./NewEventButton";
import {
  KIND_LABELS,
  STATUS_DOT,
  STATUS_LABELS,
  statusFor,
  type EventRow,
  type EventStatus,
} from "./types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: EventStatus[] = ["live", "ended", "scheduled", "draft", "awarded", "archived"];
const STATUS_RANK: Record<EventStatus, number> = {
  live: 0,
  ended: 1, // needs the Close & award act — surfaced high on purpose
  scheduled: 2,
  draft: 3,
  awarded: 4,
  archived: 5,
};

/**
 * Clubhouse events — the limited-time competitions surfaced on the
 * iOS Club > Clubhouse scope. Full editorial control: compose,
 * schedule, publish, close & award. One primitive, four shapes
 * (`types.ts`); the iOS app renders whatever this page publishes.
 */
export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("clubhouse_events")
    .select(
      "id,title,subtitle,description,kind,starts_at,ends_at,target_count,cover_storage_key,badge_definition_id,award_rule,published_at,is_archived,finalized_at,created_at,updated_at",
    );

  const counts: Record<string, number> = {};
  if (events && events.length > 0) {
    const { data: countRows } = await supabase
      .from("clubhouse_event_courses")
      .select("event_id")
      .in("event_id", events.map((e) => e.id));
    for (const row of countRows ?? []) counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }

  const all: EventRow[] = (events ?? []).map((e) => ({ ...e, course_count: counts[e.id] ?? 0 }));

  const buckets: Record<EventStatus, number> = {
    live: 0,
    scheduled: 0,
    draft: 0,
    ended: 0,
    awarded: 0,
    archived: 0,
  };
  for (const r of all) buckets[statusFor(r)] += 1;

  const rows = [...all].sort((a, b) => {
    const rank = STATUS_RANK[statusFor(a)] - STATUS_RANK[statusFor(b)];
    if (rank !== 0) return rank;
    return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
  });

  return (
    <div className={pageShell("wide")}>
      <SectionHeader eyebrow="Editorial" title="Clubhouse events" actions={<NewEventButton />} />

      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map((key) => (
            <span key={key} className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1 text-xs">
              <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[key])} />
              <span className="text-ink-2">{STATUS_LABELS[key]}</span>
              <span className="font-semibold tabular-nums text-ink">{buckets[key]}</span>
            </span>
          ))}
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-alert/40 bg-alert/10 p-4 text-sm text-alert">
          Failed to load: {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl glass-panel p-8 text-center text-sm text-ink-3">
          <p className="font-medium text-ink-2">No events yet.</p>
          <p className="mt-1">
            Create one, give it a window, publish it — the app&apos;s Clubhouse picks it up
            straight away.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <EventCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ row }: { row: EventRow }) {
  const status = statusFor(row);
  const cover = listCoverURL(row.cover_storage_key);
  const window = `${fmtDate(row.starts_at)} → ${fmtDate(row.ends_at)}`;

  return (
    <Link
      href={`/events/${row.id}`}
      className="group overflow-hidden rounded-xl glass-panel transition hover:ring-2 hover:ring-brand/40"
    >
      <div className="relative h-28 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="size-full object-cover opacity-90" />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <p className="font-semibold text-ink group-hover:text-brand">{row.title}</p>
        <p className="text-xs text-ink-3">{KIND_LABELS[row.kind]}</p>
        <p className="text-xs tabular-nums text-ink-2">{window}</p>
        <p className="text-xs text-ink-3">
          {row.course_count > 0 ? `${row.course_count} courses in the set` : "Whole of England"}
          {row.target_count ? ` · target ${row.target_count}` : ""}
          {row.badge_definition_id ? " · badge attached" : ""}
        </p>
      </div>
    </Link>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
