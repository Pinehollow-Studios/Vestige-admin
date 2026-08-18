import { AGE_BANDS, ageFromYear } from "./formula";

/**
 * The Age reference table. Age is *derived*, not judged, so this exists to
 * explain where its number came from without anyone reading `formula.ts`.
 *
 * The score column is computed by calling `ageFromYear()` rather than written
 * out, so the table can never drift from the curve it documents.
 */
export function AgeBandsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[340px] text-sm">
        <thead>
          <tr className="border-b border-rule/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <th className="py-2 pr-3">Era</th>
            <th className="py-2 pr-3">Founded</th>
            <th className="py-2 text-right">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule/40">
          {AGE_BANDS.map(({ era, from, to }) => {
            const hi = ageFromYear(from ?? 1766);
            const lo = ageFromYear(to);
            return (
              <tr key={era}>
                <td className="py-1.5 pr-3 text-ink-2">{era}</td>
                <td className="py-1.5 pr-3 tabular-nums text-ink-3">
                  {from == null ? `before ${to}` : `${from}–${to}`}
                </td>
                <td className="py-1.5 text-right font-display font-semibold tabular-nums text-brand">
                  {hi === lo ? lo : `${lo}–${hi}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
