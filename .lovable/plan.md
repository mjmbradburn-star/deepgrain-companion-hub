
## SEO + LLM discovery audit

### Current assessment

The product is strong: the concept is distinctive, the copy has a clear editorial voice, and the assessment/report loop is already more useful than a generic “AI maturity quiz”. The main SEO/LLM gap is not product quality; it is machine readability and search-intent coverage.

Right now the site has:
- A sitemap and robots file.
- A privacy page and cookie banner.
- Strong human-facing pages for the homepage, pillars, ladder, benchmarks, reports, and assessment.
- A clear conversion action: start the 3-minute AI maturity scan.

But it is weak in these areas:
- Only the static `index.html` metadata appears to be global, so most routes likely share the same title/description unless set elsewhere.
- No visible reusable SEO component for per-route canonical URLs, Open Graph tags, Twitter tags, robots directives, or JSON-LD.
- No `llms.txt` / AI-readable site summary file.
- No structured data describing the organisation, software/application, diagnostic, FAQ, breadcrumbs, or dataset/benchmark.
- Search pages are mostly branded/editorial, but not yet shaped around query intent like “AI maturity assessment”, “AI readiness benchmark”, “AI adoption survey”, “AI operating model”, “AI governance maturity”, etc.
- The assessment flow is excellent for humans, but crawlers and LLMs need more crawlable explanation of what the survey measures, how scoring works, what users receive, and why the benchmark is trustworthy.
- The homepage CTA copy still contains some inconsistent time/no-email language across components.
- Analytics consent exists, but the plan should make landing-to-completion tracking explicit and consent-aware.

## Build queue

### 1. Route-specific SEO metadata
Build a reusable SEO component and apply it to every indexable route.

Pages to cover:
- `/`
- `/assess`
- `/pillars`
- `/ladder`
- `/benchmarks`
- `/privacy`
- `/signin`
- `/reports` as `noindex`
- `/assess/r/:slug` as controlled `noindex` or non-indexed by default because reports are personal/share-link content
- assessment question/processing/deep routes as `noindex`

For each indexable page:
- Unique title.
- Unique meta description.
- Canonical URL on `https://aioi.deepgrain.ai`.
- Open Graph title/description/image.
- Twitter card tags.
- Robots meta where appropriate.

### 2. Search-intent landing copy
Strengthen above-the-fold and supporting copy around terms people actually search for, without making the site feel generic.

Target clusters:
- AI maturity assessment
- AI readiness assessment
- AI adoption benchmark
- AI operating model
- AI governance maturity
- AI workflow maturity
- AI transformation benchmark
- AI enablement survey

Implementation:
- Preserve the editorial brand voice.
- Add precise explanatory copy beneath existing poetic headings.
- Add a “What you get” section to make the outcome obvious before the user starts.
- Add a concise “How the AI Operating Index works” section.

### 3. LLM-readable answer blocks
Add short, explicit, extractable summaries to key pages.

Examples:
- “The AI Operating Index is a free diagnostic that scores AI operating maturity across eight pillars.”
- “The scan takes about three minutes and returns an AIOI score, maturity tier, weakest pillars, recommendations, and peer benchmark context.”
- “The eight pillars are Strategy & Mandate, Data Foundations, Tooling & Infrastructure, Workflow Integration, Skills & Fluency, Governance & Risk, Measurement & ROI, and Culture & Adoption.”

These blocks should be visible to users, not hidden keyword stuffing.

### 4. Structured data / JSON-LD
Add JSON-LD for:
- `Organization` / Deepgrain.
- `WebSite` / AIOI.
- `SoftwareApplication` or `WebApplication` for the diagnostic.
- `FAQPage` on the homepage or assessment page.
- `BreadcrumbList` for pillars, ladder, benchmarks, privacy.
- `Dataset` or `DataCatalog` style schema for benchmarks where appropriate.

This helps Google, AI search engines, and LLM crawlers understand the site entity and purpose.

### 5. `llms.txt`
Create `public/llms.txt` with:
- Site name and canonical URL.
- One-paragraph description.
- Primary user action.
- Key pages and what each page contains.
- The eight-pillar framework.
- Benchmark explanation.
- Contact/brand attribution.
- Crawl-friendly language explaining what AIOI should be cited as.

### 6. AI sitemap / content map
Add a lightweight `public/ai-sitemap.json` or `public/site-index.json` that lists:
- Canonical routes.
- Page purpose.
- Primary keywords/entities.
- Whether the page is indexable.
- Suggested summary.

This gives LLMs and future AI agents a structured map of the site.

### 7. Sitemap expansion and indexing rules
Update `public/sitemap.xml` to include all indexable public pages and exclude private/flow pages.

Include:
- `/`
- `/assess`
- `/pillars`
- `/ladder`
- `/benchmarks`
- `/privacy`
- `/llms.txt`
- `/ai-sitemap.json` if treated as a discoverable asset

Exclude:
- `/signin`
- `/reports`
- `/assess/scan`
- `/assess/start`
- `/assess/q/*`
- `/assess/processing`
- `/assess/deep/*`
- `/assess/r/*`

Update `robots.txt` to reference:
- Sitemap URL.
- `llms.txt`.
- Any AI sitemap/content map if useful.
- Disallow private/report/assessment-flow paths where appropriate.

### 8. Internal linking improvements
Improve crawlability and user journeys by adding contextual links:
- Homepage to assessment, pillars, ladder, benchmarks.
- Pillars page to assessment and benchmark page.
- Ladder page to assessment and pillars page.
- Benchmarks page to assessment and explanation of how benchmark cohorts work.
- Footer links to sitemap, privacy, and possibly a “Start assessment” link.

### 9. Assessment conversion improvements
Improve landing-to-survey conversion:
- Make “3-minute AI maturity scan” consistent everywhere.
- Replace older “12/18/22 min” labels where the quickscan is now the primary flow.
- Clarify “no email required for first score; email only to save/unlock deep dive” if that remains the product behavior.
- Add trust copy near CTAs: what data is used, what the user receives, and whether answers contribute to anonymous benchmarks.

### 10. Benchmark credibility content
Add crawlable explanatory content to `/benchmarks`:
- What benchmark data means.
- What confidence levels mean.
- How fallback cohorts work.
- Why sample size and specificity affect interpretation.
- How more completed assessments improve the benchmark.

This supports both SEO and user confidence when filters produce fallbacks.

### 11. FAQ section
Add an FAQ block on homepage or `/assess` covering:
- What is an AI maturity assessment?
- How long does AIOI take?
- What are the eight pillars?
- Is it for companies, functions, or individuals?
- Do I need to enter an email?
- How are benchmarks calculated?
- What happens after I get my report?
- Who is Deepgrain?

Mark it up with `FAQPage` JSON-LD.

### 12. Consent-aware analytics readiness
Extend event coverage so GA/Search Console outcomes can be interpreted later.

Events to track:
- `seo_landing_viewed`
- `primary_cta_clicked`
- `assessment_level_selected`
- `quickscan_started`
- `quickscan_completed`
- `report_viewed`
- `deepdive_email_cta_viewed`
- `deepdive_started`
- `deepdive_completed`
- `benchmark_filter_changed`

Respect cookie consent:
- Only load/send optional analytics after analytics consent.
- Keep essential product telemetry separate if already required for product operation.

### 13. Social/share previews
Improve social and AI preview assets:
- Ensure Open Graph image has explicit width/height and alt text.
- Add route-specific share copy where useful.
- Add `theme-color`.
- Add favicon/apple-touch-icon checks if missing.
- Ensure shared report links remain non-indexed but visually compelling.

### 14. Performance and crawl quality checks
After implementation:
- Validate build.
- Inspect generated `sitemap.xml`, `robots.txt`, `llms.txt`, and AI sitemap.
- Check that metadata updates when navigating routes.
- Confirm private/report routes are not marked for indexing.
- Confirm visible copy remains elegant and not keyword-stuffed.

## Technical implementation notes

- Use React-side metadata updates because this is a Vite/React SPA.
- Do not edit generated backend client/type files.
- Keep all public static SEO assets in `public/`.
- Use canonical domain `https://aioi.deepgrain.ai`.
- Keep the brand tone: editorial, precise, premium, not generic SEO sludge.
- Keep report and account pages private/non-indexable by default.
- Add tests where practical for pure helpers such as metadata definitions or sitemap/content-map generation if introduced.

## Deliverables after approval

- Updated route metadata and structured data.
- Expanded sitemap/robots setup.
- New `llms.txt`.
- New AI-readable site/content map.
- Improved homepage/assessment/benchmark copy for search and LLM extraction.
- Improved internal links and CTA consistency.
- Consent-aware analytics hooks/events.
- Final URLs ready for:
  - Google Search Console: `https://aioi.deepgrain.ai/sitemap.xml`
  - LLM/AI crawlers: `https://aioi.deepgrain.ai/llms.txt`
