import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ReportChatSheet } from "./ReportChatSheet";
import { trackEvent } from "@/lib/analytics";

export interface ReportChatLauncherProps {
  respondentId: string;
  hasDeepdive: boolean;
  /** Hidden when there are no Moves to ground the chat on. */
  enabled: boolean;
}

/**
 * Floating "Ask your report" launcher pinned bottom-right of the report page.
 * Opens a side sheet with a streaming, grounded AI assistant.
 *
 * Other components can request a pre-seeded prompt by dispatching:
 *   window.dispatchEvent(new CustomEvent("aioi:open-report-chat", {
 *     detail: { prompt: "Help me put 'Set a 90-day mandate' into practice." }
 *   }))
 */
export function ReportChatLauncher({ respondentId, hasDeepdive, enabled }: ReportChatLauncherProps) {
  const [open, setOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | undefined>();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) setSeedPrompt(detail.prompt);
      setOpen(true);
      trackEvent("report_chat.opened", { source: "move_card", respondent_id: respondentId });
    };
    window.addEventListener("aioi:open-report-chat", handler as EventListener);
    return () => window.removeEventListener("aioi:open-report-chat", handler as EventListener);
  }, [respondentId]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSeedPrompt(undefined);
          setOpen(true);
          trackEvent("report_chat.opened", { source: "launcher", respondent_id: respondentId });
        }}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brass text-ink px-4 py-3 font-ui text-sm shadow-lg shadow-black/40 hover:bg-brass-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-bright focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
        aria-label="Ask your report"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Ask your report</span>
      </button>
      <ReportChatSheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSeedPrompt(undefined);
        }}
        respondentId={respondentId}
        hasDeepdive={hasDeepdive}
        seedPrompt={seedPrompt}
      />
    </>
  );
}
