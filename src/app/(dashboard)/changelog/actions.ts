"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { FEEDBACK_ACTIVE_WORK_STAGES } from "@/lib/feedback/types";
import { type ChangeLabel, labelToKind, parseVersion } from "./types";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

/** A trimmed feedback row for the link picker (from admin_feedback_queue). */
export type FeedbackSearchRow = {
  id: string;
  kind: string;
  status: string;
  body_preview: string;
};

function revalidateVersion(id: string) {
  revalidatePath("/changelog");
  revalidatePath(`/changelog/${id}`);
}

function isUniqueViolation(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("already exists");
}

// ── Versions ────────────────────────────────────────────────────────────

/**
 * Create a fresh version (defaults to a draft) and redirect into its editor.
 * The display string is parsed into major/minor/patch for ordering; both
 * `version` and the (major,minor,patch) tuple are unique in the DB, so a repeat
 * is reported rather than silently duplicated.
 */
export async function createVersion(version: string): Promise<ActionResult<string>> {
  const parsed = parseVersion(version);
  if (!parsed) {
    return { ok: false, message: "Use a version like 0.1.2 (or 0.1)." };
  }

  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("app_versions")
    .insert({
      version: parsed.version,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      status: "draft",
      created_by_admin_id: admin.id,
      last_edited_by_admin_id: admin.id,
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error.message)) {
      return { ok: false, message: `Version ${parsed.version} already exists.` };
    }
    return { ok: false, message: error.message };
  }
  revalidatePath("/changelog");
  redirect(`/changelog/${data.id}`);
}

export type VersionPatch = {
  version?: string;
  title?: string | null;
  summary?: string | null;
};

/**
 * Patch a version's editorial fields. Changing `version` re-parses
 * major/minor/patch so ordering stays correct. Empty strings on the optional
 * text fields coerce to null; `updated_at` is set by the table trigger.
 */
export async function updateVersion(
  id: string,
  patch: VersionPatch,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const update: Record<string, unknown> = {};

  if (patch.version !== undefined) {
    const parsed = parseVersion(patch.version);
    if (!parsed) return { ok: false, message: "Use a version like 0.1.2 (or 0.1)." };
    update.version = parsed.version;
    update.major = parsed.major;
    update.minor = parsed.minor;
    update.patch = parsed.patch;
  }
  if (patch.title !== undefined) update.title = patch.title?.trim() || null;
  if (patch.summary !== undefined) update.summary = patch.summary?.trim() || null;

  if (Object.keys(update).length === 0) return { ok: true };
  update.last_edited_by_admin_id = admin.id;

  const { error } = await supabase.from("app_versions").update(update).eq("id", id);
  if (error) {
    if (isUniqueViolation(error.message)) {
      return { ok: false, message: "That version number is already taken." };
    }
    return { ok: false, message: error.message };
  }
  revalidateVersion(id);
  return { ok: true };
}

/**
 * Flip a version between draft and released. Releasing stamps `released_at`
 * with now() when it isn't already set; reverting to draft leaves the recorded
 * date in place (it's editable on its own). The date itself can be overridden
 * via setReleasedAt.
 */
export async function setReleased(
  id: string,
  released: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const update: Record<string, unknown> = {
    status: released ? "released" : "draft",
    last_edited_by_admin_id: admin.id,
  };
  if (released) {
    const { data } = await supabase
      .from("app_versions")
      .select("released_at")
      .eq("id", id)
      .maybeSingle();
    if (!data?.released_at) update.released_at = new Date().toISOString();
  }

  const { error } = await supabase.from("app_versions").update(update).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(id);
  return { ok: true };
}

/** Set (or clear) the release date directly. `null` clears it. */
export async function setReleasedAt(
  id: string,
  releasedAt: string | null,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_versions")
    .update({ released_at: releasedAt, last_edited_by_admin_id: admin.id })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(id);
  return { ok: true };
}

/** Hard delete a version (cascades its change lines) - super_admin only. */
export async function deleteVersion(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") {
    return { ok: false, message: "Delete requires super_admin." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("app_versions").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/changelog");
  redirect("/changelog");
}

// ── Sections ──────────────────────────────────────────────────────────────

/** Append a section to a version (sorts after the existing sections). */
export async function addSection(
  versionId: string,
  heading: string,
): Promise<ActionResult<string>> {
  const text = heading.trim();
  if (!text) return { ok: false, message: "Give the section a heading first." };

  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("app_version_sections")
    .select("sort_index")
    .eq("version_id", versionId)
    .order("sort_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (last?.sort_index ?? -1) + 1;

  const { data, error } = await supabase
    .from("app_version_sections")
    .insert({
      version_id: versionId,
      heading: text,
      sort_index: nextSort,
      created_by_admin_id: admin.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  return { ok: true, data: data.id };
}

export async function renameSection(
  versionId: string,
  sectionId: string,
  heading: string,
): Promise<ActionResult> {
  const text = heading.trim();
  if (!text) return { ok: false, message: "A section heading can't be empty." };
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_version_sections")
    .update({ heading: text })
    .eq("id", sectionId);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  return { ok: true };
}

/** Delete a section and (via FK cascade) every item under it. */
export async function deleteSection(
  versionId: string,
  sectionId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_version_sections")
    .delete()
    .eq("id", sectionId);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  return { ok: true };
}

/** Persist a new section order (full ordered id list → rewrite sort_index). */
export async function reorderSections(
  versionId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("app_version_sections")
        .update({ sort_index: index })
        .eq("id", id)
        .eq("version_id", versionId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, message: failed.error.message };
  revalidateVersion(versionId);
  return { ok: true };
}

// ── Items ─────────────────────────────────────────────────────────────────

/**
 * Append one or more items to a section in a single call — `texts` is usually
 * one line, but a multi-line paste sends every line at once (paste-a-list).
 * All get the same label; `kind` is derived from it for the legacy reader.
 * Returns the new ids in order.
 */
export async function addItems(
  versionId: string,
  sectionId: string,
  texts: string[],
  label: ChangeLabel | null,
): Promise<ActionResult<string[]>> {
  const lines = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (lines.length === 0) return { ok: false, message: "Write the change first." };

  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("app_version_changes")
    .select("sort_index")
    .eq("section_id", sectionId)
    .order("sort_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (last?.sort_index ?? -1) + 1;

  const { data, error } = await supabase
    .from("app_version_changes")
    .insert(
      lines.map((summary, i) => ({
        version_id: versionId,
        section_id: sectionId,
        kind: labelToKind(label),
        label,
        summary,
        sort_index: nextSort + i,
        created_by_admin_id: admin.id,
      })),
    )
    .select("id");

  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  return { ok: true, data: (data ?? []).map((r) => r.id as string) };
}

export type ItemPatch = {
  summary?: string;
  label?: ChangeLabel | null;
  detail?: string | null;
};

export async function updateItem(
  versionId: string,
  changeId: string,
  patch: ItemPatch,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.summary !== undefined) {
    const text = patch.summary.trim();
    if (!text) return { ok: false, message: "An item can't be empty." };
    update.summary = text;
  }
  if (patch.label !== undefined) {
    update.label = patch.label;
    update.kind = labelToKind(patch.label);
  }
  if (patch.detail !== undefined) update.detail = patch.detail?.trim() || null;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("app_version_changes")
    .update(update)
    .eq("id", changeId);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  return { ok: true };
}

export async function deleteItem(
  versionId: string,
  changeId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_version_changes")
    .delete()
    .eq("id", changeId);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  return { ok: true };
}

/**
 * Persist a section's item order. The full ordered id list is CLAIMED into the
 * section (section_id set on every id), so a cross-section drag is just: call
 * this for the target section including the moved id, then for the source
 * section with its remainder.
 */
export async function reorderItems(
  versionId: string,
  sectionId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("app_version_changes")
        .update({ section_id: sectionId, sort_index: index })
        .eq("id", id)
        .eq("version_id", versionId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, message: failed.error.message };
  revalidateVersion(versionId);
  return { ok: true };
}

// ── Feedback links (the loop — many reports per item) ───────────────────

export async function linkReport(
  versionId: string,
  changeId: string,
  reportId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_version_change_reports")
    .upsert(
      { change_id: changeId, feedback_report_id: reportId },
      { onConflict: "change_id,feedback_report_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  revalidatePath(`/feedback/${reportId}`);
  revalidatePath("/feedback");
  return { ok: true };
}

export async function unlinkReport(
  versionId: string,
  changeId: string,
  reportId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_version_change_reports")
    .delete()
    .eq("change_id", changeId)
    .eq("feedback_report_id", reportId);
  if (error) return { ok: false, message: error.message };
  revalidateVersion(versionId);
  revalidatePath(`/feedback/${reportId}`);
  revalidatePath("/feedback");
  return { ok: true };
}

/**
 * List the *open* feedback reports for the link picker, newest-priority first.
 * Reuses the existing `admin_feedback_queue` SECURITY DEFINER RPC, filtered to
 * the active work stages so anything already Fixed (or otherwise done) never
 * shows. An optional `query` narrows by free text - but with no query the full
 * open set is returned immediately, so the picker needs no search to be useful.
 *
 * Reports already tagged to any changelog line are filtered out so the same
 * report can't be shipped twice.
 */
export async function listOpenFeedback(
  query?: string,
): Promise<ActionResult<FeedbackSearchRow[]>> {
  await requireAdmin();
  const q = (query ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_feedback_queue", {
    p_status_filter: null,
    p_severity_filter: null,
    p_kind_filter: null,
    p_tag_filter: null,
    p_search: q || null,
    p_limit: 50,
    p_offset: 0,
    p_work_stage_filter: FEEDBACK_ACTIVE_WORK_STAGES,
  });
  if (error) return { ok: false, message: error.message };

  // Hide reports already linked to a changelog item (no double-shipping).
  const { data: linkedRows } = await supabase
    .from("app_version_change_reports")
    .select("feedback_report_id");
  const linked = new Set(
    ((linkedRows as Array<{ feedback_report_id: string }> | null) ?? []).map(
      (r) => r.feedback_report_id,
    ),
  );

  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  return {
    ok: true,
    data: rows
      .map((r) => ({
        id: r.report_id as string,
        kind: (r.kind as string) ?? "general",
        status: (r.status as string) ?? "new",
        body_preview: (r.body_preview as string) ?? "",
      }))
      .filter((r) => !linked.has(r.id)),
  };
}

// ── Release → bulk-fix the linked reports ─────────────────────────────────

/** A linked, not-yet-resolved report surfaced in the release dialog. */
export type ReleaseReportRow = {
  reportId: string;
  changeId: string;
  changeLabel: ChangeLabel | null;
  changeSummary: string;
  reportKind: string;
  reportBody: string;
  /** False for anonymised reporters (account deleted) - still markable
   *  fixed, just no notification fires. */
  hasReporter: boolean;
};

/**
 * The reports that releasing `versionId` would close: every item in the version
 * linked to a feedback report that isn't already resolved. One row per report
 * (the first linked item wins) so a reporter is never listed twice. Drives the
 * release-confirmation dialog.
 */
export async function listReportsForRelease(
  versionId: string,
): Promise<ActionResult<ReleaseReportRow[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: linkData, error } = await supabase
    .from("app_version_change_reports")
    .select(
      "feedback_report_id, app_version_changes!inner ( id, version_id, label, summary, sort_index )",
    )
    .eq("app_version_changes.version_id", versionId);
  if (error) return { ok: false, message: error.message };

  // Normalise the embedded to-one (PostgREST may hand back object or array).
  const changes = (
    (linkData as Array<{
      feedback_report_id: string;
      app_version_changes: unknown;
    }> | null) ?? []
  )
    .map((row) => {
      const c = Array.isArray(row.app_version_changes)
        ? row.app_version_changes[0]
        : row.app_version_changes;
      const item = c as {
        id?: string;
        label?: ChangeLabel | null;
        summary?: string;
        sort_index?: number;
      } | null;
      if (!item?.id) return null;
      return {
        id: item.id,
        label: item.label ?? null,
        summary: item.summary ?? "",
        sort_index: item.sort_index ?? 0,
        feedback_report_id: row.feedback_report_id,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    label: ChangeLabel | null;
    summary: string;
    sort_index: number;
    feedback_report_id: string;
  }>;
  changes.sort((a, b) => a.sort_index - b.sort_index);
  if (changes.length === 0) return { ok: true, data: [] };

  const reportIds = Array.from(new Set(changes.map((c) => c.feedback_report_id)));
  const { data: reportData } = await supabase
    .from("feedback_reports")
    .select("id, kind, status, body, user_id")
    .in("id", reportIds);
  const byId = new Map(
    ((reportData as Array<{
      id: string;
      kind: string;
      status: string;
      body: string;
      user_id: string | null;
    }> | null) ?? []).map((r) => [r.id, r]),
  );

  const out: ReleaseReportRow[] = [];
  const seen = new Set<string>();
  for (const c of changes) {
    const rep = byId.get(c.feedback_report_id);
    if (!rep) continue;
    if (rep.status === "resolved") continue; // already fixed - never re-notify
    if (seen.has(rep.id)) continue; // first linked line per report
    seen.add(rep.id);
    out.push({
      reportId: rep.id,
      changeId: c.id,
      changeLabel: c.label,
      changeSummary: c.summary,
      reportKind: rep.kind,
      reportBody: rep.body,
      hasReporter: rep.user_id != null,
    });
  }
  return { ok: true, data: out };
}

export type ReleaseItem = {
  reportId: string;
  note: string | null;
  /** Include this report in the release (mark it fixed + notify its reporter). */
  include: boolean;
};

/**
 * Release a version and, in one gesture, close every selected linked report.
 *
 * For each included report we call the existing `set_work_stage(_, 'fixed', note)`
 * RPC - which sets status=resolved, stores the note as the resolution card, and
 * fires `feedback_resolved` (the SQL skips the notification for anonymised
 * reporters). Then the version flips to released. Already-resolved reports were
 * filtered out by listReportsForRelease, so re-releasing won't double-notify.
 */
export async function releaseVersion(
  versionId: string,
  items: ReleaseItem[],
): Promise<ActionResult<{ fixed: number; failed: number }>> {
  const admin = await requireAdmin();
  // Releasing fires a batch of reporter notifications - gate it to super_admin.
  if (admin.role !== "super_admin") {
    return { ok: false, message: "Releasing a version requires super_admin." };
  }
  const supabase = await createClient();

  let fixed = 0;
  let failed = 0;
  for (const item of items) {
    if (!item.include) continue;
    const { error } = await supabase.rpc("set_work_stage", {
      p_report_id: item.reportId,
      p_stage: "fixed",
      p_resolution_note: item.note?.trim() || null,
    });
    if (error) {
      failed += 1;
      console.error("releaseVersion set_work_stage", error);
    } else {
      fixed += 1;
      revalidatePath(`/feedback/${item.reportId}`);
    }
  }

  // Flip the version to released (stamp released_at when not already set -
  // mirrors setReleased).
  const { data: existing } = await supabase
    .from("app_versions")
    .select("released_at")
    .eq("id", versionId)
    .maybeSingle();
  const update: Record<string, unknown> = {
    status: "released",
    last_edited_by_admin_id: admin.id,
  };
  if (!existing?.released_at) update.released_at = new Date().toISOString();

  const { error: relErr } = await supabase
    .from("app_versions")
    .update(update)
    .eq("id", versionId);
  if (relErr) return { ok: false, message: relErr.message };

  revalidateVersion(versionId);
  revalidatePath("/feedback");
  return { ok: true, data: { fixed, failed } };
}

/** Collapse a report body into a single-line change summary (≤140 chars). */
function summaryFromBody(body: string): string {
  const oneLine = body.trim().replace(/\s+/g, " ");
  if (!oneLine) return "Fixed a reported issue";
  return oneLine.length <= 140 ? oneLine : oneLine.slice(0, 137) + "…";
}

/**
 * Ship a feedback report into a version from the *feedback* side: append a new
 * "Fixed" item to the version's "Fixes" section (created at the end if the
 * version doesn't have one yet), prefilled from the report body and linked via
 * the junction. Closes the changelog↔feedback loop from the thread page in a
 * single click - the mirror of addItems + linkReport.
 */
export async function shipReportInVersion(
  versionId: string,
  reportId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("feedback_reports")
    .select("body")
    .eq("id", reportId)
    .maybeSingle();
  const summary = summaryFromBody((report?.body as string | null) ?? "");

  // Find-or-create the version's "Fixes" section.
  const { data: existing } = await supabase
    .from("app_version_sections")
    .select("id")
    .eq("version_id", versionId)
    .ilike("heading", "fixes")
    .order("sort_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  let sectionId = existing?.id as string | undefined;
  if (!sectionId) {
    const { data: lastSection } = await supabase
      .from("app_version_sections")
      .select("sort_index")
      .eq("version_id", versionId)
      .order("sort_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: created, error: sectionError } = await supabase
      .from("app_version_sections")
      .insert({
        version_id: versionId,
        heading: "Fixes",
        sort_index: (lastSection?.sort_index ?? -1) + 1,
        created_by_admin_id: admin.id,
      })
      .select("id")
      .single();
    if (sectionError) return { ok: false, message: sectionError.message };
    sectionId = created.id;
  }

  const { data: last } = await supabase
    .from("app_version_changes")
    .select("sort_index")
    .eq("section_id", sectionId)
    .order("sort_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: item, error } = await supabase
    .from("app_version_changes")
    .insert({
      version_id: versionId,
      section_id: sectionId,
      kind: "fixed",
      label: "fixed",
      summary,
      sort_index: (last?.sort_index ?? -1) + 1,
      created_by_admin_id: admin.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  const { error: linkError } = await supabase
    .from("app_version_change_reports")
    .insert({ change_id: item.id, feedback_report_id: reportId });
  if (linkError) return { ok: false, message: linkError.message };

  revalidateVersion(versionId);
  revalidatePath(`/feedback/${reportId}`);
  revalidatePath("/feedback");
  return { ok: true };
}
