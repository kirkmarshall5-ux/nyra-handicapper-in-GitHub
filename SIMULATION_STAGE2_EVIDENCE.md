# Stage 2 — Historical PP Evidence Inventory and Chart Pairing

## Confirmed source inspection (2026-10-10)

This is a **limited sample inspection**, not a complete card audit or verified historical race dataset.

| DRF source | Inspection | Verified observations | Still unverified |
|---|---|---|---|
| `BEL--10-10-2026 2.pdf` | pages 2–3 of 26 | Horse-specific TimeformUS Early/Late values, career starts, historical date/track/distance, race fractional times, past call position/margin strings, prior finishing order; some first-time starters have no prior race lines | Exact machine-readable mapping of all call columns; full-field matching; today's official results |
| `SAR--08-31-2024.pdf` | pages 3–4 of 35 | Prior running-line positions and fractional times; TimeformUS pace values; first-time starter entries | Exact machine-readable column mapping; historical official result chart pairings |

### Concrete evidence excerpts (for internal verification)
- Belmont card, page 2: Louisiana Baby prior Saratoga 6f running line `7æ26= 7Sar fst 6f 22§ :46 :57©1:10¦ ... 3 /12 6 3¦ 4¦ô 5¬ô 7¦¬`. This **looks like** a sequence of past-call positions and margins; columns and DRF fraction glyphs must be decoded against source layout before labeling.
- Belmont card, page 3: Ice Chocolat (Brz), historical Saratoga 1 1/16m turf line `23Ý26= 1Sar fm 1Âê 23© :47¨1:11©1:41 ... 2 /7 1§ 1§ô 1¦ 1¦ 2ô`; TimeformUS Early 99 Late 74. This is a historical race *within* the 2026-10-10 PP, not an official 2026-10-10 result.
- Saratoga card, page 3: Authentic Gallop historical 6f line `20Û24= 7Sar fst 6f 22¨ :46¦ :58©1:12¦ ... 2 /9 2 1¦ 1ô 4¦ô 7¤ô`. Illustrates why position changes need to be modeled; not a verified complete chart.

### Confirmed official chart source
Equibase describes **Full Charts** as free PDFs with points of call, fractional/split times, race conditions and footnotes:
- https://www.equibase.com/products/whatisfullcharts.cfm
- Historical chart directory: https://tvg.equibase.com/static/chart/pdf/index.html

**No complete official result chart has yet been independently matched and verified to one of the source PP race cards.** Do not report race-level validation statistics until pairing is complete.

## Evidence pipeline
1. Inventory PP text and preserve **raw past-performance lines** with page/line provenance. `simulation-evidence-inventory.js` detects candidates but deliberately **does not claim** it has decoded fractional running positions.
2. Record race identity, date, distance, surface and condition; distinguish **target race** from prior races referenced inside a PP.
3. Acquire the actual official result chart for the **target race**, not a past running line, with document URL and retrieval timestamp. Confirm permission for any automated ingestion.
4. Reconcile runner names, program numbers, field size, scratches, AE/MTO, dead heats, DNF, coupled entries, and turf-to-dirt changes. Track the official call markers for that exact distance and chart; they may not be the same across all races.
5. Manually verify column mapping for a pilot sample, including fractional glyphs, positional digits and beaten-length symbols, before automating extraction.
6. Preserve **pre-race** predictions and artifacts, with hashes and timestamps, separately from later chart observations. Stage 1 validator only accepts fully verified paired records.

## Pilot scope and next gate
Start with **two small pilot cards**: Saratoga 2024-08-31 and Belmont 2026-10-10. The 2026-10-10 card is a pre-race source as of this audit and is **not** yet eligible for official-result grading. Select straightforward flat dirt races before turf, surface switches, and hurdles. Inventory each race's runners and source-call coverage, obtain official charts after they exist, and record a manual gold-standard mapping. Do not assume all DRF text extraction can be parsed safely without source layout verification.

**Acceptance for Stage 2 completion:** at least one audited race with source PP, independent official chart, fully reconciled runners and chart calls, verified running-position mapping, and explicit handling of ambiguous statuses. Stage 2 is **in progress**, not complete.

All work remains research-only; locked V4.4c, PASS and wagering are unchanged.
