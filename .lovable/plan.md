
A four-phase rework. Each phase is a separate build pass so we can land it cleanly and you can react between passes.

## Phase 1 — Palette inversion (cream + green, brass as accent)

**New design tokens (`src/index.css`, `tailwind.config.ts`):**
- `--background` flips to cream (`#F5EFE0`-ish, slightly warmer than today's cream).
- `--foreground` becomes phthalo green (`#0F2A1D`).
- `--primary` becomes deep green; brass is demoted to a single `--accent` used sparingly (numerals, hover states, focus rings, the score badge).
- New surfaces: `--surface-0` (paper white), `--surface-1` (warm off-white), `--surface-2` (sage tint) — replaces the brown surface stack.
- Borders go from `cream/12` to `green/12`. Text muted goes to `green/60`.
- Pillar accent palette retuned to harmonise with green: moss, sage, olive, ochre, terracotta, brass, clay, slate.

**Component sweep:**
- Replace every `bg-walnut`, `bg-surface-N`, `text-cream`, `text-brass-bright` reference across `src/pages/*` and `src/components/aioi/*`. There are about 14 files; mechanical pass.
- Hero photography: swap the dark forest treatment for a light editorial one (or remove the background image; let typography carry it).
- Buttons: primary becomes deep green on cream with cream text; brass reserved for the single CTA per page.
- Radar chart, sparkline, progress bar: re-colour against the new tokens.

Net effect: the site reads like a research journal — cream paper, green ink, occasional gold. No brown anywhere.

## Phase 2 — Pillar and ladder copy rewrite (less gravitas, more recognition)

Same eight axes, same six tiers — but the language drops a register. Goal: the reader thinks "yes, that's us" not "I should be ashamed".

**Pillar copy changes (`src/components/aioi/PillarsGrid.tsx`, `src/pages/Pillars.tsx`):**
- Shorter one-liners (≤10 words), written as observations not verdicts.
- "Question we ask" rewritten as something a peer would ask over coffee, not a board interrogation.
- "Common failure" softened to "what usually gets in the way" — describes the situation, not the people.
- "From / To" bookends kept; they're useful and concrete.

**Ladder copy changes (`src/pages/Ladder.tsx`, `src/components/aioi/MaturityLadder.tsx`):**
- Tier names unchanged (Dormant → AI-Native).
- Each tier gets a plain-English "you're probably here if…" list instead of the current "what it feels like / what you'd see" split. One list, three bullets, written warmly.
- "The trap at this tier" reframed as "the next thing to watch for".
- "To climb a rung" stays — that's the actionable bit, kept punchy.

No em dashes anywhere. No "harness", "unlock", "leverage", "transform", "journey". British English, plain sentences.

## Phase 3 — Assessment shortened to 12 questions, with functional flavour

**Question set redesign:**
- Drop from 17 to 16 → then to 12: two questions per pillar for the four most decisive pillars (Strategy, Data, Workflow, Skills), one each for the remaining four (Tooling, Governance, Measurement, Culture). Lands at 12.
- Rewrite every prompt and every option in the lighter register from Phase 2. Options stay 4–6 per question; option copy becomes situational ("we have a written policy nobody reads") rather than judgemental.

**Function picker added to qualifier (`src/pages/AssessStart.tsx`):**
- New screen between role and email: "Which function are you scoring?" — six cards: Sales, Marketing, Engineering/Product, People/HR, Finance, Operations/CS.
- Stored on `respondents` as a new `function` text column (migration). Used to slice benchmarks and to colour the report header.
- Two of the 12 questions have function-specific phrasing variants (Workflow and Measurement), pulled from a small lookup keyed on `function` — same `question_id`, alternative `prompt` and `options`. Cleanest implementation: a `question_variants` table with `(question_id, function, prompt, options jsonb)`, falling back to the base row if no variant exists.

**Database migration:**
- Add `respondents.function text` (nullable initially, backfilled to `null`).
- Create `question_variants` table with RLS read-public.
- Deactivate the old 17 questions, insert the new 12, insert function-specific variants for the two flagged questions.
- Update `getQuestions()` in `src/lib/assessment.ts` to honour the function variant when present.

**Scoring (`supabase/functions/score-responses/scoring.ts`):**
- Pillar weights tweaked to reflect the new question count per pillar (already weighted, just rebalance).
- No change to the AIOI 0–100 output.

Result: 7 minutes to complete, the questions feel like they were written for the function the respondent picked, and the benchmark page can finally answer "how does Sales compare to Engineering".

## Phase 4 — Benchmarks made legible + functional slices

**`src/pages/Benchmarks.tsx` rebuild:**
- Three filter rows become four: **Level**, **Function** (the new one — six chips), **Org size**, **Sector**. Function chip is the headline.
- Replace the central "median AIOI score" + sparkline-row layout with a simpler two-up:
  - Left: big number (median AIOI), one-line interpretation ("typical Sales team at a 251–1k company").
  - Right: an 8-spoke radar against the cohort median — same visual language as the report. Reuse `RadarChart`.
- Pillar breakdown table: drop the wavy sparklines (they suggested distribution but didn't carry one). Replace with a flat 0–5 horizontal bar plus a small percentile delta vs the all-respondents median ("+0.4 vs all"). Easier to read in one glance.
- "Synthetic data" badge stays until a cohort crosses 25 real respondents (already wired via the nightly recompute). Add a one-line caveat in plain English: "Numbers settle as more respondents in this cohort opt in."
- Add a "Compare functions" toggle on cream pages: shows six small radar thumbnails side-by-side at a glance — the screenshot-worthy view that drives shares.

**Recompute job (`recompute_benchmarks` SQL function):**
- Add `function` to the `GROUPING SETS` so cohorts can be sliced by function from the materialised table.

## Phase 5 — Sales pull-through (the deepgrain.ai connection)

Small additions woven through, not a separate page:
- Bottom of every report tab: a single line — "If your weakest pillar is Workflow Integration, this is where Deepgrain works with you." — links straight to a contact form. Pillar-specific copy, not a generic "book a call" button.
- New `/manifesto` (already in plan.md but unbuilt) reframed as a short editorial: who Matthew is, why this exists, what working with Deepgrain looks like. One CTA at the end.
- Hero on `/` gets a second sub-line under the headline: "A research project, run by the people who help you fix it." This signals the dual purpose without selling.

## Sequencing

1. **Phase 1 (palette).** Visible immediately, low risk, no DB.
2. **Phase 2 (copy).** Pure content edits.
3. **Phase 3 (assessment).** Migration + frontend + scoring tweak. The biggest pass.
4. **Phase 4 (benchmarks).** Builds on Phase 3's `function` column.
5. **Phase 5 (sales pull-through).** Last, because it depends on the new tone and the new report layout.

I'll come back to you after each phase before starting the next. Phase 1 first?
