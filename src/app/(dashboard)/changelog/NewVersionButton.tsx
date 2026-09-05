"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createVersion } from "./actions";

/**
 * Create-version trigger. Tap → inline version + build prompt → creates a draft
 * row and the action redirects into its editor. Mirrors NewAnnouncementButton.
 *
 * `suggestedBuild` is one past the highest build already recorded. Build numbers are monotonic for the life of the app and never
 * reset on a marketing bump, so the field is prefilled rather than left blank:
 * the failure mode this surface has to prevent is somebody typing "1" for a
 * new marketing version, which is what every previous release did.
 */
export function NewVersionButton({ suggestedBuild }: { suggestedBuild: number }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [build, setBuild] = useState(String(suggestedBuild));
  const [pending, startTransition] = useTransition();

  const buildValue = build.trim() === "" ? null : Number(build.trim());
  const buildValid =
    buildValue === null || (Number.isInteger(buildValue) && buildValue >= 1);

  function submit() {
    if (!version.trim() || pending || !buildValid) return;
    const value = version.trim();
    startTransition(async () => {
      const result = await createVersion(value, buildValue);
      if (!result.ok) toast.error(result.message);
    });
  }

  function reset() {
    setOpen(false);
    setVersion("");
    setBuild(String(suggestedBuild));
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-brand text-brand-fg hover:bg-brand-deep"
      >
        + New version
      </Button>
    );
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") reset();
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="0.1.3"
        aria-label="Version"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        onKeyDown={onKey}
        className="h-9 w-28"
        disabled={pending}
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ink-3">build</span>
        <Input
          inputMode="numeric"
          aria-label="Build number"
          title="Never resets on a version bump - it counts every build uploaded to App Store Connect."
          value={build}
          onChange={(e) => setBuild(e.target.value)}
          onKeyDown={onKey}
          className={cn("h-9 w-16 tabular-nums", !buildValid && "border-alert text-alert")}
          disabled={pending}
        />
      </div>
      <Button
        onClick={submit}
        size="sm"
        disabled={pending || !version.trim() || !buildValid}
        className="bg-brand text-brand-fg hover:bg-brand-deep"
      >
        {pending ? "Creating…" : "Create"}
      </Button>
      <Button onClick={reset} size="sm" variant="ghost" disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
