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
import { eventDescription, eventLabel, valueLabel, ONBOARDING_STEP_LABEL } from "@/lib/analytics/config";
import { ANALYTICS_SCREENS, SCREEN_AREAS, screenContextLabel, screenLabel } from "@/lib/analytics/screens";
import {
  getOverview,
  getDailyActivity,
  getActivationFunnel,
  getDiscovery,
  getEventVolume,
  getMessageOverview,
  getTesters,
  getScreens,
  getScreenPaths,
  getOnboardingStalls,
  getOnboardingFunnelV2,
  getMarksBySource,
  getOutboxReplays,
  type TesterRow,
  type ScreenRow,
  type ScreenPathRow,
  type OnboardingStallRow,
} from "@/lib/analytics/queries";
import { formatVersionBuildOrDash } from "@/lib/appBuild";

export const dynamic = "force-dynamic";

/**
 * Analytics overview — rebuilt 2026-08-28 as ONE opinionated report (the
 * June.so model: reports, not queries) written in plain English for Tom AND
 * Jack. Rules: no raw event names anywhere, one hero number per card with a
 * delta vs the prior period, descriptions on hover, and — while the beta is
 * small — a per-tester strip up top: at 5–20 users, "what did each person
 * do" is the real report and percentage charts are noise. The strip retires
 * itself past ~25 weekly-active users (getTesterWeek returns null).
 *
 * 2026-09-05 coverage pass (Tom: "get all of the new data on Bunker"): the
 * sentence strip became the per-tester TABLE from the launch-night read
 * (courses · rounds · return sessions · … for every account), plus which
 * pages get opened and which never have, where setup stalls and whether the
 * connection or the person gave up, the most recent sessions as page
 * sequences, and how courses get marked. All read from the
 * `20260905170000_analytics_coverage_views.sql` views; the sections render
 * their empty states until a build that emits the new events is live.
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

  const [overview, daily, funnel, discovery, eventVolume, messages] = await Promise.all([
    getOverview(supabase),
    getDailyActivity(supabase),
    getActivationFunnel(supabase),
    getDiscovery(supabase),
    getEventVolume(supabase),
    getMessageOverview(supabase),
  ]);
  const [testers, screens, paths, stalls, funnelV2, marks, replays] = await Promise.all([
    getTesters(supabase),
    getScreens(supabase),
    getScreenPaths(supabase, 16),
    getOnboardingStalls(supabase),
    getOnboardingFunnelV2(supabase),
    getMarksBySource(supabase),
    getOutboxReplays(supabase),
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

  const seenScreens = new Set(screens.map((s) => s.screen));
  const unvisited = ANALYTICS_SCREENS.filter((s) => !seenScreens.has(s.key));
  const screenItems = mergeScreens(screens).slice(0, 14);
  const replayTotal = replays.reduce((n, r) => n + r.replayed, 0);

  return (
    <Shell>
      {/* ── Every tester, one row each (beta scale) ── */}
      <Reveal>
        <section className="space-y-3 rounded-2xl glass-panel p-5">
          <div className="flex items-baseline justify-between gap-3">
            <SectionLabel>Everyone in the app</SectionLabel>
            <span className="text-[11px] text-ink-3">
              {testers.length} {testers.length === 1 ? "account" : "accounts"} · return sessions =
              sessions that began after setup was finished
            </span>
          </div>
          <TestersTable rows={testers} />
        </section>
      </Reveal>

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

      {/* ── Pages: where people go, and where nobody has been ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Reveal delay={130}>
          <section className="space-y-3 rounded-xl glass-panel p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Pages people open</SectionLabel>
              <span className="text-[11px] text-ink-3">all time · people who opened it</span>
            </div>
            <BarList
              items={screenItems.map((s) => ({
                key: s.key,
                label: s.label,
                value: s.views,
                trailing: `${s.users.toLocaleString()} ${s.users === 1 ? "person" : "people"}`,
                title: s.context ? `${s.label} · ${s.context}` : s.label,
              }))}
              tone="brand"
              emptyLabel="No page views yet — this arrives with the next app update (0.4.5+)."
            />
          </section>
        </Reveal>
        <Reveal delay={140}>
          <section className="space-y-3 rounded-xl glass-panel p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Pages nobody has opened</SectionLabel>
              <span className="text-[11px] text-ink-3">
                {unvisited.length} of {ANALYTICS_SCREENS.length}
              </span>
            </div>
            {screens.length === 0 ? (
              <EmptyHint>
                Every page will show here until the update that records page views is live.
              </EmptyHint>
            ) : unvisited.length === 0 ? (
              <EmptyHint>Every page has been opened at least once.</EmptyHint>
            ) : (
              <div className="space-y-2.5">
                {SCREEN_AREAS.map((area) => {
                  const inArea = unvisited.filter((s) => s.area === area);
                  if (inArea.length === 0) return null;
                  return (
                    <div key={area}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{area}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {inArea.map((s) => (
                          <span
                            key={s.key}
                            className="rounded-md border border-rule/60 bg-paper-sunken/40 px-2 py-0.5 text-[11px] text-ink-2"
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>
      </div>

      {/* ── Setting up: the step funnel + who stopped, and why ── */}
      <Reveal delay={150}>
        <section className="space-y-4 rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Setting up · step by step</SectionLabel>
            <span className="text-[11px] text-ink-3">
              people who finished each step · &quot;offline&quot; = finished it with no connection
            </span>
          </div>
          {funnelV2.length > 0 ? (
            <FunnelBars
              stages={funnelV2.map((s) => ({
                key: s.step,
                label:
                  (s.step === "started"
                    ? "Started"
                    : s.step === "completed"
                      ? "Finished"
                      : ONBOARDING_STEP_LABEL[s.step] ?? s.step) +
                  (s.users_offline > 0 ? ` · ${s.users_offline} offline` : ""),
                count: s.users,
              }))}
            />
          ) : (
            <EmptyHint>No sign-ups recorded yet.</EmptyHint>
          )}
          <div className="border-t border-rule/60 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                Didn&apos;t finish setting up
              </p>
              <span className="text-[11px] text-ink-3">{stalls.length}</span>
            </div>
            {stalls.length === 0 ? (
              <p className="mt-2 text-xs text-ink-3">Everyone who signed up finished setup.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {stalls.map((s) => (
                  <StallCard key={s.user_id} stall={s} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </Reveal>

      {/* ── Recent sessions as page sequences ── */}
      <Reveal delay={160}>
        <section className="space-y-3 rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Recent sessions · the path each person took</SectionLabel>
            <Link
              href="/analytics/paths"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
            >
              All paths <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {paths.length === 0 ? (
            <EmptyHint>No sessions in the last 30 days.</EmptyHint>
          ) : (
            <ul className="space-y-2">
              {paths.map((p) => (
                <PathRow key={p.session_id} session={p} />
              ))}
            </ul>
          )}
          {replayTotal > 0 && (
            <p className="text-[11px] text-ink-3">
              {replayTotal.toLocaleString()} of these events arrived late — recorded on the phone
              while it was offline and sent when the connection came back.
            </p>
          )}
        </section>
      </Reveal>

      {/* ── How courses get marked ── */}
      <Reveal delay={170}>
        <section className="space-y-3 rounded-xl glass-panel p-4">
          <SectionLabel>How courses get marked played</SectionLabel>
          <p className="text-[11px] text-ink-3">
            Setup marks, course-page taps, and the marks a logged round creates — every path now counts.
          </p>
          <BarList
            items={marks.map((m) => ({
              key: `${m.source}/${m.discovery_source}`,
              label: `${valueLabel(m.source)}${
                m.discovery_source !== "unknown" && m.discovery_source !== m.source
                  ? ` · ${valueLabel(m.discovery_source)}`
                  : ""
              }`,
              value: m.marks,
              trailing: `${m.users.toLocaleString()} ${m.users === 1 ? "person" : "people"}`,
            }))}
            tone="info"
            emptyLabel="No marks recorded through the app yet."
          />
        </section>
      </Reveal>

      {/* ── Email delivery ── */}
      <Reveal delay={180}>
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

// ── Testers table — every account, one row ────────────────────────────────

const TESTER_COLUMNS =
  "minmax(150px,1.6fr) 72px 56px 60px 56px 48px 72px 56px 56px 60px 52px 84px 84px";

function TestersTable({ rows }: { rows: TesterRow[] }) {
  if (rows.length === 0) return <EmptyHint>No accounts yet.</EmptyHint>;
  const head = (label: string, align: "left" | "right" = "right", title?: string) => (
    <div
      className={
        "text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3 " +
        (align === "right" ? "text-right" : "")
      }
      title={title}
    >
      {label}
    </div>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-rule/50">
      <div style={{ minWidth: 1040 }}>
        <div
          className="grid items-center gap-3 border-b border-rule/60 bg-paper-sunken/40 px-3 py-2"
          style={{ gridTemplateColumns: TESTER_COLUMNS }}
        >
          {head("Tester", "left")}
          {head("Joined")}
          {head("Version")}
          {head("Courses", "right", "Courses in their collection")}
          {head("Rounds", "right", "Rounds logged")}
          {head("Lists", "right", "Lists they own")}
          {head("Returns", "right", "Sessions that began after setup was finished")}
          {head("Days", "right", "Days with any activity")}
          {head("Friends", "right", "Accepted friendships")}
          {head("Reacts", "right", "Reactions given")}
          {head("Public", "right", "Profile visible to everyone")}
          {head("Last active", "right", "Last recorded action in the app")}
          {head("Last opened", "right", "Last time the app came to the front — from sign-in refreshes and push registration, so it works on builds that record nothing else")}
        </div>
        <ol>
          {rows.map((t) => (
            <li key={t.user_id}>
              <Link
                href={`/users/${t.user_id}`}
                className="grid items-center gap-3 border-b border-rule/40 px-3 py-2 text-sm tabular-nums transition-colors last:border-0 hover:bg-paper-raised/50"
                style={{ gridTemplateColumns: TESTER_COLUMNS }}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {t.display_name || (t.username ? `@${t.username}` : "Someone")}
                    {!t.onboarded && (
                      <span className="ml-1.5 rounded bg-amber/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-amber">
                        setup unfinished
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-ink-3">
                    {t.username ? `@${t.username}` : ""}
                    {t.is_founding_member ? " · founder" : ""}
                    {!t.has_push ? " · no push" : ""}
                    {t.analytics_opt_out ? " · opted out" : ""}
                  </p>
                </div>
                <Num muted>{shortDate(t.joined_at)}</Num>
                <Num muted>{formatVersionBuildOrDash(t.app_version, t.app_build)}</Num>
                <Num strong={t.courses > 0}>{t.courses}</Num>
                <Num strong={t.rounds > 0}>{t.rounds}</Num>
                <Num>{t.lists}</Num>
                <Num strong={t.return_sessions > 0}>{t.return_sessions}</Num>
                <Num>{t.active_days}</Num>
                <Num>{t.friends}</Num>
                <Num>{t.reactions}</Num>
                <Num muted>{t.is_public ? "yes" : "no"}</Num>
                <Num muted>{t.last_event_at ? relDay(t.last_event_at) : "never"}</Num>
                <Num muted>{t.last_opened_at ? relDay(t.last_opened_at) : t.last_event_at ? relDay(t.last_event_at) : "never"}</Num>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Num({
  children,
  muted,
  strong,
}: {
  children: React.ReactNode;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <span
      className={
        "text-right " +
        (muted ? "text-[11px] text-ink-3" : strong ? "font-display text-ink" : "text-ink-2")
      }
    >
      {children}
    </span>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function relDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── Pages ─────────────────────────────────────────────────────────────────

/** Fold a screen's sub-surfaces into one row per page, keeping the Boards
 *  cohorts separate (Friends / Global / Local are different pages to a user). */
function mergeScreens(rows: ScreenRow[]) {
  const out = new Map<string, { key: string; label: string; context: string | null; views: number; users: number }>();
  for (const r of rows) {
    const keepContext = r.screen === "boards" && r.context;
    const key = keepContext ? `${r.screen}:${r.context}` : r.screen;
    const ctx = keepContext ? screenContextLabel(r.context) : null;
    const cur = out.get(key) ?? {
      key,
      label: ctx ? `${screenLabel(r.screen)} · ${ctx}` : screenLabel(r.screen),
      context: ctx,
      views: 0,
      users: 0,
    };
    cur.views += r.views;
    // Users across contexts can overlap; take the max as the honest floor.
    cur.users = Math.max(cur.users, r.users);
    out.set(key, cur);
  }
  return Array.from(out.values()).sort((a, b) => b.views - a.views);
}

// ── Setup stalls ──────────────────────────────────────────────────────────

type Verdict = { label: string; tone: string; detail: string };

/** Connection or person? Read off the failure rows and the last step's
 *  reachability — never guessed from timing alone. */
function stallVerdict(s: OnboardingStallRow): Verdict {
  const fails = s.failure_details ?? [];
  const connection = fails.filter((f) => f.reason === "offline" || f.reason === "transient");
  const server = fails.filter((f) => f.reason === "server");
  if (connection.length > 0 || s.last_step_online === false) {
    const op = connection[0]?.operation;
    return {
      label: "Connection",
      tone: "bg-amber/15 text-amber",
      detail: op
        ? `Lost the connection while ${valueLabel(op)}.`
        : "Finished their last step with no connection.",
    };
  }
  if (server.length > 0) {
    return {
      label: "Server refused",
      tone: "bg-alert/15 text-alert",
      detail: `The server rejected ${valueLabel(server[0].operation ?? "a save")}. Tom: check the logs.`,
    };
  }
  if (!s.last_step && !s.last_event_at) {
    return { label: "No data", tone: "bg-paper-sunken text-ink-3", detail: "Signed up before page tracking existed, or never opened the app." };
  }
  return {
    label: "Walked away",
    tone: "bg-paper-sunken text-ink-3",
    detail: "No failed saves and the phone was online — they chose to stop.",
  };
}

function StallCard({ stall }: { stall: OnboardingStallRow }) {
  const v = stallVerdict(stall);
  const name = stall.display_name || (stall.username ? `@${stall.username}` : "Someone");
  const step = stall.last_step ? ONBOARDING_STEP_LABEL[stall.last_step] ?? stall.last_step : null;
  return (
    <li className="rounded-xl border border-rule/50 bg-paper-sunken/30 px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/users/${stall.user_id}`} className="truncate text-sm font-medium text-ink hover:underline">
          {name}
        </Link>
        <span className={"shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold " + v.tone}>{v.label}</span>
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
        {step ? `Stopped after “${step}”` : "Never finished a step"}
        {stall.last_event_at ? ` · last seen ${relDay(stall.last_event_at)}` : ""}
        {stall.resumes > 0 ? ` · came back ${stall.resumes}×` : ""}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-3">{v.detail}</p>
    </li>
  );
}

// ── Session paths ─────────────────────────────────────────────────────────

const PATH_CAP = 14;

function PathRow({ session }: { session: ScreenPathRow }) {
  const name = session.display_name || (session.username ? `@${session.username}` : "Someone");
  const minutes = Math.max(
    0,
    Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60_000),
  );
  const steps = session.steps ?? [];
  const shown = steps.slice(0, PATH_CAP);
  const hidden = steps.length - shown.length;
  return (
    <li className="rounded-xl border border-rule/50 bg-paper-sunken/30 px-3.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="shrink-0 text-[10px] tabular-nums text-ink-3">
          {relDay(session.started_at)} · {minutes} min · {session.events} {session.events === 1 ? "event" : "events"}
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {shown.map((st, i) => {
          const isScreen = st.event === "screen_viewed";
          const label = isScreen
            ? `${screenLabel(st.screen ?? "?")}${
                st.screen === "boards" && st.context ? ` · ${screenContextLabel(st.context)}` : ""
              }`
            : st.event === "onboarding_step_completed" && st.step
              ? `Setup: ${ONBOARDING_STEP_LABEL[st.step] ?? st.step}`
              : eventLabel(st.event);
          return (
            <span key={`${st.at}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-[10px] text-ink-3/60">›</span>}
              <span
                className={
                  "rounded-md px-1.5 py-0.5 text-[11px] " +
                  (isScreen ? "bg-paper-sunken text-ink-2" : "bg-info/12 font-medium text-info")
                }
                title={new Date(st.at).toLocaleTimeString("en-GB")}
              >
                {label}
              </span>
            </span>
          );
        })}
        {hidden > 0 && <span className="text-[11px] text-ink-3">+{hidden} more</span>}
      </div>
    </li>
  );
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
