
## Plan to rebuild the individual report flow from first principles

### What is actually broken

The current individual flow has both logic and layout issues:

1. **Report claim/sign-in is structurally unsafe**
   - `public.respondents.user_id` still appears to be **unique per user**, even though the product now allows a user to own multiple reports.
   - `claim_report_by_slug()` updates `respondents.user_id` when someone signs in to save/claim a report.
   - If a user already owns any respondent/report, that update can fail at the database level, which matches the visible `"Could not claim report"` failure.

2. **Resume logic can attach to the wrong respondent**
   - `ensureRespondent()` currently reuses the latest in-progress respondent by `(user_id, level)`, not by the actual report/slug being resumed.
   - That is too broad for the individual flow and can mis-route answers or create confusing claim/sync behavior.

3. **Claim, auth callback, and draft sync are too tightly coupled**
   - `AuthCallback`, `AssessDeep`, `SignIn`, and the email gate all partly manage the same state.
   - This makes failure handling brittle and causes duplicate claim attempts / unclear recovery paths.

4. **The locked-report layout is visually unstable**
   - The current `PlanTab` blur + absolute overlay approach causes headline/content collisions in the individual report.
   - The email/sign-in section spacing is also too loose and spills awkwardly into surrounding sections.

### Implementation order

#### 1. Fix the data model first

Update the backend so the flow is allowed to work:

- Create a migration to remove the unintended **unique-per-user** restriction on `respondents.user_id`.
- Keep `user_id` nullable for anonymous quickscan reports.
- Preserve fast lookup indexes on `user_id`, `slug`, and respondent/report joins.
- Re-check `claim_report_by_slug()` so it cleanly supports:
  - anonymous report -> first authenticated owner
  - already-owned-by-same-user -> success
  - owned-by-different-user -> blocked
  - invalid/missing slug -> safe failure

Files involved:
- `supabase/migrations/*`

#### 2. Rebuild the individual auth/claim state machine

Refactor the flow so each step has one job:

**Auth**
- `SignIn` and `DeepDiveEmailGate` should only initiate access:
  - Google
  - Apple
  - email backup
- Both should pass the same explicit callback context.

**Callback**
- `AuthCallback` should only:
  - wait for a real restored session
  - resolve callback context
  - claim the target report if `claim` is present
  - resume draft sync only when there is an assessment draft to resume
  - send the user to one clear destination

**Deep Dive entry**
- `AssessDeep` should not aggressively re-claim on every load.
- It should:
  - load public report metadata
  - check auth readiness
  - if anonymous + user just signed in, claim once
  - if already owned by current user, continue
  - if owned by another user, show a clean wrong-account state

**Respondent reuse**
- `ensureRespondent()` should stop reusing “latest in-progress respondent of same level”.
- Reuse should be based on the current draft/respondent context, not just level.
- This prevents cross-linking between multiple individual reports.

Files involved:
- `src/lib/sync.ts`
- `src/lib/report-claim.ts`
- `src/lib/auth-callback-url.ts`
- `src/pages/AuthCallback.tsx`
- `src/pages/SignIn.tsx`
- `src/pages/AssessDeep.tsx`
- `src/pages/AssessProcessing.tsx`
- `src/components/aioi/DeepDiveEmailGate.tsx`

#### 3. Simplify the report UI instead of layering over it

Replace the fragile overlay approach with a cleaner locked-plan structure.

For the individual report:

- Keep **Month 1** fully visible.
- Replace the blurred months + absolute overlay with a dedicated **locked continuation panel** below Month 1.
- Move the sign-in/email gate into that panel as a normal flow block, not as text floating over hidden content.
- Reduce headline scale and max width for the individual variant.
- Tighten vertical spacing between:
  - month intro
  - unlock copy
  - benefit bullets
  - OAuth buttons
  - email form
- Ensure the unlock panel ends cleanly before `FounderBio` begins.

This will eliminate the visible overlap shown in the screenshots and make the sign-in CTA readable.

Files involved:
- `src/pages/AssessReport.tsx`
- `src/components/aioi/DeepDiveUnlock.tsx`
- `src/components/aioi/DeepDiveEmailGate.tsx`
- possibly `src/components/aioi/AuthAccessPanel.tsx`

#### 4. Add regression coverage around the real failure paths

Update tests to protect the rebuilt flow:

- existing user can claim a second anonymous report
- already-owned report returns success, not a hard failure
- wrong-account claim still blocks access
- auth callback does not sync the wrong respondent
- individual Deep Dive route resumes correctly after sign-in
- report page renders locked month-2/month-3 area without overlay collisions
- email fallback still preserves `next`, `claim`, and marketing consent context

Files involved:
- `src/pages/AuthCallback.routing.e2e.test.tsx`
- `src/pages/AuthCallback.email-backup.test.tsx`
- `src/pages/AuthEmailStatusFlows.e2e.test.tsx`
- `src/pages/AssessDeep.e2e.test.tsx`
- `src/pages/AssessReport.e2e.test.tsx`
- any new focused tests needed around claim/resume behavior

#### 5. Verify in the right environments

After implementation, verify in this order:

1. local/test flow in preview for layout and route logic
2. published/custom-domain sign-in flow for real OAuth/callback behavior
3. individual report -> sign in -> claim -> Deep Dive -> back to report
4. individual locked report spacing on desktop and smaller widths

### Acceptance criteria

The rebuild is complete when:

- A signed-in user can successfully claim more than one report over time.
- Individual report sign-in no longer fails with `"Could not claim report"` for valid owners.
- Auth callback only performs the work relevant to the incoming context.
- Deep Dive claim/resume flow is deterministic and recoverable.
- The individual report’s locked-plan section has no overlapping text or broken spacing.
- Google/Apple/email backup CTAs are readable, aligned, and visually contained.
- Existing wrong-account protection still works.
- Regression tests cover the multi-report ownership and individual-flow paths.

### Technical note

The highest-risk issue is the database constraint mismatch:

```text
Current behavior expected by product:
one user -> many respondents/reports over time

Current schema behavior likely:
one user -> one respondent only
```

That mismatch must be fixed first; otherwise UI changes alone will not solve the individual sign-in/claim failures.
