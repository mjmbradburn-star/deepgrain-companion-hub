
## Deep test and cleanup plan before production

### Goal

Make the assessment, authentication, report, and Deep Dive flows production-safe by adding regression coverage, removing duplicated/fragile flow code, and checking for loops or confusing recovery states without changing the intended user experience.

## 1. Map the full production flow

Create a documented flow map covering every route and transition:

```text
Home / Assessment landing
↓
/assess
↓
/assess/scan
↓
/assess/r/:slug
↓
Deep Dive unlock
↓
Google / Apple / email backup
↓
/auth/callback
↓
/assess/deep/:slug
↓
/assess/r/:slug
↓
/reports
```

Also cover legacy/full-flow routes still in use:

```text
/assess/start
↓
/assess/q/:step
↓
/assess/processing
↓
/auth/callback
↓
/assess/r/:slug
```

This gives us a checklist for every button, redirect, retry state, and recovery path.

## 2. Add a shared auth-flow test harness

Build reusable test helpers so the same scenarios can be tested without copy-paste:

- mocked signed-out session
- mocked signed-in session
- mocked OAuth success
- mocked email-link success
- mocked expired / invalid / used / unconfirmed email-link callbacks
- mocked report claim success
- mocked report already claimed by another account
- mocked scoring success
- mocked scoring failure
- mocked saved-answers-then-scoring-fails state

Use this in page-level E2E-style tests for:

- `SignIn`
- `AuthCallback`
- `DeepDiveEmailGate`
- `AssessStart`
- `AssessProcessing`
- `AssessScan`
- `AssessDeep`
- `AssessReport`
- `MyReports`

## 3. Test every assessment entry and question path

Add regression tests for the public assessment flow:

### `/assess`
- company card starts company scan
- function card starts function scan
- individual card starts individual scan
- selected level is persisted correctly
- back/home controls do not break flow

### `/assess/scan`
- renders the correct question count per level
- company includes the additional agent question
- function prompts respect the selected function
- option buttons save answers and advance
- previous/back works
- keyboard shortcuts work only when safe
- double-click or Enter/button race does not submit twice
- submit success routes to `/assess/r/:slug`
- submit timeout/network/server/validation failures show retry UI
- “Try again” retries the saved payload only once
- “Review answers” returns to editable questions without losing answers

## 4. Test report page buttons and locked/unlocked states

Add tests for `AssessReport` covering:

- loading state
- missing report state
- report-building/no-report state
- ready report state
- Share link button
- Email executive PDF popover
- PDF email success
- PDF generated but email handoff fails, showing direct link
- PDF failure toast
- Deep Dive CTA for anonymous reports shows auth gate
- Deep Dive CTA for claimed reports routes directly to `/assess/deep/:slug`
- “Resend report link” appears only for signed-in users
- resend report link uses the centralized auth callback URL builder, not a raw report URL
- tab switching does not hide or duplicate important CTAs

## 5. Test all sign-in and sign-up paths

Extend auth tests to cover every entry point:

### `/signin`
- signed-out user sees Google, Apple, and email backup
- signed-in user redirects to `next`
- `next`, `claim`, `consent_marketing`, and `email` are preserved
- email backup covers all `auth-email-status` states
- expired / invalid callback errors route back with a clear action
- Google/Apple failures show a toast and leave the user on the page

### `DeepDiveEmailGate`
- Google preserves `/assess/deep/:slug`
- Apple preserves `/assess/deep/:slug`
- email backup preserves `claim` and `consent_marketing`
- resend does not create duplicate state or lose the slug
- “Try another email” resets only the email gate state
- “Back to report” returns to `/assess/r/:slug`

### `AssessStart`
- consent requirement blocks OAuth and email backup until benchmark consent is checked
- Google/Apple begin auth with the same layout and copy as the other auth gates
- email backup saves qualifier data and routes into questions
- magic-link resend state is clear and non-duplicative

### `AssessProcessing`
- signed-in users finalize once only
- signed-out users see auth options and resend/change-email actions
- OAuth returns to processing and finalizes
- email backup returns to processing and finalizes
- errors offer retry/start-over without reload loops

## 6. Harden and test `AuthCallback`

Add targeted tests for callback routing:

- no `next` defaults safely to `/reports`
- `next=/assess/processing` resumes assessment progress
- `next=/assess/deep/:slug` claims report then enters Deep Dive
- `next=/assess/r/:slug` returns to report end state
- persisted sessionStorage context is used when provider drops params
- URL params override stale sessionStorage context
- callback context is cleared after successful routing
- claim failure shows the right recovery UI
- sync failure shows “signed in, but sync hit a snag”
- no-session timeout does not spin forever
- callback effect does not run twice under React StrictMode

## 7. Test Deep Dive across all levels

Extend `AssessDeep.e2e.test.tsx` so all report levels are covered consistently:

- individual OAuth claim -> Deep Dive -> report
- function OAuth claim -> Deep Dive -> report
- company OAuth claim -> Deep Dive -> report
- individual email backup claim -> Deep Dive -> report
- function email backup claim -> Deep Dive -> report
- company email backup claim -> Deep Dive -> report
- signed-out Deep Dive shows auth gate
- signed-in Deep Dive does not show auth gate
- already-owned report proceeds
- already-claimed report shows wrong-account recovery
- existing quickscan answers are skipped
- existing Deep Dive answers are skipped
- all remaining answers are upserted once
- scoring receives the current session token
- saved answers + scoring failure shows safe recovery
- “Finish scoring” retries scoring only
- “View report while scoring retries” does not resubmit answers
- no endless retry or redirect loop

## 8. Backend function and auth configuration checks

Verify and add tests/checks for scoring-related functions:

- `submit-quickscan`
- `score-responses`
- `rescore-respondent`
- `email-report-pdf`
- `auth-email-status`

Confirm:

- functions that validate auth internally are not blocked at the gateway
- functions that should be public have explicit safe validation inside the function
- scoring functions handle missing/invalid tokens with clear responses
- response bodies are always consumed in Deno tests
- no auth-sensitive code depends on localStorage/sessionStorage for authorization

No database schema change is planned unless tests reveal a real data-access gap.

## 9. Remove redundant and fragile code

Refactor only where tests prove it is safe.

### Candidates to consolidate

- duplicate OAuth button handling into one helper/component pattern
- duplicate auth callback URL construction into `auth-callback-url.ts`
- duplicate cooldown/resend logic into small reusable hooks if worthwhile
- duplicate “signed out, continue with Google/Apple/email backup” copy
- raw callback/report URLs replaced with centralized URL builders
- repeated report claim telemetry reduced to one place where possible
- reload-based retry in `AssessProcessing` replaced with a controlled retry if practical

### Guardrails

- do not rewrite core scoring logic unnecessarily
- do not change database tables unless a failing test requires it
- do not alter visual design beyond consistency fixes
- keep current routes stable
- keep existing public report access by slug intact
- keep Google and Apple first, email backup secondary

## 10. Loop and race-condition audit

Review and test for:

- effects that navigate repeatedly
- effects that depend on unstable objects
- StrictMode double execution
- duplicate finalise/scoring calls
- duplicate answer upserts
- timers that survive unmount
- auth callback running before session is ready
- stale sessionStorage auth context
- stale localStorage assessment/scan drafts
- “already complete” Deep Dive state repeatedly bouncing between report and Deep Dive
- report-building states