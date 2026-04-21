

## Align Benchmarks Pillar breakdown rows with the Deepgrain `PillarBarChart` grammar

### What's inconsistent today

The `/benchmarks` "Pillar breakdown" list (`src/pages/Benchmarks.tsx`, lines 677–713) uses a bespoke 12-col grid with a tiny `P{n}` chip in `sm:col-span-1`, while the canonical `PillarBarChart` (used in the Assessment report and the Deepgrain hero strip) uses a flex row with a fixed-basis label column (`sm:basis-[max(110px,22%)] sm:shrink-0`) and absolutely-positioned `0…5` axis labels above the track. The bespoke `PillarComparisonBar` inside each row also only shows `0` on the left and a delta text on the right — there is no proper `0 / 5` axis under the bar to mirror the chart's axis header.

Result: at every breakpoint the P-prefix column width drifts (too cramped on tablet, too wide on mobile because of the inline chip), and the bar's "axis" reads as "0 ··· delta" rather than the consistent `0 1 2 3 4 5` cadence seen elsewhere.

### Fix — single file, two surgical edits

`src/pages/Benchmarks.tsx`

**1. P-prefix column sizing (lines 682–697)**

Drop the 12-col grid in favour of the same flex layout `PillarBarChart` uses, with a unified label slot that absorbs the P-prefix:

```tsx
<li
  key={p.id}
  className="flex flex-col gap-y-2 sm:flex-row sm:items-center sm:gap-x-4 py-5 sm:py-6 border-b border-cream/10"
>
  {/* Label column — same basis as PillarBarChart so columns line up */}
  <div className="flex items-baseline gap-x-2 min-w-0 sm:basis-[max(140px,24%)] sm:shrink-0">
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40 tabular-nums shrink-0 w-[2.25rem]">
      P{p.id}
    </span>
    <span className="font-display text-base sm:text-lg text-cream/90 leading-tight break-words">
      {p.name}
    </span>
  </div>

  {/* Bar + score share the remaining track, with score pinned right */}
  <div className="flex items-center gap-x-3 sm:gap-x-4 flex-1 min-w-0">
    <div className="flex-1 min-w-0">
      {view ? (
        <PillarComparisonBar median={v} user={yours} pillarName={p.name} />
      ) : (
        <span className="font-mono text-[10px] text-cream/30 uppercase tracking-[0.2em] sm:tracking-[0.22em]">
          no data
        </span>
      )}
    </div>
    <span className="text-right font-display text-lg sm:text-2xl tracking-tight text-brass-bright tabular-nums w-[2.5rem] sm:w-[3rem] shrink-0">
      {view ? v.toFixed(1) : "—"}
    </span>
  </div>
</li>
```

This:
- Gives the `P{id}` token a fixed `w-[2.25rem]` slot at every breakpoint, so the eight `P1…P8` labels stack in a perfect column on mobile **and** desktop instead of jittering.
- Removes the redundant inline duplicate `P{n}` chip from the name span.
- Adopts the same `sm:basis-[max(140px,24%)] sm:shrink-0` rhythm as `PillarBarChart` so the bars start at the same x-coord across both pages.

**2. 0 / 5 axis labels under the bar (lines 219–286 in `PillarComparisonBar`)**

Replace the lone `0` + delta footer with a proper axis row that mirrors the `PillarBarChart` axis cadence:

```tsx
<div className="mt-1.5 relative h-3 font-mono text-[9px] uppercase tracking-[0.2em] text-cream/35">
  {[0, 5].map((t) => (
    <span
      key={t}
      className="absolute top-0 -translate-x-1/2 tabular-nums"
      style={{ left: `${(t / max) * 100}%` }}
    >
      {t}
    </span>
  ))}
</div>
{delta != null && (
  <div className="mt-1 flex justify-end font-mono text-[9px] uppercase tracking-[0.2em]">
    {/* existing delta tooltip button, unchanged */}
  </div>
)}
```

This:
- Anchors `0` and `5` at exactly `0%` and `100%` of the track (matching `PillarBarChart`'s axis).
- Splits the delta caption onto its own row so it never collides with the `5` label on narrow phones.
- Keeps the existing tooltip behaviour, only its container wrapper changes.

### What stays the same

- `PillarComparisonBar`'s bar visuals (median fill, ticks, "You" marker) — untouched.
- The section heading row, legend chips, filters, and the "Resume scan" CTA — untouched.
- Desktop right-aligned filters, mobile-left filters from the previous fix — untouched.

### Verification

Reload `/benchmarks` at 375px, 768px, and 1280px:
- All eight `P1…P8` tokens align in a vertical column at every breakpoint.
- Pillar names start at the same x as the chart axis labels in the report (`PillarBarChart`).
- Bar axis reads `0` ··· `5` with the `5` flush at the bar's right edge, mirroring the report chart.
- Delta caption sits on its own row, never overlapping the `5`.

### Files touched

- `src/pages/Benchmarks.tsx` (rows 219–286 inside `PillarComparisonBar`, and rows 682–712 inside the breakdown list).

