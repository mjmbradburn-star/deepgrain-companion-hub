
## AIOI v1.1 implementation queue

I’ll treat `AIOI_Lovable_Execution_Brief_v1_1.md` as the canonical source of truth and work through the changes in dependency order: data model first, content next, flow/scoring next, then benchmark/report polish and validation.

---

## Queue 1 — Instrument model foundation

**Goal:** make the app capable of representing v1.1 questions properly before changing the user flow.

**Changes**
- Add question metadata fields:
  - `detail jsonb` with `{ rationale, trap, crosscheck }`
  - `version text`
  - `status text` / active-state equivalent for `active | archived`
- Add scoring/audit fields needed by the brief:
  - cap flags / benchmark exclusion marker
  - old-vs-new score audit field for rescoring
- Preserve existing answers by archiving questions rather than deleting them.
- Keep tier numbering as `0–5`.

**Why first:** every later queue depends on questions being versioned, explainable, and archivable.

---

## Queue 2 — Create a canonical question catalogue in code

**Goal:** stop scattering question logic across Quickscan, Deep Dive, database seed data, and scoring functions.

**Changes**
- Extend `src/lib/assessment.ts` question types to support:
  - `detail`
  - `version`
  - `status`
  - `flow` / whether a question belongs to Quickscan, Deep Dive, or both-derived scoring
- Add all v1.1 detail metadata from sections 5.3–5.8.
- Add all 9 new questions from section 3.
- Mark the duplicate Deep Dive questions as archived in the catalogue.
- Keep canonical pillar labels unchanged.

**Result:** one reliable source for rendering, seeding, scoring, and methodology export.

---

## Queue 3 — Database migration and question seed update

**Goal:** bring the backend question store into line with the v1.1 catalogue.

**Changes**
- Add the metadata fields from Queue 1 to the `questions` table.
- Upsert existing questions with:
  - `version = 'v1.0'`
  - populated `detail`
  - active/archived status per the brief
- Insert the 9 new questions with:
  - `version = 'v1.1'`
  - `status = 'active'`
  - options for tiers 0–5
  - detail metadata
- Archive duplicate Deep Dive questions rather than deleting them.
- Update public question policies so only active questions appear in live flows, while historical answers remain valid for scoring.

---

## Queue 4 — Fix Quickscan / Deep Dive duplication

**Goal:** remove the amateur-feeling repeat questions while preserving scoring integrity.

**Changes**
- Company Quickscan becomes 9 questions:
  - existing 8
  - new `qs-c-p3-agents`
- Deep Dive starts at the first unique question.
- Retire duplicate Deep Dive questions:
  - `c-p1-mandate`
  - `c-p2-data`
  - `c-p3-tools`
  - `c-p4-workflow`
  - `c-p5-skills`
  - `c-p6-governance`
  - `c-p7-roi`
  - `c-p8-culture`
- Apply the same duplicate-removal rule to Function and Individual flows where Quickscan and Deep Dive currently repeat the same question.
- Ensure Quickscan answers carry forward into the full Deep Dive score.

**UX updates**
- Update the Deep Dive CTA copy to:

```text
Unlock your full report — ten more questions, three more minutes. You'll see your function-level heatmap, a 90-day roadmap, and a board-ready one-pager.
```

- Update progress display so Deep Dive shows total completion across Quickscan + Deep Dive, not “0% from scratch”.

---

## Queue 5 — Scoring engine v1.1

**Goal:** make the score credible enough to pass the CTO/CPO sniff test.

**Changes**
- Refactor shared scoring helpers used by:
  - `submit-quickscan`
  - `score-responses`
  - `rescore-respondent`
- Add a post-score cap pass implementing section 6:
  - tooling capped by data
  - workflow capped by tooling
  - workflow capped by skills
  - measurement capped by workflow
  - governance capped by operating reality
  - culture capped by skills
- Add within-question caps for the new Company questions:
  - agents vs tooling
  - observability vs orchestration
  - tool connection vs agents
  - corpus vs data foundations
  - memory vs agents
  - prompts vs skills
  - evals vs observability
- Store cap flags with the report/respondent.
- Exclude benchmark contribution when 3+ caps fire.
- Preserve the respondent-facing score/report even when benchmark-excluded.

**Report behaviour**
- If any cap fires, show one calm methodology note:

```text
Your score has been adjusted based on cross-pillar consistency checks. High tiers in one pillar require matching capabilities in another. See Methodology for details.
```

---

## Queue 6 — Size band migration and qualifier update

**Goal:** update benchmarking segmentation to the v1.1 seven-band model.

**Changes**
- Replace current size options with:

```text
Early-stage (1–50 people)
Early scale-up (51–100 people)
Mid scale-up (101–200 people)
Late scale-up (201–500 people)
Growth (501–1,000 people)
Upper-mid-market (1,001–2,000 people)
Enterprise (2,001+ people)
```

- Store internal codes:
  - `S`
  - `M1`
  - `M2`
  - `M3`
  - `L1`
  - `L2`
  - `XL`
- Migrate existing respondent size bands by midpoint:
  - `1-50` → `S`
  - `51-200` → `M2`
  - `201-600` → `M3`
  - `601-2000` → `L2`
  - `2000+` → `XL`
- Mark migrated records with a `legacy_band` flag.

---

## Queue 7 — Benchmark logic update

**Goal:** make peer comparisons more statistically honest.

**Changes**
- Update benchmark recomputation to ignore benchmark-excluded responses.
- Add size-band-aware matching.
- Add fallback behaviour:
  - if respondent’s exact band has `N < 20`, show the next-widest combined band
  - if total matching benchmark base has `N < 50`, hide peer benchmark and show:

```text
Benchmark unlocks at 50 responses in your size band. Currently at N=[count]. Check back soon.
```

- Update `fetchBestSlice` / benchmark cards to explain which cohort was matched.

---

## Queue 8 — Report and methodology surfaces

**Goal:** expose the new rigor without overwhelming respondents.

**Changes**
- Add “Why this question?” affordance where appropriate:
  - respondent sees rationale only
  - trap and cross-check stay internal/methodology-facing
- Add a Methodology / Changelog surface to the report or existing content pages.
- Publish v1.1 changelog:

```text
v1.1 — April 2026
- Added 9 questions covering agents, data corpus and memory, prompting and skills library.
- Retired duplicate Deep Dive questions.
- Populated Detail column on all live questions.
- Implemented cross-pillar consistency caps.
- Migrated size bands from 5-band to 7-band.
- Deep Dive flow no longer duplicates Quickscan answers; Quickscan responses carry forward.
```

---

## Queue 9 — Historic rescoring

**Goal:** make old reports and benchmarks consistent with v1.1.

**Changes**
- Add a safe rescoring function/job that:
  - loads existing responses
  - computes old score snapshot
  - computes v1.1 score with cap logic
  - stores the audit trail
  - updates reports
- Recompute benchmark aggregates after rescoring.
- Keep archived question answers attached to existing respondents.

---

## Queue 10 — Tests and acceptance pass

**Goal:** ship safely and prove the instrument behaves as specified.

**Automated checks**
- Question catalogue tests:
  - all active questions have six options
  - all active questions have `detail.rationale`, `detail.trap`, `detail.crosscheck`
  - all new questions are `v1.1`
  - archived duplicate questions do not appear in live Deep Dive
- Flow tests:
  - Company Quickscan has 9 questions
  - Deep Dive starts at first unique question
  - progress reflects Quickscan + Deep Dive completion
- Scoring tests from the brief:
  - Tooling Tier 5 + Data Tier 0 caps Tooling at 1
  - Governance Tier 5 + all other pillars Tier 1 caps Governance at 1
  - consistent high scores trigger no caps
  - 3+ caps excludes the response from benchmarks
- Benchmark tests:
  - exact band if `N >= 20`
  - combined band if exact band under threshold
  - methodology note if total benchmark base under 50

---

## Build order summary

```text
1. Schema + metadata fields
2. Canonical v1.1 question catalogue
3. Question seed migration
4. Quickscan / Deep Dive deduplication
5. Scoring caps + benchmark exclusion
6. Size bands + qualifier update
7. Benchmark fallback logic
8. Report methodology + changelog
9. Historic rescoring
10. Tests and acceptance pass
```

