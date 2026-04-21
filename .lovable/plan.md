

# Take it back to basics: 3-minute Quickscan + optional deep dive

The current flow asks 9–16 maturity questions plus a qualifier and an email gate **before** anyone sees a result. We're cutting that to **8 questions, no email, score on screen in ~3 minutes**, with the existing long-form assessment surviving as an opt-in "Go deeper" upgrade.

## The new shape

```text
/                  Hero CTA: "3-minute AI maturity scan"
   │
/assess            Level picker (Company / Function / Individual) — unchanged
   │
/assess/scan       NEW · 8 questions, one per pillar, full-screen single-Q
   │               · auto-advance, ←/→ + 1–6 keys, no qualifier, no email
   │               · region + function picked inline on Q1 (single combined card)
   │
/assess/r/:slug    Score + tier + radar + top 2 hotspots — visible immediately
                   ┌─ "Email me the PDF"     (gate the export, not the result)
                   ├─ "Go deeper (+8 Qs)"    → /assess/deep/:slug
                   └─ "Share / benchmark me" (anonymous opt-in)
   │
/assess/deep/:slug NEW · the remaining questions for the chosen level
                   · resumes the same respondent record, re-scores on submit
                   · unlocks the full plan (3-month rollout) on the report
```

## What changes, file by file

### 1. New question set: `src/lib/quickscan.ts`
Hand-picked **one question per pillar (8 total)** per level — the highest-signal prompt from the existing bank. Reuses the same 6-tier option scale so scoring + benchmarks keep working untouched. Question IDs prefixed `qs-` so they don't collide with the deep set.

```text
P1 Strategy   → "Who actually owns AI here?"
P2 Data       → "If a tool tried to read your data tomorrow…"
P3 Tooling    → "What AI tooling is actually in use?"
P4 Workflow   → "Where does AI sit in the day-to-day?"
P5 Skills     → "How fluent is the average person?"
P6 Governance → "What governance is in place?"
P7 ROI        → "Can you point to value AI has produced?"
P8 Culture    → "How do colleagues talk about using AI?"
```
Function variants stay where they exist (P4 + P7) and apply when the user picks a function on Q1.

### 2. New page: `src/pages/AssessScan.tsx`
Single component, no qualifier, no email. Combines the existing `OptionCard` + `ProgressBar` + auto-advance behaviour from `AssessQuestion.tsx`. Q1 has a small inline header letting the user pick **function** + **region** (skippable — dropdowns, ~5 seconds). Answers go to localStorage; on Q8 → POST a new edge function `submit-quickscan`.

### 3. New edge function: `supabase/functions/submit-quickscan/index.ts`
Anonymous insert path. Creates a `respondents` row with `user_id = NULL`, inserts the 8 `responses`, runs the existing scoring helpers from `score-responses/scoring.ts`, writes a `reports` row, returns `{ slug }`. **Schema change required:** `respondents.user_id` becomes nullable + a new RLS policy "anyone can read by slug" so the report page works without auth (slug is unguessable). Authenticated upgrade path keeps the current strict policies.

### 4. Refactored report: `src/pages/AssessReport.tsx`
- Loads by slug via a new public RPC `get_report_by_slug(slug)` (security definer, returns score / tier / pillar_tiers / hotspots only — no PII).
- Renders the **Lite report** by default: score, tier band, radar, top 2 hotspots, one "next move" pulled from `outcomes_library`.
- Three CTAs in the header: **Email me the PDF** (opens an inline form, triggers the magic link only when they ask), **Go deeper (+8 Qs)** (routes to `/assess/deep/:slug`), **Share** (copy link).
- A locked "Full 3-month plan" card with a blur + "Answer 8 more to unlock" — converts the depth choice into a visible payoff.

### 5. New page: `src/pages/AssessDeep.tsx`
Reuses the existing `AssessQuestion` shell. Loads the respondent by slug, fetches the remaining (non-quickscan) questions for the level, streams answers to `responses`, and on completion calls a new `rescore-respondent` edge function that re-runs the scoring engine and updates the same `reports` row. Report page detects the depth and switches the locked card to the full plan.

### 6. Routing + landing
- `src/App.tsx`: add `/assess/scan`, `/assess/deep/:slug`; keep the legacy `/assess/q/:step` + `/assess/start` routes alive but unlinked (existing draft-resume traffic + saved links keep working).
- `src/pages/Index.tsx` + `src/pages/Assess.tsx`: change CTA copy from "~7–12 min" to "**3-minute scan**", point to `/assess/scan`.

### 7. Telemetry
Log `events` rows on: `quickscan_started`, `quickscan_completed`, `report_viewed`, `email_requested`, `deepdive_started`, `deepdive_completed`. Lets us see actual completion rates and tune from data, not opinion.

## Database migration

```sql
-- 1. Allow anonymous respondents
ALTER TABLE respondents ALTER COLUMN user_id DROP NOT NULL;

-- 2. Public read by slug (reports + respondents + responses)
CREATE POLICY "Public read by slug" ON respondents
  FOR SELECT USING (true);  -- slug is the secret; row exposes no email
-- mirror policy on reports + responses, gated through a security-definer RPC
-- so we never expose user_id / consent_marketing on the public path.

-- 3. RPC the report page calls
CREATE FUNCTION get_report_by_slug(_slug text) RETURNS jsonb
  LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', r.slug, 'level', r.level, 'function', r.function, 'region', r.region,
    'score', rep.aioi_score, 'tier', rep.overall_tier,
    'pillar_tiers', rep.pillar_tiers, 'hotspots', rep.hotspots,
    'has_deepdive', (SELECT COUNT(*) FROM responses WHERE respondent_id = r.id) > 8
  ) FROM respondents r JOIN reports rep ON rep.respondent_id = r.id
    WHERE r.slug = _slug;
$$;
```

## What we keep

- Same scoring engine (`score-responses/scoring.ts`) — pillar means → weighted 0–100 → tier band. Eight answers feed the same maths.
- Same `benchmarks_materialised` cohort lookup — the slice card still works because we still capture function + region.
- The deep-dive content. Nothing is deleted; the long form survives as the upgrade path.
- The magic-link + auth flow — only the *trigger* moves from "before scan" to "when you click Email me the PDF".

## What we cut (for now)

- Pre-question qualifier screen (`AssessStart.tsx`) — replaced by a 5-second inline picker on Q1 of the scan.
- Email gate before scoring.
- Long processing screen / build log — sub-second response on the new endpoint.
- "Resend magic link" + processing-page session juggling on the default path.

## Sequenced rollout (single PR is fine, but logically)

1. Migration + new RPC + `submit-quickscan` edge function.
2. `quickscan.ts` content + `AssessScan.tsx` page + route.
3. Report-by-slug refactor + lite/locked layout + email-on-demand form.
4. Deep-dive page + `rescore-respondent` function + unlock state.
5. Landing + level-picker copy + telemetry events.

