import { cn } from "@/lib/utils";
import { ChangeLinesView } from "../ChangeLinesView";
import {
  type AppVersion,
  type AppVersionChange,
  type AppVersionSection,
  type ChangeReportLinks,
  type LinkedFeedback,
  VERSION_STATUS_LABELS,
  versionStatusBadgeClasses,
} from "../types";

/** Read-only presentation of a single version - the default mode of the detail
 *  page, styled to match the /changelog feed cards. Edit affordances live
 *  behind the View/Edit toggle. */
export function VersionView({
  version,
  sections,
  changes,
  links,
  linkedFeedback,
}: {
  version: AppVersion;
  sections: AppVersionSection[];
  changes: AppVersionChange[];
  links: ChangeReportLinks;
  linkedFeedback: Record<string, LinkedFeedback>;
}) {
  return (
    <article className="overflow-hidden rounded-2xl glass-panel">
      <header className="space-y-1.5 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className="font-hero text-3xl leading-none tracking-tight text-ink sm:text-4xl">
            {version.version}
          </h1>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              versionStatusBadgeClasses(version.status),
            )}
          >
            {VERSION_STATUS_LABELS[version.status]}
          </span>
          {version.released_at && (
            <span className="text-xs text-ink-3">{formatDate(version.released_at)}</span>
          )}
        </div>
        {version.title && (
          <p className="font-heading text-base font-semibold text-ink">{version.title}</p>
        )}
        {version.summary && <p className="text-sm text-ink-2">{version.summary}</p>}
      </header>

      <div className="border-t border-rule/40 p-4 sm:p-6">
        <ChangeLinesView
          sections={sections}
          changes={changes}
          links={links}
          linkedFeedback={linkedFeedback}
        />
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
