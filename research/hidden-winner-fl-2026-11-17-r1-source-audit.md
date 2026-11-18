# Finger Lakes 2026-11-17 — Race 1 manual PP pace-source audit

Status: SOURCE CHECK COMPLETED FOR SIX HORSES; LIVE RENDER AND PARSER REPRODUCTION NOT CERTIFIED.

Source: user-supplied original `flx1117p.pdf`, pages 1–2, Brisnet Premium Plus, Finger Lakes R1, dirt 6f, 2026-11-17. These are manual transcriptions of the first qualifying line within the latest five published starts, based on the current `brisnetPaceDisplay` matching rules: Brisnet source, earlier than race day, within 365 days, same surface, sprint category, and distance within 0.5 furlongs. The actual parsed import has not been compared to the PDF.

| Program | Horse | First qualifying PP line | E1 | E2 | LP | PP page | Notes |
|---|---|---|---:|---:|---:|---:|---|
| 1 | Muscle Shoals | 2026-11-09 FL 6f dirt | 92 | 96 | 74 | 1 | eligible |
| 2 | Skyler's Starship | 2026-09-15 FL 6f dirt | 82 | 85 | 87 | 1 | 2026-10-26 1m is not sprint |
| 3 | Paschal Moon | none in first five | — | — | — | 1 | five most recent starts are Presque Isle Downs all-weather; no dirt-matched line in first five |
| 4 | Isomarshall | 2026-11-09 FL 5.5f dirt | 78 | 58 | 51 | 2 | 5.5f is within 0.5f of today's 6f |
| 5 | Not for Hire | 2026-10-07 FL 5.5f dirt | 85 | 91 | 76 | 2 | 2026-10-26 1m route excluded |
| 6 | Lord King | 2026-11-09 FL 5.5f dirt | 98 | 99 | 76 | 2 | eligible |

## Certification outcome
- Race 1 matched E1/E2/LP coverage = **5/6** horses. Under strict full-field screening, **withhold all four Hidden Winner variants** for this race, even though individual pace values exist for five horses.
- Source Prime Power values: #1 121.0, #2 115.9, #3 120.1, #4 97.7, #5 116.0, #6 125.9. They match the stored freeze's Race 1 Prime Power fields.
- The presence of a synthetic-to-dirt runner with no qualifying line in the five-line window is a real coverage limitation, not a zero pace figure. Do not fill from older or unmatched races.
- This document does not certify that the web parser extracted these exact figures, that scratches were applied, or that the selector renders properly on Dell Chrome/iPad.
- Do not count this race in variant hit-rate, exacta or ROI comparisons without an explicitly documented alternate eligibility rule.

Next: audit R2–R9 matched pace lines against source pages; then compute a same-race four-variant comparison and validate in browser.
