
## Plan: fix personal Deep Dive email capture and the blocked final-question flow

### What is happening

There are two related issues in the current personal-report journey:

1. **Quickscan reports are anonymous**
   - The fast/personal scan creates a report without collecting an email.
   - The report can be viewed by slug, but it is not tied to a signed-in user.
   - When the user clicks “Go deeper”, the app lets them enter the Deep Dive without first claiming/saving the report to an email identity.

2. **The final Deep Dive question silently fails**
   - On personal reports, there is currently only one additional v1.1 Deep Dive question: the personal agents/automation question.
   - Pressing an answer reaches the final step and tries to rescore the report.
   - The rescore function correctly requires an authenticated owner, but the quickscan report is anonymous, so rescoring fails.
   - The UI then falls back to the same question screen instead of showing a useful error, which makes it look like the button is broken.

The fix is to add an email sign-up/claim step before Deep Dive, then make the Deep Dive failure state visible and recoverable.

---

## Implementation steps

### 1. Add an email sign-up CTA after the first report

On the report page, when the report is anonymous and the Deep Dive is not complete:

- Replace the direct “Go deeper” path with a stronger CTA:
  - “Save this report and unlock the Deep Dive”
  - “Email me a secure link”
  - “No password. We’ll tie this report to your email so your full report can be updated.”
- Add an email input and optional marketing consent.
- Send a magic sign-in link with a redirect back to:

```text
/auth/callback?next=/assess/deep/:slug&claim=:slug
```

- Keep the current direct Deep Dive CTA for already signed-in/owned reports.

### 2. Add secure report claiming after magic-link sign-in

Create a small backend/database claim flow:

- Add a secure function/RPC such as `claim_report_by_slug(_slug text)` that:
  - Requires an authenticated user.
  - Finds the respondent by slug.
  - If `user_id` is null, assigns it to the current user.
  - If it is already owned by the same user, returns success.
  - If it is owned by someone else, refuses the claim.
- Optionally updates consent fields captured from the CTA.
- Do not expose respondent rows directly or relax RLS.

Then update `AuthCallback` so that when `claim` is present in the URL, it claims the report before navigating to the requested Deep Dive route.

### 3. Gate Deep Dive entry when the report is not owned

Update `AssessDeep.tsx` so it does not show questions until the report is eligible for rescoring.

Behavior:

- If the user is signed out:
  - Show the email sign-up panel instead of the question.
  - Explain: “We need your email before updating this report, so the report is saved to you.”
- If the user is signed in but the report is anonymous:
  - Claim it automatically before showing questions.
- If the report belongs to another user:
  - Show a clear “This report is already linked to another email” message.
- If the report is already owned by the current user:
  - Proceed straight into the Deep Dive.

### 4. Fix the final-question blocked state

Update the Deep Dive submit handling:

- Keep the final selected answer visible, but when rescoring fails, show a prominent error/recovery block.
- Do not hide `submitErr` just because `submitting` is false.
- Use `upsert` instead of plain `insert` for Deep Dive answers so retrying does not fail on duplicate responses.
- Add a retry button that actually retries both answer save and rescore.
- Add a “Back to report” fallback.
- Use plain-language copy:
  - “Your answer is saved locally.”
  - “We need to reconnect this report to your email before re-scoring.”
  - “Retry scoring.”

### 5. Make the personal Deep Dive count explicit

Because individual reports currently have only one additional v1.1 Deep Dive question, update the copy so users are not confused:

- On personal reports:
  - “Answer 1 additional question to refine your personal report.”
- On function reports:
  - “Answer the remaining function Deep Dive questions.”
- On company reports:
  - “Complete the full company Deep Dive.”

This should replace any generic “go deeper” language that implies a long sequence when only one personal question remains.

### 6. Update telemetry

Add events for the improved funnel:

- `deepdive_email_cta_viewed`
- `deepdive_email_link_sent`
- `report_claimed`
- `report_claim_failed`
- `deepdive_rescore_failed`
- `deepdive_rescore_retried`
- `deepdive_completed`

These will make it easier to see whether users drop at email capture, magic-link verification, or final rescoring.

### 7. Validate the flow end-to-end

Test these paths:

1. Anonymous individual quickscan → report → email CTA → magic link → Deep Dive → answer one question → report rescored.
2. Anonymous function quickscan → report → email CTA → magic link → Deep Dive → multiple questions → report rescored.
3. Already signed-in user → quickscan/report → Deep Dive without extra sign-up friction.
4. Retry final Deep Dive scoring after a simulated failure.
5. Attempt to claim a report already owned by another user returns a clear blocked state.

### Files likely to change

- `src/pages/AssessReport.tsx`
- `src/components/aioi/DeepDiveUnlock.tsx`
- `src/pages/AssessDeep.tsx`
- `src/pages/AuthCallback.tsx`
- `src/pages/SignIn.tsx` or a small shared email-capture component
- `src/lib/sync.ts`
- New database migration for the secure claim function
- Possibly tests around the personal Deep Dive question count and claim flow

### Acceptance criteria

- Users see an email sign-up CTA before going deeper from an anonymous report.
- Email capture creates/signs in a user and links the existing report to that user.
- The personal Deep Dive no longer appears stuck on the final question.
- If rescoring fails, the UI shows a clear recovery state instead of silently returning to the same question.
- Anonymous reports cannot be updated unless claimed by an authenticated user.
- Existing security posture is preserved.
