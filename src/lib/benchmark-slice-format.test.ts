import { describe, it, expect } from "vitest";
import {
  computeOverallGap,
  computePillarDelta,
  formatOverallGap,
  formatPillarDelta,
  formatScore,
  formatTier,
  roundTier,
} from "@/lib/benchmark-slice-format";

// These tests guarantee the tooltip text and the displayed numbers in
// BenchmarkSliceCard go through the SAME rounding path. If anyone changes
// the display rounding (or only updates the tooltip), one of the cases
// below will fail and force them to keep both in sync.

describe("benchmark slice rounding (display ↔ tooltip)", () => {
  describe("per-pillar tier delta", () => {
    const cases: Array<{ user: number; cohort: number; expectedDelta: number; expectedDisplay: string }> = [
      { user: 3.4, cohort: 2.0, expectedDelta: 1.4, expectedDisplay: "+1.4" },
      { user: 2.0, cohort: 3.4, expectedDelta: -1.4, expectedDisplay: "-1.4" },
      { user: 2.5, cohort: 2.5, expectedDelta: 0, expectedDisplay: "0.0" },
      // Floating-point trap: 2.3 - 2.0 = 0.30000000000000004
      { user: 2.3, cohort: 2.0, expectedDelta: 0.3, expectedDisplay: "+0.3" },
      // Bankers'-rounding edge: 0.05 → 0.1 (Math.round rounds half up)
      { user: 1.05, cohort: 1.0, expectedDelta: 0.1, expectedDisplay: "+0.1" },
    ];

    it.each(cases)(
      "user=$user cohort=$cohort → delta $expectedDelta, displays $expectedDisplay",
      ({ user, cohort, expectedDelta, expectedDisplay }) => {
        const delta = computePillarDelta(user, cohort);
        expect(delta).toBeCloseTo(expectedDelta, 10);

        // The displayed value must come from the same rounding helper that
        // the tooltip uses to quote You / Cohort tiers.
        expect(formatPillarDelta(delta)).toBe(expectedDisplay);
        expect(formatTier(user)).toBe((Math.round(user * 10) / 10).toFixed(1));
        expect(formatTier(cohort)).toBe((Math.round(cohort * 10) / 10).toFixed(1));
      },
    );

    it("formatPillarDelta and the on-screen format agree to 1dp", () => {
      // Mirrors the `delta.toFixed(1)` previously inlined in the component.
      for (let i = -50; i <= 50; i++) {
        const d = i / 10; // -5.0 … 5.0 in 0.1 steps
        const display = formatPillarDelta(d);
        const numeric = Number(display);
        expect(roundTier(numeric)).toBe(roundTier(d));
      }
    });
  });

  describe("overall gap (AIOI score points)", () => {
    it("rounds both inputs before subtracting", () => {
      // 73.4 - 68.6 → 73 - 69 = 4 (NOT round(73.4 - 68.6) = 5)
      expect(computeOverallGap(73.4, 68.6)).toBe(4);
      expect(formatOverallGap(computeOverallGap(73.4, 68.6))).toBe("+4");
    });

    it.each([
      { user: 50, cohort: 35, expected: "+15" },
      { user: 35, cohort: 50, expected: "-15" },
      { user: 42, cohort: 42, expected: "0" },
    ])("user=$user cohort=$cohort → $expected", ({ user, cohort, expected }) => {
      // Note: zero case — formatOverallGap returns "0" (no sign).
      const gap = computeOverallGap(user, cohort);
      const display = formatOverallGap(gap);
      if (gap === 0) expect(display).toBe("0");
      else expect(display).toBe(expected);
    });

    it("returns '—' when cohort median is unavailable", () => {
      expect(computeOverallGap(73, null)).toBeNull();
      expect(formatOverallGap(null)).toBe("—");
    });

    it("score formatter rounds to nearest whole point (matches tooltip)", () => {
      expect(formatScore(72.4)).toBe("72");
      expect(formatScore(72.6)).toBe("73");
      // The Gap tooltip embeds formatScore(userScore) and formatScore(cohortScore).
      // Verify they agree with the value used to compute the gap.
      const user = 73.4;
      const cohort = 68.6;
      const gap = computeOverallGap(user, cohort)!;
      expect(Number(formatScore(user)) - Number(formatScore(cohort))).toBe(gap);
    });
  });
});
