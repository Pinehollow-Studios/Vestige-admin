import { ArrowUpRight } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { AnalyticsNav } from "@/components/admin/analytics/AnalyticsNav";
import { Reveal } from "@/components/admin/Motion";
import {
  SectionLabel,
  BarList,
  BigStat,
  FunnelBars,
  AreaChart,
  Sparkline,
  EmptyHint,
} from "@/components/admin/analytics/viz";
import Link from "next/link";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { eventDescription, eventLabel, valueLabel } from "@/lib/analytics/config";
import {
  getOverview,
  getDailyActivity,
  getActivationFunnel,
  getDiscovery,
  getEventVolume,
  getMessageOverview,
  getTesterWeek,
  type TesterWeekRow,
} from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

/**
 * Analytics overview — rebuilt 2026-08-28 as ONE opinionated report (the
 * June.so model: reports, not queries) written in plain English for Tom AND
 * Jack. Rules: no raw event names anywhere, one hero number per card with a
 * delta vs the prior period, descriptions on hover, and — while the beta is
 * small — a per-tester strip up top: at 5–20 users, "what did each person
 * do" is the real report and percentage charts are noise. The strip retires
 * itself past ~25 weekly-active users (getTesterWeek returns null).
 */

/** Percent delta of `now` vs `prior`; "-" when the base is 0 and now is 0. */
function deltaPct(now: number, prior: number): number {
  if (prior > 0) return Math.round(((now - prior) / prior) * 100);
  return now > 0 ? 100 : 0;
}

export default async function AnalyticsOverviewPage() {
  const supabase = await tryCreateServiceClient();

  if (!supabase) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-amber">
          Analytics isn&apos;t connected on this environment yet — the server key is missing.
        </div>
      </Shell>
    );
  }

  const [overview, daily, funnel, discovery, eventVolume, messages, testers] = await Promise.all([
    getOverview(supabase),
    getDailyActivity(supabase),
    getActivationFunnel(supabase),
    getDiscovery(supabase),
    getEventVolume(supabase),
    getMessageOverview(supabase),
    getTesterWeek(supabase),
  ]);

  if (!overview) {
    return (
      <Shell>
        <EmptyHint>
          Couldn&apos;t read the analytics data on this environment — that&apos;s a wiring
          problem, not &quot;no users yet&quot;. Tom: check the analytics views are deployed.
        </EmptyHint>
      </Shell>
    );
  }

  const totalUsers = overview.total_users;
  const activeDelta = deltaPct(overview.active_7d, overview.active_prior_7d);
  const optOutPct = totalUsers > 0 ? Math.round((overview.opt_out_users / totalUsers) * 100) : null;

  const last30 = daily.slice(-30);
  const activeSeries = last30.map((d) => ({ day: d.day, count: d.active_users }));
  const roundsSeries = last30.map((d) => ({ day: d.day, count: d.rounds }));
  const signupsSeries = last30.map((d) => ({ day: d.day, count: d.signups }));
  const hasDaily = last30.some((d) => d.active_users > 0 || d.rounds > 0);
  const rounds7d = overview.rounds_7d;

  const funnelStages = funnel.filter((s) => s.sort <= 4);
  const milestones = funnel.filter((s) => s.sort >= 5);
  const onboarded = funnel.find((s) => s.step === "onboarded")?.users ?? 0;
  const loggedUsers = funnel.find((s) => s.step === "logged")?.users ?? 0;
  const activationPct = onboarded > 0 ? Math.round((loggedUsers / onboarded) * 100) : 0;

  const discoveryItems = discovery.map((d) => ({
    key: d.discovery_source,
    label: valueLabel(d.discovery_source),
    value: d.plays,
    trailing: `${d.users.toLocaleString()} ${d.users === 1 ? "person" : "people"}`,
  }));
  const adoptionItems = eventVolume.slice(0, 8).map((e) => ({
    key: e.event_name,
    label: eventLabel(e.event_name),
    value: e.total,
    trailing: `${e.users.toLocaleString()} ${e.users === 1 ? "person" : "people"}`,
  }));

  return (
    <Shell>
      {/* ── This week's testers (beta scale; retires past ~25 people) ── */}
      {testers !== null && testers.length > 0 && (
        <Reveal>
          <section className="space-y-3 rounded-2xl glass-panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <SectionLabel>This week&apos;s testers</SectionLabel>
              <span className="text-[11px] text-ink-3">
                {testers.length} of {totalUsers} people were in the app
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {testers.map((t) => (
                <TesterCard key={t.user_id} tester={t} />
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {/* ── Pulse ── */}
      <Reveal delay={40}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PulseCard>
            <BigStat
              label="People in the app this week"
              value={overview.active_7d.toLocaleString()}
              delta={{
                text: `${activeDelta >= 0 ? "+" : ""}${activeDelta}% vs last week`,
                dir: activeDelta > 0 ? "up" : activeDelta < 0 ? "down" : "flat",
              }}
              sub={`${overview.active_30d.toLocaleString()} in the last 30 days`}
            />
          </PulseCard>
          <PulseCard>
            <BigStat
              label="Rounds logged this week"
              value={rounds7d.toLocaleString()}
              delta={{
                text: `${overview.total_rounds.toLocaleString()} all time`,
                dir: rounds7d > 0 ? "up" : "flat",
              }}
              sub="The core action — the number that matters most"
            />
          </PulseCard>
          <PulseCard>
            <BigStat
              label="New accounts this week"
              value={overview.users_7d.toLocaleString()}
              delta={{
                text: `${overview.users_30d.toLocaleString()} in 30 days`,
                dir: overview.users_7d > 0 ? "up" : "flat",
              }}
              sub={`${totalUsers.toLocaleString()} accounts in total${
                optOutPct !== null && optOutPct > 0 ? ` · ${optOutPct}% opted out of tracking` : ""
              }`}
            />
          </PulseCard>
        </div>
      </Reveal>

      {/* ── Daily activity ── */}
      <Reveal delay={60}>
        <section className="space-y-4 rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>People in the app each day · last 30 days</SectionLabel>
          </div>
          {hasDaily ? (
            <>
              <AreaChart data={activeSeries} height={150} />
              <div className="grid grid-cols-1 gap-4 border-t border-rule/60 pt-4 sm:grid-cols-2">
                <MiniSeries
                  label="Rounds logged each day"
                  total={overview.total_rounds}
                  series={roundsSeries}
                />
                <MiniSeries
                  label="New accounts each day"
                  total={overview.users_30d}
                  series={signupsSeries}
                />
              </div>
            </>
          ) : (
            <EmptyHint>Nobody has been in the app in the last 30 days.</EmptyHint>
          )}
        </section>
      </Reveal>

      {/* ── Activation + discovery ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Reveal delay={80}>
          <section className="space-y-3 rounded-xl glass-panel p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>From signing up to first round</SectionLabel>
              <span
                className="rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand"
                title="Of everyone who finished setting up, how many have logged a round."
              >
                {activationPct}% log a round
              </span>
            </div>
            {funnelStages.length > 0 ? (
              <>
                <FunnelBars
                  stages={funnelStages.map((s) => ({ key: s.step, label: s.label, count: s.users }))}
                />
                {milestones.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {milestones.map((m) => (
                      <div
                        key={m.step}
                        className="rounded-lg border border-rule/60 bg-paper-sunken/30 px-3 py-2"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                          {m.label}
                        </p>
                        <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">
                          {m.users.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyHint>No sign-ups recorded yet.</EmptyHint>
            )}
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section className="space-y-3 rounded-xl glass-panel p-4">
            <SectionLabel>Where plays come from</SectionLabel>
            <p className="text-[11px] text-ink-3">
              How people found each course at the moment they marked it played.
            </p>
            <BarList items={discoveryItems} tone="brand" emptyLabel="No plays recorded yet." />
          </section>
        </Reveal>
      </div>

      {/* ── What people are doing ── */}
      <Reveal delay={120}>
        <section className="space-y-3 rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>What people are doing · last 30 days</SectionLabel>
            <Link
              href="/analytics/explore"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
            >
              Deep dive <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <BarList
            items={adoptionItems.map((i) => ({
              ...i,
              // Hover carries the one-line description from the dictionary.
              title: eventDescription(i.key),
            }))}
            tone="info"
            emptyLabel="No activity recorded yet."
          />
        </section>
      </Reveal>

      {/* ── Email delivery ── */}
      <Reveal delay={140}>
        <section className="space-y-4 rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Email · last 30 days</SectionLabel>
            <Link
              href="/emails"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
            >
              Email centre <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MsgStat label="Delivered" hint="Recipients reached" value={messages.delivered} />
            <MsgStat label="Opens" hint="Total opens — one person can open twice" value={messages.opened} />
            <MsgStat label="Clicks" hint="Total clicks — same caveat" value={messages.clicked} />
            <MsgStat label="Bounced" hint="Addresses that rejected us" value={messages.bounced} alert />
            <MsgStat label="Complaints" hint="Marked as spam" value={messages.complained} alert />
            <MsgStat
              label="Suppressed"
              hint="Addresses we no longer email"
              value={messages.suppressed}
              alert
              href="/emails/suppressions"
            />
          </div>
        </section>
      </Reveal>
    </Shell>
  );
}

// ── Tester card — one person's week, in a sentence ────────────────────────

/** Priority order so the sentence leads with the actions that matter. */
const ACTION_PRIORITY = [
  "round_logged",
  "course_marked_played",
  "course_added_to_list",
  "course_viewed",
  "profile_viewed",
  "paywall_shown",
];

function TesterCard({ tester }: { tester: TesterWeekRow }) {
  const entries = Object.entries(tester.actions).sort((a, b) => {
    const pa = ACTION_PRIORITY.indexOf(a[0]);
    const pb = ACTION_PRIORITY.indexOf(b[0]);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return b[1] - a[1];
  });
  const sentence = entries
    .slice(0, 3)
    .map(([name, n]) => `${eventLabel(name)}${n > 1 ? ` ×${n}` : ""}`)
    .join(" · ");
  const more = entries.length - 3;
  return (
    <li className="rounded-xl border border-rule/50 bg-paper-sunken/30 px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink">{tester.display_name}</p>
        <p className="shrink-0 text-[10px] text-ink-3">{relDay(tester.last_seen)}</p>
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
        {sentence}
        {more > 0 && <span className="text-ink-3"> · +{more} more</span>}
      </p>
    </li>
  );
}

function relDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── Atoms ─────────────────────────────────────────────────────────────────

function PulseCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl glass-panel p-5">{children}</div>;
}

function MsgStat({
  label,
  hint,
  value,
  alert,
  href,
}: {
  label: string;
  hint: string;
  value: number;
  alert?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <p
        className={
          "font-display text-2xl font-semibold tabular-nums " +
          (alert && value > 0 ? "text-alert" : "text-ink")
        }
      >
        {value.toLocaleString()}
      </p>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</p>
    </>
  );
  const cls = "block rounded-xl border border-rule/60 bg-paper-sunken/30 px-3 py-3 text-center";
  return href ? (
    <Link href={href} className={cls + " transition-colors hover:border-brand/40"} title={hint}>
      {inner}
    </Link>
  ) : (
    <div className={cls} title={hint}>
      {inner}
    </div>
  );
}

function MiniSeries({
  label,
  total,
  series,
}: {
  label: string;
  total: number;
  series: { day: string; count: number }[];
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</p>
        <p className="font-display text-lg leading-none tabular-nums text-ink">
          {total.toLocaleString()}
        </p>
      </div>
      <Sparkline data={series} ariaLabel={label} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SectionHeader eyebrow="Operations" title="Analytics" />
      <AnalyticsNav active="/analytics" />
      {children}
    </div>
  );
}
