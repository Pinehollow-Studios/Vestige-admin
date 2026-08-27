import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { dedupeShippedVersions } from "@/lib/feedback/queue";
import { feedbackScreenshotSignedURLs } from "@/lib/feedback/signedUrl";
import { getCrashForFeedback } from "@/lib/crashes/queries";
import { activeStorageBaseUrl } from "@/lib/supabase/admin";
import { avatarURL } from "@/lib/storage";
import type {
  FeedbackDuplicateLink,
  FeedbackMessage,
  FeedbackOwner,
  FeedbackReport,
  FeedbackReporter,
  FeedbackScreenshot,
} from "@/lib/feedback/types";

type ThreadResponse = {
  report: FeedbackReport | null;
  reporter: FeedbackReporter | null;
  owner: FeedbackOwner | null;
  messages: FeedbackMessage[] | null;
  screenshots: FeedbackScreenshot[] | null;
  duplicates: FeedbackDuplicateLink[] | null;
};

/**
 * One feedback thread, for the inbox's right pane. Mirrors the standalone
 * /feedback/[id] page's data load (single `admin_feedback_thread` RPC + signed
 * screenshot URLs + shipped versions + linked crash), returned as JSON so the
 * client pane can render without a navigation. Admin-gated.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.error) return guard.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const [{ data, error }, shippedRes] = await Promise.all([
    guard.supabase.rpc("admin_feedback_thread", { p_report_id: id }).single<ThreadResponse>(),
    guard.supabase
      .from("app_version_change_reports")
      .select("feedback_report_id, app_version_changes ( app_versions ( id, version, status ) )")
      .eq("feedback_report_id", id),
  ]);

  if (error || !data || !data.report) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  const screenshots = data.screenshots ?? [];
  const signedURLs = await feedbackScreenshotSignedURLs(screenshots.map((s) => s.storage_path));
  const shippedVersions = dedupeShippedVersions(shippedRes.data);
  const linkedCrash = data.report.linked_crash_id ? await getCrashForFeedback(id) : null;
  const storageBase = await activeStorageBaseUrl();
  const reporterAvatarUrl = data.reporter
    ? avatarURL(data.reporter.id, data.reporter.avatar_photo_id, storageBase)
    : null;

  return NextResponse.json({
    report: data.report,
    reporter: data.reporter,
    reporterAvatarUrl,
    owner: data.owner,
    messages: data.messages ?? [],
    screenshots,
    signedURLs,
    duplicates: data.duplicates ?? [],
    shippedVersions,
    linkedCrashId: linkedCrash?.id ?? null,
  });
}
