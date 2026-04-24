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

## Phase B — Voice Wrapper edge function ✅ COMPLETE

Built `supabase/functions/recommend-report/index.ts`:

- **Trigger:** Auto-called from `score-responses` after the report row is upserted (best-effort, logged but never fails the parent call). Also callable directly with a user JWT for `/regenerate`.
- **Auth:** dual-mode. Internal calls from `score-responses` send `internal: true` + `internal_secret` (service-role key); external calls require a user JWT and ownership of the respondent.
- **Selection:** loads active Moves filtered to the respondent's lens (and function-or-null for functional lens), feeds into `selectMoves(profile, playbook)` from the shared engine. Persists `move_ids` on `reports`.
- **Voice step:** Lovable AI Gateway, `google/gemini-2.5-flash` by default (overridable via `VOICE_WRAPPER_MODEL` env). Tool-calling JSON schema enforces:
  - `headline_diagnosis` (operating shape, not the score)
  - `personalised_intro` (must reference respondent's pain/role)
  - `moves[]` with `move_id` (allowlist enforced via JSON schema enum), `personalised_why_matters`, optional `personalised_what_to_do_intro`
  - `closing_cta` (tier-aware)
- **System prompt:** voice rules verbatim — British English, no em-dashes, banned-word list, no inventing tools.
- **Hard validation:** server-side allowlist check on every `move_id`; banned-word post-filter strips/softens (em-dash → full stop, "leverage" → "use", etc.). If validation fails or wrapper output is empty → fallback path.
- **Fallback:** generates an on-voice diagnosis + intro + CTA using only respondent context and the selected Moves' canonical copy. Marked `used_fallback: true` in the persisted payload.
- **Cache:** result stored on `reports.recommendations` (jsonb) plus `reports.recommendations_generated_at` and `reports.move_ids`. Re-render is free until rescore or admin regen.
- **Latency budget:** 8s `AbortController` timeout on the AI call. On timeout/error → fallback. Total wrapper p95 well inside the 12s submit→ready budget.
- **Snapshot:** each Move in the persisted payload carries a `snapshot` of its source library row at generation time, so the UI never has to refetch and reports stay stable if the library changes later.

Migration: added `reports.recommendations_generated_at timestamptz` (with index) for cache-age tracking.

Wired into `score-responses` after the report upsert. Old `plan` field stays untouched as backstop.

---

## Phase C — Report UI rewiring

Update `AssessReport.tsx` to render the new `recommendations` payload when present, falling back to legacy `plan` only if absent.

**Changes:**

1. **`PlanTab` becomes `MovesTab`** — renders `recommendations.moves[]` as cards using `recommendations.personalised_intro` as the section lede. Each card shows:
   - Title (from snapshot)
   - "Why this matters for you" (from `personalised_why_matters`)
   - "What to do" (from snapshot `what_to_do`, markdown rendered)
   - "How you'll know it worked" (from snapshot `how_to_know`)
   - Effort dots (1-4)
   - Forced-rank badge for the organisational pinned Move
   - Optional CTA button if `cta_type` is set

2. **`HotspotCard` enriched** — add `why_matters` snippet and effort indicator from the top selected Move on that pillar.

3. **Headline diagnosis** — replace `report.diagnosis` with `recommendations.headline_diagnosis` when present.

4. **Closing CTA** — render `recommendations.closing_cta` above `ReportCta`.

5. **Loading state** — copy on processing screen acknowledges ~5-8s wrapper latency.

6. **Printable one-pager** — same data sources, condensed.

Backwards-compatible: legacy reports without `recommendations` keep rendering the old `plan` view.

---

## Phase D — Admin Playbook editor

Gated `/admin/playbook` route with admin-only RLS:
- All Moves table (sort/filter/search)
- Move editor (single page, all fields, markdown preview, tag autocomplete)
- Coverage heatmap (lens × pillar × tier_band, function selector)
- Stale view (>90d unreviewed)
- Test report (synthetic profile → engine output)

Mutations via authenticated Supabase client; admin RLS on `outcomes_library` for INSERT/UPDATE; soft-delete via `active = false`.

---

## Phase E — Migration & QA

1. Backfill function `regenerate-all-recommendations` (rate-limited).
2. Acceptance criteria: 192+ Moves ✓, synthetic 20-profile engine test, 50-call wrapper test (95%+ valid JSON), fallback verified, cap-flag handling, effort balance, coverage map clean, p95 < 12s.
3. `/admin/changelog` page.
