# Finger Lakes 2026-11-17 — Races 2–9 Brisnet PP source extraction

**Status:** PDF SOURCE EXTRACTION COMPLETE; independent freeze/parser reconciliation and device certification outstanding.

Source: original user-uploaded `flx1117p.pdf` (23-page Brisnet Premium Plus card). The companion exported CSV `FL_2026-11-17_Pace_Source_Audit_R2-R9.csv` was generated in the analysis workspace and is supplied separately in the conversation; it has not been added to the repository.

## Coverage of printed qualifying pace lines

| Race | Distance | Extracted matched E1/E2/LP | PDF pages |
|---|---|---|---|
| 2 | 1m70yds | 6/6 | 3–4 |
| 3 | 1m | 6/6 | 5–6 |
| 4 | 5.5f | 7/7 | 7–8 |
| 5 | 1m70yds | 9/9 | 9–11 |
| 6 | 5.5f | 7/7 | 12–13 |
| 7 | 5.5f | 7/7 | 14–15 |
| 8 | 1m70yds | 10/10 | 16–18 |
| 9 | 5.5f | 11/11 | 19–22 |

**Total: 63/63 horses with source-extracted matching historical pace lines in R2–R9.** These are printed entries, not independently scratch-verified active runners.

## Method and caveats

The extraction used the five most recent printed PP race lines for each horse, selecting the first historical line before 2026-11-17 within 365 days, on dirt, same sprint/route category, and no more than 0.5 furlongs from today's distance. Brisnet symbols for 1m70yds, 1 1/16m, and half-furlong distances were normalized for matching. Values were extracted from the printed E1 E2/LP columns. Race 4 #1 Nice Try Cat prints E2=6 (single digit), not 60 or missing; the extraction explicitly accepts this.

The extracted pace figures must still be checked against the actual imported frozen JSON and the current `brisnetPaceDisplay` function's behavior. The exported rows show the chosen source line and all first-five source lines to make spot checking and parser reconciliation possible. This extraction alone does not validate that the chosen PP lines were parsed into the browser correctly or that all runners were active after scratches. It does not establish historical win rates, variant comparisons or ROI.

Race 1 remains 5/6 qualifying lines due to Paschal Moon's all-weather-only latest five starts. Do not substitute unmatched surface lines.

**Next gate:** compare the 63 extracted source rows to the frozen horse-level records and matched-line output, resolve any discrepancies, apply active-runner/scratch eligibility, and run A/B/C/D only on identical fully eligible fields.
