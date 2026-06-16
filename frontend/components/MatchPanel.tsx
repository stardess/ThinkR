import ScoreRing from "@/components/ScoreRing";

interface Tier {
  label: string;
  color: string;
}

/**
 * The dark gradient panel that hosts the score ring — the signature
 * "match strength" block on every result card.
 */
export default function MatchPanel({
  score,
  tier,
  items = [],
  ringSize = 92,
  className = "",
}: {
  score: number;
  tier?: Tier | null;
  items?: string[];
  ringSize?: number;
  className?: string;
}) {
  return (
    <div className={`match-panel ${className}`}>
      <ScoreRing score={score} tierColor={tier?.color} size={ringSize} />
      {tier && (
        <p className="text-[11px] font-bold uppercase tracking-wider text-white">{tier.label}</p>
      )}
      {items.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {items.map((it) => (
            <li key={it} className="flex items-center gap-1 text-[11px] text-white/70">
              <span className="text-brand-500">✓</span> {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
