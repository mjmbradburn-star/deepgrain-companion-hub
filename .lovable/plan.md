
## Improve Deep Dive sign-in and email reliability

### Current diagnosis

The email domain is verified, and the app successfully requested emails. The problem is further down the pipeline:

- The auth email hook is receiving the sign-in/signup requests.
- It is enqueueing the email successfully.
- The queued emails are staying in `pending`.
- The queue processor is being invoked every few seconds, but the backend HTTP responses are `401`, so queued emails are not being drained and sent.
- The first-time flow currently sends a `signup` confirmation email, even though the UI says “magic link”. That mismatch can confuse users even when delivery works.

So this is not just copy or spacing: the app needs both a backend pipeline repair and a more resilient user experience when email is delayed.

## Implementation plan

### 1. Repair the email queue processing path

- Re-run the managed email infrastructure setup so the queue processor’s internal credential is refreshed and the scheduled processor can authenticate again.
- Redeploy the email queue processor and auth email hook after any changes.
- Verify that new auth emails move from `pending` to `sent` in the email log.
- Confirm the existing stuck messages either send on the next run or are safely superseded by a fresh email request.

### 2. Make the “magic link” flow match what users actually receive

- Update the auth email subject/copy for first-time users so it clearly supports this assessment flow.
- Change app UI copy from only “magic link” to clearer language such as:
  - “We’ll send a secure sign-in link”
  - “If this is your first time, the email may ask you to confirm your address first”
- Brand the sender/site name as “AI Operating Index” or “Deepgrain” instead of `deepgrain-companion-hub`.

### 3. Improve the Deep Dive email gate after submit

- After the user enters their email, show a stronger confirmation state:
  - the exact address used
  - “This can take up to a minute”
  - “Check spam/promotions”
  - a resend button after cooldown
  - a “change email” option
- Add copy explaining that opening the link will save the report and continue the Deep Dive.

### 4. Add a “Continue without waiting” recovery path where possible

- Keep the anonymous report visible after the email request instead of making email feel like a dead end.
- Add a secondary CTA:
  - “Back to report”
  - “Try another email”
  - “Resend secure link”
- Preserve the current report slug in the UI so the user does not lose their place.

### 5. Add email-delivery diagnostics for future issues

- Add lightweight internal events around:
  - email link requested
  - auth hook enqueued
  - user clicked resend
  - callback succeeded
  - callback failed/expired
- Improve the existing health-check endpoint/reporting so it flags:
  - pending auth emails
  - queue processor auth failures
  - queue backlog
  - recent failed/dlq/rate-limited email statuses
- This gives a faster signal next time a user says “I didn’t get the email.”

### 6. Validate end-to-end

- Request a fresh sign-in link from the Deep Dive card.
- Confirm the email log changes from `pending` to `sent`.
- Open the link and verify:
  - report is claimed to the email
  - `/auth/callback` resumes correctly
  - `/assess/deep/:slug` loads without losing the report
  - resend and error states remain usable
