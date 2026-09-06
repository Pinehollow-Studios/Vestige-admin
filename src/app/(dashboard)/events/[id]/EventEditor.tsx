"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdvancedSection,
  EditorSection,
  EditorShell,
  Field,
  fieldInputClass,
} from "@/components/admin/editor/EditorShell";
import { Readiness, type ReadinessCheck } from "@/components/admin/editor/Readiness";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { CoverCropDialog } from "../../curated/[id]/CoverCropDialog";
import {
  addCountyCourses,
  archiveEvent,
  clearEventCourses,
  deleteEvent,
  finalizeEvent,
  removeEventCourse,
  removeEventCover,
  setEventPublishState,
  unarchiveEvent,
  updateEvent,
  uploadEventCover,
} from "../actions";
import { ClubhouseEventCardPreview, PrizeCardPreview } from "./EventPreviews";
import { EventCoursePicker } from "./EventCoursePicker";
import {
  AWARD_LABELS,
  KIND_LABELS,
  STATUS_DOT,
  STATUS_LABELS,
  statusFor,
  type AwardRule,
  type EventKind,
  type EventRow,
  type EventStatus,
  type PrizeBadge,
} from "../types";
import { cn } from "@/lib/utils";

export type EventCourseRow = {
  course_id: string;
  course_name: string;
  county_name: string | null;
  position: number;
};

type EventForm = {
  title: string;
  subtitle: string;
  description: string;
  kind: EventKind;
  target_count: number | null;
  badge_definition_id: string | null;
  award_rule: AwardRule | null;
};

/**
 * The Clubhouse event editor. Everything Jack needs to run an event
 * end to end: shape + window, editorial copy, cover, the course set
 * (with a whole-county bulk add), the prize badge, publish
 * lifecycle, and the Close & award act once the window shuts.
 */
export function EventEditor({
  row,
  courses,
  coverURL,
  counties,
  badges,
}: {
  row: EventRow;
  courses: EventCourseRow[];
  coverURL: string | null;
  counties: { id: string; name: string }[];
  badges: PrizeBadge[];
}) {
  const status = statusFor(row);
  const { values, setField, state } = useFormAutosave<EventForm>(
    {
      title: row.title,
      subtitle: row.subtitle ?? "",
      description: row.description ?? "",
      kind: row.kind,
      target_count: row.target_count,
      badge_definition_id: row.badge_definition_id,
      award_rule: row.award_rule,
    },
    (patch) => updateEvent(row.id, patch),
  );

  const windowValid = new Date(row.ends_at) > new Date(row.starts_at);
  const wantsSet = values.kind !== "race";

  // The prize picker offers published badges only; the current
  // selection stays listed (marked draft) so an existing event never
  // silently loses its wiring (event-badges rework, 2026-08-26).
  const prizeOptions = badges.filter(
    (b) => b.is_published || b.id === values.badge_definition_id,
  );
  const selectedBadge = badges.find((b) => b.id === values.badge_definition_id) ?? null;

  const checks: ReadinessCheck[] = [
    windowValid
      ? { state: "ok", label: "Window set" }
      : { state: "missing", label: "Window invalid", hint: "The end must come after the start." },
    coverURL
      ? { state: "ok", label: "Cover image" }
      : { state: "warn", label: "No cover image", hint: "Event cards lead the Clubhouse, so give it a strong 16:9." },
    wantsSet && courses.length === 0
      ? { state: "missing", label: "No course set", hint: "Hunts, sweeps and markers need courses. Races don't." }
      : { state: "ok", label: courses.length > 0 ? `${courses.length} courses in the set` : "Whole of England counts" },
    values.badge_definition_id && !values.award_rule
      ? { state: "warn", label: "Badge without an award rule", hint: "Pick who receives it or nothing mints." }
      : values.award_rule === "all_qualifiers" && !values.target_count
        ? { state: "warn", label: "Finisher award needs a target", hint: "Set a target count or nobody qualifies." }
        : selectedBadge && !selectedBadge.is_published
          ? { state: "warn", label: "Prize badge is a draft", hint: "Publish it in /badges before Close & award mints it to real users." }
          : values.badge_definition_id
            ? { state: "ok", label: "Prize wired up" }
            : { state: "info", label: "No prize (optional)" },
    status === "live"
      ? { state: "ok", label: "Published, live on iOS" }
      : status === "ended"
        ? { state: "warn", label: "Window closed, needs Close & award" }
        : { state: "info", label: `${STATUS_LABELS[status]}, not visible to users yet` },
  ];

  return (
    <EditorShell
      backHref="/events"
      backLabel="All events"
      eyebrow={`Editorial · ${STATUS_LABELS[status].toLowerCase()}`}
      title={values.title || "Untitled event"}
      saveState={state}
      aside={<Readiness checks={checks} />}
      meta={
        <>
          <span className="inline-flex items-center gap-2 rounded-full glass-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
            {STATUS_LABELS[status]}
          </span>
          <span className="inline-flex items-center gap-1 text-ink-2">
            <Hash aria-hidden className="size-3" />
            {courses.length > 0 ? `${courses.length} courses` : "open field"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-3">
            <Calendar aria-hidden className="size-3" />
            Updated {new Date(row.updated_at).toLocaleDateString()}
          </span>
        </>
      }
    >
      <PublishSection row={row} />
      {status === "ended" && <FinalizeSection row={row} hasBadge={Boolean(values.badge_definition_id)} />}

      <EditorSection
        title="The shape"
        hint="Every shape scores the same way: distinct courses played inside the window, against the set if there is one."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kind" hint="Changes how the app frames it, not how it scores.">
            <select
              value={values.kind}
              onChange={(e) => setField("kind", e.target.value as EventKind)}
              className={fieldInputClass}
            >
              {(Object.keys(KIND_LABELS) as EventKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target" hint="'Play any N.' Blank = pure ranking, no finish line.">
            <input
              type="number"
              min={1}
              value={values.target_count ?? ""}
              onChange={(e) =>
                setField("target_count", e.target.value.trim() === "" ? null : Math.max(1, Number(e.target.value)))
              }
              className={fieldInputClass}
            />
          </Field>
        </div>
        <WindowFields row={row} />
      </EditorSection>

      <EditorSection title="Editorial" hint="Title, the one-line hook, and how it works.">
        <Field label="Title" hint="Card headline in the Clubhouse.">
          <input value={values.title} onChange={(e) => setField("title", e.target.value)} className={fieldInputClass} />
        </Field>
        <Field label="Hook" hint="One line under the title. Keep it tight.">
          <input
            value={values.subtitle}
            onChange={(e) => setField("subtitle", e.target.value)}
            maxLength={100}
            className={fieldInputClass}
          />
        </Field>
        <Field label="How it works" hint="Shown on the event page. Plain text.">
          <textarea
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4}
            className={fieldInputClass.replace("h-9", "min-h-24 py-2")}
          />
        </Field>
      </EditorSection>

      <EditorSection title="Cover image" hint="16:9. Pick any photo, the cropper opens to frame it.">
        <CoverEditor row={row} coverURL={coverURL} />
      </EditorSection>

      <EditorSection
        title="The prize"
        hint="Optional. Pick a badge and who receives it, minted by Close & award once the window shuts."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Badge">
            <select
              value={values.badge_definition_id ?? ""}
              onChange={(e) => setField("badge_definition_id", e.target.value || null)}
              className={fieldInputClass}
            >
              <option value="">No badge</option>
              {prizeOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.is_published ? "" : " (draft)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Goes to">
            <select
              value={values.award_rule ?? ""}
              onChange={(e) => setField("award_rule", (e.target.value || null) as AwardRule | null)}
              className={fieldInputClass}
            >
              <option value="">Nobody (no award)</option>
              {(Object.keys(AWARD_LABELS) as AwardRule[]).map((r) => (
                <option key={r} value={r}>
                  {AWARD_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {selectedBadge && (
          <div className="mt-3 space-y-2">
            {/* The event detail page's prize card, as the app draws it. */}
            <PrizeCardPreview badge={selectedBadge} awardRule={values.award_rule ?? null} />
            {!selectedBadge.is_published && (
              <p className="text-xs text-alert">
                Draft: publish it in /badges before the close, or winners receive a badge the app hides.
              </p>
            )}
          </div>
        )}
      </EditorSection>

      <EditorSection
        title="Clubhouse card"
        hint="How this event appears on the What's-on shelf: 300×128, no poster image (the app dropped that)."
      >
        <ClubhouseEventCardPreview
          title={values.title}
          windowLine={eventWindowLine(row)}
          status={status}
          daysLabel={eventDaysLabel(row, status)}
          progress={status === "ended" ? 1 : status === "live" ? 0.4 : 0}
        />
      </EditorSection>

      <CourseSetSection row={row} courses={courses} counties={counties} />

      <DangerSection row={row} status={status} />
    </EditorShell>
  );
}

// ── Window ─────────────────────────────────────────────────────────────
function WindowFields({ row }: { row: EventRow }) {
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState(toLocalInput(row.starts_at));
  const [end, setEnd] = useState(toLocalInput(row.ends_at));
  const dirty = start !== toLocalInput(row.starts_at) || end !== toLocalInput(row.ends_at);

  function save() {
    if (!start || !end) return;
    if (new Date(end) <= new Date(start)) {
      toast.error("The end must come after the start.");
      return;
    }
    startTransition(async () => {
      const res = await updateEvent(row.id, {
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
      });
      if (!res.ok) toast.error(res.message);
      else toast.success("Window saved");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Opens">
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={cn(fieldInputClass, "w-auto")}
        />
      </Field>
      <Field label="Closes">
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className={cn(fieldInputClass, "w-auto")}
        />
      </Field>
      <Button size="sm" variant="outline" disabled={pending || !dirty} onClick={save}>
        {pending ? "Saving…" : "Save window"}
      </Button>
      <p className="text-xs text-ink-3">
        Rounds are counted by their calendar date (UK time) inside this window.
      </p>
    </div>
  );
}

// ── Publish ────────────────────────────────────────────────────────────
function PublishSection({ row }: { row: EventRow }) {
  const [pending, startTransition] = useTransition();
  const status = statusFor(row);
  const [publishAt, setPublishAt] = useState(row.published_at ? toLocalInput(row.published_at) : "");

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message);
      else toast.success(ok);
    });

  return (
    <EditorSection
      title="Publish"
      hint={`Currently ${STATUS_LABELS[status].toLowerCase()}. A published event appears in the app's Clubhouse straight away (up to 14 days before it opens, as a teaser).`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Button
          onClick={() => run(() => setEventPublishState(row.id, new Date().toISOString()), "Published, live on iOS")}
          disabled={pending || Boolean(row.published_at && !row.is_archived)}
          className="bg-brand text-brand-fg hover:bg-brand-deep"
        >
          {row.published_at && !row.is_archived ? "Published" : "Publish now"}
        </Button>
        <Field label="Publish at">
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className={cn(fieldInputClass, "w-auto")}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={pending || !publishAt}
              onClick={() => run(() => setEventPublishState(row.id, new Date(publishAt).toISOString()), "Scheduled")}
            >
              Schedule
            </Button>
          </div>
        </Field>
        {row.published_at && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setEventPublishState(row.id, null), "Back to draft")}
          >
            Revert to draft
          </Button>
        )}
      </div>
    </EditorSection>
  );
}

// ── Close & award ──────────────────────────────────────────────────────
function FinalizeSection({ row, hasBadge }: { row: EventRow; hasBadge: boolean }) {
  const [pending, startTransition] = useTransition();

  function finalize() {
    if (!confirm(`Close "${row.title}" and mint the awards? This runs once.`)) return;
    startTransition(async () => {
      const res = await finalizeEvent(row.id);
      if (!res.ok) toast.error(res.message);
      else toast.success(res.data ? `Closed. ${res.data} badge${res.data === 1 ? "" : "s"} minted` : "Closed. No badges to mint");
    });
  }

  return (
    <EditorSection
      title="Close & award"
      hint={
        hasBadge
          ? "The window has shut. Closing mints the prize badge per the award rule and files the event under Honours."
          : "The window has shut. No badge is attached, so closing simply files the event under Honours."
      }
    >
      <Button onClick={finalize} disabled={pending} className="bg-brand text-brand-fg hover:bg-brand-deep">
        {pending ? "Closing…" : "Close & award"}
      </Button>
    </EditorSection>
  );
}

// ── Cover ──────────────────────────────────────────────────────────────
function CoverEditor({ row, coverURL }: { row: EventRow; coverURL: string | null }) {
  const [pending, startTransition] = useTransition();
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function onCropConfirm(blob: Blob) {
    setPickedFile(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("cover", new File([blob], "cover.jpg", { type: "image/jpeg" }));
      const result = await uploadEventCover(row.id, formData);
      if (!result.ok) toast.error(result.message);
      else toast.success("Cover uploaded");
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeEventCover(row.id);
      if (!result.ok) toast.error(result.message);
      else toast.success("Cover removed");
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-rule/70 bg-paper-sunken/40 sm:w-72">
        {coverURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverURL} alt={`Cover for ${row.title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-ink-3">
            No cover
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (file) setPickedFile(file);
          }}
        />
        <Button size="sm" disabled={pending} onClick={() => fileInputRef.current?.click()}>
          {pending ? "Working…" : coverURL ? "Replace" : "Upload"}
        </Button>
        {coverURL && (
          <Button size="sm" variant="outline" disabled={pending} onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <CoverCropDialog file={pickedFile} onClose={() => setPickedFile(null)} onConfirm={onCropConfirm} />
    </div>
  );
}

// ── Course set ─────────────────────────────────────────────────────────
function CourseSetSection({
  row,
  courses,
  counties,
}: {
  row: EventRow;
  courses: EventCourseRow[];
  counties: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [countyId, setCountyId] = useState("");
  const onSetIds = useMemo(() => new Set(courses.map((c) => c.course_id)), [courses]);

  function bulkAdd() {
    if (!countyId) return;
    startTransition(async () => {
      const res = await addCountyCourses(row.id, countyId);
      if (!res.ok) toast.error(res.message);
      else toast.success(res.data === 0 ? "Already all on the set" : `Added ${res.data} courses`);
    });
  }

  function remove(courseId: string) {
    startTransition(async () => {
      const res = await removeEventCourse(row.id, courseId);
      if (!res.ok) toast.error(res.message);
    });
  }

  function clearAll() {
    if (!confirm("Remove every course from the set? The event becomes an open race across England.")) return;
    startTransition(async () => {
      const res = await clearEventCourses(row.id);
      if (!res.ok) toast.error(res.message);
      else toast.success("Set cleared");
    });
  }

  return (
    <EditorSection
      title="The course set"
      hint="Leave empty for an open race: any England course counts. Add courses (or a whole county) to fence the hunt."
      actions={<EventCoursePicker eventId={row.id} alreadyOnSet={onSetIds} />}
    >
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Add a whole county" hint="The sweep shortcut.">
          <div className="flex items-center gap-2">
            <select value={countyId} onChange={(e) => setCountyId(e.target.value)} className={fieldInputClass}>
              <option value="">Pick a county…</option>
              {counties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" disabled={pending || !countyId} onClick={bulkAdd}>
              Add county
            </Button>
          </div>
        </Field>
        {courses.length > 0 && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={clearAll}>
            Clear set
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-rule/70 bg-paper-sunken/30 p-6 text-center text-sm text-ink-3">
          No set. The whole of England counts.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {courses.map((c) => (
            <li key={c.course_id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.course_name}</p>
                {c.county_name && <p className="truncate text-xs text-muted-foreground">{c.county_name}</p>}
              </div>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(c.course_id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </EditorSection>
  );
}

// ── Danger ─────────────────────────────────────────────────────────────
function DangerSection({ row, status }: { row: EventRow; status: string }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, ok?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message);
      else if (ok) toast.success(ok);
    });

  return (
    <AdvancedSection title="Danger zone" hint="Archive hides it from the app; delete is permanent.">
      <div className="flex flex-wrap gap-2">
        {status === "archived" ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => unarchiveEvent(row.id), "Restored")}>
            Restore from archive
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => archiveEvent(row.id), "Archived")}>
            Archive
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="border-alert/40 text-alert hover:bg-alert/10 hover:text-alert"
          onClick={() => {
            if (confirm(`Delete "${row.title}" permanently? This can't be undone.`)) run(() => deleteEvent(row.id));
          }}
        >
          Delete permanently
        </Button>
      </div>
    </AdvancedSection>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Clubhouse-card preview derivations ──────────────────────────────────

/** "1–30 June" style window line, matching the pre-board card state. */
function eventWindowLine(row: EventRow): string {
  const starts = new Date(row.starts_at);
  const ends = new Date(row.ends_at);
  const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "long" });
  if (starts.getMonth() === ends.getMonth() && starts.getFullYear() === ends.getFullYear()) {
    return `${starts.getDate()}\u2013${ends.getDate()} ${month(ends)}`;
  }
  return `${starts.getDate()} ${month(starts)} \u2013 ${ends.getDate()} ${month(ends)}`;
}

/** Days to the relevant boundary — start when scheduled, end when live. */
function eventDaysLabel(row: EventRow, status: EventStatus): string {
  const now = Date.now();
  const boundary =
    status === "live" ? new Date(row.ends_at).getTime() : new Date(row.starts_at).getTime();
  const days = Math.max(0, Math.ceil((boundary - now) / 86_400_000));
  return `${days}d`;
}
