"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAnnouncement, createProfilePhotoPrompt } from "./actions";

/**
 * Create-announcement triggers. "+ New announcement" → inline title prompt →
 * creates a blank draft and redirects into the editor (where content +
 * targeting + lifecycle live). Mirrors NewBadgeButton.
 *
 * "Profile photo prompt" (2026-09-05) creates the ready-made in-card photo
 * prompt as a draft - copy, `has_avatar = false` cohort and app-version floor
 * prefilled - and opens it in the editor for a final read before Publish.
 */
export function NewAnnouncementButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim() || pending) return;
    const value = title.trim();
    startTransition(async () => {
      const result = await createAnnouncement(value);
      if (!result.ok) toast.error(result.message);
    });
  }

  function createPhotoPrompt() {
    if (pending) return;
    startTransition(async () => {
      const result = await createProfilePhotoPrompt();
      if (!result.ok) toast.error(result.message);
    });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={createPhotoPrompt}
          size="sm"
          variant="outline"
          disabled={pending}
          title="Creates a draft of the in-card 'add a profile photo' prompt, targeted at users without one."
        >
          {pending ? "Creating…" : "Profile photo prompt"}
        </Button>
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          disabled={pending}
          className="bg-brand text-brand-fg hover:bg-brand-deep"
        >
          + New announcement
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="What's new in 0.1.1"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        className="h-9 w-64"
        disabled={pending}
      />
      <Button
        onClick={submit}
        size="sm"
        disabled={pending || !title.trim()}
        className="bg-brand text-brand-fg hover:bg-brand-deep"
      >
        {pending ? "Creating…" : "Create"}
      </Button>
      <Button
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
        size="sm"
        variant="ghost"
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}
