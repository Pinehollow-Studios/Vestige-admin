import Link from "next/link";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AppVersionChange,
  type AppVersionSection,
  type ChangeReportLinks,
  type LinkedFeedback,
  CHANGE_LABEL_CHIP,
  CHANGE_LABEL_CHIP_BASE,
  CHANGE_LABEL_TEXT,
  groupIntoSections,
} from "./types";

/**
 * Read-only rendering of a version's release notes: area sections ("Map",
 * "Pro", "Fixes") in order, each item led by its colour-coded label chip, with
 * the optional detail line beneath and report chips trailing. Shared by the
 * /changelog feed and the per-version View mode. Built mobile-first — chips
 * hold a fixed column so item text ragged-aligns cleanly on a phone. Legacy
 * section-less rows render in a trailing "General" group so nothing disappears
 * during the two-phase window.
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
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.section?.id ?? "general"} className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="shrink-0 font-heading text-[13px] font-semibold tracking-[0.01em] text-ink">
              {group.section?.heading ?? "General"}
            </h3>
            <span aria-hidden className="h-px flex-1 bg-rule/50" />
          </div>
          <ul className="space-y-2">
            {group.items.map((item) => {
              const reportIds = links[item.id] ?? [];
              // The chip column only exists when the section uses labels at
              // all, so an unlabelled section reads full-width on a phone.
              const hasChipColumn = group.items.some((i) => i.label);
              return (
                <li key={item.id} className="flex gap-2.5">
                  {hasChipColumn && (
                    <span
                      className={cn(
                        CHANGE_LABEL_CHIP_BASE,
                        "mt-[3px] w-[64px]",
                        item.label
                          ? CHANGE_LABEL_CHIP[item.label]
                          : "bg-transparent",
                      )}
                      aria-hidden={!item.label}
                    >
                      {item.label ? CHANGE_LABEL_TEXT[item.label] : ""}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm leading-snug text-ink">
                      {item.summary}
                      {reportIds.map((reportId) => {
                        const report = linkedFeedback?.[reportId];
                        return (
                          <Link
                            key={reportId}
                            href={`/feedback/${reportId}`}
                            title={report?.body ?? undefined}
                            className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 align-middle text-[10px] font-medium text-brand transition-colors hover:bg-brand/20"
                          >
                            <Tag aria-hidden className="size-2.5" />
                            {report?.kind ?? "report"}
                          </Link>
                        );
                      })}
                    </p>
                    {item.detail && (
                      <p className="text-[12px] leading-snug text-ink-3">
                        {item.detail}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
