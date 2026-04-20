
Mirror the function-level backfill we did earlier for `function` onto `company` and `individual` levels. For each of those two levels we'll cross-join the 9 function-only rows with the 6 region-only rows already in `benchmarks_materialised`, producing 54 combined rows per level (108 total). Each new row blends the function and region cohorts 60/40 on `median_score` and on each pillar tier in `pillar_medians`, giving respondents who set both fields a specificity-3 cohort match instead of falling back to function-only or region-only.

## Approach

Single SQL `INSERT … SELECT` per level, run via the data-insert tool (not a migration — this is data, not schema):

```text
for level in (company, individual):
  for (fn_row, region_row) in function_only × region_only at this level:
    insert combined row with:
      function       = fn_row.function
      region         = region_row.region
      size_band      = NULL
      sector         = NULL
      median_score   = round(0.6 * fn.median_score + 0.4 * region.median_score)
      pillar_medians = jsonb of {1..8: round(0.6*fn.tier + 0.4*region.tier, 1)}
      sample_size    = 60..220 (synthetic, deterministic via row hash)
      refreshed_at   = now()
```

Guard with `WHERE NOT EXISTS` so re-runs are idempotent and don't duplicate any combos already present.

## Verification

After insert, query:
```sql
SELECT level, COUNT(*) FROM benchmarks_materialised
WHERE function IS NOT NULL AND region IS NOT NULL
  AND size_band IS NULL AND sector IS NULL
GROUP BY level;
```
Expect: `company=54`, `function=54`, `individual=54`. No code changes needed — `fetchBestSlice` already prefers the function+region row.

## Files / surfaces touched

- Data only: `benchmarks_materialised` (108 new rows). No code, no schema, no UI.
