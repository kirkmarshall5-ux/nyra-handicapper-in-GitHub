# Four-variant Hidden Winner common-field retest — Finger Lakes 2026-11-17

Status: **Exploratory retrospective result; not certified for merge/publish.** Live RR models untouched.

Inputs: corrected source starter audit v2 (Brisnet PP extraction), frozen `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json` RR rankings, and official Equibase result chart `FL111726USA(1).pdf`. The generated analysis outputs `FL_2026-11-17_Four_Variant_Exploratory_Runner_Screen.csv`, `FL_2026-11-17_Four_Variant_Exploratory_Summary.csv` and `hidden_winner_four_variant_retest.py` were delivered separately in the conversation, not added to this branch.

Eligibility: every official starter must have a frozen RR rank and a source-derived qualifying pace measure. Races 2,3,5,6,8,9 pass. R4 and R7 fail incomplete RR coverage (R7 also has an FTS with no historical pace). R1 fails incomplete pace coverage. Official scratches excluded.

Screen: RR ranks #3/#4 with a gap <=3 to the best source pace measure in the complete active field. A=E1; B=E2; C=E1 sprint/E2 route; D=(E2+LP)/2 using values from the same selected source PP line. No form stability test, no bet selection changes.

| Variant | Eligible races | Flagged runners | Winners flagged | Second-place runners flagged |
|---|---:|---:|---:|---:|
| A E1 | 6 | 2 | 0 | 1 |
| B E2 | 6 | 5 | 0 | 3 |
| C distance-based | 6 | 5 | 0 | 3 |
| D E2+LP | 6 | 4 | 0 | 2 |

The observed equivalence of B and C is a *sample property*, not evidence that sprint E1 and E2 are generally equivalent. No variant improved winner detection on this small sample. No ROI is reported because this screen does not produce independent wager selections. Exacta-companion counts are not exacta wins.

Critical unresolved certification items: independent original PP line-to-imported parser comparison; complete Hidden Form logic; frozen pre-race reproducibility; physical Dell Chrome/iPad UI testing; recorder JSON download, single-race isolation and timezone freeze defects; CI/PR review. Keep PR in draft, do not merge/publish.
