
Wrap the existing specificity hint line in `BenchmarkSliceCard` with a Radix tooltip that explains all four match levels, so users understand what "Most-specific match · function + region" actually implies versus the broader fallbacks.

## Behaviour

- Hover (or focus, for keyboard users) on the hint text → tooltip appears below.
- Tooltip body is a compact 4-row legend, with the current match level highlighted in brass so the user can see where they sit.
- A small `(?)` glyph is appended to the hint line to advertise interactivity (otherwise nothing signals it's