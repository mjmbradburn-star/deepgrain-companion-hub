

## Mobile alignment fix — Reset filters & Copy share link

**Scope:** the two utility buttons above the filter rows on `/benchmarks` (`src/pages/Benchmarks.tsx`, lines 506–559).

### What's wrong on mobile

- Both buttons already left-align (`justify-start sm:justify-end`), but they look uneven because:
  - **Different border weights:** Reset uses `border-cream/15`, Copy uses `border-cream/25`.
  - **Different text weights:** Reset is `text-cream/65`, Copy is `text-cream/75`.
  - **Inconsistent tap target:** `py-1.5` gives ~30px height — under the 36px mobile minimum used elsewhere (e.g. `BenchmarkFilters.tsx` uses `py-2 min-h-[36px]`).
  - **Icon optical alignment:** both icons are 12px but the chain-link glyph sits visually higher than the rotate-arrow because of stroke geometry; `gap-2` is fine but the icons need a shared baseline wrapper.

### Changes

1. **Unify the two buttons' visual weight** so they read as a matched pair:
   - Same border: `border-cream/20`
   - Same text: `text-cream/70`
   - Same hover: `hover:border-cream/50 hover:text-cream`

2. **Match the filter-pill tap sizing** used directly below them:
   - `py-2 min-h-[36px]` on mobile, keeping `sm:py-1.5` for desktop density.

3. **Fix icon vertical alignment** by wrapping each `<svg>` in a `flex items-center justify-center w-3 h-3 shrink-0` span so both glyphs sit on the same optical centre regardless of stroke shape.

4. **Tighten the row container** for mobile:
   - `flex flex-wrap justify-start sm:justify-end gap-2 mb-4 sm:mb-4`
   - Add `mb-5` on mobile to give the filter rows below proper breathing room (currently `mb-4` only).

5. **Leave desktop untouched** — right-aligned, same density, same hover behaviour.

### Files touched

- `src/pages/Benchmarks.tsx` (lines 506–559 only)

### Verification

After edits, view `/benchmarks` at 375px and 768px to confirm:
- Buttons left-align flush with container padding on mobile.
- Both buttons share identical border colour, text colour, height, and icon baseline.
- Tap targets are ≥36px tall.
- Desktop layout (right-aligned cluster) is unchanged.

