// Owner-only "Download action plan" button. Generates the PDF on-device
// using `generateActionPlanPdf`, which fetches the user's chat and
// next-actions client-side under RLS.

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { generateActionPlanPdf, type ActionPlanInput } from "@/lib/actionPlanPdf";
import { useToast } from "@/hooks/use-toast";

export function DownloadActionPlanButton({ input }: { input: ActionPlanInput }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await generateActionPlanPdf(input);
      toast({ title: "Action plan downloaded", description: "Saved to your device as a PDF." });
    } catch (e) {
      console.error("action plan pdf failed", e);
      toast({
        title: "Couldn't generate the PDF",
        description: "Please try again. If it keeps failing, refresh the page.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-brass/40 bg-brass/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-brass-bright transition hover:bg-brass/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? "Preparing PDF…" : "Download action plan"}
    </button>
  );
}
