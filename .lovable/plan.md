
## Plan to reorder the report overview for Deep Dive/email capture

### Goal

On `/assess/r/:slug`, move the Deep Dive unlock/email-capture component above the benchmark cohort card currently headed by text like:

```text
All individual-level respondents
```

This makes the next best action — claim/sign in and continue the Deep Dive — appear before the broader benchmark context.

### What will change

#### 1. Reorder the Overview tab content

In `src/pages/AssessReport.tsx`, update `OverviewTab` so the order becomes:

```text
Score + meaning + hotspots
Eight-pillar chart
Deep Dive unlock / email capture card
Benchmark cohort card ("All individual-level respondents")
Tier-aware Report CTA
```

Instead of the current order:

```text
Score + chart
Benchmark cohort card
Report CTA
Deep Dive unlock / email capture card
```

This keeps the user focused on completing or claiming the report before they reach the generic cohort comparison.

#### 2. Keep completed Deep Dive reports clean

Only show the Deep Dive unlock/email capture component when `hasDeepdive` is false, as it does now.

For completed reports, the benchmark card will remain directly after the score/chart section.

#### 3. Tighten spacing around the moved card

Adjust vertical spacing so the moved Deep Dive card feels like a natural continuation of the overview rather than a detached page block:

- remove excessive bottom padding from the standalone card if needed
- keep enough separation before the benchmark card
- preserve the current visual style, colors, and copy
- avoid introducing new overlays or absolute positioning

#### 4. Add/adjust regression coverage

Update `src/pages/AssessReport.e2e.test.tsx` to assert the visual/content order for an incomplete individual report:

```text
Unlock your full personal profile
appears before
All individual-level respondents
```

Also ensure the anonymous report test still confirms the email/sign-in gate is shown.

### Acceptance criteria

The change is complete when:

- On incomplete individual reports, the Deep Dive/email capture card appears above the “All individual-level respondents” benchmark card.
- The benchmark card still renders below it.
- Completed Deep Dive reports do not show the unlock card.
- Existing share, PDF, resend, and report CTA controls remain unaffected.
- A regression test protects the new ordering.
