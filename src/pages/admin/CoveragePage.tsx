import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  FUNCTION_LABELS,
  FUNCTIONS,
  LENS_LABELS,
  LENSES,
  PILLARS,
  TIER_BAND_LABELS,
  TIER_BANDS,
  type Lens,
  type TierBand,
} from "@/lib/playbook";
import { PILLAR_NAMES } from "@/lib/assessment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Cell = { count: number };
type LensGrid = Record<TierBand, Record<number, Cell>>;

export default function CoveragePage() {
  const [lens, setLens] = useState<Lens>("organisational");
  const [func, setFunc] = useState<string>("revops");

  const query = useQuery({
    queryKey: ["admin", "playbook", "coverage", lens, func],
    queryFn: async () => {
      let q = supabase
        .from("outcomes_library")
        .select("id,pillar,tier_band,lens,function")
        .eq("active", true)
        .eq("lens", lens);
      if (lens === "functional") q = q.eq("function", func);
      const { data, error } = await q.limit(2000);
      if (error) throw error;
      return data as { pillar: number; tier_band: string | null }[];
    },
  });

  const grid = useMemo<LensGrid>(() => {
    const g: LensGrid = {
      low: Object.fromEntries(PILLARS.map((p) => [p, { count: 0 }])) as Record<number, Cell>,
      mid: Object.fromEntries(PILLARS.map((p) => [p, { count: 0 }])) as Record<number, Cell>,
      high: Object.fromEntries(PILLARS.map((p) => [p, { count: 0 }])) as Record<number, Cell>,
    };
    for (const m of query.data ?? []) {
      const band = m.tier_band as TierBand | null;
      if (!band || !g[band]) continue;
      g[band][m.pillar].count += 1;
    }
    return g;
  }, [query.data]);

  const totalCells = TIER_BANDS.length * PILLARS.length;
  const filledCells = useMemo(() => {
    let n = 0;
    for (const b of TIER_BANDS) for (const p of PILLARS) if (grid[b][p].count > 0) n++;
    return n;
  }, [grid]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Coverage</h2>
          <p className="text-sm text-muted-foreground">
            {query.isLoading
              ? "Loading…"
              : `${filledCells}/${totalCells} cells filled`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lens} onValueChange={(v) => setLens(v as Lens)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LENSES.map((l) => (
                <SelectItem key={l} value={l}>{LENS_LABELS[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lens === "functional" && (
            <Select value={func} onValueChange={setFunc}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNCTIONS.map((fn) => (
                  <SelectItem key={fn} value={fn}>{FUNCTION_LABELS[fn]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-r p-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pillar \\ Band
                </th>
                {TIER_BANDS.map((b) => (
                  <th key={b} className="border-b p-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {TIER_BAND_LABELS[b]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PILLARS.map((p) => (
                <tr key={p}>
                  <td className="border-r p-2 text-xs">
                    <span className="font-medium">P{p}</span>{" "}
                    <span className="text-muted-foreground">{PILLAR_NAMES[p]}</span>
                  </td>
                  {TIER_BANDS.map((b) => {
                    const c = grid[b][p].count;
                    const params = new URLSearchParams({
                      lens,
                      pillar: String(p),
                      tier_band: b,
                    });
                    if (lens === "functional") params.set("function", func);
                    return (
                      <td
                        key={b}
                        className={cn(
                          "p-0 text-center align-middle",
                          c === 0 && "bg-destructive/10",
                          c === 1 && "bg-amber-500/10",
                          c >= 2 && "bg-emerald-500/10",
                        )}
                      >
                        <Link
                          to={`/admin/playbook?${params.toString()}`}
                          className="block px-3 py-3 text-sm font-medium hover:bg-muted/50"
                        >
                          {c}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <LegendSwatch className="bg-destructive/10" label="Empty" />
        <LegendSwatch className="bg-amber-500/10" label="1 Move" />
        <LegendSwatch className="bg-emerald-500/10" label="2+ Moves" />
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded border", className)} />
      {label}
    </span>
  );
}
