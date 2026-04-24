import { useState } from "react";
import { Sparkles } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BackfillSummary {
  ok?: number;
  would_update?: number;
  ai_errors?: number;
  write_errors?: number;
  skipped_no_body?: number;
  processed?: number;
  total_ms?: number;
}

/**
 * Admin tool: fills missing why_matters / what_to_do / how_to_know on
 * legacy Moves using the AIOI voice. Two-step: dry-run preview, then apply.
 */
export function BackfillMoveCopyButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BackfillSummary | null>(null);

  const dryRun = async () => {
    setBusy(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-move-copy", {
        body: { apply: false, limit: 100 },
      });
      if (error) throw error;
      setPreview(data as BackfillSummary);
    } catch (err) {
      toast({
        title: "Dry-run failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-move-copy", {
        body: { apply: true, limit: 100, delay_ms: 400 },
      });
      if (error) throw error;
      const summary = data as BackfillSummary;
      toast({
        title: "Backfill complete",
        description: `${summary.ok ?? 0} updated · ${summary.ai_errors ?? 0} AI errors · ${summary.write_errors ?? 0} write errors`,
      });
      setOpen(false);
      // Reload so the Moves list refetches and the "Incomplete" pills disappear.
      window.setTimeout(() => window.location.reload(), 600);
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPreview(null);
            void dryRun();
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" /> Fill missing copy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fill missing Move copy</DialogTitle>
          <DialogDescription>
            Uses the AIOI voice to draft <code>why_matters</code>, <code>what_to_do</code>,
            and <code>how_to_know</code> for active Moves that have a populated{" "}
            <code>body</code> but are missing the structured fields. Idempotent —
            re-running only touches rows still incomplete.
          </DialogDescription>
        </DialogHeader>

        {busy && !preview && (
          <p className="text-sm text-muted-foreground">Calculating impact…</p>
        )}

        {preview && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Dry-run impact</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                Would update: <span className="text-foreground font-mono">{preview.would_update ?? 0}</span> Moves
              </li>
              <li>
                Skipped (no seed body):{" "}
                <span className="text-foreground font-mono">{preview.skipped_no_body ?? 0}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Estimated cost: under $1 via Lovable AI Gateway. Time: ~
              {Math.ceil(((preview.would_update ?? 0) * 1.2) / 60)} min.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={apply}
            disabled={busy || !preview || (preview.would_update ?? 0) === 0}
          >
            {busy ? "Running…" : `Apply to ${preview?.would_update ?? 0} Moves`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
