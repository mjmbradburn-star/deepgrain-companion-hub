
## AIOI — AI Operating Index
*A diagnostic product at aioi.deepgrain.ai, built in the Deepgrain visual language: phthalo green, dark walnut, aged brass, Cormorant Garamond. One question at a time. Culminates in a Claude-generated tailored report.*

---

### Design foundation (shared with Deepgrain, adapted for product UI)

- **Colour tokens**: `--color-green #123524`, `--color-walnut #1C0F0A`, `--color-brass #A07840`, `--color-cream #F2EBD9`, plus surface layers (`--surface-0/1/2/3`) for product chrome.
- **Pillar accents**: 8 warm, brass-harmonised hues (sage, sand, moss, terracotta, amber, brass, muted red, slate).
- **Typography**: Cormorant Garamond (300/400/500/600 + italics) for display + body editorial; system sans for eyebrows, body UI, badges; JetBrains Mono only for the processing log.
- **Spacing**: 4pt grid. Radii 4 / 8 / 999. 1px cream-20% borders, brass focus rings.
- **Motion**: 200ms micro, 300ms page transitions (fade + 12px slide), spring progress bar. No scroll-jacking, no parallax.

### Information architecture

Routes: `/` · `/assess` · `/assess/start` · `/assess/q/[step]` · `/assess/processing` · `/assess/r/[slug]` (Overview / Plan / Report / Invite tabs) · `/benchmarks` · `/pillars` · `/ladder` · `/manifesto`.

### Phased build

**Phase 1 — Brand foundation & landing**
- Install Cormorant + JetBrains Mono, replace design tokens in `index.css` and `tailwind.config.ts`, add forest hero photography.
- Top nav: `AIOI` left, `deepgrain.ai ↗` right.
- Landing `/` with all sections: hero ("MEASURE YOUR AI DEBT."), 8 Pillars grid, Maturity Ladder (6 tiers, expandable), Three Levels cards, live benchmark counter, "Why Deepgrain" band.
- Build primitive components: `PillarChip`, `TierBadge`, `OptionCard`, `ProgressBar`, `ScoreBadge`, `HotspotCard`.

**Phase 2 — Diagnostic flow**
- `/assess` level picker (Company / Function / Individual cards, brass-border hover).
- `/assess/start` 3-screen qualifier (role, size, pain) + email capture screen with two consent checkboxes.
- `/assess/q/[step]` one-question-per-screen experience: pillar chip, 48px Cormorant question, large option cards, multicolour progress bar that accumulates pillar-coloured segments. Keyboard 1–6 / Enter / arrows. 300ms slide transitions.
- `/assess/processing` typewriter log of work being done (no spinner) while the report is built.

**Phase 3 — Results**
- `/assess/r/[slug]` results dashboard with top band (96px brass score, tier label, italic diagnosis, 8-axis radar chart) and tab navigation.
- **Overview tab**: pillar stack, top 3 hotspot cards, benchmark band, expandable pillar accordions.
- **Plan tab**: Month 1 / 2 / 3 sections, intervention cards with effort/impact/time-to-value badges, slide-in detail drawer.
- **Report tab**: print-styled A4 one-pager (the viral artefact — works in CMD-P).
- **Invite tab**: send personalised invites to function leads, live counter of completions.

**Phase 4 — Supporting pages**
- `/benchmarks` live data with 3 filter pills (level / size / sector) and pillar breakdown rows.
- `/pillars` and `/ladder` deep-dive pages.
- `/manifesto` long-form editorial in 22px Cormorant body.

### Backend (Lovable Cloud, end-to-end)

- **Auth**: Magic link via Lovable Cloud, tied to respondent slug.
- **Database** (Cloud-managed Postgres): `respondents`, `responses`, `reports`, `questions`, `question_options`, `outcomes_library`, `benchmarks_materialised`, `events`. RLS so respondents can only read their own rows via signed token.
- **Scoring + report pipeline** runs in edge functions instead of n8n:
  1. `score-responses` — compute pillar tiers + AIOI score + hotspots when final answer submitted.
  2. `generate-report` — assemble Claude payload (no PII), call Claude Sonnet via Lovable AI Gateway with structured JSON schema, validate, write `reports` row.
  3. `render-report-pdf` — render the print one-pager to PDF, store in Cloud Storage.
  4. `send-report-email` — branded magic-link email with report URL + PDF attachment via Lovable's transactional email system.
- Frontend polls `reports` table on `/assess/processing` until `generated_at` is set, then redirects.

### Content & seed data

- Seed an initial question set (one level — Function — with ~18 questions, 6 tiered options each) plus a starter `outcomes_library` so the report engine has interventions to choose from. Other levels can be added by writing rows.
- All copy in Matthew's voice — direct, British English, no "harness / unlock / leverage". Tier labels strictly Dormant → AI-Native.

### What this plan does not include (yet)

- Notion sync for `questions` and `outcomes_library` (manual seed first; sync can be added once content stabilises).
- CRM webhook on high scores.
- The full Claude prompt + JSON schema will be drafted alongside Phase 3 and refined once the scoring engine produces its first outputs.

### Suggested first deliverable (one build pass)

Phase 1 (brand foundation + landing) and the primitive components — so the visual language and the first impression land before we wire the diagnostic flow. Phases 2–4 follow in subsequent passes.
