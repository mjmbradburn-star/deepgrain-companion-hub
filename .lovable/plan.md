
## Plan to add lightweight post-deploy smoke tests

### Goal

Add a small post-deploy safety check that hits the production site after deployment and verifies the key routes are being served correctly:

```text
/assess
/auth/callback
/reports
```

These checks are intentionally lightweight: they validate that deployed deep links resolve to the React app shell, do not return 404/5xx responses, and produce clear CI output.

### Files to add/update

#### Add

```text
scripts/post-deploy-smoke.mjs
.github/workflows/post-deploy-smoke.yml
```

#### Update

```text
package.json
```

Add a script such as:

```json
"smoke:postdeploy": "node scripts/post-deploy-smoke.mjs"
```

### Smoke test script behavior

Create a Node-based smoke runner using built-in `fetch`, with no browser dependency.

It will read the target URL from:

```text
SMOKE_BASE_URL
```

Defaulting to the production custom domain:

```text
https://aioi.deepgrain.ai
```

It will test:

```text
/assess
/auth/callback?error=access_denied&error_description=Smoke+test
/reports
```

For each route, it will confirm:

- Response status is successful, normally `200`.
- Response content type is HTML.
- The app root is present:

```html
<div id="root"></div>
```

- The Vite/React script shell is present.
- The response does not look like a raw hosting-level 404 or 5xx page.
- The final resolved URL is logged clearly.

### Route-specific checks

#### `/assess`

Confirms the public assessment entry route is served as an app route and does not break after deploy.

Expected result:

```text
PASS /assess — app shell served
```

#### `/auth/callback`

Use a safe, non-authenticated error callback URL:

```text
/auth/callback?error=access_denied&error_description=Smoke+test
```

This avoids requiring a real sign-in token while still confirming the deployed callback route is reachable and handled by the SPA fallback.

Expected result:

```text
PASS /auth/callback — callback route shell served
```

#### `/reports`

Confirms the private reports deep link is served by the deployed SPA. Client-side auth can then redirect unauthenticated users to sign-in, but the deployment must still serve the route correctly.

Expected result:

```text
PASS /reports — private route shell served
```

### Reporting output

The script will print a clear summary:

```text
Post-deploy smoke test summary

PASS  /assess          200 app shell served
PASS  /auth/callback   200 app shell served
PASS  /reports         200 app shell served

Totals:
- Routes checked: 3
- Passed: 3
- Failed: 0
```

If any route fails, the script exits with a non-zero code so the workflow is marked failed.

### GitHub Actions workflow

Add a separate workflow:

```text
.github/workflows/post-deploy-smoke.yml
```

It will support:

1. Automatic run on successful GitHub deployment events:

```yaml
on:
  deployment_status:
```

2. Manual run for production deploy review:

```yaml
workflow_dispatch:
```

The workflow will:

- Use Node 20.
- Install dependencies with `npm ci` only if needed by the project script environment.
- Run:

```bash
npm run smoke:postdeploy
```

- Write a concise result summary to the GitHub Actions job summary.

### Target URL configuration

Use this priority order:

1. `SMOKE_BASE_URL` workflow input, for manual runs.
2. Repository variable `SMOKE_BASE_URL`, if configured.
3. Default:

```text
https://aioi.deepgrain.ai
```

This allows the same smoke runner to test custom domain, published URL, or preview URL without code changes.

### Notes on “post-deploy” automation

The workflow will run automatically when GitHub receives a successful deployment event. If the deployment provider does not emit GitHub deployment events, the same workflow can still be run manually from GitHub Actions after publishing, and the script remains reusable from any external deploy hook.

### Acceptance criteria

The implementation is complete when:

- A smoke test script exists and can test the live deployed app.
- `/assess`, `/auth/callback`, and `/reports` are checked.
- Failed HTTP responses or missing app shell markers fail the smoke run.
- Results are printed clearly in CI logs.
- A GitHub Actions workflow can run the smoke tests post-deploy.
- The smoke test target URL is configurable.
- No production app behavior changes are introduced.
