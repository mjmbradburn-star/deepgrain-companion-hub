
# AIOI Recommendations Architecture — Credit-Conscious Adoption Plan

## Guiding constraints

- **Credits are tight.** Do the high-leverage backend/data work; defer anything that touches Hero, navigation, transitions, or design tokens.
- **No design/UX regressions.** Reuse the existing `HotspotCard` / `ReportCta` / 90-day plan slots. The report visually looks the same; the *content source* changes.
- **No big-bang rewrite.** Map the new architecture onto the table we already have (`outcomes_library`) instead of creating a parallel `playbook_moves` table and migrating twice.
- **Defer the admin UI.** Authoring goes via SQL seed + a single read-only "Coverage" debug page. Full Lovable admin UX is Phase 4 (post-credit-refresh).

---

## Phase 0 — Decisions to lock before any code (no credits)

Before we spend a single credit, you confirm:

1. **Reuse `outcomes_library` vs. add `playbook_moves`?** Recommendation: **reuse and extend**. Add the missing columns (`lens`, `tier_band`, `function`, `size_bands`, `why_matters`, `how_to_know`, `effort`, `tags`, `cta_type`, `cta_url`, `active`, `last_reviewed_at`). One migration, no data loss, half the wiring.
2. **Voice Wrapper model.** Default to **Lovable AI Gateway → `google/gemini-2.5-flash`** (free during current promo, no API key). Switch to Claude Sonnet later via env var if you want — but the gateway saves both credits and operational setup now.
3. **Launch Playbook size.** Brief asks for 192 Moves. Recommendation: ship with **~60 Moves at v1** (8 pillars × 3 tier bands × ~2.5 lenses-or-functions average) so the Engine has something credible to select from. You write them; we don't burn credits on AI-drafted seeds.
4. **Caching.** Per-respondent JSON cached on `reports.recommendations` column. Regenerated only on retake or admin "regenerate".

---

## Phase 1 — Schema + seed (small migration, ~minimal credits)

**Files touched:** 1 migration, 0 frontend.

1. `ALTER TABLE public.outcomes_library` to add the Move columns listed above. Keep existing rows working (defaults: `lens='organisational'`, `tier_band` derived from `applies_to_tier`, `active=true`).
2. Add `reports.recommendations JSONB` (cached Voice Wrapper output) and `reports.move_ids UUID[]` (auditable selection).
3. Seed file (`supabase/migrations/<ts>_seed_playbook_v1.sql`) with the worked examples from §10 of your doc as the first ~15 Moves. You add the rest by direct SQL or `psql` from your machine — no admin UI required for v1.
4. RLS: `outcomes_library` already public-read; keep it. Only service role can write.

**Acceptance:** existing reports keep rendering. New columns default safely.

---

## Phase 2 — Selection Engine (pure TS, testable, no UI)

**Files touched:**
- New: `supabase/functions/_shared/selection-engine.ts` (pure, vitest-able)
- New: `supabase/functions/_shared/selection-engine.test.ts`
- Modify: `supabase/functions/score-responses/index.ts` and `rescore-respondent/index.ts` to call the engine after scoring and persist `move_ids`.

The engine implements §6 pseudocode:
- `bandify(score)` → low/mid/high
- Filter by `lens, pillar, tier_band, function, size_bands, active`
- Score with the 0.40/0.20/0.20/0.20 weights
- Cap counts per lens (Individual 3-5, Functional 5-7, Organisational 5+1)
- Cross-check flag boost: when `capFlags` from `applyConsistencyCaps` mention a prerequisite pillar, boost Moves on that pillar
- Effort balancing pass (don't return five 4-week moves)

**No frontend changes in this phase.** The engine just stores `move_ids`. The report continues to render the legacy `fallbackPlan` until Phase 3.

**Acceptance:** Unit tests cover the worked examples in §10 of the brief — given a synthetic respondent, the engine returns the expected Move IDs.

---

## Phase 3 — Voice Wrapper edge function + report wiring

**Files touched:**
- New: `supabase/functions/generate-recommendations/index.ts` (Lovable AI Gateway call, JSON output, fallback to raw Moves on failure per §7.6)
- Modify: `src/pages/AssessReport.tsx` to read `reports.recommendations` (cached) and render Moves into the **existing** hotspot/plan slots
- Modify: `src/components/aioi/HotspotCard.tsx` — *minor* prop additions (`whyMatters`, `whatToDo`, `howToKnow`, `effort`) — same visual frame, more fields. **No layout redesign.**

**Design impact = near zero.** We reuse:
- `HotspotCard` for the per-Move cards (add an "effort dots" row — 4 small filled dots, brass-bright, ≤16px tall)
- `ReportCta` unchanged
- The 90-day plan section is replaced by a "Your Moves" section using the same container/typography tokens

**Voice Wrapper rules:**
- Use `LOVABLE_API_KEY` already in env
- System prompt = §7.4 verbatim, stored in `_shared/voice-wrapper-prompt.ts`
- Output JSON validated with zod; on parse failure → render Moves directly (graceful fallback)
- Cache per respondent in `reports.recommendations`. Regen only on retake / admin trigger.

**Acceptance:** A respondent's report shows 3–7 Moves, in your voice, sourced from the seeded Playbook. If the model fails, the same Moves render with the canned intro from §7.6 — user never sees an error.

---

## Phase 4 — Deferred until after credit refresh

These are explicitly **out of scope for the current credit budget**:

- Full admin UX (table, editor, coverage heatmap, stale view, test report) — §8 of brief
- Per-function specificity beyond the 4 priority functions (RevOps, Marketing, Engineering, People)
- Tag autocomplete, markdown preview, audit log
- "If you only do one thing this quarter" forced-rank visual treatment (we'll mark it with a single `is_forced_rank` flag in JSON; visually it's just the first card with an existing eyebrow until we invest in design)
- Async n8n/batch re-run pipeline (§2 "Defer" row)

You author Moves via direct SQL inserts in the meantime. That's the trade we make to protect credits and design.

---

## What this plan deliberately does NOT change

- `Hero.tsx` and any landing-page styling
- `SiteNav`, `SiteFooter`, `PageTransition`, motion utilities
- Tailwind tokens, fonts, colour palette
- Auth, email, benchmarks, scoring math (other than appending the engine call)
- `ReportCta` copy or layout — `ctaForTier` keeps working unchanged

---

## Estimated credit footprint (rough, ordered cheapest → most)

1. Phase 1 schema + seed: **small** (1 migration, 1 seed file)
2. Phase 2 engine + tests: **medium** (pure TS, no UI churn)
3. Phase 3 voice wrapper + report wiring: **medium-large** (1 edge function + targeted edits in 2 components)
4. Phase 4 admin UX: **large** — defer

If credits get tight mid-flight, **stop after Phase 2** and ship Moves rendered directly from the Playbook with no Voice Wrapper. The report is still a meaningful upgrade because the *content* is now yours and editable, even without AI framing.

---

## Open questions for you

1. Confirm: **reuse `outcomes_library`** rather than create `playbook_moves`? (Saves credits + migration risk.)
2. Confirm: **Lovable AI Gateway / Gemini 2.5 Flash** for the Voice Wrapper v1, with Claude Sonnet as a later env-var swap? (Saves the API-key step and is free under the current gateway promo.)
3. Confirm: **defer admin UI** to after credit refresh — you author Moves via SQL for v1?
4. Confirm: **launch with ~60 Moves**, not 192, and grow over time?

Once you answer those four, I can switch to default mode and execute Phases 1 → 3 in order.
