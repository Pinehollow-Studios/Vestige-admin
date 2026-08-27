"use client";

import Link from "next/link";
import { forwardRef, useMemo, useRef, useState, useTransition } from "react";
import {
  AlignLeft,
  ExternalLink,
  GripVertical,
  Link2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addItems,
  addSection,
  deleteItem,
  deleteSection,
  deleteVersion,
  linkReport,
  renameSection,
  reorderItems,
  reorderSections,
  setReleased,
  setReleasedAt,
  unlinkReport,
  updateItem,
  updateVersion,
  type FeedbackSearchRow,
} from "../actions";
import {
  type AppVersion,
  type AppVersionChange,
  type AppVersionSection,
  type ChangeLabel,
  type ChangeReportLinks,
  CHANGE_LABEL_CHIP,
  CHANGE_LABEL_CHIP_BASE,
  CHANGE_LABEL_TEXT,
  CHANGE_LABELS,
  type LinkedFeedback,
  groupIntoSections,
} from "../types";
import { FeedbackLinkPicker } from "./FeedbackLinkPicker";
import { ReleaseDialog } from "./ReleaseDialog";

/** Chip cycle: no label → new → improved → fixed → removed → no label. */
function nextLabel(current: ChangeLabel | null): ChangeLabel | null {
  if (current === null) return CHANGE_LABELS[0];
  const i = CHANGE_LABELS.indexOf(current);
  return i === CHANGE_LABELS.length - 1 ? null : CHANGE_LABELS[i + 1];
}

/** What's being dragged. Items carry their source section for cross-drops. */
type DragPayload =
  | { type: "section"; id: string }
  | { type: "item"; id: string; fromSectionId: string };

export function VersionEditor({
  version,
  initialSections,
  initialChanges,
  initialLinks,
  initialLinkedFeedback,
  headingSuggestions,
  isSuperAdmin,
}: {
  version: AppVersion;
  initialSections: AppVersionSection[];
  initialChanges: AppVersionChange[];
  initialLinks: ChangeReportLinks;
  initialLinkedFeedback: Record<string, LinkedFeedback>;
  headingSuggestions: string[];
  isSuperAdmin: boolean;
}) {
  const [sections, setSections] = useState<AppVersionSection[]>(initialSections);
  const [changes, setChanges] = useState<AppVersionChange[]>(initialChanges);
  const [links, setLinks] = useState<ChangeReportLinks>(initialLinks);
  const [linkedFeedback, setLinkedFeedback] =
    useState<Record<string, LinkedFeedback>>(initialLinkedFeedback);
  const drag = useRef<DragPayload | null>(null);

  const groups = useMemo(
    () => groupIntoSections(sections, changes),
    [sections, changes],
  );
  const itemCount = changes.length;

  // ── Local state helpers (server actions fire alongside; optimistic) ──────

  function patchItem(updated: AppVersionChange) {
    setChanges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function stageLinkedReport(report: FeedbackSearchRow) {
    setLinkedFeedback((m) => ({
      ...m,
      [report.id]: {
        id: report.id,
        kind: report.kind,
        status: report.status,
        body: report.body_preview,
      },
    }));
  }

  /** Rewrite one section's item list (order + membership) locally. */
  function applyItemOrder(sectionId: string, orderedIds: string[]) {
    setChanges((prev) =>
      prev.map((c) => {
        const index = orderedIds.indexOf(c.id);
        if (index === -1) {
          // Renumber the remainder of the item's own section lazily - the
          // server rewrites source-section sort on its own reorder call.
          return c;
        }
        return { ...c, section_id: sectionId, sort_index: index };
      }),
    );
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────

  // Both drop handlers are called from a card's onDrop (the payload type
  // decides which one acts), so each consumes the payload only when it matches.
  function handleSectionDrop(targetSectionId: string | null) {
    const payload = drag.current;
    if (!payload || payload.type !== "section") return;
    drag.current = null;
    const ordered = [...sections].sort((a, b) => a.sort_index - b.sort_index);
    const from = ordered.findIndex((s) => s.id === payload.id);
    if (from === -1) return;
    const [moved] = ordered.splice(from, 1);
    const to =
      targetSectionId === null
        ? ordered.length
        : ordered.findIndex((s) => s.id === targetSectionId);
    if (to === -1 || moved.id === targetSectionId) return;
    ordered.splice(to, 0, moved);
    setSections(ordered.map((s, i) => ({ ...s, sort_index: i })));
    reorderSections(version.id, ordered.map((s) => s.id)).then((res) => {
      if (!res.ok) toast.error(res.message);
    });
  }

  /** Drop an item before `beforeId` (null = append) in `targetSectionId`. */
  function handleItemDrop(targetSectionId: string, beforeId: string | null) {
    const payload = drag.current;
    if (!payload || payload.type !== "item") return;
    drag.current = null;
    if (payload.id === beforeId) return;

    const targetItems = changes
      .filter((c) => c.section_id === targetSectionId && c.id !== payload.id)
      .sort((a, b) => a.sort_index - b.sort_index)
      .map((c) => c.id);
    const insertAt =
      beforeId === null ? targetItems.length : targetItems.indexOf(beforeId);
    if (insertAt === -1) return;
    targetItems.splice(insertAt, 0, payload.id);

    applyItemOrder(targetSectionId, targetItems);
    const calls: Promise<{ ok: boolean; message?: string }>[] = [
      reorderItems(version.id, targetSectionId, targetItems),
    ];
    if (payload.fromSectionId !== targetSectionId) {
      const sourceItems = changes
        .filter(
          (c) => c.section_id === payload.fromSectionId && c.id !== payload.id,
        )
        .sort((a, b) => a.sort_index - b.sort_index)
        .map((c) => c.id);
      applyItemOrder(payload.fromSectionId, sourceItems);
      if (sourceItems.length > 0) {
        calls.push(reorderItems(version.id, payload.fromSectionId, sourceItems));
      }
    }
    Promise.all(calls).then((results) => {
      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) toast.error(failed.message ?? "Reorder failed.");
    });
  }

  return (
    <div className="space-y-6">
      <MetaCard version={version} isSuperAdmin={isSuperAdmin} />

      <section className="space-y-4 rounded-2xl glass-panel p-5">
        <header className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ink">What changed</h2>
          <span className="text-xs text-ink-3">
            {itemCount} {itemCount === 1 ? "item" : "items"} · {sections.length}{" "}
            {sections.length === 1 ? "section" : "sections"}
          </span>
        </header>

        {groups.length === 0 && (
          <p className="rounded-lg border border-dashed border-rule/60 bg-paper-sunken/30 p-6 text-center text-sm text-ink-3">
            No sections yet. Name the first one below - the page or area the
            changes belong to (Map, Pro, Fixes…).
          </p>
        )}

        <div className="space-y-4">
          {groups.map((group) =>
            group.section ? (
              <SectionCard
                key={group.section.id}
                versionId={version.id}
                section={group.section}
                items={group.items}
                links={links}
                linkedFeedback={linkedFeedback}
                onDragStart={(payload) => (drag.current = payload)}
                onSectionDrop={handleSectionDrop}
                onItemDrop={handleItemDrop}
                onRenamed={(heading) =>
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === group.section!.id ? { ...s, heading } : s,
                    ),
                  )
                }
                onDeleted={() => {
                  setSections((prev) => prev.filter((s) => s.id !== group.section!.id));
                  setChanges((prev) =>
                    prev.filter((c) => c.section_id !== group.section!.id),
                  );
                }}
                onItemsAdded={(rows) => setChanges((prev) => [...prev, ...rows])}
                onItemUpdated={patchItem}
                onItemDeleted={(id) =>
                  setChanges((prev) => prev.filter((c) => c.id !== id))
                }
                onLinked={(changeId, report) => {
                  stageLinkedReport(report);
                  setLinks((prev) => ({
                    ...prev,
                    [changeId]: [...(prev[changeId] ?? []), report.id],
                  }));
                }}
                onUnlinked={(changeId, reportId) =>
                  setLinks((prev) => ({
                    ...prev,
                    [changeId]: (prev[changeId] ?? []).filter((r) => r !== reportId),
                  }))
                }
              />
            ) : (
              // Legacy rows the old bunker wrote without a section - read-only
              // note; adopt them by dragging into a real section.
              <OrphanItems key="orphans" items={group.items} />
            ),
          )}
        </div>

        <AddSectionRow
          versionId={version.id}
          suggestions={headingSuggestions}
          onAdded={(section) => setSections((prev) => [...prev, section])}
          onSectionDropAtEnd={() => handleSectionDrop(null)}
        />
      </section>
    </div>
  );
}

// ── Version meta + lifecycle ────────────────────────────────────────────

function MetaCard({
  version,
  isSuperAdmin,
}: {
  version: AppVersion;
  isSuperAdmin: boolean;
}) {
  const [versionStr, setVersionStr] = useState(version.version);
  const [title, setTitle] = useState(version.title ?? "");
  const [summary, setSummary] = useState(version.summary ?? "");
  const [status, setStatus] = useState(version.status);
  const [releasedAt, setReleasedAtState] = useState(version.released_at);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    versionStr.trim() !== version.version ||
    title.trim() !== (version.title ?? "") ||
    summary.trim() !== (version.summary ?? "");

  function save() {
    startTransition(async () => {
      const res = await updateVersion(version.id, {
        version: versionStr,
        title,
        summary,
      });
      if (!res.ok) toast.error(res.message);
      else toast.success("Saved");
    });
  }

  // Releasing (draft → released) routes through the confirmation dialog so the
  // operator can message every linked reporter as the fix ships. Reverting
  // (released → draft) is a plain toggle - it never un-resolves a report.
  function toggleReleased(next: boolean) {
    if (next) {
      if (status === "released") return;
      if (!isSuperAdmin) {
        toast.error("Releasing a version requires super_admin.");
        return;
      }
      setReleaseDialogOpen(true);
      return;
    }
    setStatus("draft");
    startTransition(async () => {
      const res = await setReleased(version.id, false);
      if (!res.ok) {
        toast.error(res.message);
        setStatus("released");
      }
    });
  }

  function handleReleased() {
    setStatus("released");
    if (!releasedAt) setReleasedAtState(new Date().toISOString());
    setReleaseDialogOpen(false);
  }

  function changeReleasedAt(value: string) {
    const iso = value ? new Date(value).toISOString() : null;
    setReleasedAtState(iso);
    startTransition(async () => {
      const res = await setReleasedAt(version.id, iso);
      if (!res.ok) toast.error(res.message);
    });
  }

  function remove() {
    if (!confirm(`Delete v${version.version} and all its sections? This can't be undone.`))
      return;
    startTransition(async () => {
      const res = await deleteVersion(version.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl glass-panel p-5">
      {releaseDialogOpen && (
        <ReleaseDialog
          versionId={version.id}
          version={version.version}
          onReleased={handleReleased}
          onClose={() => setReleaseDialogOpen(false)}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Version">
          <Input
            value={versionStr}
            onChange={(e) => setVersionStr(e.target.value)}
            placeholder="0.1.3"
            className="h-9"
            disabled={pending}
          />
        </Field>
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional headline (e.g. Beta polish)"
            className="h-9"
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="Summary">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Optional one-line summary of the release."
          rows={2}
          disabled={pending}
          className="w-full rounded-lg border border-rule/70 bg-paper-sunken/60 px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand disabled:opacity-50"
        />
      </Field>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-rule/50 pt-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Status">
            <div className="inline-flex overflow-hidden rounded-lg border border-rule/70">
              {(["draft", "released"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => toggleReleased(s === "released")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    status === s
                      ? "bg-brand text-brand-fg"
                      : "bg-paper-sunken/40 text-ink-2 hover:text-ink",
                  )}
                >
                  {s === "draft" ? "In development" : "Released"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Release date">
            <input
              type="date"
              value={releasedAt ? releasedAt.slice(0, 10) : ""}
              onChange={(e) => changeReleasedAt(e.target.value)}
              disabled={pending}
              className="h-8 rounded-md border border-rule/70 bg-paper-sunken/60 px-2 text-xs text-ink outline-none focus-visible:border-brand disabled:opacity-50"
            />
          </Field>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button
              onClick={remove}
              size="sm"
              variant="destructive"
              disabled={pending}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
          <Button
            onClick={save}
            size="sm"
            disabled={pending || !dirty}
            className="bg-brand text-brand-fg hover:bg-brand-deep"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}

// ── A section card: heading + items + add-item row ──────────────────────

function SectionCard({
  versionId,
  section,
  items,
  links,
  linkedFeedback,
  onDragStart,
  onSectionDrop,
  onItemDrop,
  onRenamed,
  onDeleted,
  onItemsAdded,
  onItemUpdated,
  onItemDeleted,
  onLinked,
  onUnlinked,
}: {
  versionId: string;
  section: AppVersionSection;
  items: AppVersionChange[];
  links: ChangeReportLinks;
  linkedFeedback: Record<string, LinkedFeedback>;
  onDragStart: (payload: DragPayload) => void;
  onSectionDrop: (targetSectionId: string) => void;
  onItemDrop: (targetSectionId: string, beforeId: string | null) => void;
  onRenamed: (heading: string) => void;
  onDeleted: () => void;
  onItemsAdded: (rows: AppVersionChange[]) => void;
  onItemUpdated: (updated: AppVersionChange) => void;
  onItemDeleted: (id: string) => void;
  onLinked: (changeId: string, report: FeedbackSearchRow) => void;
  onUnlinked: (changeId: string, reportId: string) => void;
}) {
  const [heading, setHeading] = useState(section.heading);
  const [pending, startTransition] = useTransition();
  const addInputRef = useRef<HTMLInputElement>(null);

  const reportCount = new Set(items.flatMap((i) => links[i.id] ?? [])).size;

  function saveHeading() {
    const h = heading.trim();
    if (!h || h === section.heading) {
      setHeading(section.heading);
      return;
    }
    startTransition(async () => {
      const res = await renameSection(versionId, section.id, h);
      if (!res.ok) {
        toast.error(res.message);
        setHeading(section.heading);
      } else {
        onRenamed(h);
      }
    });
  }

  function remove() {
    if (
      items.length > 0 &&
      !confirm(`Delete "${section.heading}" and its ${items.length} item${items.length === 1 ? "" : "s"}?`)
    )
      return;
    startTransition(async () => {
      const res = await deleteSection(versionId, section.id);
      if (!res.ok) toast.error(res.message);
      else onDeleted();
    });
  }

  return (
    <div
      className="space-y-2 rounded-xl border border-rule/50 bg-paper-sunken/30 p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation();
        // A section dragged onto this card slots in before it; an item dropped
        // on the card body (not on a row) appends to this section.
        onSectionDrop(section.id);
        onItemDrop(section.id, null);
      }}
    >
      <div
        className="group flex items-center gap-1.5"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart({ type: "section", id: section.id });
        }}
      >
        <GripVertical
          aria-hidden
          className="size-3.5 shrink-0 cursor-grab text-ink-3/50 group-hover:text-ink-3"
        />
        <Input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          onBlur={saveHeading}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          disabled={pending}
          className="h-8 flex-1 border-transparent bg-transparent font-heading text-sm font-semibold hover:border-rule/50 focus-visible:border-brand"
          aria-label="Section heading"
        />
        {reportCount > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/30 px-2 py-0.5 text-[10px] font-medium text-brand">
            <Tag aria-hidden className="size-2.5" />
            {reportCount} {reportCount === 1 ? "report" : "reports"}
          </span>
        )}
        <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
          {items.length}
        </span>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:text-alert disabled:opacity-50"
          aria-label="Delete section"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              versionId={versionId}
              sectionId={section.id}
              item={item}
              reportIds={links[item.id] ?? []}
              linkedFeedback={linkedFeedback}
              onDragStart={onDragStart}
              onDropBefore={() => onItemDrop(section.id, item.id)}
              onUpdated={onItemUpdated}
              onDeleted={() => onItemDeleted(item.id)}
              onLinked={(report) => onLinked(item.id, report)}
              onUnlinked={(reportId) => onUnlinked(item.id, reportId)}
              onCommitted={() => addInputRef.current?.focus()}
            />
          ))}
        </ul>
      )}

      <AddItemRow
        ref={addInputRef}
        versionId={versionId}
        sectionId={section.id}
        defaultLabel={items.length > 0 ? items[items.length - 1].label : null}
        onAdded={onItemsAdded}
      />
    </div>
  );
}

// ── A single item row ───────────────────────────────────────────────────

function ItemRow({
  versionId,
  sectionId,
  item,
  reportIds,
  linkedFeedback,
  onDragStart,
  onDropBefore,
  onUpdated,
  onDeleted,
  onLinked,
  onUnlinked,
  onCommitted,
}: {
  versionId: string;
  sectionId: string;
  item: AppVersionChange;
  reportIds: string[];
  linkedFeedback: Record<string, LinkedFeedback>;
  onDragStart: (payload: DragPayload) => void;
  onDropBefore: () => void;
  onUpdated: (updated: AppVersionChange) => void;
  onDeleted: () => void;
  onLinked: (report: FeedbackSearchRow) => void;
  onUnlinked: (reportId: string) => void;
  onCommitted: () => void;
}) {
  const [text, setText] = useState(item.summary);
  const [detail, setDetail] = useState(item.detail ?? "");
  const [detailOpen, setDetailOpen] = useState(item.detail != null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveText() {
    const t = text.trim();
    if (!t) {
      setText(item.summary);
      return;
    }
    if (t === item.summary) return;
    startTransition(async () => {
      const res = await updateItem(versionId, item.id, { summary: t });
      if (!res.ok) {
        toast.error(res.message);
        setText(item.summary);
      } else {
        onUpdated({ ...item, summary: t });
      }
    });
  }

  function saveDetail() {
    const d = detail.trim();
    if (d === (item.detail ?? "")) {
      if (!d) setDetailOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await updateItem(versionId, item.id, { detail: d || null });
      if (!res.ok) {
        toast.error(res.message);
        setDetail(item.detail ?? "");
      } else {
        onUpdated({ ...item, detail: d || null });
        if (!d) setDetailOpen(false);
      }
    });
  }

  function cycleLabel() {
    const label = nextLabel(item.label);
    onUpdated({ ...item, label }); // optimistic - chip flips instantly
    startTransition(async () => {
      const res = await updateItem(versionId, item.id, { label });
      if (!res.ok) {
        toast.error(res.message);
        onUpdated(item);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteItem(versionId, item.id);
      if (!res.ok) toast.error(res.message);
      else onDeleted();
    });
  }

  function pick(report: FeedbackSearchRow) {
    setPickerOpen(false);
    startTransition(async () => {
      const res = await linkReport(versionId, item.id, report.id);
      if (!res.ok) toast.error(res.message);
      else onLinked(report);
    });
  }

  function unlink(reportId: string) {
    startTransition(async () => {
      const res = await unlinkReport(versionId, item.id, reportId);
      if (!res.ok) toast.error(res.message);
      else onUnlinked(reportId);
    });
  }

  return (
    <li
      className="group/item space-y-1 rounded-lg border border-transparent px-1 py-0.5 transition-colors hover:border-rule/40 hover:bg-paper-sunken/40"
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart({ type: "item", id: item.id, fromSectionId: sectionId });
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation();
        onDropBefore();
      }}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical
          aria-hidden
          className="size-3 shrink-0 cursor-grab text-ink-3/0 transition-colors group-hover/item:text-ink-3/60"
        />
        <button
          type="button"
          onClick={cycleLabel}
          disabled={pending}
          title="Click to change the label"
          className={cn(
            CHANGE_LABEL_CHIP_BASE,
            "w-[64px] py-1 transition-colors disabled:opacity-50",
            item.label
              ? CHANGE_LABEL_CHIP[item.label]
              : "border border-dashed border-rule/60 text-ink-3/60 hover:text-ink-3",
          )}
        >
          {item.label ? CHANGE_LABEL_TEXT[item.label] : "label"}
        </button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={saveText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
              onCommitted();
            }
          }}
          disabled={pending}
          className="h-7 flex-1 border-transparent bg-transparent text-sm hover:border-rule/50 focus-visible:border-brand"
        />
        <button
          type="button"
          onClick={() => setDetailOpen((v) => !v)}
          disabled={pending}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition-colors disabled:opacity-50",
            detailOpen || item.detail
              ? "text-brand"
              : "text-ink-3/50 hover:text-ink-3",
          )}
          aria-label="Toggle detail line"
          title="Detail line"
        >
          <AlignLeft className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={pending}
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5 rounded-md p-1.5 text-[10px] transition-colors disabled:opacity-50",
            reportIds.length > 0 ? "text-brand" : "text-ink-3/50 hover:text-ink-3",
          )}
          aria-label="Link feedback reports"
          title="Link feedback reports"
        >
          <Link2 className="size-3" />
          {reportIds.length > 0 && (
            <span className="tabular-nums">{reportIds.length}</span>
          )}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="shrink-0 rounded-md p-1.5 text-ink-3/0 transition-colors hover:!text-alert group-hover/item:text-ink-3/60 disabled:opacity-50"
          aria-label="Delete item"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {detailOpen && (
        <div className="ml-[92px]">
          <Input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            onBlur={saveDetail}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            disabled={pending}
            placeholder="Optional detail line…"
            className="h-6 border-transparent bg-transparent text-xs text-ink-2 hover:border-rule/50 focus-visible:border-brand"
          />
        </div>
      )}

      {reportIds.length > 0 && (
        <div className="ml-[92px] flex flex-wrap gap-1">
          {reportIds.map((reportId) => {
            const report = linkedFeedback[reportId];
            return (
              <span
                key={reportId}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand/25 bg-brand/5 py-0.5 pl-2 pr-1 text-[10px]"
                title={report?.body ?? undefined}
              >
                <Tag aria-hidden className="size-2.5 shrink-0 text-brand" />
                <span className="truncate text-ink-2">
                  {report?.body ?? "report"}
                </span>
                <Link
                  href={`/feedback/${reportId}`}
                  className="shrink-0 text-brand hover:underline"
                  aria-label="Open report"
                >
                  <ExternalLink className="size-2.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => unlink(reportId)}
                  disabled={pending}
                  className="shrink-0 rounded p-0.5 text-ink-3 transition-colors hover:text-alert disabled:opacity-50"
                  aria-label="Unlink report"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <div className="ml-[92px]">
          <FeedbackLinkPicker onPick={pick} onCancel={() => setPickerOpen(false)} />
        </div>
      )}
    </li>
  );
}

// ── Add items to a section (Enter-to-add, paste-a-list) ─────────────────

const AddItemRow = forwardRef<
  HTMLInputElement,
  {
    versionId: string;
    sectionId: string;
    defaultLabel: ChangeLabel | null;
    onAdded: (rows: AppVersionChange[]) => void;
  }
>(function AddItemRow({ versionId, sectionId, defaultLabel, onAdded }, ref) {
  // The label persists between adds (runs of items usually share one), seeded
  // from the section's last item so rapid entry is type → Enter → type.
  const [label, setLabel] = useState<ChangeLabel | null>(defaultLabel);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(lines: string[]) {
    const clean = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    if (clean.length === 0 || pending) return;
    startTransition(async () => {
      const res = await addItems(versionId, sectionId, clean, label);
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Could not add." : res.message);
        return;
      }
      const now = new Date().toISOString();
      onAdded(
        res.data.map((id, i) => ({
          id,
          version_id: versionId,
          section_id: sectionId,
          kind: "improved" as const,
          summary: clean[i],
          label,
          detail: null,
          sort_index: Number.MAX_SAFE_INTEGER - clean.length + i,
          created_at: now,
          updated_at: now,
        })),
      );
      setText("");
    });
  }

  return (
    <div className="flex items-center gap-1.5 pl-[18px]">
      <button
        type="button"
        onClick={() => setLabel(nextLabel(label))}
        disabled={pending}
        title="Label for new items - click to change"
        className={cn(
          CHANGE_LABEL_CHIP_BASE,
          "w-[64px] py-1 transition-colors disabled:opacity-50",
          label
            ? CHANGE_LABEL_CHIP[label]
            : "border border-dashed border-rule/60 text-ink-3/60 hover:text-ink-3",
        )}
      >
        {label ? CHANGE_LABEL_TEXT[label] : "label"}
      </button>
      <Input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit([text]);
        }}
        onPaste={(e) => {
          // Paste-a-list: a multi-line paste becomes one item per line, the
          // first line merged with anything already typed.
          const pasted = e.clipboardData.getData("text");
          if (!pasted.includes("\n")) return;
          e.preventDefault();
          const lines = pasted
            .split("\n")
            .map((l) => l.replace(/^\s*[-*•]\s+/, "").trim());
          if (lines.length > 0) lines[0] = `${text}${lines[0]}`.trim();
          submit(lines);
        }}
        placeholder="Add an item… (Enter to add, paste a list for many)"
        className="h-7 flex-1 text-sm"
        disabled={pending}
      />
      <Button
        onClick={() => submit([text])}
        size="sm"
        variant="ghost"
        disabled={pending || !text.trim()}
        className="h-7 px-2 text-ink-3 hover:text-brand"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
});

// ── Legacy section-less rows (two-phase window) ─────────────────────────

function OrphanItems({ items }: { items: AppVersionChange[] }) {
  return (
    <div className="space-y-1 rounded-xl border border-dashed border-rule/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        General (not in a section)
      </p>
      <ul className="space-y-0.5 text-sm text-ink-2">
        {items.map((item) => (
          <li key={item.id}>{item.summary}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Add a section ───────────────────────────────────────────────────────

function AddSectionRow({
  versionId,
  suggestions,
  onAdded,
  onSectionDropAtEnd,
}: {
  versionId: string;
  suggestions: string[];
  onAdded: (section: AppVersionSection) => void;
  onSectionDropAtEnd: () => void;
}) {
  const [heading, setHeading] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = heading.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await addSection(versionId, text);
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Could not add section." : res.message);
        return;
      }
      const now = new Date().toISOString();
      onAdded({
        id: res.data,
        version_id: versionId,
        heading: text,
        sort_index: Number.MAX_SAFE_INTEGER,
        created_at: now,
        updated_at: now,
      });
      setHeading("");
    });
  }

  return (
    <div
      className="flex items-center gap-2 border-t border-rule/40 pt-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onSectionDropAtEnd}
    >
      <Input
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Add a section - the page or area (Map, Pro, Fixes…)"
        className="h-8 flex-1 text-sm"
        disabled={pending}
        list="section-heading-suggestions"
      />
      <datalist id="section-heading-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Button
        onClick={submit}
        size="sm"
        disabled={pending || !heading.trim()}
        className="bg-brand text-brand-fg hover:bg-brand-deep"
      >
        <Plus className="size-3.5" />
        Section
      </Button>
    </div>
  );
}
