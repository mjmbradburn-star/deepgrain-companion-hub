
## CI workflow plan for PR regression blocking

### Goal

Add a GitHub Actions workflow that runs the full production regression checks on every pull request. If any test fails, the PR check fails so it can be used as a required merge gate before production deploy.

### Files to add/update

1. Add:

```text
.github/workflows/e2e-regression.yml
```

2. Optionally add package scripts in:

```text
package.json
```

to make the commands easier to run locally and in CI.

### Workflow behavior

The workflow will run on every pull request:

```yaml
on:
  pull_request:
```

It will include:

- Node setup
- Dependency install with `npm ci`
- Frontend E2E regression tests
- Backend edge-function auth/security regression tests
- Clear failure status if any suite fails
- GitHub Actions concurrency so newer PR pushes cancel older runs

### CI jobs

#### 1. Frontend E2E regression job

Runs the full browser-flow-style Vitest suite:

```text
src/pages/**/*.e2e.test.tsx
```

This covers the existing assessment, sign-in/sign-up, auth callback, processing, reports, My Reports, shared reports, and Deep Dive regression flows.

Command:

```bash
npx vitest run "src/pages/**/*.e2e.test.tsx"
```

#### 2. Backend function regression job

Runs the Deno-based backend safety checks for scoring and report PDF paths, including invalid, malformed, anonymous, and expired-looking token scenarios.

Command set:

```bash
deno test -A \
  supabase/functions/score-responses/scoring_test.ts \
  supabase/functions/score-responses/auth-access_test.ts \
  supabase/functions/rescore-respondent/auth-access_test.ts \
  supabase/functions/email-report-pdf/access-control_test.ts \
  supabase/functions/email-report-pdf/email-handoff_test.ts
```

This job will require the workflow environment to provide:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

These should be stored as GitHub repository secrets or variables for the connected backend test environment.

#### 3. Optional production safety checks

Include these in the same workflow so the PR gate catches non-test breakage too:

```bash
npm run lint
npm run build
```

This keeps the deploy gate stricter: tests passing is necessary, but broken lint/build also blocks merge.

### Merge blocking behavior

The workflow file itself makes PR checks fail when tests fail.

To fully block merges in GitHub, the repository should require the workflow status checks before merging into the production branch. The required checks should be named clearly, for example:

```text
Frontend E2E regression
Backend edge-function regression
Build and lint
```

If branch protection is already enabled, the new checks can be selected as required status checks. If it is not enabled yet, I will add a short note in the workflow/README explaining that this final “block merge” enforcement is controlled by GitHub branch protection settings.

### Acceptance criteria

The CI setup is complete when:

- A new PR automatically runs the regression workflow.
- Frontend E2E tests run on every PR.
- Backend scoring/report PDF safety checks run on every PR.
- Any failed test causes the PR workflow to fail.
- Build or lint failures also fail the workflow.
- The check names are stable and easy to mark as required in GitHub.
- No production app behavior changes are introduced.
