# Research-only B/C negative-Speed counterfactual — FL Race 4, 2026-11-17

## Inputs inspected
Original Brisnet Premium Plus `flx1117p.pdf`, official Equibase chart `FL111726USA(1).pdf`, frozen `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json`, and `brisnet-models.js`.

## Pre-race source facts
| Horse | Starts before card | Only prior line | Speed | Brisnet running comment | Official Nov 17 finish |
|---|---:|---|---:|---|---:|
| #1 Nice Try Cat | 1 | 2026-10-20 FL 5.5f | -18 | Broke two lengths slow; outrun | 7th |
| #7 Winning Rose | 1 | 2026-10-20 FL 5.5f | -1 | Poor start, raced wide | 5th |

Official Nov 17 chart notes Nice Try Cat **hit the gate at the start** and Winning Rose **hard to load, broke slowly**. Neither horse's source record supports a claim of losing the rider, pulling up, or failing to finish. The negative Speed figure is an actual printed figure, not by itself proof of a failed finish.

## Counterfactual definitions and outcomes
- **A baseline:** strict source validation in `brisnet-models.js` rejects a negative Speed, leaving both horses unranked.
- **B ignore negative Speed:** treat negative Speed as missing for scoring but retain the historical race's date and evidence. Because each horse has **only one career start**, there is no older verified positive Speed to replace the missing latest figure. The model's mandatory latest-Speed input remains unavailable. **Both remain unranked; no rank or ROI change is computable under current eligibility.**
- **C abnormal-race adjustment:** use documented abnormal finish/nonfinish evidence before excluding a whole line, and otherwise flag the bad start for review. Their *prior* running-line comments describe poor starts, not proven nonfinish; no second historical line exists regardless. **Both remain unranked.** No arbitrary numeric imputation.

## Interpretation
This is a **two-horse eligibility counterfactual**, not a scored alternative full-field rerank or ROI trial. It provides no evidence of an improvement in winners or exactas. Do not claim either B or C is validated across historical cards. Keep live Brisnet RR unchanged.

## Resume pace project gates
1. Compare 0.5f research pace-display tolerance with 1f RR scoring tolerance; label/segregate both, preserving RR.
2. Complete same-line provenance and full Hidden Form screen on eligible frozen races; separately track RR-incomplete and FTS races.
3. Execute committed JS regression tests and independently verify source-to-imported lines.
4. Dell Chrome/iPad browser and freeze recorder checks, CI, PR review before merging or publishing.
