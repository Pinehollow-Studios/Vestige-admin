"use client";

import { useTransition } from "react";
import { Check, Flag, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPhotoModeration, type ModerationState } from "./actions";

/**
 * Approve / Reject / Flag controls for one photo in the moderation queue.
 * Mirrors `lists/QueueActions.tsx` (useTransition + sonner). The visible set
 * depends on the photo's current state — a pending photo offers the three
 * verdicts; an already-decided photo offers "Reset to pending" so a mistaken
 * call is reversible.
 */
export function PhotoModerationActions({
  photoId,
  current,
}: {
  photoId: string;
  current: ModerationState;
}) {
  const [pending, startTransition] = useTransition();

  function run(next: ModerationState, verb: string) {
    startTransition(async () => {
      const result = await setPhotoModeration(photoId, next);
      if (result.ok) toast.success(verb);
      else toast.error(result.message);
    });
  }

  if (current !== "pending") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run("pending", "Reset to pending")}
        className="w-full"
      >
        <RotateCcw className="size-3.5" />
        Reset to pending
      </Button>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run("rejected", "Rejected")}
        className="flex-1 border-alert/30 text-alert hover:bg-alert/10 hover:text-alert"
      >
        <X className="size-3.5" />
        Reject
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run("flagged", "Flagged")}
        className="flex-1 border-amber/40 text-amber hover:bg-amber/10 hover:text-amber"
      >
        <Flag className="size-3.5" />
        Flag
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => run("approved", "Approved")}
        className="flex-1 bg-brand text-brand-fg hover:bg-brand-deep"
      >
        <Check className="size-3.5" />
        Approve
      </Button>
    </div>
  );
}
