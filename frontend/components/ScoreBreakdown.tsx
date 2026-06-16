import { ScoreSignal } from "@/lib/types";

/**
 * Presentational breakdown of a compatibility score: one mini progress bar per
 * signal with a short explanatory caption. The parent controls disclosure.
 */
export default function ScoreBreakdown({
  breakdown,
  className = "",
}: {
  breakdown: ScoreSignal[];
  className?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {breakdown.map((sig) => {
        const pct = sig.max ? Math.max(0, Math.min(100, (sig.earned / sig.max) * 100)) : 0;
        return (
          <div key={sig.label}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-slate-700">{sig.label}</span>
              <span className="tabular-nums text-slate-400">
                {sig.earned}/{sig.max}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{sig.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
