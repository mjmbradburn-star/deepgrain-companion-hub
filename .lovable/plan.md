
## Plan to tighten DeepDiveUnlock mobile typography hierarchy

### Goal

Refine the `DeepDiveUnlock` intro typography on small screens so the eyebrow, headline, and detail feel intentionally grouped after the recent card reorder and spacing changes.

### What will change

#### 1. Tune the compact intro stack

In `src/components/aioi/DeepDiveUnlock.tsx`, adjust the compact variant used on report pages so the top intro reads as a tighter hierarchy on mobile:

```text
Eyebrow + icon
Headline
Detail
Depth note
```

The aim is to reduce visual looseness without making the card feel cramped.

#### 2. Eyebrow refinement

For `compact` mode:

- slightly reduce the icon size on mobile
- reduce the eyebrow tracking on the smallest screens
- add `leading-snug` so long eyebrow copy does not feel airy if it wraps
- preserve the wider tracking on `sm` and above

Expected direction:

```text
text-[9px] sm:text-[10px]
tracking-[0.14em] sm:tracking-[0.2em]
leading-snug
```

#### 3. Headline refinement

For `compact` mode:

- keep the headline prominent, but make the mobile line-height slightly tighter and more controlled
- use a fluid/clamped or responsive size that sits between the current body detail and large desktop headline
- preserve the existing desktop/tablet scale

Expected direction:

```text
text-[1.6rem] sm:text-4xl
leading-[1.02] sm:leading-[1.05]
tracking-[-0.02em]
```

This should keep “Unlock your full personal profile…” strong without dominating the card on phones.

#### 4. Detail refinement

For `compact` mode:

- make the detail sit closer to the headline on mobile
- use normal UI/body rhythm instead of feeling like a second display headline
- improve readability with controlled line-height

Expected direction:

```text
mt-2.5 sm:mt-3
text-[15px] sm:text-base
leading-relaxed
```

#### 5. Depth note refinement

For the small “Answer 1 additional question…” line:

- reduce mobile tracking slightly
- keep it visually secondary to the main detail
- maintain brass accent color

Expected direction:

```text
mt-2.5 sm:mt-3
text-[9px] sm:text-[10px]
tracking-[0.13em] sm:tracking-[0.2em]
leading-snug
```

#### 6. Add a focused regression check

Update `src/pages/AssessReport.e2e.test.tsx` to protect the compact mobile typography classes for the report-page unlock card, similar to the existing CTA mobile-safe sizing test.

The test should confirm that the individual unlock headline and surrounding intro elements render with the intended compact/mobile classes.

### Files to edit

- `src/components/aioi/DeepDiveUnlock.tsx`
- `src/pages/AssessReport.e2e.test.tsx`

### Acceptance criteria

The change is complete when:

- On mobile, the eyebrow, headline, detail, and depth note feel visually grouped.
- The headline remains the dominant element without feeling oversized or detached.
- The detail copy reads comfortably and sits closer to the headline.
- Tablet/desktop typography remains consistent with the current design.
- Existing anonymous email-gate behavior and CTA sizing remain unchanged.
- A regression test protects the compact typography hierarchy.
