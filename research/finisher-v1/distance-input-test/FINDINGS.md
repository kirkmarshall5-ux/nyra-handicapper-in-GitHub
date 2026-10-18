# Distance correction test results

Verified source-distance corrections are isolated under this directory. No production code, V4.4c, original Finisher inputs, weights or live-site imports changed.

## Main comparison: 130 historical DRF races

| Metric | V4.4c control | Original Finisher | Corrected-input Finisher |
| --- | ---: | ---: | ---: |
| Winner first | 29 | 35 | 35 |
| Correct second | 23 | 29 | 30 |
| Correct third | 24 | 23 | 24 |
| Exact first-two order | 8 | 10 | 10 |
| Selected first two contain actual first two, either order | 12 | 17 | 17 |
| Actual first two both within selected first three | 46 | 40 | 40 |
| Exact first-three order | 2 | 5 | 5 |
| Winner anywhere in selected first three | 76 | 74 | 74 |
| Total actual top-three horses included | 219 | 223 | 223 |
| Correct fourth (secondary) | 27 | 20 | 19 |
| Total actual top-four horses included (secondary) | 353 | 342 | 343 |

The correction adds one correct second and one correct third. Correct first-three slots total 76 / 87 / 89 (control / original / corrected). Winners, exact pairs and selected top-three groups are unchanged. Winner anywhere in first three remains lower than V4.4c (74 versus 76). First-three horse coverage is 223 versus 219, or 1.715 versus 1.685 per race.

## Interpretation for win and exacta selection

For a straight exacta, ordered first-two accuracy is 10/130 versus 8/130. For a two-horse box, the pair-coverage diagnostic is 17/130 versus 12/130. For a three-horse box, the relevant pair-coverage diagnostic goes the other way: 40/130 versus 46/130. These are selection counts, not settled wager returns or profitability. Stronger first-place selection does not automatically strengthen every exacta structure.

Under the user's revised objective, fourth-place weakness alone is not a reason to reject the challenger. Continue judging winners, ordered pairs and top-three selection separately. The historical evidence is encouraging for winners and two-horse pair selection but mixed for broader exacta-box coverage. No weight change is supported by this small input-correction effect.

## Exactly what changed

Of 1,036 DRF runner appearances across 141 races, 34 matching-speed values changed: 21 recovered, 5 false matches removed and 8 averages revised. Historical 130: 31 appearances across 12 races, seven complete orders changed and one first pick changed. None of the selected three-horse groups changed; first-three order changed in two races. The remaining five order changes are farther down the field.

The only changed historical first pick was BAQ June 21 R2: Relaxx became Lady Firefoot; Massarat won, so both picks missed. Second-place Relaxx moved into the correct second slot. KEE October 9 R9 moved Vote No into its actual third slot. These explain the two additional correct first-three placements.

Six previously undecoded race headers now decode. Five recover at least one genuine matching-speed observation. BAQ May 23 R6 still has no qualifying comparable history under the unchanged matching rules; it correctly remains unknown rather than receiving an invented match.

October 17 Belmont DRF: three runner inputs in two races change, with no ranking or performance changes. V4.4c picks three winners versus Finisher's four, as before. Native Brisnet input parsing is outside this DRF correction and is unchanged.

## Verification and scope

All 141 original Finisher orders and scores reproduce before any input replacement. Recent speed, Late, starter sets and eligibility are copied unchanged; only matched-speed input changes. Existing 365-day, first-five, half-furlong and 90-day-decay rules remain unchanged. The decoder and protocol were hashed before inspecting outcome changes. The control/model hashes still verify.

All 359 Node tests pass (351 existing plus eight focused distance tests). Unit checks cover source-verified glyphs, ordinary/explicit fractions, primary versus alternate conditions, unknown formats, false matches, zero values, date limits, first-five history and source immutability.

Reproduction: `node research/finisher-v1/deep-input-audit.mjs /path/to/archive-workspace`, then `node research/finisher-v1/distance-input-test/run.mjs /path/to/archive-workspace`. The full compressed RESULTS evidence and CSV preserve every old/new order and changed runner trace. This is an outcome-known retrospective test, not untouched forward validation.

Decision: accept the decoder correction as verified research input handling. Preserve the original replay, keep 60/25/15 and V4.4c frozen, and do not deploy the research decoder or promote Finisher from this test alone.
