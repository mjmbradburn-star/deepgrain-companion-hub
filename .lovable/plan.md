
# Make the advice practical, and the voice yours

The grounding work is done. The chat now only talks about the user's report. The next gap is the **shape and tone** of what it says. Today the assistant tends to give framing ("you should think about governance"). What you want is **what to put in the calendar on Monday morning**, in your voice.

This plan does two things:

1. Force every chat reply into a concrete "do this tomorrow" shape.
2. Lock the voice. One shared style guide, applied to chat output and to Move-copy generation, with a server-side sanitiser that strips em-dashes and AI tells before the user sees them.

## 1. Practicality contract for every reply

Edit the system prompt in `supabase/functions/report-chat/index.ts` so that, unless the user explicitly asks for something else (a one-pager, a brief, a sequence), the model must answer in this shape:

```
The Move:        '<exact Move title from the allow-list>'
Why now:         one sentence tied to their hotspot or tier
Do this week:    3-5 bullets, each starts with a verb, names who does it,
                 names the artefact produced (doc, channel, meeting, policy)
First 30 mins:   the very first thing to open or write tomorrow morning
You'll know
it landed when:  a behaviour or artefact, not a metric
Watch out for:   the most common way this fails in a company their size
```

Rules baked into the prompt:

- Every action must name a **role** (you, your COO, the team lead, an AI champion) and a **deliverable** (a one-page policy, a Slack channel, a 30-minute standup, a shared prompt library, a tagged folder in Drive).
- No "consider", "explore", "think about", "look into", "develop a strategy", "foster a culture". If the model would write that, it must instead write the specific thing to do.
- Never invent vendor names. If a tool is needed, say "your existing chat tool" or "whatever you use for docs".
- Cap the answer at ~180 words unless the user asked for an artefact (brief, plan, email).
- For "How do I handle X?" questions (policy breaches, shadow tool use, scepticism, exec resistance) the assistant answers in the same shape but with a "Say this:" block containing a short script the user can paste or read aloud.

## 2. Shared voice guide, used in two places

Create `supabase/functions/_shared/aioi-voice.ts` exporting:

- `VOICE_GUIDE` (string) — the canonical voice rules. Covers: British English, no em-dashes, second person, no banned words, no rhetorical questions, no "in today's fast-paced world" openings, no "I hope this helps" closings, no emoji, contractions allowed, dry and direct.
- `BANNED_PATTERNS` (RegExp[]) — superset of what `backfill-move-copy` already has, plus: "navigate", "landscape", "robust", "comprehensive", "dive in", "let's", "feel free", "I'd be happy to", "as an AI", "ensure that", "it's important to note", "in order to", "going forward", "at the end of the day".
- `sanitise(text)` — same function shape as the one in `backfill-move-copy`, with the em-dash → comma replacement, contractions kept, double spaces collapsed.
- `BANNED_OPENERS` (RegExp[]) — strips assistant openings like "Great question", "Certainly", "Of course", "Sure", "Absolutely".

Then:

- `backfill-move-copy/index.ts` imports `VOICE_GUIDE`, `BANNED_PATTERNS`, `sanitise` from the shared module instead of redefining its own. One source of truth.
- `report-chat/index.ts` imports the same things and uses `VOICE_GUIDE` inside the system prompt's VOICE block, so the chat and the Move copy speak in the same voice.

## 3. Strip the AI tells before the user sees them

The chat streams. We can't sanitise mid-stream cleanly without breaking SSE framing, so do it in two places:

1. **In the system prompt**: hard rule at the top, with examples of bad → good rewrites. Cheapest fix, catches most cases.
2. **On persistence**: when we save the assistant's final message to `report_chat_messages`, run `sanitise()` on it. The DB copy (which is what the user sees on reload, and what gets exported to the action plan PDF) is always clean. The transient streamed version in the browser may briefly show an em-dash before it gets replaced by the persisted version on the next render.

Add a small post-stream step in the edge function: collect the streamed deltas server-side as they pass through, then on `[DONE]` write the sanitised full text to the DB. (We already proxy the upstream stream; we'll wrap it in a `TransformStream` that tees the content into a buffer.)

Optional polish: when the sheet finishes streaming, the client refetches the last persisted message from `report_chat_messages` and replaces the in-memory copy. One extra read, no UI rewrite needed.

## 4. Tighter starter prompts

Replace the current generic suggested prompts in `src/components/aioi/ReportChatSheet.tsx` with prompts that pull on the practicality contract:

- "What should I do tomorrow morning on '<their #1 Move title>'?"
- "We don't have an AI policy yet. What's the smallest one that works?"
- "Someone on my team is using ChatGPT for client work without telling me. How do I handle it?"
- "Give me a 30-minute agenda for the Monday standup that opens up '<their weakest pillar>'."

These are pre-rendered server-side via the existing grounding bundle (the sheet already has access to `recommendations.moves[0]` and `hotspots[0]` from props). Falls back to generic strings if those aren't loaded.

## 5. What I'm NOT touching

- The Moves data itself. The advice quality starts in the playbook copy, but rewriting Moves is a separate piece of work and would need your editorial pass. This change makes the assistant **render** the Moves into action-shaped advice, which is the highest-leverage move right now.
- Quotas, RLS, injection rules. All untouched.
- The "Discuss this Move" entry point. Already there, will benefit automatically.

## Technical change list

**New**
- `supabase/functions/_shared/aioi-voice.ts` — shared voice guide, banned patterns, sanitise, banned openers.

**Edited**
- `supabase/functions/report-chat/index.ts` — import shared voice; rewrite system prompt with the practicality contract and the answer shape; tee the upstream stream; sanitise + persist final assistant text on `[DONE]`.
- `supabase/functions/backfill-move-copy/index.ts` — drop the local copies, import from `_shared/aioi-voice.ts`. No behaviour change.
- `src/components/aioi/ReportChatSheet.tsx` — derive the suggested prompts from props (top Move title, top hotspot pillar name); fall back to generics.
- `src/pages/AssessReport.tsx` — pass `topMoveTitle` and `topHotspotName` into `ReportChatLauncher` → `ReportChatSheet` so the prompts can be specific.

## Order of execution

1. Create the shared voice module.
2. Refactor `backfill-move-copy` to use it (no functional change, just deduplication).
3. Update `report-chat`: new system prompt, stream tee, sanitise-on-persist.
4. Update the sheet's starter prompts and the launcher props.
5. Eyeball it on a real report: ask "what do I do tomorrow on Move X" and confirm the reply has the contract sections, no em-dashes, no "delve".

Approve and I'll ship 1-4 in one go and do the manual check in 5.
