import { cn } from "@/lib/utils";

/** Uppercase mint section subhead — the recurring analytics section label. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
      {children}
    </h2>
  );
}

/** Small inline empty state for a section that has no data yet. */
export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-rule/70 bg-paper-sunken/40 px-4 py-8 text-center text-sm text-ink-3">
      {children}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString();
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Funnel: one bar per stage, width relative to the first stage. Each row
 * shows the absolute count and the share of the entry stage — the activation
 * drop-off read.
 */
export function FunnelBars({ stages }: { stages: { key: string; label: string; count: number }[] }) {
  const top = stages[0]?.count ?? 0;
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const share = top > 0 ? s.count / top : 0;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs text-ink-2">{s.label}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-paper-sunken ring-1 ring-inset ring-rule/60">
              <div
                className="h-full rounded-lg bg-brand/80"
                style={{ width: `${Math.max(share * 100, s.count > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right font-display text-sm tabular-nums text-ink">
              {fmt(s.count)}
            </span>
            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-ink-3">
              {top > 0 && i > 0 ? pct(share) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Ranked horizontal bar list (event volume, discovery sources, B2B rows).
 * `value` drives the bar width relative to the list max; `trailing` is an
 * optional secondary figure shown on the right.
 */
export function BarList({
  items,
  emptyLabel = "Nothing yet.",
  tone = "brand",
}: {
  items: { key: string; label: string; value: number; trailing?: string }[];
  emptyLabel?: string;
  tone?: "brand" | "amber" | "info";
}) {
  if (items.length === 0) return <EmptyHint>{emptyLabel}</EmptyHint>;
  const max = Math.max(...items.map((i) => i.value), 1);
  const fill = tone === "amber" ? "bg-amber/70" : tone === "info" ? "bg-info/70" : "bg-brand/75";
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs text-ink-2" title={it.label}>
            {it.label}
          </span>
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
            <div className={cn("h-full rounded-full", fill)} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right font-display text-sm tabular-nums text-ink">
            {fmt(it.value)}
          </span>
          {it.trailing !== undefined && (
            <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-ink-3">{it.trailing}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Hand-rolled SVG area sparkline for a daily series — no chart lib. Stretches
 * to its container width; the stroke stays crisp via non-scaling-stroke.
 */
export function Sparkline({
  data,
  className,
}: {
  data: { day: string; count: number }[];
  className?: string;
}) {
  const w = 100;
  const h = 34;
  const n = data.length;
  const max = Math.max(...data.map((d) => d.count), 1);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => h - (v / max) * (h - 3) - 1.5;
  const line = data.map((d, i) => `${x(i).toFixed(2)},${y(d.count).toFixed(2)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = "spark-fill";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height: 48 }}
      role="img"
      aria-label="Daily active users"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** The standard B2B-aggregate footnote: what protects users in every cell. */
export function ThresholdNote({ n, suppressed }: { n: number; suppressed?: number }) {
  return (
    <p className="text-[11px] leading-relaxed text-ink-3">
      Aggregated, opted-out users excluded. Cells covering fewer than {n} users are
      suppressed{typeof suppressed === "number" && suppressed > 0 ? ` (${suppressed} hidden)` : ""}.
      Internal preview — not a club export.
    </p>
  );
}

/** A labelled metric tile (single number + hint), matching the stats grid. */
export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className="rounded-xl glass-panel p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-3xl leading-none tabular-nums",
          tone === "brand" ? "text-brand" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}
