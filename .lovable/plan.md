

## Tighten standfirst animation spacing on mobile

### Problem

On mobile, the Hero standfirst paragraph and CTA cluster (which contains the "See the eight pillars" link) both use `animate-fade-up` with staggered delays (200ms, 320ms). The keyframe starts at `translateY(12px)` and the cluster also has `gap-6` plus `mt-8` and `pb-6` on the parent. During the staggered entrance the elements visibly drop into place from below, which on a short mobile viewport reads as extra empty space sitting above the "See the eight pillars" prompt before the layout settles. Combined with the parent's `mt-8` push-down, the bottom of the hero feels loose on phones.

### Fix

Single file: `src/components/aioi/Hero.tsx`, the standfirst + CTA block (lines 47–72).

1. **Reduce mobile vertical padding/gaps** on the standfirst container so the CTA cluster (and the "See the eight pillars" link inside it) sits tighter against the headline on small screens, matching the snug rhythm desktop already gets via `mt-auto`:
   - `mt-8 sm:mt-auto` → `mt-6 sm:mt-auto`
   - `pb-6 sm:pb-28` → `pb-8 sm:pb-28` (gives the link a touch more breathing room from the viewport edge but pulls the block up overall)
   - `gap-6 sm:gap-8` → `gap-4 sm:gap-8` (mobile only — desktop unchanged)
   - Inner CTA cluster `gap-4 sm:gap-6` → `gap-3 sm:gap-6`

2. **Stop the fade-up translate from reading as "extra height"** on mobile by:
   - Replacing `animate-fade-up` on the standfirst `<p>` (line 49) and CTA cluster `<div>` (line 55) with `animate-fade-in` on mobile, keeping `animate-fade-up` from `sm:` upward. Use responsive variants: `animate-fade-in sm:animate-fade-up`. Result: on phones the elements simply fade in place with no vertical drop, removing the transient gap; desktop keeps the editorial fade-up motion.
   - Keep the staggered `[animation-delay:200ms]` / `[animation-delay:320ms]` — they work for both keyframes.

3. **No changes to** the headline animation, the hairline rule, the masthead, or the desktop layout.

### Verification

Load `/` at 375px and 390px, watch the Hero settle — the "See the eight pillars" link should appear in its final position immediately, with no perceptible upward drift, and the gap below the CTA cluster should feel tighter than the current build. Re-check at 768px and 1280px to confirm desktop is visually unchanged.

### Files touched

- `src/components/aioi/Hero.tsx` (lines 47–72 only)

