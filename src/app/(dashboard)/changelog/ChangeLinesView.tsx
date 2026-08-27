import Link from "next/link";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AppVersionChange,
  type AppVersionSection,
  type ChangeReportLinks,
  type ChipTone,
  type LinkedFeedback,
  CHANGE_LABEL_TEXT,
  CHANGE_LABEL_TONE,
  groupIntoSections,
} from "./types";

function chipClasses(tone: ChipTone): string {
  switch (tone) {
    case "brand":
      return "border-brand/35 text-brand";
    case "amber":
      return "border-amber/40 text-amber";
    case "alert":
      return "border-alert/40 text-alert";
    case "neutral":
      return "border-rule/70 text-ink-3";
  }
}

/**
 * Read-only rendering of a version's release notes: area sections ("Map",
 * "Pro", "Fixes") in order, items beneath with their optional label chip,
 * detail line, and linked-report chips. Shared by the full changelog read page
 * and the per-version View mode. Legacy section-less rows render in a trailing
 * "General" group so nothing disappears during the two-phase window.
 */
export function ChangeLinesView({
  sections,
  changes,
  links = {},
  linkedFeedback,
  emptyLabel = "No changes recorded yet.",
}: {
  sections: AppVersionSection[];
  changes: AppVersionChange[];
  links?: ChangeReportLinks;
  linkedFeedback?: Record<string, LinkedFeedback>;
  emptyLabel?: string;
}) {
  const groups = groupIntoSections(sections, changes);
  if (groups.length === 0) {
    return <p className="text-sm text-ink-3">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.section?.id ?? "general"} className="space-y-1.5">
          <p className="font-heading text-sm font-semibold text-ink">
            {group.section?.heading ?? "General"}
          </p>
          <ul className="space-y-1.5 border-l border-rule/50 pl-3.5">
            {group.items.map((item) => {
              const reportIds = links[item.id] ?? [];
              return (
                <li key={item.id} className="space-y-0.5 text-sm leading-snug text-ink">
                  <div className="flex items-start gap-2">
                    {item.label && (
                      <span
                        className={cn(
                          "mt-px inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          chipClasses(CHANGE_LABEL_TONE[item.label]),
                        )}
                      >
                        {CHANGE_LABEL_TEXT[item.label]}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      {item.summary}
                      {reportIds.map((reportId) => {
                        const report = linkedFeedback?.[reportId];
                        return (
                          <Link
                            key={reportId}
                            href={`/feedback/${reportId}`}
                            title={report?.body ?? undefined}
                            className="ml-2 inline-flex items-center gap-1 rounded-full border border-brand/30 px-1.5 py-0.5 align-middle text-[10px] font-medium text-brand transition-colors hover:bg-brand/10"
                          >
                            <Tag aria-hidden className="size-2.5" />
                            {report?.kind ?? "report"}
                          </Link>
                        );
                      })}
                    </span>
                  </div>
                  {item.detail && (
                    <p
                      className={cn(
                        "text-[12px] leading-snug text-ink-3",
                        item.label && "ml-[68px]",
                      )}
                    >
                      {item.detail}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
