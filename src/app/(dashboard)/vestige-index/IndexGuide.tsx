import { AgeBandsTable } from "./AgeBands";
import type { IndexWeights } from "./formula";
import { RANKING_SOURCES, scoreForRank } from "@/lib/ranking-import/score";

/**
 * The Index reference — tables, not prose. Every number Jack needs to read a
 * score is here; the reasoning behind them lives in `formula.ts` and the
 * changelog, not on screen.
 */
export function IndexGuideContent({ weights }: { weights: IndexWeights }) {
  const sum = weights.age + weights.ranking + weights.setting;
  const pct = (v: number) => (sum > 0 ? Math.round((v / sum) * 100) : 0);

  const AXES = [
    { name: "Ranking", weight: pct(weights.ranking), by: "Imported", note: "Published top-100s. Blank for most courses." },
    { name: "Setting", weight: pct(weights.setting), by: "You", note: "Drafted from the landscape. Yours to correct." },
    { name: "Age", weight: pct(weights.age), by: "Automatic", note: "From the founding year." },
  ];

  const RUNGS = [
    ["90–100", "World top-100"],
    ["80–89", "Best of GB&I"],
    ["70–79", "Regional standout"],
    ["55–69", "Good members' course"],
    ["40–54", "Ordinary"],
    ["20–39", "Weak"],
  ];

  return (
    <div className="space-y-5">
      <Block title="The three numbers">
        <Table head={["", "Weight", "Set by", ""]}>
          {AXES.map((a) => (
            <tr key={a.name}>
              <Td className="font-medium text-ink">{a.name}</Td>
              <Td className="text-right font-display font-semibold text-brand">{a.weight}%</Td>
              <Td>
                <span
                  className={
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                    (a.by === "You"
                      ? "border-amber/30 bg-amber/5 text-amber"
                      : "border-rule/70 bg-paper-sunken/50 text-ink-3")
                  }
                >
                  {a.by}
                </span>
              </Td>
              <Td className="text-xs text-ink-3">{a.note}</Td>
            </tr>
          ))}
        </Table>
      </Block>

      <Block title="Setting — what the number means">
        <Table>
          {RUNGS.map(([band, meaning]) => (
            <tr key={band}>
              <Td className="w-20 font-display font-semibold text-brand">{band}</Td>
              <Td className="text-xs text-ink-2">{meaning}</Td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-[11px] text-ink-3">
          The land and the views — not condition or difficulty. 50 is average, not half marks.
          Blank is better than a guess.
        </p>
      </Block>

      <Block title="Age — from the founding year">
        <AgeBandsTable />
      </Block>

      <Block title="Ranking — from the published lists">
        <Table head={["Position", "Score"]}>
          {[1, 10, 25, 50, 100, 200].map((r) => (
            <tr key={r}>
              <Td className="tabular-nums text-ink-2">#{r}</Td>
              <Td className="text-right font-display font-semibold text-brand">{scoreForRank(r)}</Td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-[11px] text-ink-3">
          {RANKING_SOURCES.map((s) => s.publisher).join(" · ")} — best position in each, averaged.
          No ranking is normal; its weight moves to the other two.
        </p>
      </Block>

      <Block title="The final score">
        <p className="text-xs text-ink-2">
          Best in England ≈ <strong className="text-ink">99</strong> · typical course ≈{" "}
          <strong className="text-ink">50</strong> · never ranked, capped at{" "}
          <strong className="text-ink">88</strong>.
        </p>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</p>
      {children}
    </div>
  );
}

function Table({ head, children }: { head?: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[300px] text-sm">
        {head && (
          <thead>
            <tr className="border-b border-rule/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              {head.map((h, i) => (
                <th key={i} className={"py-2 pr-3 " + (i === 1 ? "text-right" : "")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-rule/40">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <td className={"py-1.5 pr-3 " + className}>{children}</td>;
}
