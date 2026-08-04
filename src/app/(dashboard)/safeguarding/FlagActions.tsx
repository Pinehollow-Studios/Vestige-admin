"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EyeOff, Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  messageUser,
  setAccountStatus,
  setLeaderboardHidden,
  type AccountStatus,
} from "../users/actions";
import { resolveFlag, type ResolvedFlagState } from "./actions";

/**
 * Inline actions on a pending safeguarding flag - resolve it (clean /
 * actioned, optional reviewer note) plus the quick user-level moves from the
 * user hub (hide from leaderboards, message via outreach thread, account
 * status). Reuses the `/users` server actions so behaviour + revalidation stay
 * one implementation; mirrors `UserActions.tsx` visually. After an actioned
 * resolve the flag leaves the pending filter on the revalidated refresh.
 */
export function FlagActions({
  flagId,
  userId,
  status,
  hidden,
  isSuperAdmin,
}: {
  flagId: string;
  userId: string;
  status: AccountStatus;
  hidden: boolean;
  isSuperAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message);
      else toast.success(ok);
    });

  const resolve = (state: ResolvedFlagState) =>
    run(
      () => resolveFlag(flagId, state, note),
      state === "reviewed_clean" ? "Resolved - clean" : "Resolved - actioned",
    );

  const changeStatus = (next: AccountStatus) => {
    if (next === status) return;
    if (next === "suspended" && !confirm("Suspend this account? They'll be blocked from signing in.")) return;
    if (next === "restricted" && !confirm("Restrict this account? They keep access but can't log new rounds.")) return;
    run(() => setAccountStatus(userId, next), `Account → ${next}`);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    run(() => messageUser(userId, message), "Message sent - opens their feedback thread");
    setMessage("");
    setMessageOpen(false);
  };

  const STATUSES: { value: AccountStatus; label: string; tone: "brand" | "amber" | "alert" }[] = [
    { value: "active", label: "Active", tone: "brand" },
    { value: "restricted", label: "Restricted", tone: "amber" },
    { value: "suspended", label: "Suspended", tone: "alert" },
  ];

  return (
    <div className="mt-3 space-y-3 border-t border-rule/60 pt-3">
      {/* Resolve the flag */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Resolve flag</p>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reviewer note (optional)…"
          disabled={pending}
          className="block w-full rounded-lg border border-rule/70 bg-paper-sunken/40 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => resolve("reviewed_clean")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" aria-hidden />}
            Resolve clean
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => resolve("reviewed_actioned")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber/40 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/10 disabled:opacity-60"
          >
            Mark actioned
          </button>
        </div>
      </div>

      {/* Quick user-level actions */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">On the user</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => {
            const active = s.value === status;
            const disabled = pending || (s.value === "suspended" && !isSuperAdmin);
            return (
              <button
                key={s.value}
                type="button"
                disabled={disabled}
                onClick={() => changeStatus(s.value)}
                title={s.value === "suspended" && !isSuperAdmin ? "Suspend requires super admin" : undefined}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active ? activeTone(s.tone) : "border-rule/70 text-ink-2 hover:border-brand/40 hover:text-ink",
                )}
              >
                {s.label}
                {active && " · now"}
              </button>
            );
          })}
          <span aria-hidden className="text-ink-3">·</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => setLeaderboardHidden(userId, !hidden),
                hidden ? "Restored to leaderboards" : "Hidden from leaderboards",
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60",
              hidden
                ? "border-rule/70 text-ink-2 hover:border-brand/40 hover:text-ink"
                : "border-amber/40 text-amber hover:bg-amber/10",
            )}
          >
            <EyeOff aria-hidden className="size-3" />
            {hidden ? "Restore to boards" : "Hide from boards"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMessageOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60",
              messageOpen
                ? "border-brand bg-brand/10 text-brand"
                : "border-rule/70 text-ink-2 hover:border-brand/40 hover:text-ink",
            )}
          >
            <MessageSquare aria-hidden className="size-3" />
            Message user
          </button>
        </div>

        {messageOpen && (
          <div className="space-y-1.5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Opens an outreach thread in their in-app feedback…"
              disabled={pending}
              className="block w-full resize-y rounded-lg border border-rule/70 bg-paper-sunken/40 p-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={sendMessage}
                disabled={pending || !message.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg transition-opacity disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function activeTone(tone: "brand" | "amber" | "alert"): string {
  return tone === "brand"
    ? "border-brand bg-brand/15 text-brand"
    : tone === "amber"
      ? "border-amber bg-amber/15 text-amber"
      : "border-alert bg-alert/15 text-alert";
}
