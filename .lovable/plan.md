

## Deep fix for “Email me the PDF” failures

### What is failing

The PDF generation itself is working: the function creates and uploads the PDF, then fails only when trying to queue the email.

The latest backend logs show:

- `email-report-pdf` reaches the email handoff step.
- The call to `send-transactional-email` is rejected with `401 Invalid JWT`.
- `send-transactional-email` has no logs for that request, which means the request is being blocked at the backend gateway before its code runs.
- `email_send_log` is empty, confirming the email is never being queued.

So the current `502` is a wrapper error from `email-report-pdf`: “I made the PDF, but I could not reach the email queue.”

## Implementation plan

### 1. Remove the brittle gateway-JWT dependency for internal email functions

Update these backend function settings:

- `send-transactional-email`
- `process-email-queue`

Change them from gateway-level JWT validation to in-function service validation.

This avoids the current `Invalid JWT` gateway failure while keeping the functions protected.

### 2. Add explicit service-call authorization inside the email functions

In `send-transactional-email`:

- Require the caller to present the project service credential in either:
  - `Authorization: Bearer ...`, or
  - `apikey: ...`
- Reject anything else with `401`.
- Keep this function service-only because the current app only calls it from `email-report-pdf`, not directly from the browser.

In `process-email-queue`:

- Keep it service-only.
- Validate the bearer credential directly instead of parsing it as a JWT.
- This also protects the cron-driven queue processor from the same token-format issue.

### 3. Harden `email-report-pdf`

Update `email-report-pdf` so it:

- Validates required backend environment values before doing any work.
- Calls `send-transactional-email` with the service credential explicitly.
- Logs sanitized upstream error details.
- Does not surface the raw backend error to users.
- If the PDF was generated but email queuing fails, returns a successful HTTP response with:
  - `ok: false`
  - `pdfUrl`
  - a clear fallback message

That prevents the UI/runtime overlay from appearing when the email handoff fails after the PDF already exists.

### 4. Improve the “Email me the PDF” UI fallback

Update `EmailPdfButton` so it handles the new fallback response cleanly:

- If email queues successfully: show “On its way”.
- If the PDF was generated but email queuing failed: show the direct download link in the popover and toast.
- If PDF generation itself fails: show a normal error.
- Avoid throwing a runtime error for the recoverable “PDF exists, email queue failed” case.

### 5. Add a no-send health check for the email pipeline

Extend the existing `health-check` endpoint so it diagnoses the email path, not just scoring functions.

Add no-send health modes to:

- `send-transactional-email`
- `process-email-queue`

Then update `health-check` to report:

- PDF email sender reachable
- transactional email function reachable
- queue processor reachable
- email database tables present
- queue RPC functions present
- queue configuration row present
- recent email status counts, without exposing recipient addresses

This will make future diagnosis much faster than relying on screenshots or runtime overlays.

### 6. Refresh backend email infrastructure

After the code changes, re-run the managed email infrastructure setup to refresh the queue processor’s stored service credential and cron wiring.

This is safe and idempotent, and specifically addresses the possibility that the queue processor has a stale service credential.

### 7. Deploy and verify

Deploy the changed backend functions:

- `email-report-pdf`
- `send-transactional-email`
- `process-email-queue`
- `health-check`

Then verify:

1. Email domain is still verified.
2. Health check reports the email pipeline as healthy.
3. `send-transactional-email` health mode reaches function code rather than being gateway-blocked.
4. `process-email-queue` health mode reaches function code.
5. A PDF request no longer returns a 502 when the PDF exists.
6. A successful email request creates a `pending` row in the email log, followed by `sent` after the queue processor runs.

## Files to change

- `supabase/config.toml`
- `supabase/functions/send-transactional-email/index.ts`
- `supabase/functions/process-email-queue/index.ts`
- `supabase/functions/email-report-pdf/index.ts`
- `supabase/functions/health-check/index.ts`
- `src/pages/AssessReport.tsx`

