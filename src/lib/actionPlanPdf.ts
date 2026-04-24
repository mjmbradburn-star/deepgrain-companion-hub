// Generate a "Download action plan" PDF for the current report.
//
// The PDF stitches together three sources of ground-truth data, all scoped
// to a single respondent and pulled with the user's JWT (so RLS enforces
// ownership):
//
//   1. The report itself      — score, tier, pillar tiers, hotspots,
//                                headline diagnosis, ranked Moves.
//   2. The chat history       — the last assistant turns from
//                                `report_chat_messages`, summarised as
//                                "AI-suggested next steps".
//   3. The Next Actions table — any concrete checklist items the user has
//                                saved against this respondent.
//
// We render with jsPDF using only the built-in Helvetica family (no font
// loading, no network, no Unicode glyphs that would render as boxes).

import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

const PILLAR_NAMES: Record<number, string> = {
  1: "Strategy & Mandate",
  2: "Data Foundations",
  3: "Tooling & Infrastructure",
  4: "Workflow Integration",
  5: "Skills & Fluency",
  6: "Governance & Risk",
  7: "Measurement & ROI",
  8: "Culture & Adoption",
};

interface MoveSnapshot {
  title: string;
  pillar: number;
  tier_band: string;
  why_matters: string | null;
  what_to_do: string | null;
  how_to_know: string | null;
  effort: number | null;
  impact: number | null;
}
interface RecMove {
  move_id: string;
  personalised_why_matters?: string;
  snapshot: MoveSnapshot;
}
interface Recommendations {
  headline_diagnosis?: string;
  personalised_intro?: string;
  closing_cta?: string;
  moves: RecMove[];
}

export interface ActionPlanInput {
  respondent: {
    id: string;
    slug: string;
    level: string;
    function: string | null;
    org_size: string | null;
  };
  report: {
    aioi_score: number | null;
    overall_tier: string | null;
    pillar_tiers: Record<string, { tier: number; label: string; name: string }> | null;
    hotspots: Array<{ pillar: number; name: string; tier: number; tierLabel: string }> | null;
    recommendations: Recommendations | null;
  };
}

// ─── Strip characters that the built-in Helvetica face cannot render ──────
// jsPDF's standard fonts only ship the WinAnsi / Latin-1 range. Anything
// outside that — em-dashes, smart quotes, emoji, en-dashes — turns into a
// black box. Replace them with safe ASCII equivalents.
function ascii(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/[\u2014\u2013]/g, "-")  // em / en dash
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\xFF]/g, "");     // drop anything still outside Latin-1
}

// Pull "next-step-shaped" lines out of an assistant chat reply: any line
// that starts with a bullet, dash, or numbered prefix. Caps results so a
// rambling answer can't dominate the PDF.
function extractSuggestions(content: string, max = 5): string[] {
  const out: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(?:[-*•]|\d+[.)])\s+(.{4,200})$/);
    if (m) {
      // Strip stray markdown emphasis.
      const cleaned = m[1].replace(/[*_`]/g, "").trim();
      if (cleaned) out.push(cleaned);
      if (out.length >= max) break;
    }
  }
  return out;
}

interface ChatRow { role: "user" | "assistant"; content: string; created_at: string }
interface NextActionRow {
  title: string;
  due_date: string | null;
  completed_at: string | null;
  move_id: string | null;
  sort_order: number;
}

export async function generateActionPlanPdf(input: ActionPlanInput): Promise<void> {
  const { respondent, report } = input;

  // 1. Pull chat + next actions in parallel. Both are RLS-gated to the
  //    signed-in owner of `respondent_id`, so we don't need to recheck.
  const [chatRes, actionsRes] = await Promise.all([
    supabase
      .from("report_chat_messages")
      .select("role, content, created_at")
      .eq("respondent_id", respondent.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("next_actions")
      .select("title, due_date, completed_at, move_id, sort_order")
      .eq("respondent_id", respondent.id)
      .order("sort_order", { ascending: true }),
  ]);

  const chat = (chatRes.data ?? []) as ChatRow[];
  const actions = (actionsRes.data ?? []) as NextActionRow[];

  // Map move_id -> title so we can label saved actions by their parent Move.
  const moveTitleById = new Map<string, string>();
  for (const m of report.recommendations?.moves ?? []) {
    if (m?.move_id && m?.snapshot?.title) moveTitleById.set(m.move_id, m.snapshot.title);
  }

  // 2. Distil chat-derived suggestions: take bullet/numbered lines from the
  //    most recent assistant turns. Dedupe against itself (case-insensitive).
  const seen = new Set<string>();
  const chatSuggestions: string[] = [];
  for (const msg of [...chat].reverse()) {
    if (msg.role !== "assistant") continue;
    for (const s of extractSuggestions(msg.content)) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      chatSuggestions.push(s);
      if (chatSuggestions.length >= 12) break;
    }
    if (chatSuggestions.length >= 12) break;
  }

  // 3. Render.
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Cursor management with auto page-break.
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (
    text: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; gap?: number; color?: [number, number, number] } = {},
  ) => {
    const size = opts.size ?? 10;
    const style = opts.style ?? "normal";
    const lineH = size * 1.35;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    if (opts.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    else doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(ascii(text), contentW);
    for (const ln of lines) {
      ensureSpace(lineH);
      doc.text(ln, margin, y);
      y += lineH;
    }
    if (opts.gap) y += opts.gap;
  };

  const sectionHeading = (label: string) => {
    ensureSpace(40);
    y += 8;
    doc.setDrawColor(180, 140, 60);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 28, y);
    y += 14;
    writeLines(label.toUpperCase(), { size: 11, style: "bold", color: [120, 90, 30], gap: 6 });
  };

  // ── Header ──
  writeLines("AI Operating Index", { size: 11, style: "bold", color: [120, 90, 30] });
  writeLines("Action Plan", { size: 26, style: "bold", gap: 4 });
  const meta = [
    `Lens: ${ascii(respondent.level)}`,
    respondent.function ? `Function: ${ascii(respondent.function)}` : null,
    respondent.org_size ? `Org size: ${ascii(respondent.org_size)}` : null,
    `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
  ].filter(Boolean).join("  ·  ");
  writeLines(meta, { size: 9, color: [110, 110, 110], gap: 12 });

  // ── Snapshot ──
  sectionHeading("Snapshot");
  writeLines(`AIOI score: ${report.aioi_score ?? "n/a"} / 100`, { size: 12, style: "bold" });
  writeLines(`Overall tier: ${report.overall_tier ?? "n/a"}`, { size: 11, gap: 8 });

  if (report.pillar_tiers) {
    writeLines("Pillar tiers", { size: 10, style: "bold", gap: 2 });
    for (const [k, v] of Object.entries(report.pillar_tiers)) {
      const name = PILLAR_NAMES[Number(k)] ?? v.name;
      writeLines(`  Pillar ${k}  ${name}  -  tier ${v.tier} (${v.label})`, { size: 10 });
    }
    y += 4;
  }

  if (report.hotspots && report.hotspots.length > 0) {
    writeLines("Hotspots to address first", { size: 10, style: "bold", gap: 2 });
    for (const h of report.hotspots) {
      writeLines(`  ${h.name} (Pillar ${h.pillar})  -  tier ${h.tier} (${h.tierLabel})`, { size: 10 });
    }
    y += 4;
  }

  if (report.recommendations?.headline_diagnosis) {
    writeLines("Headline diagnosis", { size: 10, style: "bold", gap: 2 });
    writeLines(report.recommendations.headline_diagnosis, { size: 10, gap: 6 });
  }

  // ── Ranked Moves ──
  const moves = report.recommendations?.moves ?? [];
  if (moves.length > 0) {
    sectionHeading("Recommended Moves");
    moves.slice(0, 12).forEach((m, i) => {
      const s = m.snapshot;
      ensureSpace(60);
      writeLines(`${i + 1}. ${s.title}`, { size: 12, style: "bold", gap: 2 });
      const meta2 = `${PILLAR_NAMES[s.pillar] ?? `Pillar ${s.pillar}`}  ·  ${s.tier_band} band  ·  effort ${s.effort ?? "?"}  ·  impact ${s.impact ?? "?"}`;
      writeLines(meta2, { size: 9, color: [110, 110, 110], gap: 4 });
      const why = m.personalised_why_matters || s.why_matters;
      if (why) {
        writeLines("Why it matters", { size: 9, style: "bold" });
        writeLines(why, { size: 10, gap: 4 });
      }
      if (s.what_to_do) {
        writeLines("What to do", { size: 9, style: "bold" });
        writeLines(s.what_to_do, { size: 10, gap: 4 });
      }
      if (s.how_to_know) {
        writeLines("How you'll know", { size: 9, style: "bold" });
        writeLines(s.how_to_know, { size: 10, gap: 8 });
      } else {
        y += 4;
      }
    });
  }

  // ── Saved Next Actions ──
  sectionHeading("Your Next Actions");
  if (actions.length === 0) {
    writeLines("You haven't saved any actions yet. Use the report chat to draft your first ones.", {
      size: 10, color: [110, 110, 110], gap: 6,
    });
  } else {
    for (const a of actions) {
      const tick = a.completed_at ? "[x]" : "[ ]";
      const due = a.due_date ? `  (due ${a.due_date})` : "";
      const fromMove = a.move_id ? moveTitleById.get(a.move_id) : null;
      writeLines(`${tick}  ${a.title}${due}`, { size: 10, style: "bold" });
      if (fromMove) writeLines(`     from "${fromMove}"`, { size: 9, color: [110, 110, 110] });
      y += 2;
    }
  }

  // ── AI-suggested steps from the chat ──
  if (chatSuggestions.length > 0) {
    sectionHeading("AI-suggested steps from your report chat");
    writeLines("Pulled from the assistant's replies. Tick off the ones you want to act on.", {
      size: 9, color: [110, 110, 110], gap: 6,
    });
    for (const s of chatSuggestions) {
      writeLines(`[ ]  ${s}`, { size: 10, gap: 2 });
    }
  }

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `AIOI Action Plan  ·  ${ascii(respondent.slug)}  ·  Page ${p} of ${pageCount}`,
      margin,
      pageH - 24,
    );
  }

  doc.save(`aioi-action-plan-${respondent.slug}.pdf`);
}
