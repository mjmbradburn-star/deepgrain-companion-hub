
## Make sign-in and report access reliable instead of “email-only fragile”

### What is happening now

The current issue is broader than spacing or one broken email send:

- The sender domain is verified.
- Recent auth emails are reaching the backend email log as `sent`, so the queue is no longer the main blocker.
- The affected auth events are still showing up as `user_confirmation_requested` rather than a true magic-link sign-in flow.
- The app currently always calls `signInWithOtp(..., shouldCreateUser: true)`, so one form is trying to handle:
  - first-time account creation
  - unconfirmed users
  - returning sign-in
- That means the UI says “magic link”, but the backend may actually send a confirmation email instead.
- Both `/signin` and the Deep Dive claim gate depend too heavily on one email step, so when delivery is delayed, filtered, or mismatched, the user hits a dead end.

### What to build

### 1. Split account states instead of pretending every email request is the same

Add a small backend auth-status check for an email address that returns only the minimum safe state needed by the UI:

- no account yet
- account exists but email not confirmed
- confirmed account exists

Then change the flows so they behave honestly:

- **confirmed account** → send a sign-in link
- **unconfirmed account** → resend confirmation with explicit wording
- **new email** → create access flow with explicit “confirm your email first” messaging

This removes the current ambiguity where the app promises a magic link but may trigger confirmation instead.

### 2. Make the UI copy state-aware across both entry points

Update both:

- `src/pages/SignIn.tsx`
- `src/components/aioi/DeepDiveEmailGate.tsx`

So the after-submit state reflects the actual backend outcome:

- “We sent a sign-in link”
- “We sent a confirmation email”
- “This address already has an account but still needs confirmation”

Also show:

- exact email address used
- up to 1 minute delivery expectation
- spam/promotions hint
- resend after cooldown
- change email
- a clear explanation of what happens after clicking

### 3. Add a non-email fallback so the flow is not blocked by inbox delivery

Add Google sign-in as a parallel recovery path on:

- `/signin`
- the Deep Dive save/claim gate
- expired/invalid callback error states

That gives users a way through even when inbox delivery is slow, filtered, or confusing.

### 4. Stop making the Deep Dive feel like a dead end

Keep the report experience usable while authentication is unresolved:

- preserve the current report slug at every step
- keep “Back to report” available
- keep “Try another email” and “Resend link”
- if the user cannot authenticate immediately, do not strand them on a blank waiting state

For the assessment-specific flow, move the UX framing from “you must do email now” to “save this report to continue later”.

### 5. Harden callback and resend behavior

Refine:

- `src/pages/AuthCallback.tsx`
- `src/lib/sync.ts`
- `src/lib/report-claim.ts`

So callback handling distinguishes:

- expired link
- invalid/used link
- unconfirmed-account state
- claim succeeded but answer sync failed
- sign-in succeeded but report ownership could not be attached

Then make resend actions preserve:

- `next`
- `claim`
- consent flags
- known email

### 6. Improve backend observability around auth delivery and conversion

Extend diagnostics so future failures are obvious:

- log requested auth intent vs actual email type sent
- track resend clicks
- track callback success/failure by reason
- surface recent auth email backlog and failure counts in health-check
- flag “signup confirmations sent from sign-in surface” as a first-class signal

### 7. Validate with the real scenarios that matter

Test these end-to-end paths:

1. brand-new email
2. existing confirmed user
3. existing unconfirmed user
4. expired link resend
5. Deep Dive claim flow from a public report
6. `/signin?next=/reports`
7. Google fallback path
8. “sent in backend, not visible to user” messaging path

## Technical details

### Frontend files to update
- `src/pages/SignIn.tsx`
- `src/components/aioi/DeepDiveEmailGate.tsx`
- `src/pages/AuthCallback.tsx`
- `src/pages/AssessDeep.tsx`
- `src/pages/AssessProcessing.tsx`
- `src/lib/sync.ts`
- `src/lib/report-claim.ts`

### Backend work
- Add a small backend function to resolve auth state for an email without exposing private user data
- Update auth email handling/copy so subject + body clearly match:
  - sign-in link
  - confirm email
- Extend health diagnostics for auth-email outcome visibility

### Optional but recommended structural improvement
If we want the deepest reliability fix after the auth cleanup, add a dedicated “continue your report” app-email path for report recovery, separate from account authentication. That would let report continuation be resilient even when auth email semantics are confusing.

## Implementation order

1. Backend auth-state lookup
2. State-aware copy + CTA updates
3. Google sign-in fallback
4. Callback/resend hardening
5. Deep Dive no-dead-end recovery UX
6. Diagnostics and end-to-end validation

## Expected outcome

After this work:

- users will no longer be told they got a “magic link” when the system actually sent a confirmation email
- email delivery issues will no longer fully block report recovery
- returning users will have a reliable sign-in path
- first-time users will understand they are confirming access, not “mysteriously not getting a magic link”
- support/debugging will be much faster because the app will expose the real auth state instead of masking it
