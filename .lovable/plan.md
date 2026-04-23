
## Plan to fix DeepDiveUnlock CTA sizing on mobile

### Goal

Make the `Continue Deep Dive` button in `DeepDiveUnlock` fit cleanly on small screens, stay easy to tap, and avoid awkward wrapping or cramped icon/text spacing.

### What will change

#### 1. Adjust the CTA row layout for mobile

In `src/components/aioi/DeepDiveUnlock.tsx`, update the authenticated CTA container so mobile uses a stacked, full-width layout:

```text
Mobile:
[ Continue Deep Dive           → ]
[ lock note below ]

Tablet/desktop:
[ Continue Deep Dive → ] [ lock note ]
```

This keeps the primary action visually strong on phones without squeezing the button and helper text into the same row.

#### 2. Make the button mobile-friendly

Update the button classes so it:

- is full-width on mobile
- has a minimum touch height of at least `48px`
- uses slightly tighter letter spacing on the smallest screens
- keeps the icon inline without forcing text wrapping
- returns to compact auto-width sizing on `sm` and larger screens

Expected class direction:

```text
w-full sm:w-auto
h-12 min-h-12
px-5 sm:px-7
text-[11px] sm:text-xs
tracking-[0.14em] sm:tracking-[0.18em]
```

#### 3. Prevent awkward text/icon wrapping

Wrap the button label and arrow in an inner inline-flex span so the CTA contents stay aligned:

```text
Continue Deep Dive →
```

The button itself can be full width, but the label/icon group should remain visually centered and unbroken.

#### 4. Tune the lock helper text below the button

On mobile, make the “No new login · resumes this same report” note sit beneath the button with:

- smaller tracking
- comfortable line-height
- no forced horizontal squeeze
- centered or left-aligned consistently with the card layout

On larger screens it can remain inline beside the CTA.

#### 5. Add a small regression test

Update `src/pages/AssessReport.e2e.test.tsx` or add a focused component test to verify the rendered `Continue Deep Dive` link includes mobile-safe classes such as:

```text
w-full sm:w-auto
min-h-12 / h-12
```

This protects against reverting to the previous cramped inline button layout.

### Acceptance criteria

The change is complete when:

- On mobile, `Continue Deep Dive` appears as a full-width touch-friendly button.
- The CTA text and arrow do not wrap awkwardly.
- The helper lock note no longer competes with the button horizontally on small screens.
- Desktop/tablet layout remains visually similar to the current compact row.
- Existing anonymous email-gate behavior is unchanged.
