# Finger Lakes 2026-11-17 — source recovery and merge gate

Research only. Live Brisnet RR formula unchanged.

The original Brisnet Premium Plus PDF `flx1117p.pdf` was rechecked against the official Equibase chart `FL111726USA(1).pdf` and the source-to-freeze reconciliation.

- Race 2 #2 Fast Amendment: **2026-11-03, Finger Lakes 1 1/16 miles, dirt**, E1=70, E2=71, LP=79. This is within 0.5 furlongs of today's 1 mile 70 yards.
- Race 6 #4 Spicey Ticey: **2026-10-07, Finger Lakes 6 furlongs, dirt**, E1=92, E2=85, LP=52. This is 0.5 furlongs from today's 5.5 furlongs. The more recent 2026-10-24 7f race is outside the tolerance.
- Race 7 #6 Sugarpapi: **first-time starter, 0 career starts**. No historical E1/E2/LP exists; absence is correct, not a parser omission.
- Race 2 #7 Pure Realization, Race 8 #9 Eric From Miami and Race 9 #11 Valiant Warrior are official scratches, excluded from starter-only evaluations.

Revised R2–R9 official starter source coverage: 62/63 horses with qualifying source E1/E2/LP; 1/63 legitimate FTS without historical pace. **Do not describe this as 63/63 measured pace.**

## Merge / publish gate

**NOT READY TO MERGE.** Outstanding:
1. Confirm the recovered values and every other source line against the *imported* frozen horse-level data and rendered `brisnetPaceDisplay` metrics.
2. Resolve RR ranking incompleteness in R4 and R7; document PASS/FTS handling without filling missing figures or changing live models.
3. Run all four A/B/C/D variants on identical certified fields; D's E2 and LP must be evaluated for same-line provenance, since independently selected metric maxima may come from different starts.
4. Validate research UI and selector in Dell Chrome and iPad; confirm no regression in freeze/JSON recorder, isolation, timestamps, or live model selections.
5. Run available automated checks and obtain independent PR review/CI evidence before merging. Publication only after these gates pass.

The exported audit CSV is a separate conversation artifact and is not automatically part of the GitHub branch.
