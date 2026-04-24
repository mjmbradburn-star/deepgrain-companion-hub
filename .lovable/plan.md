# AIOI Recommendations Architecture v1 — Full Build Plan

This plan delivers the full hybrid architecture from your brief at the quality bar specified, leveraging what's already in place (extended `outcomes_library` schema, `selection-engine.ts`, 40 seeded Moves) and completing every remaining acceptance criterion.

---

## Current state (what already exists)

- Schema extended on `outcomes_library`: `lens`, `tier_band`, `function`, `size_bands`, `why_matters`, `what_to_do`, `how_to_know`, `tags`, `cta_type`, `cta_url`, `last_reviewed_at`. Indexes in place.
- `reports` table has `recommendations` (jsonb) and `move_ids` (uuid[]) for caching + auditability.
- Pure Selection Engine (`supabase/functions/_shared/selection-engine.ts`) with 9 passing tests — implements bandify, hotspot pick, weighted scoring (0.40/0.20/0.20/0.20), pillar spread, effort balance, lens caps (3-5 / 5-7 / 5+1), forced-rank for organisational.
- 40 Moves currently seeded. Need ~152 more to reach 192-Move launch target.
- Live report (`AssessReport.tsx`, `PlanTab` + `OutcomeCard` + hotspot grid in `OneSheetReport`) currently renders the legacy `plan[]` from `score-responses`.

---

## Phase A — Complete the Playbook seed (192 Moves)

Author the full launch library to the brief's §11 spec, written in your voice (British, direct, no em-dashes, action-led). Insert via `supabase--insert` (data, not migrations) so we don't pollute migration history.

**Coverage matrix (target 192 active Moves):**

| Lens | Cells | Moves per cell | Subtotal |
|---|---|---|---|
| Individual | 8 pillars × 3 bands | 1 | 24 |
| Organisational | 8 pillars × 3 bands | 1 | 24 |
| Functional (priority 6 functions × 8 pillars × 3 bands) | 144 | 1 | 144 |
| **Total** | | | **192** |

Priority functions per brief: **revops, marketing, engineering-product, people-hr, finance, ops-cs**. (legal deferred to Q2.)

Every Move has all required fields: `title` (5-9 words, action-led), `why_matters` (1-2 sentences), `what_to_do` (specific, named tools, links where relevant), `how_to_know` (lead indicator), `effort` (1-4), `tags`, `size_bands` where applicable, `last_reviewed_at = now()`, `active = true`.

The §10 worked examples (Individual P5 low; RevOps P4 low; People P3 mid; Org governance) are seeded verbatim. Re-confirm the 40 already-seeded Moves still meet the §10 quality bar; rewrite where they fall short.

**Authoring approach:** I'll draft all 192 in your voice using the §10 examples + §4 anchor topics + §7.4 voice rules as the style guide, in batches per lens. You can edit later via the admin UX (Phase D). This is the heavy-lift step — the architecture is worthless without the content.

---

## Phase B — Voice Wrapper edge function

New edge function `recommend-report`:

- **Trigger:** Called from `score-responses` after scoring, and again on-demand from a `/regenerate` admin action.
- **Inputs:** `respondent_id` (verified server-side via JWT + ownership), pulls respondent context, scored pillar tiers, hotspots, cap_flags from DB.
- **Selection step:** Loads active Moves from `outcomes_library`, calls `selectMoves(profile, playbook)` from the shared engine. Persists `move_ids` to `reports`.
- **Voice step:** Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with tool-calling JSON schema per brief §7.2:
  - `headline_diagnosis`
  - `personalised_intro` (must reference respondent's stated `pain` or `role`)
  - `moves[]` with `move_id`, `personalised_why_matters`, optional `personalised_what_to_do_intro`
  - `closing_cta` (tier-aware)
- **System prompt:** brief §7.4 verbatim — voice rules (British English, no em-dashes, no banned words list, no inventing tools).
- **Hard validation:** every returned `move_id` must be in the engine's selection. Strip any extras. If JSON is malformed or call fails → fallback per §7.6 (render Moves bare with a generic on-voice intro, log the failure, retry once async).
- **Cache:** Result stored in `reports.recommendations` (jsonb). Re-render is free until respondent retakes or admin clicks regenerate.
- **Latency budget:** sub-10s. Wrap in try/catch with timeout.

**Wire into `score-responses`:** after the existing scoring + report row insert, call the selection + voice wrapper inline. If it fails, the report still renders (legacy `plan` stays as a backstop for one release while we validate).

---

## Phase C — Report UI rewiring

Update `AssessReport.tsx` to render the new `recommendations` payload when present, falling back to legacy `plan` only if absent.

**Changes:**

1. **`PlanTab` becomes `MovesTab`** — renders `recommendations.moves[]` as cards using `recommendations.personalised_intro` as the section lede. Each card shows:
   - Title (from Move)
   - "Why this matters for you" (from `personalised_why_matters` — Voice Wrapper output)
   - "What to do" (from Move `what_to_do`, markdown rendered)
   - "How you'll know it worked" (from Move `how_to_know`)
   - Effort dots (1-4) — visual indicator
   - Forced-rank badge for the organisational pinned Move
   - Optional CTA button if `cta_type` is set

2. **`HotspotCard` enriched** — add `why_matters` snippet and effort indicator from the top selected Move on that pillar. Keeps existing visual frame.

3. **Headline diagnosis** — replace the legacy `report.diagnosis` quote with `recommendations.headline_diagnosis` when present.

4. **Closing CTA** — render `recommendations.closing_cta` above `ReportCta`.

5. **Loading state** — "Building your report…" copy on the processing screen acknowledges the ~5-8s wrapper latency.

6. **Printable one-pager** — same data sources, condensed layout. Shows top 3 Moves + forced-rank.

Backwards-compatible: legacy reports without `recommendations` keep rendering the old `plan` view. Once all live reports are regenerated (Phase E), the legacy code path is removed.

---

## Phase D — Admin Playbook editor

Gated admin route `/admin/playbook` (RLS: only your `auth.uid()` — set via a `playbook_admins` table or a hardcoded uid env check on the page).

**Views:**

- **All Moves table** — sortable/filterable by lens, pillar, tier_band, function, active, last_reviewed_at. Search by title/tag.
- **Move editor** — single Move on a page, all fields editable. Markdown preview for `what_to_do`. Tag autocomplete from existing tag set. Save → live immediately.
- **Coverage map** — heatmap (lens × pillar × tier_band, with function selector for functional lens) showing active Move counts per cell. Empty cells highlighted red.
- **Stale view** — Moves not reviewed in 90 days, sorted by lens.
- **Test report** — pick a synthetic respondent profile (lens, function, size, pillar tiers) and see exactly which Moves the engine would select. Sanity-check tool.

**Mutations:** Use authenticated Supabase client with new RLS policies allowing INSERT/UPDATE on `outcomes_library` for admin uids only. Soft-delete via `active = false`.

---

## Phase E — Migration & QA

1. **Backfill existing reports:** one-off edge function `regenerate-all-recommendations` that loops through every report and calls `recommend-report`. Rate-limited to respect AI gateway.
2. **Acceptance criteria check (brief §13):**
   - 192+ active Moves ✓
   - Synthetic test of 20 respondent profiles — engine returns correct count per lens
   - 50-call wrapper test — 95%+ valid JSON
   - Fallback verified
   - Cross-check flag handling verified (cap fires → prereq pillar prioritised)
   - Effort balance verified (no 5-of-the-same-effort outputs)
   - Coverage map shows no critical empty cells
   - p95 submit→ready < 12s
3. **Changelog page** at `/admin/changelog` so updates are demonstrable.

---

## Technical details

**Files to create:**
- `supabase/functions/recommend-report/index.ts` — Voice Wrapper + selection orchestration
- `supabase/functions/regenerate-all-recommendations/index.ts` — backfill (admin-gated)
- `src/pages/admin/PlaybookList.tsx`, `PlaybookEditor.tsx`, `PlaybookCoverage.tsx`, `PlaybookTestReport.tsx`, `PlaybookStale.tsx`
- `src/components/aioi/MoveCard.tsx` — replaces OutcomeCard for new payload
- `src/lib/playbook.ts` — typed client helpers

**Files to modify:**
- `supabase/functions/score-responses/index.ts` — call recommend-report after scoring
- `src/pages/AssessReport.tsx` — `PlanTab` → `MovesTab`, headline + CTA wiring, fallback
- `src/components/aioi/HotspotCard.tsx` — accept Move enrichment props
- `src/integrations/supabase/types.ts` — auto-regenerated

**Migrations needed:**
- RLS policies on `outcomes_library` for INSERT/UPDATE by admins
- Optional: `playbook_admins` table (or env-driven allowlist)
- `recommendations_generated_at` column on `reports` for cache age tracking

**Data inserts (no migration):**
- ~152 new Moves to reach 192
- Possibly rewrites of weak existing Moves

**AI model:** `google/gemini-2.5-flash` via Lovable AI Gateway (free under current promo, no key setup, ~5-8s latency, structured-output via tool calling). Swappable to Claude Sonnet via env var later — `recommend-report` reads `VOICE_WRAPPER_MODEL` env if set.

**Voice Wrapper guarantees:**
- Tool-calling forces valid JSON schema (no parse failures from prose drift)
- `move_id` allowlist enforced server-side
- Banned-word post-filter (em-dash, "leverage", "unlock", "delve", "synergy", etc.) — auto-strip or retry once
- 8s timeout → fallback path

---

## Order of execution (build phase)

1. **A. Seed 152 Moves** (largest single time investment; pure inserts)
2. **B. Build `recommend-report` edge function** (selection wired to voice wrapper + cache)
3. **C. Rewire report UI** (`MovesTab`, enriched HotspotCard, headline, CTA, fallback)
4. **D. Admin Playbook editor** (table → editor → coverage map → test report → stale view)
5. **E. Migrate existing reports + run acceptance suite**

Each phase ships independently; phases A+B+C are required for launch. D unblocks your update cadence (§9). E is the polish + verification pass.

---

## What this does NOT do

- Does not migrate to a separate `playbook_moves` table (we keep `outcomes_library` extended — saves migration risk and the legacy `plan` fallback keeps working through transition).
- Does not add an n8n workflow layer (your brief defers it; can be added later as Layer 4).
- Does not include legal/compliance function Moves (deferred to Q2 per brief §11).
- Does not change scoring logic (engine is downstream of scoring; current scoring stays as-is).

Ready to execute on approval. Phase A is the credit-heavy step (large insert volume + drafting); B/C/D/E are mostly engineering with light AI involvement.

