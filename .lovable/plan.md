

## Content & tone audit — pre-launch sweep

I've read every user-facing string across the marketing pages (Hero, PillarsGrid, MaturityLadder, ThreeLevels, BenchmarkCounter, WhyDeepgrain, SiteNav, SiteFooter), the long-form pages (Pillars, Ladder, Benchmarks), the assessment flow (Assess, AssessStart, AssessQuestion, AssessProcessing, AssessScan, AssessReport), the question library (`assessment.ts`, `quickscan.ts`), and supporting components (DeepDiveUnlock, BenchmarkSliceCard, AssessChrome).

### Verdict on tone

The voice is already consistent and on-brand: dry, declarative, British-spelling, lower-case-where-it-can-be, allergic to corporate-deck language ("It hasn't really come up", "An informal 'don't paste customer data' rule and crossed fingers", "Pilots that never become how the work actually gets done"). No rewrites needed for tone — only **a handful of small consistency nits** plus the em-dash sweep.

### 1. Em-dash removal (the main job)

**~30 user-facing em-dashes to remove.** They split into two categories:

**A. Prose em-dashes → replace with the right punctuation** (period, comma, colon, or "and"/"so", chosen per sentence to preserve cadence).

| File | Line | Current → Proposed |
|---|---|---|
| `Hero.tsx` | (no prose em-dashes — only in JSX comments, which I'll leave) | — |
| `PillarsGrid.tsx` | clean | — |
| `MaturityLadder.tsx` | clean | — |
| `ThreeLevels.tsx` | 7 | "across every function — and where to" → "across every function, and where to" |
| `ThreeLevels.tsx` | 14 | "function leads — product, marketing, ops, finance, legal" → "function leads: product, marketing, ops, finance, legal" |
| `BenchmarkCounter.tsx` | 31 | "— most companies are Reactive." → "Most companies are Reactive." |
| `WhyDeepgrain.tsx` | 16 | "how the work actually gets done — function by function" → "how the work actually gets done. Function by function" |
| `DeepDiveUnlock.tsx` | 36 | "eight pillars — not just the top three hotspots" → "eight pillars, not just the top three hotspots" |
| `DeepDiveUnlock.tsx` | 91 | "Eight more — one per pillar — sharpens" → "Eight more, one per pillar, sharpens" |
| `BenchmarkSliceCard.tsx` | 106 | "No matching cohort yet — your slice publishes" → "No matching cohort yet. Your slice publishes" |
| `BenchmarkSliceCard.tsx` | 233, 258 | "Tightest match — both fields shared" → "Tightest match. Both fields shared" |
| `assessment.ts` | 413 | "AI is the operating model — strategy and AI are inseparable." → "AI is the operating model. Strategy and AI are inseparable." |
| `assessment.ts` | 489 | "No — org chart and processes unchanged." → "No. Org chart and processes unchanged." |
| `assessment.ts` | 507 | "Builds reusable assets — prompts, templates, mini-tools." → "Builds reusable assets: prompts, templates, mini-tools." |
| `Assess.tsx` | 28 | "Step 01 — Choose your level · 3-minute scan" → "Step 01 · Choose your level · 3-minute scan" (use the existing middot separator) |
| `Assess.tsx` | 34 | "one per pillar — score on screen" → "one per pillar. Score on screen" |
| `AssessProcessing.tsx` | 206 | "Click the link to sign in — your answers are saved" → "Click the link to sign in. Your answers are saved" |
| `AssessReport.tsx` | 409 | "Try refreshing — the engine may still be drafting it." → "Try refreshing. The engine may still be drafting it." |
| `AssessReport.tsx` | 430 | "interventions to ship — sequenced so" → "interventions to ship, sequenced so" |
| `AssessReport.tsx` | 431 | "need the deep dive — eight more questions tighten" → "need the deep dive. Eight more questions tighten" |
| `AssessReport.tsx` | 801 | "in the next phase — for now your colleagues" → "in the next phase. For now your colleagues" |
| `AssessReport.tsx` | 1001 | "PDF ready — direct link below" → "PDF ready · direct link below" |
| `AssessStart.tsx` | 192 | "regional benchmark — adoption looks very different" → "regional benchmark. Adoption looks very different" |
| `AssessStart.tsx` | 332 | "while you answer — your results page" → "while you answer. Your results page" |
| `AssessStart.tsx` | 363 | "Deepgrain's occasional notes — no more than once a fortnight" → "Deepgrain's occasional notes. No more than once a fortnight" |
| `AssessScan.tsx` | 63, 73, 86, 96, 110, 119 | six error-hint em-dashes → replace with periods/commas (e.g. "Review your answers below. One of them may be incomplete.") |
| `Benchmarks.tsx` | 492 | "Volume I — Benchmarks" → "Volume I · Benchmarks" (matches the masthead's middot style) |
| `Benchmarks.tsx` | 498 | "sector, and region — then compare" → "sector, and region. Then compare" |
| `Benchmarks.tsx` | 569 | "Sales runs hotter than Legal — always has." → "Sales runs hotter than Legal. Always has." |

**B. UI placeholder em-dashes — keep as-is.** The single `"—"` glyph used as a "no data" symbol in tables, score cells, and the gap-formatter (`Benchmarks.tsx` lines 606, 859; `BenchmarkSliceCard.tsx` 168; `benchmark-slice-format.ts`; `AssessReport.tsx` 550) is a typographic convention, not prose. Removing it would mean inventing a substitute ("n/a", blank cell) that reads worse. **Recommendation: leave these.** Flag if you'd rather swap to "n/a" or blank.

**C. Code-comment em-dashes — leave.** Roughly 25 hits inside `//` comments and JSDoc. Not user-facing. No change.

### 2. Small consistency nits (suggested, not required)

1. **`Ladder.tsx` line 134** has a clunky double comparative: *"is usually the more interesting number than the average."* → *"is usually a more interesting number than the average."*
2. **`Ladder.tsx` line 201**: *"Tier {t.index} of 5"* — but there are six tiers (0–5). → *"Tier {t.index} of 5"* is technically correct (zero-indexed of five) but reads wrong. Suggest *"Rung {t.index + 1} of 6"* to match the "Six rungs" headline above it.
3. **`Pillars.tsx` line 153** uses curly quotes inside JS string: *`doesn't ask whether you "use AI"`* — straight quotes, fine, but inconsistent with the curly-quote ‑styled `"…"` used in Pillars line 233 and Ladder lines 31, 47, 77, 95. Pick one. Recommend straight quotes everywhere (renders fine in Inter/Cormorant and avoids encoding surprises).
4. **`Pillars.tsx` line 272** says *"Twelve questions"* on the Pillars CTA, but the Hero and Assess pages now consistently say *"Eight questions, one per pillar"* for the scan. Either update the CTA to *"Eight questions"* or clarify *"Eight to scan, twelve to deep-dive"*.
5. **`SiteFooter.tsx` line 16** links to `/manifesto` — confirm that route exists; I didn't see it in the page list. If not, remove the link.

### 3. What I'm NOT changing

- Headlines (`Measure your AI debt.`, `Six rungs. Climb the one in front of you.`, etc.) — on tone, no em-dashes.
- The 8 pillar blurbs and 6 tier descriptions — they're the strongest copy on the site.
- Question text in the assessment (already em-dash-free in the prompts themselves).
- Email templates under `supabase/functions/_shared/email-templates/` — these are outside the in-app site review. Flag if you want them included.

### Process

1. Apply em-dash sweep across the ~30 prose locations (single coordinated edit per file).
2. Apply the four nits above (assuming you agree).
3. After edits: load Hero, Pillars, Ladder, Benchmarks, Assess flow, and Report at desktop + mobile widths and visually verify no awkward sentence breaks resulted from punctuation swaps.
4. Report back with a diff summary and any spots where a period felt too abrupt and a comma read better.

### Decisions I need from you before I push

1. **UI placeholder `"—"` glyphs** — leave as-is, or swap to "n/a" / blank?
2. **Curly vs straight quotes** — straighten everything?
3. **Pillars CTA** — *"Eight questions"* or *"Eight to scan, twelve to deep-dive"*?
4. **Email templates** — in scope for this sweep?

