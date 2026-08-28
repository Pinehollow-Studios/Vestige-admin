"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  History,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AudiencePicker } from "@/components/admin/AudiencePicker";
import type { CountyOption } from "@/app/(dashboard)/notifications/types";
import type { PickerUser } from "@/lib/users/roster";
import type { AdminOption } from "@/lib/feedback/owners";
import { cn } from "@/lib/utils";
import {
  deleteFlag,
  fetchFlagReach,
  revertFlag,
  setFlagArchived,
  setFlagEnabled,
  setFlagTargets,
  upsertFlag,
} from "./actions";
import {
  areaFor,
  CATEGORY_BLURB,
  defaultValueFor,
  describeChange,
  FLAG_CATEGORIES,
  flagCategory,
  humanizeKey,
  isFeature,
  isOn,
  PROPAGATION_NOTE,
  relativeTime,
  valueSummary,
  VALUE_TYPE_LABELS,
  VALUE_TYPES,
  whoSummary,
  type BroadcastAudienceKind,
  type BroadcastTarget,
  type FlagCategory,
  type FlagHistoryRow,
  type FlagRow,
  type FlagValueType,
} from "./types";

/* The control room (2026-08-28 rebuild). One flat, searchable list in three
 * honest groups — Features (on/off), Copy (text overrides), Tuning (numbers +
 * JSON) — plus a collapsed Archived section that finally makes Restore
 * reachable. One positive toggle per row (ON = users see it), who/when on
 * every row, and every live change routes through a confirm that states the
 * blast radius and the propagation truth, with an optional note that lands in
 * feature_flag_history. Rows derive everything from server props (the old
 * board cached toggle state locally and drifted after saves). */

// ── Pending-change plumbing ─────────────────────────────────────────────

type PendingChange = {
  title: string;
  body: string;
  tone: "brand" | "danger";
  confirmLabel: string;
  run: (note: string) => Promise<{ ok: boolean; message?: string }>;
};

// ── Board ───────────────────────────────────────────────────────────────

export function FlagsBoard({
  flags,
  counties,
  allUsers,
  targetsByFlag,
  history,
  admins,
}: {
  flags: FlagRow[];
  counties: CountyOption[];
  allUsers: PickerUser[];
  targetsByFlag: Record<string, string[]>;
  history: FlagHistoryRow[];
  admins: AdminOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [note, setNote] = useState("");
  const [busy, startTransition] = useTransition();

  const adminName = useMemo(() => {
    const map = new Map(admins.map((a) => [a.id, a.label]));
    return (id: string | null) => (id ? (map.get(id) ?? "an admin") : "an admin");
  }, [admins]);

  const historyByKey = useMemo(() => {
    const map = new Map<string, FlagHistoryRow[]>();
    for (const h of history) {
      const list = map.get(h.flag_key) ?? [];
      list.push(h);
      map.set(h.flag_key, list);
    }
    return map;
  }, [history]);

  const live = flags.filter((f) => !f.archived);
  const archived = flags.filter((f) => f.archived);
  const q = query.trim().toLowerCase();
  const matches = (f: FlagRow) =>
    q === "" ||
    f.key.includes(q) ||
    humanizeKey(f.key).toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    areaFor(f.key).toLowerCase().includes(q);

  const featuresOff = live.filter((f) => isFeature(f.value_type) && !isOn(f)).length;
  const overridesOn = live.filter((f) => !isFeature(f.value_type) && f.enabled).length;

  function requestChange(change: PendingChange) {
    setNote("");
    setPending(change);
  }

  function confirmPending() {
    const change = pending;
    if (!change) return;
    startTransition(async () => {
      const res = await change.run(note);
      setPending(null);
      if (!res.ok) toast.error(res.message ?? "Change failed.");
      else {
        toast.success("Live.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: search + the two numbers that matter + create. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            aria-hidden
            className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flags…"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              featuresOff > 0 ? "bg-alert/10 font-medium text-alert" : "bg-paper-sunken/50",
            )}
          >
            {featuresOff === 0 ? "Everything on" : `${featuresOff} feature${featuresOff === 1 ? "" : "s"} OFF`}
          </span>
          <span className="rounded-full bg-paper-sunken/50 px-2.5 py-1">
            {overridesOn} override{overridesOn === 1 ? "" : "s"} live
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating((v) => !v)}
          className="bg-brand text-brand-fg hover:bg-brand-deep"
        >
          <Plus className="size-3.5" />
          New flag
        </Button>
      </div>

      {creating && (
        <CreateFlagPanel
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {FLAG_CATEGORIES.map((category) => {
        const rows = live
          .filter((f) => flagCategory(f.value_type) === category)
          .filter(matches)
          .sort((a, b) => areaFor(a.key).localeCompare(areaFor(b.key)) || a.key.localeCompare(b.key));
        if (rows.length === 0) return null;
        return (
          <section key={category} className="space-y-2">
            <header className="flex items-baseline gap-2">
              <h2 className="font-heading text-sm font-semibold text-ink">{category}</h2>
              <p className="text-xs text-ink-3">{CATEGORY_BLURB[category]}</p>
            </header>
            <ul className="space-y-1.5">
              {rows.map((flag) => (
                <FlagCard
                  key={flag.key}
                  flag={flag}
                  category={category}
                  history={historyByKey.get(flag.key) ?? []}
                  adminName={adminName}
                  counties={counties}
                  allUsers={allUsers}
                  targetIds={targetsByFlag[flag.key] ?? []}
                  busy={busy}
                  requestChange={requestChange}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {archived.length > 0 && (
        <details className="group rounded-xl border border-dashed border-rule/50 p-3">
          <summary className="flex cursor-pointer select-none list-none items-center gap-2 text-xs font-medium text-ink-3 [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            Archived ({archived.length}) — kept for history, never delivered to the app
          </summary>
          <ul className="mt-2 space-y-1">
            {archived.filter(matches).map((flag) => (
              <li
                key={flag.key}
                className="flex items-center gap-3 rounded-lg bg-paper-sunken/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-2">{humanizeKey(flag.key)}</p>
                  <p className="truncate text-[11px] text-ink-3">
                    <span className="font-mono">{flag.key}</span>
                    {flag.description && <> · {flag.description}</>}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  className="text-ink-3 hover:text-brand"
                  onClick={() =>
                    requestChange({
                      title: `Restore “${humanizeKey(flag.key)}”?`,
                      body: "It comes back to the live list with its old settings and starts being delivered to the app again.",
                      tone: "brand",
                      confirmLabel: "Restore",
                      run: (n) => setFlagArchived(flag.key, false, n),
                    })
                  }
                >
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        tone={pending?.tone ?? "brand"}
        busy={busy}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-2">{pending?.body}</p>
          <p className="text-xs text-ink-3">{PROPAGATION_NOTE}</p>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why? (optional — kept in the history)"
            className="h-8 text-xs"
            disabled={busy}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

// ── One flag row ────────────────────────────────────────────────────────

function FlagCard({
  flag,
  category,
  history,
  adminName,
  counties,
  allUsers,
  targetIds,
  busy,
  requestChange,
}: {
  flag: FlagRow;
  category: FlagCategory;
  history: FlagHistoryRow[];
  adminName: (id: string | null) => string;
  counties: CountyOption[];
  allUsers: PickerUser[];
  targetIds: string[];
  busy: boolean;
  requestChange: (change: PendingChange) => void;
}) {
  const [open, setOpen] = useState(false);
  const feature = isFeature(flag.value_type);
  const on = isOn(flag);
  const title = humanizeKey(flag.key);
  const last = history[0];
  const narrowed =
    flag.audience_kind !== "everyone" ||
    flag.rollout_percentage < 100 ||
    flag.min_app_version != null ||
    flag.max_app_version != null;

  function toggle() {
    if (feature) {
      const next = !on;
      requestChange({
        title: next ? `Turn “${title}” on?` : `Turn “${title}” OFF?`,
        body: next
          ? `${title} comes back for ${whoSummary(flag).toLowerCase()}.`
          : `${title} disappears from the app for ${whoSummary(flag).toLowerCase()} — the surface hides entirely.`,
        tone: next ? "brand" : "danger",
        confirmLabel: next ? "Turn on" : "Turn off",
        // A feature is killed by actively delivering false (enabled stays true
        // so the row keeps overriding the app's built-in default).
        run: (n) =>
          upsertFlag(
            {
              key: flag.key,
              description: flag.description,
              value_type: flag.value_type,
              value: next,
              enabled: true,
              rollout_percentage: flag.rollout_percentage,
              audience_kind: flag.audience_kind,
              target: flag.target,
              min_app_version: flag.min_app_version,
              max_app_version: flag.max_app_version,
            },
            n,
          ),
      });
    } else {
      const next = !flag.enabled;
      requestChange({
        title: next ? `Use this override?` : `Stop using this override?`,
        body: next
          ? `“${title}” starts delivering ${valueSummary(flag)} instead of the app's built-in value.`
          : `“${title}” stops overriding — the app falls back to its built-in value.`,
        tone: "brand",
        confirmLabel: next ? "Use override" : "Stop override",
        run: (n) => setFlagEnabled(flag.key, next, n),
      });
    }
  }

  return (
    <li className="rounded-xl glass-panel">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-ink">{title}</span>
            <span className="rounded-full bg-paper-sunken/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-3">
              {areaFor(flag.key)}
            </span>
            {narrowed && (
              <span className="rounded-full bg-amber/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber">
                {whoSummary(flag)}
              </span>
            )}
            {!feature && flag.enabled && (
              <span className="max-w-[220px] truncate text-[11px] text-ink-2">
                → {valueSummary(flag)}
              </span>
            )}
          </div>
          {flag.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">{flag.description}</p>
          )}
          {last && (
            <p className="mt-0.5 text-[10px] text-ink-3/80">
              {describeChange(last)} · {relativeTime(last.changed_at)} by {adminName(last.changed_by)}
              {last.note && <> · “{last.note}”</>}
            </p>
          )}
        </button>

        <Switch
          checked={feature ? on : flag.enabled}
          label={feature ? (on ? "On" : "Off") : flag.enabled ? "Override" : "Built-in"}
          disabled={busy}
          onToggle={toggle}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:text-ink"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <FlagEditor
          flag={flag}
          category={category}
          history={history}
          adminName={adminName}
          counties={counties}
          allUsers={allUsers}
          targetIds={targetIds}
          busy={busy}
          requestChange={requestChange}
        />
      )}
    </li>
  );
}

// ── The expanded editor ─────────────────────────────────────────────────

function FlagEditor({
  flag,
  category,
  history,
  adminName,
  counties,
  allUsers,
  targetIds,
  busy,
  requestChange,
}: {
  flag: FlagRow;
  category: FlagCategory;
  history: FlagHistoryRow[];
  adminName: (id: string | null) => string;
  counties: CountyOption[];
  allUsers: PickerUser[];
  targetIds: string[];
  busy: boolean;
  requestChange: (change: PendingChange) => void;
}) {
  const [description, setDescription] = useState(flag.description);
  const [valueText, setValueText] = useState(() =>
    flag.value_type === "string"
      ? String(flag.value ?? "")
      : flag.value_type === "number"
        ? String(flag.value ?? 0)
        : JSON.stringify(flag.value ?? (flag.value_type === "json" ? {} : true), null, 2),
  );
  const [audienceKind, setAudienceKind] = useState<BroadcastAudienceKind>(flag.audience_kind);
  const [target, setTarget] = useState<BroadcastTarget>(flag.target);
  const [minVersion, setMinVersion] = useState(flag.min_app_version ?? "");
  const [maxVersion, setMaxVersion] = useState(flag.max_app_version ?? "");
  const [rollout, setRollout] = useState(flag.rollout_percentage);
  const [reach, setReach] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const feature = isFeature(flag.value_type);
  const audienceDirty =
    audienceKind !== flag.audience_kind ||
    rollout !== flag.rollout_percentage ||
    minVersion !== (flag.min_app_version ?? "") ||
    maxVersion !== (flag.max_app_version ?? "") ||
    JSON.stringify(target) !== JSON.stringify(flag.target);

  function parsedValue(): { ok: true; value: unknown } | { ok: false; message: string } {
    if (feature) return { ok: true, value: flag.value };
    if (flag.value_type === "string") return { ok: true, value: valueText };
    if (flag.value_type === "number") {
      const n = Number(valueText);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, message: "Not a number." };
    }
    try {
      return { ok: true, value: JSON.parse(valueText) };
    } catch {
      return { ok: false, message: "Not valid JSON." };
    }
  }

  function save() {
    const parsed = parsedValue();
    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }
    requestChange({
      title: `Save changes to “${humanizeKey(flag.key)}”?`,
      body: feature
        ? "The description and audience settings update; the on/off state stays as it is."
        : flag.enabled
          ? `The override delivers the new value to ${whoSummary({ ...flag, audience_kind: audienceKind, rollout_percentage: rollout, target_user_count: targetIds.length }).toLowerCase()}.`
          : "Saved but not live — the override switch for this flag is off.",
      tone: "brand",
      confirmLabel: "Save",
      run: async (n) => {
        if (audienceKind === "individuals") {
          const t = await setFlagTargets(flag.key, targetIds);
          if (!t.ok) return t;
        }
        return upsertFlag(
          {
            key: flag.key,
            description,
            value_type: flag.value_type,
            value: parsed.value,
            enabled: flag.enabled,
            rollout_percentage: rollout,
            audience_kind: audienceKind,
            target,
            min_app_version: minVersion.trim() || null,
            max_app_version: maxVersion.trim() || null,
          },
          n,
        );
      },
    });
  }

  return (
    <div className="space-y-4 border-t border-rule/40 p-3">
      <p className="font-mono text-[10px] text-ink-3">{flag.key}</p>

      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          What this controls
        </span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write it for Jack — what changes in the app when this flips?"
          className="h-8 text-sm"
        />
      </label>

      {!feature && (
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            {category === "Copy" ? "The text the app shows" : "Value"}
          </span>
          {flag.value_type === "string" ? (
            <textarea
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-rule/70 bg-paper-sunken/60 px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand"
            />
          ) : (
            <textarea
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              rows={flag.value_type === "json" ? 4 : 1}
              className="w-full rounded-lg border border-rule/70 bg-paper-sunken/60 px-3 py-2 font-mono text-xs text-ink outline-none focus-visible:border-brand"
            />
          )}
        </label>
      )}

      <details className="rounded-lg border border-rule/40 p-2.5">
        <summary className="cursor-pointer select-none text-xs font-medium text-ink-3 [&::-webkit-details-marker]:hidden">
          Advanced — who receives this flag
          {audienceDirty && <span className="ml-2 text-amber">unsaved</span>}
        </summary>
        <div className="mt-3 space-y-3">
          <AudiencePicker
            audienceKind={audienceKind}
            setAudienceKind={setAudienceKind}
            target={target}
            setTarget={setTarget}
            minVersion={minVersion}
            setMinVersion={setMinVersion}
            maxVersion={maxVersion}
            setMaxVersion={setMaxVersion}
            counties={counties}
            allUsers={allUsers}
            initialSelectedIds={targetIds}
            onPersistTargets={(ids) => setFlagTargets(flag.key, ids)}
          />
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
              Rollout — {rollout}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={rollout}
              onChange={(e) => setRollout(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </label>
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || audienceDirty}
              title={audienceDirty ? "Save first — reach reflects the saved settings" : undefined}
              className="h-7 text-ink-3 hover:text-brand"
              onClick={async () => {
                const res = await fetchFlagReach(flag.key);
                if (res.ok) setReach(res.data ?? 0);
                else toast.error(res.message);
              }}
            >
              How many people?
            </Button>
            {audienceDirty && <span>save first — the count reads the saved settings</span>}
            {reach !== null && !audienceDirty && (
              <span className="tabular-nums text-ink-2">{reach} people</span>
            )}
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-ink-3 hover:text-ink"
            onClick={() => setShowHistory((v) => !v)}
          >
            <History className="size-3.5" />
            History ({history.length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            className="h-7 text-ink-3 hover:text-amber"
            onClick={() =>
              requestChange({
                title: `Archive “${humanizeKey(flag.key)}”?`,
                body: "It stops being delivered to the app and moves to the Archived section below — restorable any time. The app falls back to its built-in behaviour.",
                tone: "danger",
                confirmLabel: "Archive",
                run: (n) => setFlagArchived(flag.key, true, n),
              })
            }
          >
            <Archive className="size-3.5" />
            Archive
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            className="h-7 text-ink-3 hover:text-alert"
            onClick={() =>
              requestChange({
                title: `Delete “${humanizeKey(flag.key)}” forever?`,
                body: "Gone from the panel and the app falls back to its built-in behaviour. Prefer Archive — delete only removes the row; its history is kept.",
                tone: "danger",
                confirmLabel: "Delete",
                run: () => deleteFlag(flag.key),
              })
            }
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={save}
          className="bg-brand text-brand-fg hover:bg-brand-deep"
        >
          Save
        </Button>
      </div>

      {showHistory && (
        <ul className="space-y-1 rounded-lg bg-paper-sunken/30 p-2.5">
          {history.length === 0 && (
            <li className="text-xs text-ink-3">No recorded changes yet.</li>
          )}
          {history.slice(0, 12).map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 text-ink-2">
                {describeChange(entry)}
                <span className="text-ink-3">
                  {" "}
                  · {relativeTime(entry.changed_at)} by {adminName(entry.changed_by)}
                  {entry.note && <> · “{entry.note}”</>}
                </span>
              </span>
              {entry.old_row && entry.action !== "delete" && (
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-ink-3 transition-colors hover:text-brand disabled:opacity-50"
                  onClick={() =>
                    requestChange({
                      title: `Revert “${humanizeKey(flag.key)}”?`,
                      body: `Back to how it was before ${relativeTime(entry.changed_at)}'s change (${describeChange(entry).toLowerCase()}). The revert is logged as a new change.`,
                      tone: "brand",
                      confirmLabel: "Revert",
                      run: () => revertFlag(flag.key, entry.old_row!, entry.changed_at),
                    })
                  }
                >
                  Revert
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Create ──────────────────────────────────────────────────────────────

function CreateFlagPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [key, setKey] = useState("");
  const [type, setType] = useState<FlagValueType>("boolean");
  const [description, setDescription] = useState("");
  const [busy, startTransition] = useTransition();

  const keyOk = /^[a-z][a-z0-9_]*$/.test(key);

  function create() {
    if (!keyOk) {
      toast.error("Key must be lower_snake_case, e.g. boards_enabled");
      return;
    }
    if (!description.trim()) {
      toast.error("Write the description — it's how Jack knows what this does.");
      return;
    }
    startTransition(async () => {
      const res = await upsertFlag(
        {
          key,
          description: description.trim(),
          value_type: type,
          value: defaultValueFor(type),
          enabled: type === "boolean", // features are born ON; overrides born inactive
          rollout_percentage: 100,
          audience_kind: "everyone",
          target: {},
          min_app_version: null,
          max_app_version: null,
        },
        "Created",
      );
      if (!res.ok) toast.error(res.message);
      else {
        toast.success(`Created ${key}`);
        onCreated();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/25 bg-brand/[0.04] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Key (must match what the app reads)
          </span>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="boards_enabled"
            className={cn("h-8 font-mono text-sm", key && !keyOk && "border-alert/60")}
            disabled={busy}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Kind
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FlagValueType)}
            disabled={busy}
            className="h-8 w-full rounded-md border border-rule/70 bg-paper-sunken/60 px-2 text-xs text-ink outline-none focus-visible:border-brand"
          >
            {VALUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {VALUE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          Description (required)
        </span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What changes in the app when this flips?"
          className="h-8 text-sm"
          disabled={busy}
        />
      </label>
      <p className="text-[11px] text-ink-3">
        A flag only does something once the app has code reading this key — creating one here is
        harmless until then.
      </p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={create}
          disabled={busy || !key || !description.trim()}
          className="bg-brand text-brand-fg hover:bg-brand-deep"
        >
          <Plus className="size-3.5" />
          Create
        </Button>
      </div>
    </div>
  );
}

// ── Atoms ───────────────────────────────────────────────────────────────

function Switch({
  checked,
  label,
  disabled,
  onToggle,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="flex shrink-0 items-center gap-2 disabled:opacity-50"
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          checked ? "text-brand" : "text-ink-3",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-rule",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-paper transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
