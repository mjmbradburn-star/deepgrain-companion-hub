
## Plan to add flaky E2E detection in CI

### Goal

Update the pull request regression gate so any failed frontend E2E spec is automatically rerun up to two more times. The CI output will clearly distinguish between:

- Passed on first attempt
- Flaky but recovered on retry
- Still failing after all retries

This makes production deploy reviews safer because intermittent tests are visible instead of silently hidden.

### What will change

#### 1. Add a small E2E retry runner

Create a Node script, for example:

```text
scripts/run-e2e-with-flake-detection.mjs
```

It will:

1. Find all frontend E2E specs:

```text
src/pages/*.e2e.test.tsx
```

2. Run each spec individually with Vitest.
3. If a spec fails, rerun only that failed spec up to two more times.
4. Track each spec’s final state:
   - `PASS` — passed on first try
   - `FLAKY` — failed once, then passed on retry
   - `FAIL` — failed after all three attempts
5. Print a clear summary table in the CI log.

Example output:

```text
E2E regression summary

PASS   AssessDeep.e2e.test.tsx              attempt 1/3
PASS   AssessProcessing.e2e.test.tsx        attempt 1/3
FLAKY  MyReports.e2e.test.tsx               passed on attempt 2/3
FAIL   AuthCallback.routing.e2e.test.tsx    failed after 3/3 attempts

Totals:
- Specs passed first try: 6
- Flaky specs recovered: 1
- Specs still failing: 1
```

### CI behavior

#### Passing CI

CI will pass when:

- Every E2E spec eventually passes within 3 attempts.

If one or more tests recovered after retry, the workflow still passes but the summary clearly reports the flaky specs.

#### Failing CI

CI will fail when:

- Any E2E spec still fails after the initial run plus two retries.

This continues to block merges for real failures.

### Package script update

Update `package.json` from the current direct Vitest command:

```json
"test:e2e": "vitest run $(ls src/pages/*.e2e.test.tsx | tr '\\n' ' ')"
```

to:

```json
"test:e2e": "node scripts/run-e2e-with-flake-detection.mjs"
```

The GitHub Actions workflow can continue to call:

```text
npm run test:e2e
```

so the CI workflow remains simple and stable.

### Workflow update

Keep the existing PR workflow and job names, but improve the frontend E2E step name so reviewers understand flaky detection is active:

```yaml
- name: Run frontend E2E regression suite with flaky detection
  run: npm run test:e2e
```

The backend edge-function tests will remain unchanged unless you want the same retry behavior added there later.

### Reporting details

The runner will print:

- one line per spec
- how many attempts each spec needed
- a final total summary
- a “flaky tests detected” section when applicable
- a non-zero exit code only if any spec remains failing after all retries

### Acceptance criteria

The change is complete when:

- Frontend E2E specs are run individually.
- Any failed spec is retried up to two more times.
- Flaky specs are reported clearly in CI logs.
- Persistent failures still fail the workflow and block merges.
- The existing workflow still runs on every pull request.
- Backend regression checks and build/lint checks are not weakened.
- No production app behavior changes are introduced.
