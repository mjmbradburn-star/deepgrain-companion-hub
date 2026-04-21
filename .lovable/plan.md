

## Overflow-safe Select & Popover on small screens

Right now `SelectContent` and `PopoverContent` use Radix defaults — fixed widths, no collision padding, no viewport-aware height — so on phones they can:

- spill past the card or screen edge,
- cover the trigger and adjacent inputs instead of flipping,
- exceed the viewport height with no inner scroll.

This is a one-shot primitive fix that benefits every Select/Popover site-wide without touching call sites.

### Changes

**`src/components/ui/select.tsx` — `SelectContent`**
- Add `collisionPadding={12}` and `sideOffset={6}` so it never touches the viewport edge.
- Add `avoidCollisions` (default true, made explicit) and `position="popper"` already in place.
- Constrain size with Radix CSS vars:
  - `max-h-[min(24rem,var(--radix-select-content-available-height))]`
  - `w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)]`
- Ensure `Viewport` scrolls: keep `overflow-y-auto` on content, drop the fixed `h-[var(--radix-select-trigger-height)]` rule on the viewport (that line forces height to a single row and breaks scrolling for long lists).

**`src/components/ui/popover.tsx` — `PopoverContent`**
- Add `collisionPadding={12}`, keep `sideOffset={4}`.
- Replace fixed `w-72` with `w-[min(18rem,calc(100vw-1.5rem))]` so it shrinks on narrow screens.
- Add `max-h-[min(80vh,var(--radix-popover-content-available-height))] overflow-y-auto`.

**`src/components/ui/dropdown-menu.tsx` (audit + same treatment)**
- Apply the same `collisionPadding`, `max-h`, and `max-w` clamps to `DropdownMenuContent` and `DropdownMenuSubContent` for parity (used by the share/download menu in `AssessReport`).

### Verification

After the edit, at 360×800: open the Benchmarks filter pills (no Select today, but verify), the share popover on `/assess/report`, and any in-form Select. Confirm content stays inside the viewport, flips above the trigger when there's no room below, and scrolls internally when option lists are long.

### Files touched

`src/components/ui/select.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/dropdown-menu.tsx`.

