import { useEffect, useState } from "react";
import { Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BackfillSummary {
  ok?: number;
  ok_fallback?: number;
  errors?: number;
  skipped_existing?: number;
  processed?: number;
}

/**
 * Admin tool: regenerates engine + voice-wrapper output for reports that
 * don't yet have `recommendations`. Batches in a configurable window so we
 * don't hammer the AI Gateway. Re-callable for subsequent batches.
 */
export function BackfillReportsButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState(50);
  const [lastSummary, setLastSummary] = useState<BackfillSummary | null>(null);

  // Show how many reports are still missing recommendations.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .is("recommendations", null);
      if (!cancelled && !error) setPending(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lastSummary]);

  const apply = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "regenerate-all-recommendations",
        { body: { apply: true, limit: batchSize, delay_ms: 400, force: false } },
      );
      if (error) throw error;
      const summary = data as BackfillSummary;
      setLastSummary(summary);
      toast({
        title: "Batch complete",
        description: `${summary.ok ?? 0} ok · ${summary.ok_fallback ?? 0} fallback · ${summary.errors ?? 0} errors`,
      });
    } catch (err) {
      toast({
        title: "Backfill failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="h-4 w-4 mr-2" /> Backfill reports
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backfill report recommendations</DialogTitle>
          <DialogDescription>
            Runs the selection engine + voice wrapper for reports that don't yet
            have recommendations. Process in batches; re-press to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-muted-foreground">
              Reports awaiting backfill:{" "}
              <span className="text-foreground font-mono">
                {pending === null ? "…" : pending}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-size">Batch size (1-200)</Label>
            <Input
              id="batch-size"
              type="number"
              min={1}
              max={200}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
            />
            <p className="text-xs text-muted-foreground">
              ~1.2s per report. A batch of 50 takes about a minute.
            </p>
          </div>

          {lastSummary && (
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="font-medium">Last batch</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>OK: <span className="text-foreground font-mono">{lastSummary.ok ?? 0}</span></li>
                <li>Fallback (no AI wrap): <span className="text-foreground font-mono">{lastSummary.ok_fallback ?? 0}</span></li>
                <li>Errors: <span className="text-foreground font-mono">{lastSummary.errors ?? 0}</span></li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Close
          </Button>
          <Button onClick={apply} disabled={busy || pending === 0}>
            {busy ? "Running…" : `Process next ${batchSize}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
