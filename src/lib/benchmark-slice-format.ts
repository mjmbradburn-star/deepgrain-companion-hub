// Pure rounding + display helpers for BenchmarkSliceCard.
//
// Extracted so tests can verify the SAME rounding feeds both the displayed
// numbers and the tooltip text. If a display format changes here without the
// matching tooltip update (or vice versa), the test in
// benchmark-slice-rounding.test.ts will fail.

/** Round a tier value (0..5) to 1 decimal place. */
export function roundTier(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Per-pillar delta = user - cohort, rounded to 1dp. Mirrors the same
 *  Math.round((u - c) * 10) / 10 used in BenchmarkSliceCard. */
export function computePillarDelta(user: number, cohort: number): number {
  return Math.round((user - cohort) * 10) / 10;
}

/** Display string for a tier (always 1dp, e.g. "2.4"). */
export function formatTier(value: number): string {
  return roundTier(value).toFixed(1);
}

/** Display string for a pillar delta with explicit sign ("+0.4", "-1.2", "0.0"). */
export function formatPillarDelta(delta: number): string {
  const rounded = roundTier(delta); // delta already 1dp, but normalise -0
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  const sign = safe > 0 ? "+" : "";
  return `${sign}${safe.toFixed(1)}`;
}

/** Cohort/user score display (whole AIOI score points). */
export function formatScore(value: number): string {
  return String(Math.round(value));
}

/** Overall gap (score points). null when cohort is missing. */
export function computeOverallGap(
  userScore: number,
  cohortScore: number | null,
): number | null {
  if (cohortScore == null) return null;
  return Math.round(userScore) - Math.round(cohortScore);
}

/** Display string for the overall gap with explicit sign ("+5", "-3"). */
export function formatOverallGap(gap: number | null): string {
  if (gap == null) return "—";
  const safe = Object.is(gap, -0) ? 0 : gap;
  const sign = safe > 0 ? "+" : "";
  return `${sign}${safe}`;
}
