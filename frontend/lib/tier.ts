// Map a 0–100 compatibility score to a tier label + color key.
// Mirrors backend services/matching.py score_to_tier (85 / 65 / 40 thresholds).
export function tierFromScore(score: number | null | undefined): { label: string; color: string } {
  const s = score ?? 0;
  if (s >= 85) return { label: "Strong Match", color: "green" };
  if (s >= 65) return { label: "Good Match", color: "blue" };
  if (s >= 40) return { label: "Partial Match", color: "yellow" };
  return { label: "Low Match", color: "gray" };
}
