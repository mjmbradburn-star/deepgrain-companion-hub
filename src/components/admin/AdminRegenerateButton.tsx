import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-only "Regenerate recommendations" button. Only renders for users
 * with the `admin` role. Calls `regenerate-all-recommendations` with the
 * single-slug + force=true path so this respondent's report is rebuilt
 * end-to-end (engine + voice wrapper) without forcing a retake.
 */
export function AdminRegenerateButton({ slug }: { slug: string }) {
  const { isReady, isAdmin } = useIsAdmin();
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  if (!isReady || !isAdmin) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "regenerate-all-recommendations",
        { body: { slug, apply: true, force: true } },
      );
      if (error) throw error;
      const okCount = (data?.ok ?? 0) + (data?.ok_fallback ?? 0);
      const errors = data?.errors ?? 0;
      if (errors > 0 || okCount === 0) {
        toast({
          title: "Regeneration failed",
          description: data?.results?.[0]?.error ?? "No reports were updated.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Recommendations regenerated",
          description: data?.ok_fallback ? "Used fallback (no AI wrap)." : "Refreshing the page…",
        });
        // Hard reload so the report fetches the new recommendations.
        window.setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) {
      toast({
        title: "Regeneration failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={busy}
      className="border-brass/40 bg-transparent text-brass-bright hover:bg-brass/10 font-ui text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] h-9"
      title="Admin: re-run engine + voice wrapper for this report"
    >
      <RefreshCw className={`h-3.5 w-3.5 mr-2 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Regenerating…" : "Regenerate"}
    </Button>
  );
}
