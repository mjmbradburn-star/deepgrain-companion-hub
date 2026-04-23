
## Fix the two Deep Dive flow failures quickly

### Problems to address

1. **OAuth handoff from the report is not explicit enough**
   - After “Continue with Google”, the user should see clear in-app confirmation that sign-in succeeded.
   - The flow should then go straight to `/assess/deep/:slug`, not leave the user wondering whether sign-in worked.

2. **Deep Dive completion can fall into a retry loop**
   - The answers may be saved, but re-scoring fails.
   - The current screen only offers “Retry scoring” or “Back to report”, which can trap the user in the same state.
   - This is likely to affect individual, function, and company reports because they share the same Deep Dive completion path.

## Implementation plan

### 1. Make OAuth redirects report-aware and visible

Update the Google/Apple sign-in URLs from the Deep Dive gate so they preserve:

- report slug
- intended destination: `/assess/deep/:slug`
- claim intent
- provider/method, e.g. `auth_method=google`

Then update `AuthCallback` so that when OAuth succeeds it shows a short confirmation state such as:

- “Signed in with Google.”
- “Saving this report to your account.”
- “Taking you to the Deep Dive.”

After claiming the report, it should immediately route to:

```text
/assess/deep/:slug
```

### 2. Add an auth-ready guard before report claim / Deep Dive loading

Add a small auth readiness hook or helper so authenticated work does not run until the session is fully restored.

Use it in:

- `AuthCallback`
- `AssessDeep`
- `AssessProcessing`
- `MyReports` if needed

This prevents authenticated calls from firing while the browser has returned from OAuth but the session is not yet available to the client.

The important rule:

```text
Do not claim reports, load private responses, or invoke scoring until auth is ready and user/session exists.
```

### 3. Harden the Deep Dive page after OAuth

Update `AssessDeep` so the flow becomes:

```text
Load public report by slug
↓
Wait for auth readiness
↓
If signed out: show OAuth-first gate
↓
If signed in: claim report
↓
Load existing answers
↓
Show remaining Deep Dive questions
```

If the claim succeeds, do not show the email gate again.

If the claim fails because the report belongs to another account, show a clear “wrong account” recovery state with:

- sign out / use another account
- back to report
- contact/support-style instruction if needed

### 4. Fix the re-scoring failure loop

Update the Deep Dive completion logic so it separates three phases:

1. **Save new answers**
2. **Re-score report**
3. **Route back to updated report**

If answers save but scoring fails:

- do not imply the answers are only “saved locally”
- do not create an endless “retry scoring” loop
- show a clearer state:

```text
Your Deep Dive answers are saved.
We could not refresh the score yet.
```

Primary action:

```text
Finish scoring
```

Secondary action:

```text
View report while scoring is retried
```

The retry should only re-run scoring if answers are already saved, not re-submit the same responses unnecessarily.

### 5. Fix backend function configuration for scoring auth

The `rescore-respondent` function validates the user token inside the function, but the project config currently does not list it under function-specific auth settings.

Add function config entries for scoring functions that perform in-code auth validation:

```toml
[functions.rescore-respondent]
verify_jwt = false

[functions.score-responses]
verify_jwt = false
```

This avoids the gateway rejecting valid sessions before the function’s own ownership check runs.

### 6. Pass the current session token explicitly when re-scoring

Before invoking `rescore-respondent`, get the current session and pass its access token in the function request headers.

If no session is available:

- route back through sign-in with the report slug preserved
- do not show “retry scoring” as if it were a scoring problem

### 7. Add tests for all three report levels

Add/extend regression tests for:

- individual report OAuth claim → lands on Deep Dive
- function report OAuth claim → lands on Deep Dive
- company report OAuth claim → lands on Deep Dive
- Deep Dive answer save succeeds but scoring fails → no endless loop
- retry after saved answers invokes scoring only
- unauthenticated Deep Dive access shows OAuth-first gate
- signed-in Deep Dive access does not show the gate again

### Files to update

- `src/pages/AuthCallback.tsx`
- `src/pages/AssessDeep.tsx`
- `src/pages/AssessProcessing.tsx`
- `src/components/aioi/DeepDiveEmailGate.tsx`
- `src/pages/SignIn.tsx` if shared OAuth redirect handling needs alignment
- `src/hooks/use-auth-ready.ts` or equivalent new auth readiness helper
- `supabase/config.toml`
- `src/pages/AssessDeep.e2e.test.tsx`
- `src/pages/AuthCallback.email-backup.test.tsx`

### Expected outcome

After the fix:

- clicking Google/Apple from the report clearly confirms sign-in
- the user is routed straight into the correct Deep Dive
- Deep Dive completion no longer gets stuck on the retry screen
- saved answers are preserved
- scoring retries are safe and specific
- individual, function, and company Deep Dive flows behave consistently
