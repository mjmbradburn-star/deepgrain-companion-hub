import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, StopCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-chat`;

type Msg = { role: "user" | "assistant"; content: string };

const FALLBACK_PROMPTS = [
  "What should I do tomorrow morning on my top Move?",
  "We don't have an AI policy yet. What's the smallest one that works?",
  "Someone on my team is using ChatGPT for client work without telling me. How do I handle it?",
  "Give me a 30-minute agenda for next Monday's standup that opens up my weakest pillar.",
];

function buildSuggestedPrompts(topMoveTitle?: string, topHotspotName?: string): string[] {
  const move = topMoveTitle?.trim();
  const hotspot = topHotspotName?.trim();
  return [
    move
      ? `What should I do tomorrow morning on '${move}'?`
      : FALLBACK_PROMPTS[0],
    "We don't have an AI policy yet. What's the smallest one that works?",
    "Someone on my team is using ChatGPT for client work without telling me. How do I handle it?",
    hotspot
      ? `Give me a 30-minute agenda for next Monday's standup that opens up ${hotspot}.`
      : FALLBACK_PROMPTS[3],
  ];
}

export interface ReportChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  respondentId: string;
  hasDeepdive: boolean;
  /** Optional pre-seeded prompt (e.g. from a "Discuss this Move" link). */
  seedPrompt?: string;
  topMoveTitle?: string;
  topHotspotName?: string;
}

export function ReportChatSheet({
  open,
  onOpenChange,
  respondentId,
  hasDeepdive,
  seedPrompt,
  topMoveTitle,
  topHotspotName,
}: ReportChatSheetProps) {
  const suggestedPrompts = buildSuggestedPrompts(topMoveTitle, topHotspotName);
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load prior conversation when sheet opens for the first time.
  useEffect(() => {
    if (!open || historyLoaded) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("report_chat_messages")
        .select("role, content")
        .eq("respondent_id", respondentId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      }
      setHistoryLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, respondentId, historyLoaded]);

  // Apply seed prompt when provided (does not auto-send — user reviews first).
  useEffect(() => {
    if (open && seedPrompt && !input) {
      setInput(seedPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedPrompt]);

  // Autoscroll on new content.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    trackEvent("report_chat.message_sent", { respondent_id: respondentId });

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("not_signed_in");
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ respondent_id: respondentId, message: text }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 402) {
          const body = await resp.json().catch(() => ({}));
          toast({
            title: "Limit reached",
            description: body.message ?? "You've used your free questions on this report.",
            variant: "destructive",
          });
        } else if (resp.status === 429) {
          const body = await resp.json().catch(() => ({}));
          const isInjectionCooldown = body?.error === "injection_rate_limited";
          toast({
            title: isInjectionCooldown ? "Cooling down" : "Slow down",
            description: body?.message ?? "Too many requests, try again in a moment.",
            variant: "destructive",
          });
        } else if (resp.status === 401 || resp.status === 403) {
          toast({
            title: "Sign-in required",
            description: "Sign in with the magic link in your email to use the assistant.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Couldn't reach the assistant", description: "Try again in a moment.", variant: "destructive" });
        }
        // Drop the optimistic user message so they can retry cleanly.
        setMessages((prev) => prev.filter((m) => m !== userMsg));
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) upsert(delta);
          } catch {
            // Partial JSON — push back and wait.
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // user-initiated stop — keep the partial reply
      } else {
        console.error("report-chat error", err);
        toast({
          title: "Assistant unavailable",
          description: "Please try again.",
          variant: "destructive",
        });
        setMessages((prev) => prev.filter((m) => m !== userMsg));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      // Replace the in-memory streamed reply with the server-sanitised copy
      // (em-dashes stripped, AI tells removed). One extra read keeps voice tight.
      try {
        const { data: latest } = await supabase
          .from("report_chat_messages")
          .select("role, content")
          .eq("respondent_id", respondentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest && latest.role === "assistant" && typeof latest.content === "string") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: latest.content as string } : m));
            }
            return prev;
          });
        }
      } catch {
        // Non-fatal; the streamed copy stays.
      }
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col bg-surface-1 border-cream/10 p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-cream/10">
          <SheetTitle className="font-display text-cream text-2xl">Ask your report</SheetTitle>
          <SheetDescription className="text-cream/60 text-sm">
            Grounded in your AIOI scores, hotspots, and Moves.
            {!hasDeepdive && (
              <span className="block mt-1 text-cream/50">
                {`Free tier: 3 questions per report.`}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.length === 0 && historyLoaded && (
            <div className="space-y-3">
              <p className="text-sm text-cream/65">Try one of these to get started:</p>
              <ul className="space-y-2">
                {suggestedPrompts.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => setInput(p)}
                      className="w-full text-left rounded-md border border-cream/10 bg-cream/5 px-3 py-2 text-sm text-cream/80 hover:border-brass/40 hover:bg-cream/10 transition-colors"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-lg bg-brass/15 border border-brass/30 px-4 py-2.5 text-cream text-sm whitespace-pre-wrap"
                    : "max-w-[92%] rounded-lg bg-cream/5 border border-cream/10 px-4 py-3 text-cream/90 text-sm"
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:text-cream prose-strong:text-cream">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-cream/50 text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>

        <div className="border-t border-cream/10 p-4 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your report…"
            rows={3}
            className="resize-none bg-surface-0 border-cream/15 text-cream placeholder:text-cream/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-cream/40">⌘/Ctrl + Enter to send</p>
            {isStreaming ? (
              <Button type="button" variant="outline" size="sm" onClick={stop}>
                <StopCircle className="h-4 w-4 mr-1.5" /> Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => void send()}
                disabled={!input.trim()}
                className="bg-brass text-ink hover:bg-brass-bright"
              >
                <Send className="h-4 w-4 mr-1.5" /> Send
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
