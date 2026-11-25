# Controlled Contender replacement-context experiment

**Result: this fixed bounded replacement did not beat the no-context control. Do not deploy it or increase its cap on the basis of this replay.** This is one exploratory candidate on repeatedly analyzed development races, not an independent validation of pace theory.

## Population and controls

Reuse exactly the 124 current-gate-passing DRF races on 22 cards, 921 experienced runners, from the prior frozen feature comparison. Seventeen blank-program races remain excluded. The current Contender order is reproduced for every included race. All three arms use identical fields, input values, outcome mappings, retained coefficients, trend and name-based tie-breaking.

1. CURRENT_CONTENDER: all frozen parent contributions, including its original context feature 8.
2. NO_CONTEXT: zero only feature 8; all other terms retained.
3. BOUNDED_REPLACEMENT: NO_CONTEXT plus the one replacement specified below.

V4.4c, Finisher, production Contender, PASS behavior, probability calibration and betting permissions remain unchanged. MIX1 and Brisnet do not enter this experiment. All 30 sealed holdout PDFs remain unopened and unused.

## Frozen replacement rule

The primary Step 2 cutoffs are retained: a five-point top-Early cluster and a ten-point clear Early gap. All Early values must be available and all runners experienced. Otherwise withhold the whole-field replacement; the candidate still removes the old context, so it equals NO_CONTEXT in those fields.

- **Pressure proxy:** when the top-two gap is at most five points, calculate (number within five points of the highest Early minus one) / (field size minus one). Multiply this by each horse's centered Late percentile in [-1,+1], then by 0.05. Strong relative Late benefits; weak relative Late receives a relative penalty. Missing Late or a flat Late field is neutral.
- **Early-advantage proxy:** when the top-two Early gap is at least ten points, give only the uniquely highest-Early horse 0.05 × min(1, gap/20).
- The branches are mutually exclusive. The absolute replacement is therefore bounded at **0.05 Contender score points**, not five percentage points of weight or win probability. The cap is an exploratory small term chosen before this replay, not optimized.

The replacement uses verified summary figures as provisional setup evidence. The running styles and actual-tempo labels required for a certified duel/lone-lead forecast remain unverified. This experiment deliberately tests the rating-based proxy; it does not claim those stronger conditions are known. No extra style label, raw Late-minus-Early energy measure or historical result enters its prediction inputs.

Direct speed, Early and Late contributions stay intact. Replacing context can therefore still reinforce an existing early/late preference; it is not a new assessment of overall ability. No coefficient is refitted, and no parameter grid or second candidate is tested.

## Main results

All three arms use the same 124 races. Pair ordering counts the six comparisons among the actual first four; all four actual finishers have numerical ranks, for 744 comparable pairs.

| Arm | First-choice winners | Winner in top four | Exactas | Trifectas | Superfectas | Correct top-four pairs | Mean top-four rank error ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|
| Current Contender | 26 | 95 | 7 | 3 | 2 | 435/744 | 1.954 |
| No context | 29 | 93 | 8 | 3 | 2 | 438/744 | 1.942 |
| Bounded replacement | 28 | 94 | 7 | 3 | 2 | 436/744 | 1.946 |

Correct top-four set coverage totals: current 329 horses, no context 327, replacement 328, out of 496 possible. Correct exact-position hits for places 1–4: current [26,24,21,12], no context [29,24,22,12], replacement [28,23,22,12]. Underneath order among actual places 2–4: 218/372, 218/372 and 217/372 respectively.

The no-context control leads winner and pair-order counts here, but its winner-in-four and set coverage are below current Contender. This is not a blanket deployment recommendation to remove context either.

## What the replacement actually added

Relative to NO_CONTEXT:

- Pressure proxy active in 49 races; ranking order changes in four. No winner gain/loss; one net top-four pair lost.
- Early-advantage proxy active in 50 races; ranking order changes in six. One winner lost, none gained; one net top-four pair lost.
- No trigger in 23 races; replacement withheld in two incomplete-Early fields.
- Nonzero replacement in 99 races; only ten full rankings change. Pair ordering improves in one race, worsens in three, and is unchanged in the other 120.

The key adverse case is **Saratoga June 5 R4**. NO_CONTEXT orders 3–1–5–4–2–6. The early bonus changes that to 1–3–5–4–2–6 against actual 3–1–4–2. This loses the winner and exacta that removing the old context had recovered. It illustrates why a large Early-rating gap cannot automatically be treated as a usable finishing advantage.

In Belmont October 17 R1, the pressure/Late branch changes the relative order of actual third/fourth finishers #4/#5 in the wrong direction, although the winner/exacta stay intact. Other moves sometimes occur outside the first four predictions; the report grades only actual known places and does not invent the rest of the finishing order.

Compared with current Contender, the replacement gains two first-choice winners, loses none, and adds one correctly ordered pair. Those small aggregate gains are weaker than simply removing the old context. Comparing only against current would incorrectly credit the new term for benefits largely produced by removal.

## Uncertainty and interpretation

The replacement-minus-no-context pair-accuracy difference is -2/744, about -0.27 percentage points. A descriptive whole-card bootstrap interval spans approximately -0.76 to +0.26 percentage points. It does not establish an improvement. These intervals are on selected reused development races, not independent evidence.

The result rejects this particular fixed replacement as an improvement over the no-context control in this sample. It does not prove late strength is unimportant, that a verified pace interaction cannot help, or that a larger bonus would work. Increasing the cap until a missed winner appears would turn this into outcome-driven tuning.

The next useful work is the missing evidence identified in Step 2: independently supported lead-seeking/tactical flexibility and valid tempo labels. Keep this failed candidate and its frozen settings intact for the research record. Any future candidate needs a separate version and a locked validation plan. Do not alter current production weights from these results.

## Reproduction and checks

- protocol.json: complete rules and cutoffs, written before this scoring replay; prior outcomes were already known, so no prospective claim.
- experiment.py: pure scoring whitelist, fixed three-arm replay, grading and paired whole-card uncertainty analysis.
- prediction-freeze.json.gz: exact whitelisted inputs and all three predicted score/order sets, saved before actual finishes are joined.
- results.json.gz: every race, trigger, delta, arm order and grade.
- SUMMARY.json, summary.csv and race-comparison.csv: all cohort summaries, safeguards and paired results.
- changed-races.json: the ten rankings changed by the replacement versus removal.
- HASHES.json: code/evidence identities.

Run python3 experiment.py and python3 -m unittest test_experiment.py from this directory. Reuse the existing sibling drf-pace-comparison-20261021/feature-freeze.json.gz and drf-setup-diagnostic-20261021/prediction-freeze.json.gz; do not open PP holdouts. The expected parent hash is enforced. No production model modules or unverified data sources are required.

Twelve tests pass: context-only removal, pressure/Late direction, cap, unique-leader bonus, mutual exclusivity, neutral setups, missingness/FTS, missing or flat Late, field size, source immutability, outcome irrelevance, parent tie-breaking, exact replay of every recorded ranking/grade and complete field coverage. The implementation reproduces all 124 original parent orders before making any change.
