# Report Assistant — "Ask your report" AI chat

## What we're building

A chat assistant that lives **on the report page** (not the assessment), grounded in the user's actual results. It answers questions like:

- "Which Move should I do first this quarter?"
- "Why is governance my weakest pillar?"
- "Translate this Move into a one-page brief for my CFO."
- "Build me a 30-day plan from my top three Moves."

It is a **report companion**, not a generic chatbot. It only ever talks about *this respondent's* report.

## Where it lives

A pinned **"Ask your report"** panel inside `AssessReport.tsx`, anchored bottom-right as a floating launcher that opens a side sheet (Sheet component, already in shadcn). Visible only when:

1. The respondent's report has loaded successfully, AND
2. `recommendations.moves.length > 0` (no moves = nothing to ground on).

The launcher uses the existing `Sparkles` / `MessageSquare` icon and copy: **"Ask your report"** with a subtle pulse on first arrival.

Also surfaced as a **secondary CTA inside each MoveCard**: a small "Discuss this Move" link that opens the sheet pre-seeded with `"Help me put '<Move title>' into practice."`

Not rendered on the locked pre-deepdive teaser (gated behind `hasDeepdive` for full Q&A; pre-deepdive users get 3 free turns then a soft paywall pointing to deep-dive unlock — keeps the Voice Wrapper economics intact).

## Why on the report (not the assessment)

The assessment is deliberately fast (3 minutes, 8 questions). Adding a chatbot mid-flow would inflate completion time and contaminate the scoring signal. After the report renders the user has *something to talk about* — their scores, hotspots, and ranked Moves — which is exactly what the LLM needs as grounding context.

## Grounding: what the assistant knows

Every chat call sends the respondent's report state as the system context (server-side, never trusted from client). The edge function loads:

- `respondents` row: lens, function, size_band, pillar_tiers, overall score, tier
- `recommendations` JSON: headline_diagnosis, personalised_intro, the ranked `moves[]` (id, title, pillar, why_matters, what_to_do, how_to_know, effort, impact)
- Top hotspots and matched benchmark slice

The system prompt enforces:

- British English, AIOI voice (reuses the same banned-word list from `backfill-move-copy`)
- Refuses off-topic requests ("I can only help with your AI Operating Index report")
- Always cites Move titles when recommending action
- No hallucinated scores — if asked about something not in the report, say so

## Conversation persistence

Chats are saved per respondent so users returning via magic link see prior conversations. New table `report_chat_messages` (respondent_id, role, content, created_at) with RLS: respondent can read/write their own via the existing report token; admins can read all.

Conversation history is included on every call (per AI chatbot best practices). Cap history at the last 30 messages to bound token cost; older messages are summarised into a single system note.

## Streaming

SSE streaming via the standard Lovable AI Gateway pattern: tokens render progressively in the sheet using `react-markdown` so formatted answers (lists, bold, tables) display correctly. AbortController wired to a "stop" button.

## Rate limiting / cost guardrails

- Free tier (no deep-dive): 3 turns per respondent, then a CTA to unlock deep-dive
- Deep-dive unlocked: 50 turns per respondent, then soft cap with a "you've explored this report deeply — want a 1:1?" CTA
- 429/402 from the gateway surfaced as toast copy: "Too many requests, try again in a moment" / "AI quota reached for this report"

## Model choice

Default `google/gemini-3-flash-preview` — fast, cheap, multimodal-capable, plenty strong for grounded Q&A on a ~2KB report. We can A/B against `google/gemini-2.5-pro` later if users start asking heavy reasoning questions ("rebuild my org chart for an AI-native operating model").

## Technical change list

**New files**
- `supabase/functions/report-chat/index.ts` — streaming SSE handler. Loads respondent context server-side, builds the system prompt, forwards to Lovable AI Gateway, streams back. Validates respondent token + turn quota.
- `src/components/aioi/ReportChatSheet.tsx` — Sheet UI, message list with `react-markdown`, input, streaming reducer, abort controller.
- `src/components/aioi/ReportChatLauncher.tsx` — floating button + first-arrival pulse + unread indicator.

**Migration**
- Create `report_chat_messages` table (id, respondent_id FK, role enum: user|assistant, content text, created_at) with RLS policies (respondent-owned read/write via existing token mechanism, admins via `has_role`).
- Index on `(respondent_id, created_at)`.

**Edits**
- `src/pages/AssessReport.tsx` — mount `<ReportChatLauncher>` and `<ReportChatSheet>` once recommendations load; pass `respondentId`, `hasDeepdive`, and a callback to seed prompts.
- `src/components/aioi/MoveCard.tsx` — add the "Discuss this Move" link that emits a custom event the sheet listens for.
- `package.json` — add `react-markdown` (~25KB gz) if not already present.

## What I'm explicitly NOT building

- A general-purpose chatbot or homepage assistant — too broad, low signal, high cost
- Voice/audio input — out of scope for v1
- Image generation — assistant is text-only; the report already has charts
- Automatic email of chat transcripts — easy to add later if users ask

## Order of execution if approved

1. Migration: `report_chat_messages` table + RLS
2. Edge function `report-chat` with streaming + grounding + quota
3. UI: `ReportChatSheet` and `ReportChatLauncher`
4. Wire into `AssessReport.tsx` and `MoveCard.tsx`
5. QA: spot-check on a real report; verify the assistant refuses off-topic prompts and cites Move titles correctly

Approve and I'll ship steps 1–4 in one batch and then do step 5.
