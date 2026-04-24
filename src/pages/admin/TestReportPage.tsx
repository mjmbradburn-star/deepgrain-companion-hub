import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Beaker, Loader2, Play } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  FUNCTION_LABELS,
  FUNCTIONS,
  LENS_LABELS,
  LENSES,
  PILLARS,
  SIZE_BANDS,
  type Lens,
} from "@/lib/playbook";
import { PILLAR_NAMES } from "@/lib/assessment";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";

type SelectedRow = {
  id: string;
  title: string;
  lens: string;
  pillar: number;
  tier_band: string;
  function: string | null;
  effort: number | null;
  role: string | null;
  score: number;
};

type Result = {
  candidate_count: number;
  selected_count: number;
  selected: SelectedRow[];
};

const DEFAULT_TIERS: Record<number, number> = {
  1: 2, 2: 1, 3: 3, 4: 2, 5: 1, 6: 3, 7: 2, 8: 2,
};

export default function TestReportPage() {
  const { toast } = useToast();
  const [lens, setLens] = useState<Lens>("organisational");
  const [func, setFunc] = useState<string>("revops");
  const [sizeBand, setSizeBand] = useState<string>("M2");
  const [tiers, setTiers] = useState<Record<number, number>>(DEFAULT_TIERS);
  const [capFlags, setCapFlags] = useState<number[]>([]);

  const run = useMutation({
    mutationFn: async (): Promise<Result> => {
      const { data, error } = await supabase.functions.invoke("admin-test-selection", {
        body: {
          profile: {
            lens,
            function: lens === "functional" ? func : null,
            size_band: sizeBand || null,
            pillar_tiers: tiers,
            cap_flag_pillars: capFlags,
          },
        },
      });
      if (error) throw error;
      return data as Result;
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Selection failed", description: err.message });
    },
  });

  const result = run.data;

  const selectedByPillar = useMemo(() => {
    const map: Record<number, SelectedRow[]> = {};
    for (const m of result?.selected ?? []) {
      (map[m.pillar] ??= []).push(m);
    }
    return map;
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Beaker className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Test report</h2>
          <p className="text-sm text-muted-foreground">
            Run the live Selection Engine against a synthetic profile.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4 rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Profile
          </h3>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lens</Label>
            <Select value={lens} onValueChange={(v) => setLens(v as Lens)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LENSES.map((l) => (
                  <SelectItem key={l} value={l}>{LENS_LABELS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lens === "functional" && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Function</Label>
              <Select value={func} onValueChange={setFunc}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNCTIONS.map((fn) => (
                    <SelectItem key={fn} value={fn}>{FUNCTION_LABELS[fn]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Size band</Label>
            <Select value={sizeBand} onValueChange={setSizeBand}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZE_BANDS.map((sb) => (
                  <SelectItem key={sb} value={sb}>{sb}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Pillar tiers (0-5)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PILLARS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 font-medium">P{p}</span>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={1}
                    value={tiers[p]}
                    onChange={(e) =>
                      setTiers((t) => ({ ...t, [p]: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }))
                    }
                    className="h-8"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Cap-flag pillars
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PILLARS.map((p) => {
                const on = capFlags.includes(p);
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() =>
                      setCapFlags((arr) => (on ? arr.filter((x) => x !== p) : [...arr, p]))
                    }
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    P{p}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={() => run.mutate()} disabled={run.isPending} className="w-full">
            {run.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run selection
          </Button>
        </aside>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Selected Moves
          </h3>
          {!result && !run.isPending && (
            <p className="mt-4 text-sm text-muted-foreground">
              Configure a profile on the left and run the engine.
            </p>
          )}
          {run.isPending && (
            <div className="mt-6 flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {result && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                {result.selected_count} of {result.candidate_count} candidates picked.
              </p>
              <div className="mt-4 space-y-4">
                {Object.entries(selectedByPillar)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([pillar, moves]) => (
                    <div key={pillar} className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        P{pillar} · {PILLAR_NAMES[Number(pillar) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]}
                      </div>
                      <ul className="space-y-1.5">
                        {moves.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            <Link to={`/admin/playbook/${m.id}`} className="font-medium hover:underline">
                              {m.title}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {m.role === "forced_rank" && (
                                <Badge variant="default" className="text-[10px]">Forced rank</Badge>
                              )}
                              {m.effort !== null && <span>Effort {m.effort}</span>}
                              <span>Score {m.score}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
