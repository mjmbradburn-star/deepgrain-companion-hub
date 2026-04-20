
Add a `Last refreshed` line to the `BenchmarkSliceCard` header, sourced from `slice.row.refreshed_at` (already on the row, no schema/query changes needed).

## Placement & format

Right side of the header, beneath the existing `n = …` count, so the meta column reads:

```text
n = 1,093
Refreshed 2 days ago
```

- Format relatively (`just now`, `5 min ago`, `2 days ago`, `3 weeks ago`) via a tiny inline helper — no new dependency.
- Same mono micro-caps style as the `n =` line (`font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40`).
- Tooltip / `title` attribute carries the absolute ISO timestamp for hover detail.
- If `refreshed_at` is missing, render nothing (graceful).

## File touched

- `src/components/aioi/BenchmarkSliceCard.tsx` — add helper + one extra `<p>` in the header's right-hand block.

No DB, no other components, no API.
