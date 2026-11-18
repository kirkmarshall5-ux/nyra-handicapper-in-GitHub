# Finger Lakes Nov 17 source-to-freeze reconciliation — gate result

**Status: PARTIAL / BLOCKED.** Matched source CSV `FL_2026-11-17_Pace_Source_Audit_R2-R9.csv` was joined by (race, program number) to `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json` dashboard active fields and Brisnet RR ranks. Reconciliation CSV supplied in conversation as `FL_2026-11-17_Source_Freeze_Reconciliation.csv`.

## Exact join results
- 63 rows in original R2–R9 source audit.
- 60 rows match frozen active horse name by race and program number.
- Three source rows absent from the frozen active field: R2 #7 Pure Realization, R8 #9 Eric From Miami, R9 #11 Valiant Warrior.
- Three frozen active runners absent from source extraction: R2 #2 Fast Amendment, R6 #4 Spicey Ticey, R7 #6 Sugarpapi.
- R4 RR ranked 5 of 7 active horses; R7 RR ranked 7 of 8. Both are **incomplete**, so no fully covered variant screening even if printed pace lines exist.
- Race 1 separately has 5/6 qualifying historical pace lines; withhold all variants.
- These discrepancies must be resolved against scratches and the original PPs. Do not assume the three source-only horses were scratches, or that omitted active horses have no pace figure.
- The frozen research snapshot exposes dashboard rankings and field, **not the original horse-level `ratings.lines` input objects** needed to independently replay `brisnetPaceDisplay`. Therefore 60 matched names do not certify matching E1/E2/LP parsed values.

## Four-way comparison gate
**Not passed.** Do not compute A/B/C/D comparative win rates, exacta hits, or ROI from an incomplete or mismatched runner-level table. Before scoring, resolve the six discrepancies, obtain actual frozen/parsed E1/E2/LP line evidence, and apply identical full-field and active-runner eligibility to all four variants.

The original source audit's 63/63 figure describes extraction coverage for **its own included horses**, not coverage of the frozen active field. Do not label this a certified full-field source audit.

Live RR scoring unchanged. No deployment approval.
