

## Verify and fix bottom spacing around "See the eight pillars" prompt

### Where this lives

The "See the eight pillars" prompt sits at the bottom of the `BenchmarkCounter` section on the home page (`src/components/aioi/BenchmarkCounter.tsx`), which is rendered between `ThreeLevels` and `WhyDeepgrain` on `src/pages/Index.tsx`.

### What to check

1. Read `BenchmarkCounter.tsx` and confirm the bottom padding/margin currently applied to the section and to the inner prompt link.
2. Read the parent `Index.tsx` to see if any wrapping container adds extra `py-*` / `space-y-*` that compounds with the section's own bottom padding.
3. Compare against the standard `section-y` utility used elsewhere (Hero, PillarsGrid, ThreeLevels, WhyDeepgrain) so the rhythm matches the rest of the page.
4. Verify at 375px, 768px, and 1280px in the preview that the gap below the prompt before the next section feels identical to the gap above it (symmetric breathing room) and matches the gap between other adjacent sections.

### Likely fix

Most often this kind of asymmetry comes from one of three things, and the fix is whichever applies:

- **Prompt link has its own `mt-*` plus the section already uses `section-y`** → remove the redundant top margin or normalise to the standard rhythm.
- **Section uses `pb-*` smaller than its `pt-*`** → switch to `section-y` (or matching `pt`/`pb`) so top and bottom are equal.
- **Parent in `Index.tsx` adds `space-y-*` on top of per-section padding** → drop the parent gap and rely on each section's own padding.

I'll pick the minimum change that gives a consistent gap on mobile and desktop without disturbing the surrounding sections.

### Verification

Screenshot `/` at 375 / 768 / 1280, eyeball the gap above and below the prompt, and confirm it matches the gap between `ThreeLevels` → `BenchmarkCounter` and `BenchmarkCounter` → `WhyDeepgrain`.

### Files likely touched

- `src/components/aioi/BenchmarkCounter.tsx` (most likely, one or two class changes)
- `src/pages/Index.tsx` (only if a parent wrapper is the culprit)

