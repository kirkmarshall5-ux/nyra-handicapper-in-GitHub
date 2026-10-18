# Finisher 3F v1: development results

V4.4c remains the unchanged control. One fixed three-input research challenger was evaluated; no weight tuning followed this run. It is not wired into the website.

## Results

Each metric is V4.4c / Finisher. Lower MAE is better; coverage, slots and exact-order counts are higher-is-better.

| Cohort | Races | Correct top-four slots | Coverage per race | Mean full-order rank error | Winners | Exact top four |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 58-race full-order archive | 58 | 54 / 48 | 2.86 / 2.62 | 1.727 / 1.840 | 17 / 18 | 0 / 2 |
| 47 Saratoga first-four archive | 47 | 30 / 39 | 2.53 / 2.55 | not available | 7 / 11 | 0 / 1 |
| 25 Keeneland full-order archive | 25 | 19 / 20 | 2.72 / 2.80 | 1.971 / 1.861 | 5 / 6 | 0 / 0 |
| Oct 17 Belmont / Brisnet | 11 | 8 / 13 | 2.64 / 2.91 | 1.800 / 1.547 | 3 / 3 | 0 / 1 |
| Oct 17 Keeneland / Brisnet, complete fields | 6 | 7 / 1 | 2.33 / 2.33 | 2.406 / 2.429 | 3 / 1 | 0 / 0 |
| Oct 17 Belmont / DRF | 11 | 8 / 10 | 2.55 / 2.91 | 1.734 / 1.580 | 3 / 4 | 0 / 0 |

130 historical races are unique across the three archive cohorts. They yield 103 / 107 correct top-four slots out of 520, 2.715 / 2.631 coverage, and 29 / 35 winners. On the 83 unique historical races with full finishing orders, MAE is 1.801 / 1.846 and pairwise order accuracy is 63.36% / 62.88%. The challenger is not an overall finishing-order improvement.

October 17 adds 21 unique races, with Belmont tested through both DRF and Brisnet sources. Four incomplete Keeneland V4.4c fields are excluded from paired primary metrics, including the race where this challenger newly rates Hen Party. There are 151 unique considered races overall, 147 unique races in complete paired comparisons, and 158 complete source-specific comparisons because Belmont is replayed with two PP formats. Never count the two Belmont providers as different races.

## Decision

Retain Finisher 3F v1 as research-only. It improves some cohorts but loses too much coverage on the 58-race archive and performs poorly on the six complete October 17 Keeneland Brisnet races. Do not replace V4.4c, add a live model box, or claim improved finishing order from the 3 exact-four historical hits alone. Keep Contender on the live site while this challenger is assessed.

Before a future revision: examine the recurring coverage losses by race type and source, keep each new rule explainable, then freeze one revised specification before evaluating it. New untouched races are necessary for a final forward comparison, but the present historical weaknesses should be understood first. Do not add more simultaneous models.

## Scope and reproduction

This is development on outcome-known races previously examined in the project, not a new blind test. The 58-race control uses archived frozen scores with scratches removed; the challenger compares the final field. Saratoga supplies only official first-four results. Keeneland 25 excludes changed surfaces and incomplete fields. October 17 uses final starters and official actual conditions, including six surface switches. This difference in cohort protocols is explicit and prevents treating them as a single uniform validation.

Where the older name-keyed archives lack program numbers, the evaluator uses `name:<normalized-name>` as an internal ID. These are not invented program numbers. The model accepts only verified scoring values; it does not read results, payouts, morning lines or current odds.

Commands: `npm test`, then `node research/finisher-v1/evaluate.mjs /path/to/archive-workspace`. The latter uses the archived source paths recorded in `EVALUATION.json`; all source SHA-256 digests are included. `EVALUATION.json.gz` (decompress with gzip) contains frozen per-runner inputs, contributions, orders, exclusions and all metrics. Model rules are in `SPECIFICATION.md`; the pre-evaluation hashes still verify.

All 351 Node tests pass (344 existing plus 7 new). The production scoring and parser files were not modified.
