import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Check, ChevronDown, ChevronUp, Loader2, MessageSquare, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { PILLAR_NAMES } from "@/lib/assessment";
import type { RecommendationMove } from "./MoveCard";

interface NextActionRow {
  id: string;
  respondent_id: string;
  move_id: string | null;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
}

export interface NextActionsModuleProps {
  respondentId: string;
  moves: RecommendationMove[];
  isOwner: boolean;
}

const TOP_N = 5;

/**
 * Rank Moves by impact descending, then effort ascending — best ROI first.
 * Forced-rank Moves are pinned to the top regardless of score.
 */
function rankMovesForActions(moves: RecommendationMove[]): RecommendationMove[] {
  return [...moves].sort((a, b) => {
    if (a.role === "forced_rank" && b.role !== "forced_rank") return -1;
    if (b.role === "forced_rank" && a.role !== "forced_rank") return 1;
    const ai = a.snapshot.impact ?? 0;
    const bi = b.snapshot.impact ?? 0;
    if (ai !== bi) return bi - ai;
    const ae = a.snapshot.effort ?? 5;
    const be = b.snapshot.effort ?? 5;
    return ae - be;
  });
}

export function NextActionsModule({ respondentId, moves, isOwner }: NextActionsModuleProps) {
  const { toast } = useToast();
  const [actions, setActions] = useState<NextActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const ranked = useMemo(() => rankMovesForActions(moves).slice(0, TOP_N), [moves]);

  // Load existing actions.
  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("next_actions")
        .select("*")
        .eq("respondent_id", respondentId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && data) setActions(data as NextActionRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [respondentId, isOwner]);

  // Listen for "expand from chat" events so the assistant can pop a Move open.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ move_id?: string }>).detail;
      if (detail?.move_id) {
        setExpanded((prev) => new Set(prev).add(detail.move_id!));
        document.getElementById("next-actions")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("aioi:expand-action", handler as EventListener);
    return () => window.removeEventListener("aioi:expand-action", handler as EventListener);
  }, []);

  const toggleExpanded = (moveId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moveId)) next.delete(moveId);
      else next.add(moveId);
      return next;
    });
  };

  const generateChecklist = async (move: RecommendationMove) => {
    setGeneratingFor(move.move_id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: "Sign in required", description: "Sign in to generate a checklist.", variant: "destructive" });
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/next-actions-expand`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ respondent_id: respondentId, move_id: move.move_id }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast({ title: "Slow down", description: "Try again in a moment.", variant: "destructive" });
        else if (resp.status === 402) toast({ title: "Limit reached", description: "AI credits exhausted.", variant: "destructive" });
        else toast({ title: "Couldn't generate checklist", variant: "destructive" });
        return;
      }
      const payload = await resp.json() as { items: Array<{ title: string; due_date: string; sort_order: number }> };
      // Compute base sort offset so new items append after existing ones for this Move.
      const existingForMove = actions.filter((a) => a.move_id === move.move_id).length;
      const rows = payload.items.map((it, i) => ({
        respondent_id: respondentId,
        move_id: move.move_id,
        title: it.title,
        due_date: it.due_date,
        sort_order: existingForMove + i,
      }));
      const { data: inserted, error } = await supabase.from("next_actions").insert(rows).select();
      if (error || !inserted) {
        toast({ title: "Couldn't save checklist", description: error?.message, variant: "destructive" });
        return;
      }
      setActions((prev) => [...prev, ...(inserted as NextActionRow[])]);
      setExpanded((prev) => new Set(prev).add(move.move_id));
      trackEvent("next_actions.generated", { respondent_id: respondentId, move_id: move.move_id, count: rows.length });
    } finally {
      setGeneratingFor(null);
    }
  };

  const addBlank = async (moveId: string) => {
    const existing = actions.filter((a) => a.move_id === moveId).length;
    const { data, error } = await supabase
      .from("next_actions")
      .insert({ respondent_id: respondentId, move_id: moveId, title: "New action", sort_order: existing })
      .select()
      .single();
    if (error || !data) {
      toast({ title: "Couldn't add", description: error?.message, variant: "destructive" });
      return;
    }
    setActions((prev) => [...prev, data as NextActionRow]);
  };

  const updateAction = async (id: string, patch: Partial<NextActionRow>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from("next_actions").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Couldn't save change", description: error.message, variant: "destructive" });
    }
  };

  const removeAction = async (id: string) => {
    const prev = actions;
    setActions((p) => p.filter((a) => a.id !== id));
    const { error } = await supabase.from("next_actions").delete().eq("id", id);
    if (error) {
      setActions(prev);
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    }
  };

  const totalDone = actions.filter((a) => a.completed_at).length;
  const totalAll = actions.length;
  const pct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  if (!isOwner) {
    return (
      <section
        id="next-actions"
        aria-label="Next actions"
        className="mt-16 sm:mt-20 rounded-md border border-cream/10 bg-surface-1/40 p-8 text-center"
      >
        <p className="eyebrow text-brass-bright mb-3">Next actions</p>
        <p className="font-display text-2xl text-cream mb-3">Sign in to build your action plan</p>
        <p className="text-sm text-cream/65 max-w-md mx-auto">
          When you sign in to your report, you can turn any Move into a dated checklist and tick items off as you go.
        </p>
      </section>
    );
  }

  return (
    <section id="next-actions" aria-label="Next actions" className="mt-16 sm:mt-20">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brass-bright mb-2">Next actions · ranked by impact</p>
          <h2 className="font-display text-3xl sm:text-4xl text-cream tracking-tight">
            Turn your top {ranked.length} Moves into a checklist
          </h2>
          <p className="text-sm text-cream/65 mt-2 max-w-2xl">
            Each Move expands into 3-5 concrete steps with due dates. The assistant can help you pick what to do first.
          </p>
        </div>
        {totalAll > 0 && (
          <div className="min-w-[180px]">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream/50 mb-2">
              {totalDone} / {totalAll} done
            </p>
            <Progress value={pct} className="h-1.5 bg-cream/10" />
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-cream/55 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your action plan…
        </div>
      ) : (
        <ol className="space-y-4">
          {ranked.map((move, idx) => {
            const moveActions = actions
              .filter((a) => a.move_id === move.move_id)
              .sort((a, b) => a.sort_order - b.sort_order);
            const isOpen = expanded.has(move.move_id);
            const moveDone = moveActions.filter((a) => a.completed_at).length;
            const pillarName = PILLAR_NAMES[move.snapshot.pillar as 1] ?? `Pillar ${move.snapshot.pillar}`;
            return (
              <li
                key={move.move_id}
                className="rounded-lg border border-cream/10 bg-surface-1/55 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(move.move_id)}
                  className="w-full flex items-start justify-between gap-4 px-5 sm:px-6 py-4 text-left hover:bg-cream/[0.03] transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <span className="font-display text-2xl text-brass-bright/50 tabular-nums leading-none mt-0.5">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45 mb-1">
                        {pillarName}
                        {typeof move.snapshot.impact === "number" && (
                          <span className="ml-2 text-cream/35">Impact {move.snapshot.impact}/4</span>
                        )}
                        {typeof move.snapshot.effort === "number" && (
                          <span className="ml-2 text-cream/35">Effort {move.snapshot.effort}/4</span>
                        )}
                      </p>
                      <p className="font-display text-lg sm:text-xl text-cream leading-snug">
                        {move.snapshot.title}
                      </p>
                      {moveActions.length > 0 && (
                        <p className="text-xs text-cream/55 mt-1.5">
                          {moveDone} of {moveActions.length} done
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-cream/45">
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-cream/10 px-5 sm:px-6 py-5 space-y-4 bg-surface-0/40">
                    {moveActions.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-cream/65">No actions yet for this Move.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => generateChecklist(move)}
                            disabled={generatingFor === move.move_id}
                            className="bg-brass text-ink hover:bg-brass-bright"
                          >
                            {generatingFor === move.move_id ? (
                              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Drafting…</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-1.5" /> Generate checklist with AI</>
                            )}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => addBlank(move.move_id)}>
                            <Plus className="h-4 w-4 mr-1.5" /> Add blank action
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent("aioi:open-report-chat", {
                                detail: { prompt: `Help me sequence the steps for "${move.snapshot.title}". What should I do this week?` },
                              }));
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1.5" /> Ask the assistant
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {moveActions.map((a) => (
                            <ActionRow
                              key={a.id}
                              action={a}
                              onUpdate={(patch) => updateAction(a.id, patch)}
                              onDelete={() => removeAction(a.id)}
                            />
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => addBlank(move.move_id)}>
                            <Plus className="h-4 w-4 mr-1.5" /> Add action
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => generateChecklist(move)}
                            disabled={generatingFor === move.move_id}
                          >
                            {generatingFor === move.move_id ? (
                              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Drafting…</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-1.5" /> Suggest more</>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent("aioi:open-report-chat", {
                                detail: { prompt: `Review my checklist for "${move.snapshot.title}" and suggest what to tackle this week.` },
                              }));
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1.5" /> Discuss
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ActionRow({
  action,
  onUpdate,
  onDelete,
}: {
  action: NextActionRow;
  onUpdate: (patch: Partial<NextActionRow>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(action.title);
  const done = !!action.completed_at;
  const due = action.due_date ? parseISO(action.due_date) : undefined;
  const overdue = !done && due && due < new Date(new Date().toDateString());

  const commitTitle = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== action.title) onUpdate({ title: next });
    else setDraft(action.title);
  };

  return (
    <li className="flex items-start gap-3 group">
      <Checkbox
        checked={done}
        onCheckedChange={(v) =>
          onUpdate({ completed_at: v ? new Date().toISOString() : null })
        }
        className="mt-1 border-cream/30 data-[state=checked]:bg-brass data-[state=checked]:border-brass"
        aria-label={`Mark "${action.title}" as ${done ? "incomplete" : "done"}`}
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
              if (e.key === "Escape") { setDraft(action.title); setEditing(false); }
            }}
            className="bg-surface-1 border-cream/15 text-cream h-8 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "block text-left text-sm text-cream/85 hover:text-cream w-full",
              done && "line-through text-cream/40 hover:text-cream/55",
            )}
          >
            {action.title}
          </button>
        )}
        <div className="flex items-center gap-3 mt-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.16em]",
                  overdue ? "text-red-400" : "text-cream/45 hover:text-cream/70",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {due ? format(due, "d MMM") : "Set due date"}
                {overdue && <span className="ml-1 normal-case tracking-normal">overdue</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={due}
                onSelect={(d) =>
                  onUpdate({ due_date: d ? format(d, "yyyy-MM-dd") : null })
                }
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {done && action.completed_at && (
            <span className="inline-flex items-center gap-1 text-[11px] text-brass-bright/70 font-mono">
              <Check className="h-3 w-3" /> {format(parseISO(action.completed_at), "d MMM")}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 text-cream/40 hover:text-red-400 transition"
        aria-label={`Delete "${action.title}"`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
