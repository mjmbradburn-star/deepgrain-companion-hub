import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const SPEC_DIR = "src/pages";
const SPEC_SUFFIX = ".e2e.test.tsx";
const MAX_ATTEMPTS = 3;

if (!existsSync(SPEC_DIR)) {
  console.error(`E2E spec directory not found: ${SPEC_DIR}`);
  process.exit(1);
}

const specs = readdirSync(SPEC_DIR)
  .filter((file) => file.endsWith(SPEC_SUFFIX))
  .sort((a, b) => a.localeCompare(b))
  .map((file) => join(SPEC_DIR, file));

if (specs.length === 0) {
  console.error(`No E2E specs found in ${SPEC_DIR} matching *${SPEC_SUFFIX}`);
  process.exit(1);
}

const results = [];

for (const spec of specs) {
  let passed = false;
  let attempts = 0;

  for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts += 1) {
    console.log(`\n▶ Running ${basename(spec)} (attempt ${attempts}/${MAX_ATTEMPTS})`);
    const result = spawnSync("npx", ["vitest", "run", spec], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.status === 0) {
      passed = true;
      break;
    }
  }

  results.push({ spec: basename(spec), passed, attempts });
}

const passedFirstTry = results.filter((result) => result.passed && result.attempts === 1);
const flakyRecovered = results.filter((result) => result.passed && result.attempts > 1);
const stillFailing = results.filter((result) => !result.passed);
const longestName = Math.max(...results.map((result) => result.spec.length));

console.log("\nE2E regression summary\n");
for (const result of results) {
  const label = result.passed ? (result.attempts === 1 ? "PASS" : "FLAKY") : "FAIL";
  const detail = result.passed
    ? result.attempts === 1
      ? `attempt 1/${MAX_ATTEMPTS}`
      : `passed on attempt ${result.attempts}/${MAX_ATTEMPTS}`
    : `failed after ${MAX_ATTEMPTS}/${MAX_ATTEMPTS} attempts`;
  console.log(`${label.padEnd(6)} ${result.spec.padEnd(longestName)}  ${detail}`);
}

console.log("\nTotals:");
console.log(`- Specs passed first try: ${passedFirstTry.length}`);
console.log(`- Flaky specs recovered: ${flakyRecovered.length}`);
console.log(`- Specs still failing: ${stillFailing.length}`);

if (flakyRecovered.length > 0) {
  console.log("\nFlaky tests detected:");
  for (const result of flakyRecovered) {
    console.log(`- ${result.spec} passed on attempt ${result.attempts}/${MAX_ATTEMPTS}`);
  }
}

if (stillFailing.length > 0) {
  console.log("\nPersistent E2E failures:");
  for (const result of stillFailing) {
    console.log(`- ${result.spec} failed after ${MAX_ATTEMPTS}/${MAX_ATTEMPTS} attempts`);
  }
  process.exit(1);
}

process.exit(0);