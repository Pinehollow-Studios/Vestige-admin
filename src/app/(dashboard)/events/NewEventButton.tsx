"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEvent } from "./actions";

/**
 * Client-side trigger for the create-event flow. Two-step inline
 * form, mirroring `NewCuratedListButton`: only the title is asked
 * for at create time; the window and everything else are edited on
 * the next page.
 */
export function NewEventButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim() || pending) return;
    const value = title.trim();
    startTransition(async () => {
      const result = await createEvent(value);
      if (!result.ok) {
        toast.error(result.message);
      }
      // On success the action redirects — no further UI work.
    });
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-brand text-brand-fg hover:bg-brand-deep"
      >
        + New event
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="The September Thirty"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        className="w-56"
      />
      <Button size="sm" onClick={submit} disabled={pending || !title.trim()}>
        {pending ? "Creating…" : "Create"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
