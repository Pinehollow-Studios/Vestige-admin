import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCoverURL } from "@/lib/storage";
import { EventEditor, type EventCourseRow } from "./EventEditor";
import { type EventRow } from "../types";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export default async function EventEditorPage(props: { params: RouteParams }) {
  const { id } = await props.params;
  const supabase = await createClient();

  // Four reads in parallel: the event, its course set, the county
  // catalogue (for the sweep bulk-add), and the published badge
  // definitions (for the prize select).
  const [eventResult, coursesResult, countiesResult, badgesResult] = await Promise.all([
    supabase
      .from("clubhouse_events")
      .select(
        "id,title,subtitle,description,kind,starts_at,ends_at,target_count,cover_storage_key,badge_definition_id,award_rule,published_at,is_archived,finalized_at,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("clubhouse_event_courses")
      .select("course_id,position,courses(name,counties(name))")
      .eq("event_id", id)
      .order("position", { ascending: true }),
    supabase.from("counties").select("id,name").order("name"),
    supabase
      .from("badge_definitions")
      .select("id,name")
      .eq("is_archived", false)
      .order("name"),
  ]);

  if (eventResult.error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-alert/40 bg-alert/10 p-4 text-sm text-alert">
          Failed to load event: {eventResult.error.message}
        </div>
      </div>
    );
  }
  if (!eventResult.data) notFound();

  const courses: EventCourseRow[] = (coursesResult.data ?? []).map((row) => {
    const c = unwrapRow<CourseRowFromJoin>(row.courses);
    return {
      course_id: row.course_id,
      course_name: c?.name ?? "Unknown course",
      county_name: unwrapRow<{ name: string }>(c?.counties)?.name ?? null,
      position: row.position,
    };
  });

  const row: EventRow = {
    ...eventResult.data,
    course_count: courses.length,
  };

  return (
    <EventEditor
      row={row}
      courses={courses}
      coverURL={listCoverURL(row.cover_storage_key)}
      counties={countiesResult.data ?? []}
      badges={badgesResult.data ?? []}
    />
  );
}

type CourseRowFromJoin = {
  name: string;
  counties: { name: string }[] | { name: string } | null;
};

function unwrapRow<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return value as T;
}
