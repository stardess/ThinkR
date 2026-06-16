// Circular compatibility-score ring (Jobright-style), tinted in the ThinkR palette.

const RING_COLORS: Record<string, string> = {
  green: "#F9A03F", // Strong
  blue: "#F9B05A", // Good
  yellow: "#F6C886", // Partial
  gray: "#9CA3AF", // Low
};

export default function ScoreRing({
  score,
  tierColor = "green",
  size = 92,
  stroke = 7,
  light = false,
}: {
  score: number;
  tierColor?: string;
  size?: number;
  stroke?: number;
  /** Render for a light background instead of the dark match panel. */
  light?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const ring = RING_COLORS[tierColor] ?? RING_COLORS.gray;
  const track = light ? "#Eceae6" : "rgba(255,255,255,0.16)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center font-extrabold tabular-nums ${
          light ? "text-brand-900" : "text-white"
        }`}
      >
        <span style={{ fontSize: size * 0.3 }} className="leading-none">
          {Math.round(pct)}
          <span style={{ fontSize: size * 0.16 }} className={light ? "text-brand-500" : "text-white/70"}>
            %
          </span>
        </span>
      </div>
    </div>
  );
}
