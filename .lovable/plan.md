# AIOI Recommendations Architecture · review, redundancy audit, indexing fixes

This is a single-pass review of three things you asked for:

1. **Compliance with the v1 Recommendations Architecture** — what we've built, what's missing, what's drifted.
2. **Page-by-page redundancy audit** — what to keep, merge, or delete.
3. **Indexing posture** — which URLs Google should and shouldn't see, and what to tighten.

I've stayed away from speculative refactors. Every change below has a concrete reason tied to your spec, your traffic surface, or your security posture. Where I'd push back on doing work, I say so.

---

## 1. Architecture compliance — score and gaps

The v1 spec is a three-layer system: **Playbook → Selection Engine → Voice Wrapper**, with admin tooling, fallbacks, and a published update cadence. Here's the honest read.

### What's built and matches the spec

- **Layer 1 (Playbook).** `outcomes_library` carries the full Move shape from §5: `lens`, `pillar`, `tier_band`, `function`, `size_bands`, `why_matters`, `what_to_do`, `how_to_know`, `effort`, `impact`, `tags`, `cta_*`, `active`, `last_reviewed_at`, `notes`. The `claude_payload`/`recommendations` columns on `reports` mirror §7.2 output.
- **Layer 2 (Selection Engine).** `supabase/functions/_shared/selection-engine.ts` is pure, testable, deterministic, no AI dependency. Implements hotspot pillar filter, tier-band match, function/size matching, pillar weights, freshness, effort balance, prerequisite tag boost, lens caps (`{individual: 3-5, functional: 5-7, organisational: 5-6}`), forced-rank pick for organisational. Matches §6 closely.
- **Layer 3 (Voice Wrapper).** `recommend-report` edge function takes the engine output, calls Lovable AI Gateway (`gemini-2.5-flash` by default — we swapped Sonnet for cost; functionally equivalent for the wrapping job), enforces banned phrases, falls back to Playbook content on failure, caches on `reports.recommendations` + `move_ids`. Matches §7.
- **Admin UX.** `/admin/playbook` has Moves list, Move editor, Coverage map, Stale view, Test report. Matches §8.1 line-for-line.
- **Failure path.** `MovesTab` renders the fallback banner + snapshot copy when `used_fallback === true`, so the user never sees an error. Matches §7.6.
- **Acceptance criteria** that are infra-related (engine deterministic, fallback works, JSON validation, tagged-prereq prioritisation) are covered by the existing test suites.

### Gaps and drift worth flagging (not all worth fixing)

| # | Gap | Severity | What I'd do |
|---|-----|----------|-------------|
| G1 | The spec calls for a separate `playbook_moves` table; we reuse `outcomes_library`. Functionally equivalent today, but the table name lies about what it stores. | Low | **Don't rename.** Cosmetic. The `Move` interface in `selection-engine.ts` already abstracts it. Document the alias in a comment on the table and move on. |
| G2 | Spec §11 wants ~192 launch Moves. Unknown current count. | Unknown | Run a coverage check from the admin Coverage page; flag empty cells. **Not a code change** — content work. |
| G3 | Selection engine §6 mentions a `pick_unblocking_move` based on cross-pillar blocking weight; ours picks the lowest-tier hotspot in the *already-selected* set. Simpler, but it can miss a true "blocker" pillar that wasn't in the hotspot trio. | Medium | Adjust `selectMoves` so the forced-rank pick is allowed to pull from a wider candidate pool (top 4 weakest pillars), not just the already-selected three. ~15 lines. |
| G4 | Spec §7.5 caches per respondent indefinitely with regen on retake. We have `recommendations_generated_at` but no automatic invalidation when an underlying Move is edited. | Low | Add a button (already exists per-report in admin context) and document the rule. **No code change** — the "regenerate" button + retake covers 95% of cases. |
| G5 | Spec §13 wants p95 < 12s submit→report. Voice wrapper has an 8s timeout. No SLO instrumentation today. | Low-Medium | Add a single `latency_ms` event from the client around the submit→report-ready transition. ~10 lines in `AssessProcessing.tsx`. |
| G6 | Spec §10 specifies that Functional reports fall back to function-base Moves when a function-specific Move doesn't exist. The engine implements this (`functionMatches` allows `function == null`), but **no test** asserts it. | Low | Add one Vitest case in `selection-engine_test.ts`. |

**My recommendation:** do G3 and G6 now (small, tightens the engine to spec). Defer G1, G4, G5 — none of them improve the user's experience today.

---

## 2. Page-by-page redundancy audit

I walked all 22 pages in `src/pages/` and the 6 admin pages.

### Verdict by route

```
KEEP / CORE
  /                   Index             — landing
  /pillars            Pillars           — pillar reference (linked from Index, llms.txt, sitemap)
  /ladder             Ladder            — tier reference
  /benchmarks         Benchmarks        — benchmark explorer
  /privacy            Privacy           — required policy
  /assess             Assess            — level chooser, entry to scan
  /assess/scan        AssessScan        — quickscan flow (8 questions)
  /assess/processing  AssessProcessing  — score+wrapper progress
  /assess/r/:slug     AssessReport      — the report
  /assess/deep/:slug  AssessDeep        — deep-dive top-up
  /reports            MyReports         — saved reports list (auth)
  /signin             SignIn            — magic-link entry
  /auth/callback      AuthCallback      — supabase callback
  /unsubscribe        Unsubscribe       — email pref management
  /admin/playbook/**  Admin             — Matt's authoring surface

REVIEW / DECIDE
  /assess/start       AssessStart       — legacy long-form flow (462 lines)
  /assess/q/:step     AssessQuestion    — companion to AssessStart
  /ai/overview        AiOverview        — AI-readable site map
  /deploy-review      DeployReview      — internal QA artefact
```

### Redundancy findings

**Strong candidate to delete: `/assess/start` + `/assess/q/:step` (AssessStart + AssessQuestion).**
These were the legacy "long-form" flow before the 3-minute scan became the default. The new path is `Assess → AssessScan → AssessProcessing → AssessReport`. Nothing in the live UI links to `/assess/start` or `/assess/q/:step` (verified with `rg`). `Assess.tsx` already syncs `loadDraft`/`saveDraft` and `loadScan`/`saveScan` for parity, but the legacy resume path isn't promoted anywhere. Total: ~684 lines + their tests. Removing them would also let us drop the `loadDraft`/`saveDraft` legacy half of `lib/assessment.ts`.

> **Caveat**: there may be live email links pointing to the long-form flow from earlier sends. Before deletion I'd grep `email-templates/` and `seed-emails/` for `/assess/start`. If found, redirect those routes to `/assess` instead of deleting outright.

**Probably delete: `/deploy-review` (DeployReview, 44 lines).**
Public route that serves a static PDF from `/public/e2e-production-deploy-summary.pdf`. The PDF is sensitive operational evidence and the route has no auth gate. Either:
- Move the PDF behind admin auth and put the page under `/admin/deploy-review`, or
- Delete both the page and the PDF — internal QA evidence shouldn't ship with production.

**Keep but reposition: `/ai/overview` (AiOverview).**
This is a deliberate AI-crawler entry point. It overlaps with `/llms.txt` and `/ai-sitemap.json` but serves a different audience (LLMs that follow links vs LLMs that read llms.txt). Worth keeping. It is currently in `seoRoutes` and indexable, which is correct for its purpose.

**Already correctly gated: `/dev/hero-cta`.**
Only mounted when `import.meta.env.DEV`. 404s in production. No action.

**Already correctly slim: `NotFound` (27 lines), `Privacy`, `SignIn`, `Unsubscribe`.** Each does one job.

### Code-reduction opportunities (within kept pages)

- **`AssessReport.tsx` is 1,870 lines.** It contains `MovesTab`, `OverviewTab`, `MovesEmptyState`, `EmailPdfButton`, `ResendReportLink`, `MovesControls`, `PlanTab`, `ReportTab`, `MethodologyTab`, `ReportView`, the loader, and a handful of small helpers. None of this is broken, but anyone touching the file pays for the size on every edit. A single split into `pages/AssessReport/` with one file per tab + one `loader.ts` would not change behaviour and would let our test files target each tab in isolation. **Optional, moderate risk because of the test count.**
- **`Benchmarks.tsx` is 1,036 lines.** Same shape — fine to leave until next iteration. Don't touch unless we're already in there.
- **`AssessReport.test.tsx` is 749 lines** and several scenarios overlap (HotspotCard tests, Moves tab tests, full-page tests). Once we split the page, the test file should follow. **Wait until we split the page.**

---

## 3. Indexing and Google exposure — tighten this now

Today's posture is mostly correct but has three concrete leaks. The good news: `seoRoutes` already marks the right pages `noindex`, and `robots.txt` already disallows the sensitive paths under `*`.

### Leaks to fix

**L1. Googlebot (and Bing/Twitter/Facebook) currently bypass the disallow rules.**
`public/robots.txt` opens with `User-agent: Googlebot \n Allow: /` (and the same for Bing, Twitter, Facebook) before the `User-agent: *` block with the disallow list. Per the robots spec, the most-specific group wins, so **Googlebot ignores every Disallow we have**. Reports, sign-in pages, deep-dive flows, and any link with a slug are all crawlable by the four most important crawlers. Fix: drop the per-bot `Allow: /` blocks (the universal `User-agent: * Allow: /` already lets them in) and let everyone obey the same Disallow list. ~15 lines deleted.

**L2. `/deploy-review` is publicly indexable.**
It isn't in `robots.txt`, has no `noindex` in `seoRoutes`, and links a sensitive operational PDF that's also fetchable directly at `/e2e-production-deploy-summary.pdf`. Two-step fix:
- Add `Disallow: /deploy-review` to `robots.txt`, mark the page `noindex` in `seoRoutes`.
- Either delete the PDF from `public/` or move it into `/private-evidence/` behind admin auth (Cloud Storage with a signed URL is overkill — the simpler move is delete-from-`public/`).

**L3. `/admin/playbook/**` is not in `robots.txt` and not `noindex`-tagged.**
Add `Disallow: /admin` and a `noindex` SEO entry for the admin layout. Today the admin pages don't appear in any sitemap, so they likely aren't indexed yet, but a single accidental external link would change that. Belt-and-braces.

### Smaller cleanups

- `Disallow: /assess/start` and `/assess/q/` should stay until after we decide on G2 in §2 (delete vs. keep).
- The sitemap (`public/sitemap.xml`) currently lists only 7 URLs — that's right. No changes needed.
- `llms.txt` is good. No changes needed.

### What I'd not change

- The `noindex` settings on `/signin`, `/reports`, `/auth/callback`, `/unsubscribe`, `/assess/r/`, `/assess/deep/`, `/assess/processing`, `/assess/scan`, and the `404` page are already correct. Don't touch.

---

## 4. Concrete change set if you approve

Smallest safe change set, in order:

1. **`public/robots.txt`** — remove the four per-bot `Allow: /` blocks so the universal Disallow list applies to Google/Bing/Twitter/Facebook. Add `Disallow: /admin` and `Disallow: /deploy-review`.
2. **`src/lib/seo.ts`** — add `noindex: true` entries for `admin` and `deployReview`; wire them in `AdminPlaybookLayout.tsx` and `DeployReview.tsx` via `<Seo …>`.
3. **`/deploy-review` decision** — delete the page + PDF, or move the page under `/admin/deploy-review`. Default recommendation: delete.
4. **`AssessStart` + `AssessQuestion` decision** — grep emails for outbound links to `/assess/start`. If clean, delete both pages and their tests. If not, redirect those routes to `/assess`.
5. **Selection engine §6 conformance (G3 + G6)** — broaden the forced-rank candidate pool to the top-4 hotspots, and add the function-fallback test case. ~30 lines + 1 new test.

Behaviour after these changes:
- No live user-facing page changes their layout.
- Search engines stop crawling protected paths (today they crawl them).
- Sensitive QA artefact stops being a public URL.
- Two redundant flows either go away or are explicitly redirected.
- The selection engine matches §6 verbatim and gains a regression test for fallback.

## 5. What I'm explicitly NOT doing (and why)

- **Renaming `outcomes_library` → `playbook_moves`.** Pure churn. Every edge function, type file, and seed script would touch it for zero user gain. Spec compliance is semantic, not nominal.
- **Splitting `AssessReport.tsx` into a folder.** Tempting but high-risk while we still have 14 tests pinned to its current exports. Defer until the next time we're already editing it.
- **Adding caching/regen orchestration for Move edits invalidating cached reports.** The admin "regenerate" button + user retake already cover this. Building automatic invalidation is a multi-table trigger that would need careful testing for almost no real benefit.
- **Adding more JSON-LD or expanding `llms.txt`.** Both are well-tuned for the current page set; adding more without a measured ranking gap is cargo culting.

If you approve this plan, I'll execute steps 1–3 immediately, and pause for your decision on 4 (need the email-link grep result) and 5 (small but worth a separate review).
