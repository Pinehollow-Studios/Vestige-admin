"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { setAppVersionConfig } from "./actions";

type Initial = {
  min: string;
  minBuild: string;
  recommended: string;
  recommendedBuild: string;
  updateUrl: string;
};

/** Compare "a.b.c" semver-ish strings. >0 when a is higher than b. */
function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** "25" → 25; blank / non-numeric → null (no build floor). */
function parseBuild(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Compare (version, build) floors. >0 when a is higher than b. */
function cmpFloor(av: string, ab: number | null, bv: string, bb: number | null): number {
  const d = cmpVersion(av, bv);
  if (d !== 0) return d;
  return (ab ?? 0) - (bb ?? 0);
}

/**
 * The §3.8.2 gate, build-aware since 2026-09-05: each floor is a marketing
 * version plus an optional build number. Builds are monotonic for the life of
 * the app, so "0.4.4 (25)" walls or nudges a 0.4.4 (1) install while leaving
 * 0.4.4 (25) alone. What the user sees is unchanged - the same wall, the same
 * nudge - it just knows which binary it is talking to.
 */
export function AppVersionForm({ initial }: { initial: Initial }) {
  const [min, setMin] = useState(initial.min);
  const [minBuild, setMinBuild] = useState(initial.minBuild);
  const [recommended, setRecommended] = useState(initial.recommended);
  const [recommendedBuild, setRecommendedBuild] = useState(initial.recommendedBuild);
  const [updateUrl, setUpdateUrl] = useState(initial.updateUrl);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty =
    min !== initial.min ||
    minBuild !== initial.minBuild ||
    recommended !== initial.recommended ||
    recommendedBuild !== initial.recommendedBuild ||
    updateUrl !== initial.updateUrl;
  // Raising the hard floor (by version OR build) is the dangerous case - it
  // walls older apps out.
  const raisesFloor =
    cmpFloor(min, parseBuild(minBuild), initial.min, parseBuild(initial.minBuild)) > 0;
  // A nudge below the floor is a contradiction - the wall wins before the
  // banner could ever show.
  const nudgeBelowFloor =
    recommended.trim() !== "" &&
    cmpFloor(recommended, parseBuild(recommendedBuild), min, parseBuild(minBuild)) < 0;
  // A build with no version to pair it with is meaningless for the nudge.
  const nudgeBuildWithoutVersion = recommended.trim() === "" && recommendedBuild.trim() !== "";

  function doSave() {
    startTransition(async () => {
      const result = await setAppVersionConfig(
        min,
        parseBuild(minBuild),
        recommended || null,
        recommended ? parseBuild(recommendedBuild) : null,
        updateUrl || null,
      );
      setConfirmOpen(false);
      if (result.ok) toast.success("Saved - applies on next app launch");
      else toast.error(result.message);
    });
  }

  function attemptSave() {
    if (nudgeBelowFloor) {
      toast.error("Recommended version can't be below the minimum - the wall would win first.");
      return;
    }
    if (nudgeBuildWithoutVersion) {
      toast.error("Set a recommended version to pair the recommended build with.");
      return;
    }
    if (raisesFloor) setConfirmOpen(true);
    else doSave();
  }

  const floorLabel = `${min}${parseBuild(minBuild) != null ? ` (${parseBuild(minBuild)})` : ""}`;

  return (
    <div className="space-y-4 rounded-xl glass-panel p-5">
      <div className="grid grid-cols-[1fr_140px] gap-3">
        <Field
          label="Minimum supported version"
          hint="Hard floor. Apps below this hit a blocking 'update required' wall. Keep at 0.0.0 to gate nobody."
          value={min}
          onChange={setMin}
          placeholder="0.0.0"
        />
        <Field
          label="Minimum build"
          hint="Optional. Pairs with the version: an app ON that version with a lower build is walled too."
          value={minBuild}
          onChange={setMinBuild}
          placeholder="(none)"
          numeric
        />
      </div>
      <div className="grid grid-cols-[1fr_140px] gap-3">
        <Field
          label="Recommended version"
          hint="Soft nudge. Apps below this (but at/above the floor) see a dismissible 'update available' banner. Leave blank for none."
          value={recommended}
          onChange={setRecommended}
          placeholder="(none)"
        />
        <Field
          label="Recommended build"
          hint="Optional. Nudges installs ON the recommended version that sit below this build - e.g. 0.4.4 (1) when 0.4.4 (25) is out."
          value={recommendedBuild}
          onChange={setRecommendedBuild}
          placeholder="(none)"
          numeric
        />
      </div>
      <Field
        label="Update link"
        hint="Where both 'Update' buttons point - the TestFlight or App Store URL. Leave blank to fall back to the App Store app."
        value={updateUrl}
        onChange={setUpdateUrl}
        placeholder="https://…"
      />
      <div className="flex justify-end pt-1">
        <Button onClick={attemptSave} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Raise the minimum version?"
        confirmLabel="Raise the floor"
        tone="danger"
        busy={pending}
        onConfirm={doSave}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
      >
        <p>
          Setting the floor to <strong className="text-ink">{floorLabel}</strong> forces every app below
          it to a blocking <strong className="text-ink">&quot;update required&quot;</strong> wall. Anyone who
          can&rsquo;t update is locked out of the app until they do.
        </p>
        <p className="mt-2 text-ink-3">Only do this for a genuinely breaking change or a bad build.</p>
      </ConfirmDialog>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  numeric = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">{label}</span>
      <input
        type="text"
        inputMode={numeric ? "numeric" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-rule/70 bg-paper-sunken/60 px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"
      />
      {hint && <span className="block text-xs leading-snug text-ink-3">{hint}</span>}
    </label>
  );
}
