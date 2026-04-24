# Phase 3 completion — build queue

Parts 1 (architecture review) and 2 (redundancy + indexing fixes) are already shipped. This plan executes **Part 3**: closing the remaining Phase-3 gaps so the live report fully matches the v1 Recommendations Architecture and we have the ops levers needed for launch.

---

## Build queue (in execution order)

### Step 1 — Coverage diagnostic (no code, just data)
Run the Move-coverage queries against `outcomes_library` and surface:
- Active total + breakdown by `lens` (individual / functional / organisational)
- Coverage matrix: pillar × tier_band × lens — flag empty cells
- Function coverage for functional Moves
- Stale Moves (`last_reviewed_at` > 90 days or null)

**Output**: a short report you can act on. No DB writes. Determines whether you need a content sprint before backfill.

### Step 2 — Engine guardrail (G7, new)
Add a hard guard in `recommend-report`: if the engine returns 0 Moves for any lens that should have output, log a `recommendations.empty_result` event with respondent_id + lens + hotspots so we can detect coverage gaps in production rather than discovering them via user complaints.

**Files**: `supabase/functions/recommend-report/index.ts` (~10 lines).

### Step 3 — Per-report regenerate button (G4 closure)
Surface the existing regenerate capability on the admin report view so you can re-run a single respondent's recommendations after editing a Move, without forcing them to retake.

- Add a "Regenerate recommendations" button on the admin per-report page (or on `/assess/r/:slug` when viewed as admin).
- Wire it to call `recommend-report` with a `force: true` flag that bypasses the `recommendations` cache.
- Show toast on success; refresh the report.

**Files**: `supabase/functions/recommend-report/index.ts` (accept `force` param), one admin React component, the report page.

### Step 4 — Latency SLO instrumentation (G5 closure)
Add a single `report.latency_ms` event fired from `AssessProcessing.tsx` at the moment the report becomes ready. Captures p95 submit→report so we can track against the §13 12s target without any dashboard work.

**Files**: `src/pages/AssessProcessing.tsx` (~10 lines), uses existing `events` table.

### Step 5 — Quality column on admin Moves list
Small UX win for content work: surface `last_reviewed_at` age + Move usage count (how many reports cite this `move_id`) as a sortable column in `/admin/playbook`. Lets you see at a glance which Moves are stale-and-popular (highest fix priority) vs stale-and-unused (deletion candidates).

**Files**: one admin component + one read query.

### Step 6 — Idempotent bulk regenerate (admin-only)
Add an admin-gated edge function `regenerate-all-recommendations` that:
- Iterates respondents with reports
- Calls the engine + voice wrapper for each
- Skips any that already have a `recommendations_generated_at` newer than a `since` timestamp param
- Rate-limited to ~1 req/sec to stay inside Lovable AI quotas
- Logs progress to `events` table

**This is the lever for migrating existing respondents to the new engine output (spec §11 requirement).** You press a button when ready; confirmation dialog shows count + estimated cost first.

**Files**: new `supabase/functions/regenerate-all-recommendations/index.ts`, new admin button on `/admin/playbook`.

### Step 7 — §13 acceptance checklist verification
Once Steps 1–6 ship and at least Step 1 confirms enough Move coverage, walk the §13 checklist:
- Engine deterministic (existing test) ✓
- Fallback works (existing test) ✓
- JSON validation (existing test) ✓
- Tagged-prereq prioritisation (existing test) ✓
- Functional fallback to base Moves (added in Part 2) ✓
- Forced-rank from top-4 (added in Part 2) ✓
- p95 < 12s (Step 4 will measure)
- Empty-result detection (Step 2)

Output: a single tick-list comment on `.lovable/plan.md` so you have a written record.

---

## Order of operations

1. Step 1 (data) — runs first because it informs whether to defer Step 6.
2. Steps 2, 3, 4, 5 (code) — independent, ship in one batch.
3. Step 6 (code) — ships in same batch but stays behind admin button. Not run until you press it.
4. Step 7 (verification) — after Step 4 has captured a day or two of latency events.

## What this does NOT include

- Renaming `outcomes_library` (cosmetic, deferred per Part 1).
- Auto-invalidation of cached recommendations on Move edit (Step 3 + retake covers it).
- Splitting `AssessReport.tsx` (deferred per Part 2).
- Writing new Moves content — that's your job once Step 1 shows the gaps.

## Estimated effort
~half a day of implementation. Backfill cost (Step 6) depends on respondent count; Step 1 will tell us.

**Approve and I'll start with Step 1 (coverage queries) immediately, then ship Steps 2–6 as one code batch.**