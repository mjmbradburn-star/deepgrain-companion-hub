import { describe, expect, it } from "vitest";

import { selectBestSliceFromRows, type BenchmarkRow } from "./benchmarks";

function row(partial: Partial<BenchmarkRow>): BenchmarkRow {
  return {
    id: crypto.randomUUID(),
    level: "company",
    size_band: null,
    sector: null,
    function: null,
    region: null,
    sample_size: 100,
    median_score: 50,
    pillar_medians: {
      "1": { name: "Strategy & Mandate", tier: 3 },
      "2": { name: "Data Foundations", tier: 3 },
      "3": { name: "Tooling & Infrastructure", tier: 3 },
      "4": { name: "Workflow Integration", tier: 3 },
      "5": { name: "Skills & Fluency", tier: 3 },
      "6": { name: "Governance & Risk", tier: 3 },
      "7": { name: "Measurement & ROI", tier: 3 },
      "8": { name: "Culture & Adoption", tier: 3 },
    },
    refreshed_at: new Date().toISOString(),
    ...partial,
  } as BenchmarkRow;
}

describe("v1.1 benchmark size-band matching", () => {
  it("uses exact size band when N >= 20", () => {
    const match = selectBestSliceFromRows({
      level: "company",
      sizeBand: "M2",
      rows: [row({ sample_size: 100 }), row({ size_band: "M2", sample_size: 25 })],
    });

    expect(match?.row.size_band).toBe("M2");
    expect(match?.cohortNote).toContain("Exact size-band cohort");
  });

  it("uses combined adjacent bands when exact band is under threshold", () => {
    const match = selectBestSliceFromRows({
      level: "company",
      sizeBand: "M2",
      rows: [
        row({ sample_size: 100 }),
        row({ size_band: "M2", sample_size: 8, median_score: 40 }),
        row({ size_band: "M1", sample_size: 7, median_score: 50 }),
        row({ size_band: "M3", sample_size: 9, median_score: 60 }),
      ],
    });

    expect(match?.row.size_band).toBe("M1+M2+M3");
    expect(match?.row.sample_size).toBe(24);
    expect(match?.cohortNote).toContain("Combined adjacent size-band cohort");
  });

  it("locks peer benchmark when total matching base is under 50", () => {
    const match = selectBestSliceFromRows({
      level: "company",
      sizeBand: "M2",
      rows: [row({ sample_size: 42 }), row({ size_band: "M2", sample_size: 25 })],
    });

    expect(match?.lockedReason).toBe("Benchmark unlocks at 50 responses in your size band. Currently at N=42. Check back soon.");
  });
});
