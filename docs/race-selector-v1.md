# Race Selector v1: separate research layer

The selector identifies Dirt/Turf/Synthetic and sprint <8f versus route >=8f, runs after the three parent forecasts, and blends within-field rank percentiles. No parent score, model weight, probability conversion or betting rule is changed. Race Day shows a fourth research panel; the original three remain authoritative as their own models.

## Active benchmark

EQUAL-THIRDS-v1: V4.4c 1/3, Contender 1/3, MIX1 1/3. Parent rank r among N entrants becomes 100*(N-r)/(N-1), then scores are averaged. A numerical tie retains V4.4c order. Blend scores are not probabilities. Full identical fields and exact provider-specific parent model IDs are required. Ordinary DRF parent PASS/HOLD is preserved. Complete native Brisnet research rankings may blend while retaining overall PASS and no win-probability line. Any missing runner, source blocker, mixed provider or unsupported condition holds the selector.

Current Brisnet PP QA: R3, R7 and R8 have complete inputs; R1/R2/R4/R5/R6/R9 hold for partial parent fields. First-time starters are never dropped to force a blend. Source and parent forecasts are not mutated. Going, field size and maiden status are recorded; going is not used to alter v1 weights.

## Offline condition-weight prototype

fitConditionPolicy never runs automatically on Race Day. Candidate grid is fixed before outcome testing: equal thirds and the three permutations of 50%/25%/25%. The objective is mean per-race full-field absolute finishing-rank error; winner, ordered first two, first-four set and exact first-four order remain separate diagnostics. No separate winner-optimized model or calibrated success-probability estimator has been developed.

Default fitting gate: at least 30 certified races across five dates in the exact provider family and surface/distance cell. These are research design choices, not proof of adequate sample size or adoption. Every accepted training record needs full matching official order, reviewed pre-off forecasts and final field. Duplicates, different cells/providers and races dated on/after the forward test date are excluded. Equal weighting wins a tie between candidate policies. A returned policy is research-only, records training IDs/dates and cannot be applied to earlier/same-date races. It is never installed as a production policy by this prototype.

Adoption remains subject to independent forward evaluation and uncertainty. Preserve the prior 30-new-race checkpoint and first assessment at 100 new races across at least 20 dates; there is no automatic promotion. These checkpoints do not guarantee that subdivided weights can be estimated accurately. Prefer equal weights while a cell is sparse. Parent performance and the blend must be reported on the same eligible cohort. Brisnet results never update the DRF/Timeform model-strength table.

## First descriptive check

Equal-rank replay of the same 56 previously reviewed races / 10 dates: first-choice winners V4.4c 9, Contender 8, MIX1 12, selector 10. Correctly ordered first two: 3, 4, 5, 2. First-four set: 5, 9, 5, 7. Correctly ordered first four: 0, 1, 2, 0. This does not show a selector advantage. Only 11 races have reviewed full-chart backing; other outcomes retain prior provisional source status. The normalized archive stores top four, so full-field rank error cannot be computed from that file and no condition policy was fitted to it. No claim of fresh blind validation or better probabilities is made.

## New freeze behavior

New preRaceFreeze calls can receive selectorRating. It is validated against the same verified active field, then recorded in a separate optional selector property, including model ID, scores, context, weights, parent IDs and policy ID. The models property still contains exactly the original three parent snapshots. Original stored freezes are never rewritten. SHA-256 export covers the optional selector data. The existing button remains Freeze All 3 Models, with explanatory text that the separate selector output is also recorded. Quote recording, probability gates and actual stake zero remain unchanged.

## Repeatable checks

Run node --test. Selector tests cover six categories, source-family isolation, rank scaling/ties, incomplete fields, scratches/conditional entries, frozen-output nonmutation, policy chronology/duplicates/data gates, optional snapshot integrity and nonprobability display. Automated desktop/iPad-size browser tests cover both a selector HOLD and a complete native blend. This is emulated Chromium, not physical iPad acceptance.
