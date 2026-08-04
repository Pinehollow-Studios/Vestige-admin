import { pageShell } from "@/components/admin/PageShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getImportStatus } from "./actions";
import { ImportConsole } from "./ImportConsole";

export const dynamic = "force-dynamic";
// An apply diffs ~1.6k live courses against the source, inserts the new ones,
// backfills missing centres, then recomputes the index - give the serverless
// function room beyond the short default timeout.
export const maxDuration = 60;

export default async function CourseImportPage() {
  await requireAdmin();
  const status = await getImportStatus();

  return (
    <div className={pageShell("narrow")}>
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All courses
      </Link>

      <SectionHeader eyebrow="Editorial · dataset" title="Course dataset" />

      <ImportConsole status={status} />
    </div>
  );
}
