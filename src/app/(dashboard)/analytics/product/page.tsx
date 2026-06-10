import { SectionHeader } from "@/components/admin/SectionHeader";
import { AnalyticsNav } from "@/components/admin/analytics/AnalyticsNav";
import { SectionLabel, FunnelBars, BarList, Sparkline, MetricCard, EmptyHint } from "@/components/admin/analytics/viz";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { eventLabel, DISCOVERY_SOURCE_LABEL } from "@/lib/analytics/config";
import {
  getEvents,
  rollupOnboardingFunnel,
  rollupDAU,
  rollupVolume,
  rollupDiscovery,
  distinctUsers,
  distinctSessions,
  isoDaysAgo,
} from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function ProductAnalyticsPage() {
  const supabase = await tryCreateServiceClient();
  if (!supabase) return <Shell>{notConfigured}</Shell>;

  const events30 = await getEvents(supabase, { sinceIso: isoDaysAgo(30), limit: 10000 });

  const funnel = rollupOnboardingFunnel(events30);
  const dau = rollupDAU(events30, 30);
  const volume = rollupVolume(events30).map((v) => ({ key: v.key, label: eventLabel(v.key), value: v.count }));
  const discovery = rollupDiscovery(events30).map((d) => ({
    key: d.key,
    label: DISCOVERY_SOURCE_LABEL[d.key] ?? d.key,
    value: d.count,
  }));

  const activeUsers = distinctUsers(events30);
  const sessions = distinctSessions(events30);
  const dauToday = dau[dau.length - 1]?.count ?? 0;
  const dauPeak = Math.max(...dau.map((d) => d.count), 0);
  const eventsPerUser = activeUsers > 0 ? (events30.length / activeUsers).toFixed(1) : "0";

  return (
    <Shell>
      <section className="space-y-3">
        <SectionLabel>Engagement · last 30 days</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Active users" value={activeUsers.toLocaleString()} hint="Distinct, 30d" tone="brand" />
          <MetricCard label="Sessions" value={sessions.toLocaleString()} hint="Distinct session ids" />
          <MetricCard label="Events / user" value={eventsPerUser} hint="Engagement depth" />
          <MetricCard label="DAU today" value={dauToday.toLocaleString()} hint={`Peak ${dauPeak}`} />
        </div>
        <div className="rounded-xl glass-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Daily active users
            </span>
            <span className="text-[11px] tabular-nums text-ink-3">{dau[0]?.day} → {dau[dau.length - 1]?.day}</span>
          </div>
          {dauPeak > 0 ? (
            <Sparkline data={dau} />
          ) : (
            <EmptyHint>No active-user days in the window yet.</EmptyHint>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl glass-panel p-4">
        <SectionLabel>Activation funnel</SectionLabel>
        <p className="text-[11px] text-ink-3">
          Distinct users reaching each onboarding stage. The drop-off between stages is where activation is won or lost.
        </p>
        <FunnelBars stages={funnel} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl glass-panel p-4">
          <SectionLabel>Feature adoption</SectionLabel>
          <p className="text-[11px] text-ink-3">Event volume by type — what gets used.</p>
          <BarList items={volume} emptyLabel="No events in the window yet." />
        </section>

        <section className="space-y-3 rounded-xl glass-panel p-4">
          <SectionLabel>Discovery attribution</SectionLabel>
          <p className="text-[11px] text-ink-3">
            How users reach the courses they view, bucket and play — the B2B-grade signal no domain table holds.
          </p>
          <BarList items={discovery} emptyLabel="No discovery-tagged events yet." tone="info" />
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SectionHeader
        eyebrow="Insights · Analytics"
        title="Product"
        description="Activation, engagement and feature adoption from the app event stream."
      />
      <AnalyticsNav active="/analytics/product" />
      {children}
    </div>
  );
}

const notConfigured = (
  <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-amber">
    Service-role key not configured — set <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to read the
    analytics tables.
  </div>
);
