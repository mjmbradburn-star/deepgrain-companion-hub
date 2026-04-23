const DEFAULT_BASE_URL = "https://aioi.deepgrain.ai";
const REQUEST_TIMEOUT_MS = 15000;

const checks = [
  {
    label: "/assess",
    path: "/assess",
  },
  {
    label: "/auth/callback",
    path: "/auth/callback?error=access_denied&error_description=Smoke+test",
  },
  {
    label: "/reports",
    path: "/reports",
  },
];

const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL || DEFAULT_BASE_URL);
const results = [];

function normalizeBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    console.error(`Invalid SMOKE_BASE_URL: ${value}`);
    process.exit(1);
  }
}

function appShellIsPresent(html) {
  return /<div\s+id=["']root["']\s*>\s*<\/div>/i.test(html);
}

function reactScriptShellIsPresent(html) {
  return /<script[^>]+(?:type=["']module["'][^>]+)?src=["'][^"']+\.(?:js|tsx?)(?:\?[^"']*)?["']/i.test(html)
    || /<script[^>]+src=["'][^"']*assets\/[^"']+\.js[^"']*["']/i.test(html);
}

function looksLikeHostingError(html) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return [
    "404 not found",
    "page not found",
    "not found",
    "500 internal server error",
    "502 bad gateway",
    "503 service unavailable",
    "application error",
  ].some((marker) => text.includes(marker));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Deepgrain post-deploy smoke test",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

console.log(`Post-deploy smoke target: ${baseUrl}`);

for (const check of checks) {
  const url = new URL(check.path, `${baseUrl}/`);
  const failures = [];
  let status = 0;
  let resolvedUrl = url.toString();

  try {
    const response = await fetchWithTimeout(url);
    status = response.status;
    resolvedUrl = response.url;
    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    if (!response.ok) {
      failures.push(`HTTP ${response.status}`);
    }

    if (!contentType.toLowerCase().includes("text/html")) {
      failures.push(`non-HTML content-type: ${contentType || "missing"}`);
    }

    if (!appShellIsPresent(html)) {
      failures.push("missing #root app shell");
    }

    if (!reactScriptShellIsPresent(html)) {
      failures.push("missing React/Vite script shell");
    }

    if (looksLikeHostingError(html)) {
      failures.push("response looks like a hosting error page");
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  results.push({
    label: check.label,
    passed: failures.length === 0,
    status,
    resolvedUrl,
    failures,
  });
}

const passed = results.filter((result) => result.passed);
const failed = results.filter((result) => !result.passed);
const longestLabel = Math.max(...results.map((result) => result.label.length));

console.log("\nPost-deploy smoke test summary\n");
for (const result of results) {
  const label = result.passed ? "PASS" : "FAIL";
  const detail = result.passed ? "app shell served" : result.failures.join("; ");
  console.log(`${label.padEnd(6)} ${result.label.padEnd(longestLabel)}  ${result.status || "ERR"} ${detail}`);
  console.log(`       resolved: ${result.resolvedUrl}`);
}

console.log("\nTotals:");
console.log(`- Routes checked: ${results.length}`);
console.log(`- Passed: ${passed.length}`);
console.log(`- Failed: ${failed.length}`);

if (failed.length > 0) {
  process.exit(1);
}
