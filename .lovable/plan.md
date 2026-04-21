

## Mobile re-optimization — site-wide

The site was designed desktop-first. On phones, container padding is too generous, headlines blow past the viewport, vertical sections stack with 7rem+ of dead space, the nav hides three of its four links behind `sm:`, and several grids (radar tiles, compare cards, pillar bookends, plan months) collapse to a single column without re-tuning typography or spacing. This pass fixes all of it in one sweep.

### Goals

1. Nothing horizontally scrolls at 360px width.
2. Type scales sensibly down (no headline bigger than ~3rem on phones).
3. Vertical rhythm shrinks proportionally — no 8rem gaps between sections on a 700px-tall screen.
4. The nav is usable on mobile (currently 3 of 4 links are hidden).
5. Tap targets ≥ 44px; no clipped chips or overlapping badges.

### What changes

**Global tokens & primitives**
- `tailwind.config.ts` container padding: `1.5rem` → `{ DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }`.
- `index.css`: tighten `.eyebrow` letter-spacing on small screens; add a `.section-y` utility (`py-16 sm:py-24 lg:py-32`) and a `.headline-xl` clamp utility to standardise the giant H1s.

**SiteNav (`SiteNav.tsx`)**
- Add a mobile menu: hamburger button that opens a `Sheet` (already in ui/) containing Pillars, Ladder, Benchmarks, deepgrain.ai. Remove `hidden sm:inline` on the links inside the sheet. Desktop ≥ md keeps the inline row.
- Shrink the "AI Operating Index" tagline on < sm (or hide it on < 380px so the wordmark doesn't collide with the menu button).

**SiteFooter (`SiteFooter.tsx`)**
- Reduce `py-12` → `py-10 sm:py-12`. Tighten the version row gap.

**Hero (`Hero.tsx`)**
- Headline clamp: `clamp(2.75rem, 11vw, 9rem)` → `clamp(2.25rem, 10vw, 9rem)` and `max-w-[12ch]` → `max-w-[10ch] sm:max-w-[12ch]`.
- Reduce top padding (`pt-12 sm:pt-16` → `pt-8 sm:pt-16`) and bottom padding (`pb-24 sm:pb-28` → `pb-16 sm:pb-28`).
- CTA row: stack vertically below sm; full-width primary button on phones.
- Hide the "Volume I · MMXXVI" middle masthead item on < sm (already done), shrink masthead font on < sm.

**PillarsGrid, MaturityLadder, ThreeLevels, BenchmarkCounter, WhyDeepgrain (homepage sections)**
- Replace `py-28 sm:py-36` with `py-16 sm:py-24 lg:py-32` everywhere.
- Headlines: `text-5xl sm:text-6xl` → `text-4xl sm:text-5xl lg:text-6xl`.
- PillarsGrid cards: padding `p-7` → `p-5 sm:p-7`; tighten heading `text-2xl` → `text-xl sm:text-2xl`.
- MaturityLadder accordion trigger row: smaller gap, hide the tag text on < md (it already is), shrink rung label `text-3xl` → `text-2xl sm:text-3xl`.

**Pillars page (`Pillars.tsx`)**
- Hero: `pt-40 pb-24` → `pt-28 pb-16 sm:pt-40 sm:pb-24`. Headline clamp lower-bound `3rem` → `2.25rem`.
- Pillar entries: `space-y-24 sm:space-y-32` → `space-y-16 sm:space-y-24`. Big tabular pillar number `text-7xl` → `text-5xl sm:text-7xl`. SignalCards/Bookends already stack — tighten internal padding `p-6` → `p-5`.

**Ladder page (`Ladder.tsx`)**
- Same hero treatment as Pillars.
- Visual ladder rows: the 12-col grid crushes on phones. Restructure for < sm: index + tier name + bar on row 1, percentage right-aligned on row 1, tag line on row 2 (smaller). Keep the existing 12-col layout from `sm` upward.
- Tier deep-dives: `space-y-28` → `space-y-16 sm:space-y-24`. Same big number shrink.

**Benchmarks page (`Benchmarks.tsx`)**
- Filter row: confirm it wraps / scrolls cleanly on mobile (audit `BenchmarkFilters.tsx`).
- "Big number + radar" two-up grid: ensure the radar SVG has `max-w-full h-auto` and the score block stacks above it on < lg with reduced gap (`gap-12` → `gap-8 lg:gap-12`).
- Compare grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` keeps but reduce tile padding on phones.
- Pillar comparison bars: shrink label/number type one step on < sm; ensure tooltip trigger remains tappable.

**AssessReport (`AssessReport.tsx`)**
- Top grid `gap-12 lg:gap-16` → `gap-8 lg:gap-16`, section `py-16 sm:py-20` → `py-10 sm:py-20`.
- Plan months grid: aside stacks above main on < lg; reduce its huge month number on phones.
- Sticky/share controls: ensure the share popover and download buttons wrap to a second row instead of overflowing.

**Assess flow (`AssessQuestion`, `AssessScan`, `AssessDeep`, `AssessProcessing`)**
- Question prompt clamp lower-bound `2rem` → `1.5rem`.
- Option cards: full-width on phones, generous tap padding (`py-4` minimum).
- AssessChrome header step counter and back link stay intact at 360px (audit and tighten gap if needed).

### Out of scope

- No visual redesign — colour palette, fonts, component aesthetics unchanged.
- No new pages or routes.
- Desktop layouts (≥ lg) remain as-is.

### Verification

After the edit, screenshot each route at 375×812 (iPhone) and 768×1024 (tablet): `/`, `/pillars`, `/ladder`, `/benchmarks`, `/assess`, `/assess/scan`, and a sample report. Confirm no horizontal scroll, no clipped headlines, mobile nav works, and section spacing feels deliberate.

### Files touched

`tailwind.config.ts`, `src/index.css`, `src/components/aioi/SiteNav.tsx`, `src/components/aioi/SiteFooter.tsx`, `src/components/aioi/Hero.tsx`, `src/components/aioi/PillarsGrid.tsx`, `src/components/aioi/MaturityLadder.tsx`, `src/components/aioi/ThreeLevels.tsx`, `src/components/aioi/BenchmarkCounter.tsx`, `src/components/aioi/WhyDeepgrain.tsx`, `src/components/aioi/AssessChrome.tsx`, `src/components/aioi/OptionCard.tsx`, `src/components/aioi/BenchmarkFilters.tsx`, `src/pages/Pillars.tsx`, `src/pages/Ladder.tsx`, `src/pages/Benchmarks.tsx`, `src/pages/AssessReport.tsx`, `src/pages/AssessQuestion.tsx`, `src/pages/AssessScan.tsx`, `src/pages/AssessDeep.tsx`.

