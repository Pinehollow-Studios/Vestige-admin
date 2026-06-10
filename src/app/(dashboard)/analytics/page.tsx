import Link from "next/link";
import { ArrowUpRight, Database, Activity } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { StatsStrip, type Stat } from "@/components/admin/StatsStrip";
import { AnalyticsNav } from "@/components/admin/analytics/AnalyticsNav";
import { EventFeed } from "@/components/admin/analytics/EventFeed";
import { SectionLabel, FunnelBars, BarList, MetricCard, ThresholdNote } from "@/components/admin/analytics/viz";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { eventLabel, MIN_COHORT_N } from "@/lib/analytics/config";
import {
  getPlatformStats,
  getEvents,
  getB2BConversion,
  rollupOnboardingFunnel,
  rollupVolume,
  isoDaysAgo,
} from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage() {
  const supabase = await tryCreateServiceClient();
  const metabaseUrl = process.env.NEXT_PUBLIC_METABASE_DASHBOARD_URL;

  if (!supabase) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-amber">
          Service-role key not configured — set <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to
          read the analytics tables.
        </div>
      </Shell>
    );
  }

  const [stats, events30, conversion] = await Promise.all([
    getPlatformStats(supabase),
    getEvents(supabase, { sinceIso: isoDaysAgo(30), limit: 5000 }),
    getB2BConversion(supabase),
  ]);

  const recent = events30.slice(0, 12);
  const funnel = rollupOnboardingFunnel(events30);
  const topEvents = rollupVolume(events30)
    .slice(0, 6)
    .map((v) => ({ key: v.key, label: eventLabel(v.key), value: v.count }));

  const platformStats: Stat[] = [
    { key: "users", label: "Users", value: stats.users, hint: `+${stats.usersWeek} this week` },
    { key: "events", label: "Events (all-time)", value: stats.events, hint: `${stats.eventsToday} today`, tone: "attention" },
    { key: "rounds", label: "Rounds", value: stats.rounds, hint: `+${stats.roundsWeek} this week` },
    { key: "played", label: "Played markers", value: stats.playedMarkers, hint: "Lifetime plays" },
  ];

  return (
    <Shell>
      <StatsStrip stats={platformStats} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Live event stream · last 30 days</SectionLabel>
          <Link href="/analytics/events" className="text-[11px] font-semibold text-brand hover:underline">
            Open explorer →
          </Link>
        </div>
        <EventFeed
          rows={recent}
          emptyLabel="No events yet. They appear here once the instrumented app runs (Debug → dev, or a shipped build → prod)."
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Activation funnel</SectionLabel>
            <Link href="/analytics/product" className="text-[11px] font-semibold text-brand hover:underline">
              Detail →
            </Link>
          </div>
          <FunnelBars stages={funnel} />
        </section>

        <section className="space-y-3 rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Top events</SectionLabel>
            <Link href="/analytics/product" className="text-[11px] font-semibold text-brand hover:underline">
              Detail →
            </Link>
          </div>
          <BarList items={topEvents} emptyLabel="No events recorded in the window yet." />
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>B2B preview · headline</SectionLabel>
          <Link href="/analytics/b2b" className="text-[11px] font-semibold text-brand hover:underline">
            Full preview →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Bucket-listed" value={conversion.bucketed.toLocaleString()} hint="Intent signals" />
          <MetricCard label="Converted to played" value={conversion.converted.toLocaleString()} hint="Bucket → played" />
          <MetricCard
            label="Conversion rate"
            value={`${Math.round(conversion.rate * 100)}%`}
            hint="Of bucket-listed"
            tone="brand"
          />
          <MetricCard label="Contributing users" value={conversion.users.toLocaleString()} hint="After opt-out exclusion" />
        </div>
        <ThresholdNote n={MIN_COHORT_N} />
      </section>

      <section className="space-y-3">
        <SectionLabel>Explore &amp; tools</SectionLabel>
        {metabaseUrl ? (
          <div className="overflow-hidden rounded-xl glass-panel">
            <iframe src={metabaseUrl} className="h-[640px] w-full" title="Metabase dashboard" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ToolCard
              href="https://supabase.com/dashboard/project/_/sql/new"
              icon={<Database className="size-4" />}
              label="Supabase SQL editor"
              description="Ad-hoc queries over app_events + domain tables. Run as the service role to read across users."
            />
            <ToolCard
              href="https://supabase.com/dashboard/project/_/editor"
              icon={<Activity className="size-4" />}
              label="app_events table"
              description="The raw event sink. Metabase embeds here once NEXT_PUBLIC_METABASE_DASHBOARD_URL is set."
            />
          </div>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SectionHeader
        eyebrow="Insights · Analytics"
        title="Analytics"
        description="Product + business analytics over the app event stream and domain data. Internal surface; the B2B preview is threshold-gated."
      />
      <AnalyticsNav active="/analytics" />
      {children}
    </div>
  );
}

function ToolCard({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-3 rounded-xl glass-panel p-4 transition-colors hover:border-brand"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1 font-display text-base text-ink">
          {label}
          <ArrowUpRight aria-hidden className="size-3 text-ink-3" />
        </p>
        <p className="text-[11px] leading-relaxed text-ink-2">{description}</p>
      </div>
    </a>
  );
}
