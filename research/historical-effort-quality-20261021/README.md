# Historical effort quality: separate fixed experiment

**Result: no ranking changes. Do not promote the adjustment.** This test establishes source extraction and narrow coverage, not an accuracy benefit or a rejection of the broader historical-effort hypothesis.

Use the same 124 previously analyzed DRF development races, 22 cards and 921 experienced runners as the context experiment. This is repeatedly exposed development data, not blind or independent validation. Seventeen blank-program races remain excluded. Zero sealed holdouts were opened or used. Production models, weights and site behavior remain unchanged. MIX1 is excluded.

## Isolation and fixed rule

Compare current frozen Contender with that same score plus one bounded historical-quality reward. Keep all 19 contributions, including the current context term, and trend unchanged. Do not substitute the failed replacement-context candidate, remove context, refit coefficients, add a new target-setup interaction, or search thresholds.

Consider the latest three historical rows, within 365 days and strictly before the target date, matching surface and within 0.5 furlong. Require at least two rows with usable five-slot calls. Weight the selected rows 0.5/0.3/0.2, with no rescaling for missing or unqualified rows and no replacement of a malformed selected row by older favorable evidence. Unsupported distances/surfaces are withheld. Dirt history is conservatively restricted to Aqu/BAQ/Sar/Bel/CD/Kee; turf requires an explicit course glyph. Target distance is decoded in 114/124 races. This restricted whitelist sacrifices coverage to avoid ambiguous historical surface mapping.

Reward a selected line only when its finish is top three and within three lengths, and either:

* **Early resilience against flow:** historical C/circled C; positions at both middle pre-stretch printed checkpoints are first or second and within two lengths of the lead.
* **Late gain against flow:** historical S/circled S; both middle checkpoints are fourth or worse and at least two lengths behind; improves at least two places and two beaten lengths from the third printed checkpoint to the finish.

Add `0.05 * sum(row_weight * qualifies)` Contender score points. This is a score increment, not a probability increment. No penalty for unmarked/unknown flow, no extra multiplier for extreme symbols. Winner lead margins are never counted as beaten lengths. Head/neck labels can satisfy bounds without assigning invented numerical lengths; uncertain small-margin labels remain unresolved. Five-slot values are not universally labeled Start/quarter/half: use raw slots 2 and 3, stretch and finish, preserving the distance-dependent call-label correction.

The protocol was saved before replay, source review and target-outcome grading. All target outcomes had already been historically exposed; freezing now does not make this independent validation. Scoring inputs and predictions were persisted before the new evaluation join.

## Source verification

The [DRF symbol explanation](https://www.drf.com/news/new-symbols-more-clearly-define-race-shape-feature) and [DRF FAQ](https://www.drf.com/news/drf-race-shape-symbols-frequently-asked-questions) support evaluating runners against historical flow. Symbols describe which style benefited, not fractional pace speed; absence does not establish neutral flow. Only completed historical race symbols are inputs, never the target race's post-race shape.

Verified the PDF encoding against original rendered source rows: `S` = favored speed; `ÿ` = circled S/extremely favored speed; `C` = favored closers; `ý` = circled C/extremely favored closers. All 12 rewarded row occurrences were visually checked for source calls/margins, shape, surface and historical distance. This is not a visual certification of every unrewarded row. Each occurrence has PDF hash/page/y, horse/date and expected values in `source-review.json`; the review is bound to the prediction-freeze hash and enforced before grading. One Carmel Coast historical effort repeats across two target cards: 12 rewarded occurrences represent 11 unique horse/history events.

## Coverage

| Measure | Count |
|---|---:|
| Target races / runners | 124 / 921 |
| Runners with at least two usable matched historical rows | 449 |
| Selected historical row occurrences | 1,473 |
| Selected rows with decoded flow | 400 |
| Runners receiving a nonzero reward | 12 |
| Early resilience rewards | 11 |
| Late gain rewards | 1 |
| Races with a nonzero score adjustment | 12 |
| Races with an altered ranking | 0 |

The narrow rule supplies very little direct evidence about closers. Do not equate missing qualifying history with weak ability. The other history may be unmarked, outside strict matching, unresolved, too old, or fail the specific rule.

## Results

| Metric | Current Contender | Plus historical quality |
|---|---:|---:|
| First-choice winners | 26/124 | 26/124 |
| Winner in first four | 95/124 | 95/124 |
| Top-four horses covered | 329/496 | 329/496 |
| Exactas in order | 7 | 7 |
| Trifectas in order | 3 | 3 |
| Superfectas in order | 2 | 2 |
| Actual-top-four pairs ordered correctly | 435/744 | 435/744 |
| Underneath pairs ordered correctly | 218/372 | 218/372 |

Individual rewards were 0.01–0.025 points. Four rewarded runners were already first; every other reward was smaller than the score gap to the next higher runner. `rewarded-horses.csv` records those gaps and the results without using them to retune the cap. Paired differences are exactly zero; the retained descriptive card bootstrap degenerates to [0,0] because the predictions are identical. That is not evidence of equivalence or a confidence statement about the broader idea.

## Surface consistency flags

Frozen parent metadata labels BEL_2026-10-17 R2/R4/R7 `Synth`, while the archived PP card metadata says `Turf`. All 19 runners in these three races receive zero new adjustment; original baseline orders are preserved. This comparison does not adjudicate a possible later surface change or silently repair earlier scoring. Those metadata versions must be reconciled with the original race conditions/chart/change record before a future surface-dependent experiment relies on them. The six cards without an archived PDF hash retain the prior audit's explicitly limited filename/date/header/summary evidence; no claim of historical byte equality is added.

## Decision and next step

Keep the live models unchanged. Retain the historical-flow evidence as a separately auditable research input. First resolve the three target-surface discrepancies and improve certified historical evidence coverage, especially late efforts, before defining another frozen test. Do not increase this reward merely to force a ranking change after seeing these outcomes. No claimed gain, no automatic next grid, no holdout access.

## Reproduction and artifacts

`protocol.json` fixes the hypothesis and thresholds. `prediction-freeze.json.gz` includes source-referenced selected history, unchanged parent contributions/trend, evidence decisions and both orders; no target results. `results.json.gz` adds actual top-four results and every per-race metric. `SUMMARY.json`, `race-comparison.csv`, `rewarded-horses.csv` and `target-metadata.json` provide compact review paths. `HASHES.json` hashes the saved artifacts.

The script imports shared grading/bootstrap functions from sibling `contender-context-replacement-20261021/experiment.py` (local alias `contender_context_experiment`). Its parent freeze is sibling `drf-pace-comparison-20261021/feature-freeze.json.gz` (local alias supplied by the previous experiment). Building from PDFs additionally requires the allowlisted source audit's full local raw audit and original archived parsed cards; those inputs are not silently rediscovered or replaced. Evaluation and the frozen evidence checks replay from the committed freeze, source-review and parent artifacts.

Run `python experiment.py grade`, then `python -m unittest discover -s . -p 'test_*.py' -v` from this directory. **18 tests pass**, covering against-flow versus aided efforts, unknown shapes, lead versus beaten margins, uncertain labels, insufficient history, strict distance/surface, no future/same-day history, no favorable-line substitution, unchanged context/contributions/trend, all 124 baseline orders, frozen evidence and every recorded outcome metric. These checks validate the experiment implementation; they do not establish predictive improvement.
