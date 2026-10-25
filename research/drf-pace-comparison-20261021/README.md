# DRF late pace and pace-context comparison — October 21, 2026

**Result:** DRF late-rating coverage is nearly complete in this selected historical sample. Its scoring value differs by model and by the objective: winner selection versus exact finishing order. No production changes are supported by this development screen alone.

## Population and controls

Attempted 141 previously graded DRF races from the October 18 development audit. Excluded 17 because archived program numbers are blank, preventing unique program-to-result matching. The remaining **124 races across 22 cards contain 921 rated horses, zero first-time starters, and known top-four results**. Every included race passes current V4.4c and Finisher evidence gates and has a complete Contender ranking. All attempted rows and exclusions are retained. These are selected previously tested common actual-starter fields, not all DRF cards and not a blind holdout evaluation. Retrospective final fields/conditions are not proof of a timestamped pre-race forecast.

DRF and Brisnet are separate experiments. No Brisnet or MIX1 results enter this comparison. All 30 sealed holdout PDFs remain unopened and unused. This experiment reads previously parsed development JSON, never PP PDFs.

Five fixed removal arms keep each race's field, speed figures, connections, source evidence, coefficients on retained terms, trend, and tie-breaking unchanged:

| Arm | V4.4c | Finisher | Contender |
|---|---|---|---|
| Current | Current code | Current code | Current code |
| No direct late | No change: no direct late term | Set late input unknown; retain neutral 50th percentile and fixed 15% weight | Zero late coefficient, feature 7; retain early and interaction |
| No context | Remove `pace-fit` signal; reapply adjustment cap | No change: no context term | Zero pressure-fit interaction, feature 8 |
| No late or context | Remove `pace-fit` | Same as no direct late | Zero features 7 and 8 |
| No pace | Remove `pace-fit` | Same as no direct late | Zero early, late, and interaction, features 6–8 |

“No direct late” does **not** remove late information indirectly retained in Contender's interaction. The combined-removal arm exposes that distinction. No weights are refitted or redistributed. The DRF pressure-fit term is a heuristic combining the early/late difference with a count above Early 95; this study tests removing it, not replacing it with a new calibrated pace forecast.

## Coverage

- TimeformUS Late is available for **919/921 horses (99.8%)** and **123/124 winners (99.2%)**.
- The earlier Brisnet result, 33/102, counts LP values surviving strict historical surface/distance/recency rules. It measures a different input and different sample.
- Near-universal availability cannot show that late pace discriminates winners. That requires the paired scoring comparison below.

## Main comparison

All counts have a denominator of 124 races. Exacta/trifecta/superfecta mean the model's first two/three/four in exact finishing order.

| Model / arm | First-choice winners | Exactas | Trifectas | Superfectas | Top-four rank error ↓ |
|---|---:|---:|---:|---:|---:|
| V4.4c current | 29 | 8 | 2 | 0 | 1.929 |
| V4.4c no context | 29 | 8 | 2 | 0 | 1.942 |
| Finisher current | 33 | 10 | 5 | 3 | 1.962 |
| Finisher no direct late | 30 | 11 | 7 | 5 | 1.966 |
| Contender current | 26 | 7 | 3 | 2 | 1.954 |
| Contender no direct late | 30 | 5 | 2 | 1 | 1.933 |
| Contender no context | 29 | 8 | 3 | 2 | 1.942 |
| Contender no late or context | 29 | 4 | 2 | 1 | 1.940 |
| Contender no pace | 32 | 8 | 4 | 2 | 1.938 |

Top-four rank error is mean absolute predicted-rank error for actual places 1–4; lower is better. Every included horse is ranked. Exact place hits, underneath pair order, all cohort breakdowns and all five arms are in the CSV/JSON files.

**Finisher:** removing late loses five existing winner hits and gains two, a net loss of three. Keeping late helps first-choice winners here, while removal improves some exact-order counts. There is no single improvement across all metrics.

**Contender:** removing direct late gains seven winner hits and loses three, but exactas fall from seven to five. Removing only context gains three winners, loses none, and adds one exacta. Removing all three pace terms gains six winners and loses none in this sample. This flags the present pace combination as a development concern; it does not establish that finishing ability is unimportant or that all pace should be dropped.

The direct-late removal effect varies across cohorts: Contender first-choice hits change 11→10 in DRF58, 5→7 in SAR47, 7→7 in KEE25, and 3→6 in October 17 Belmont. Therefore the net +4 is not a consistent gain across all groups. Finisher and Contender direct-late winner-rate differences have descriptive whole-card bootstrap intervals crossing zero. The all-pace Contender removal interval is positive, but this remains selected reused development data with prior model research; it is not independent confirmation.

The next candidate to test is a better specified, field-relative pace-context rule while retaining the current model as control. First define the rule and its missing-data handling, then freeze a prospective comparison. Do not increase late weights or remove pace terms in production on the basis of these results.

## Reproduction and validation

`feature-freeze.json.gz` contains the exact per-horse scoring inputs/contributions, parent coefficients, baseline orders, outcome mapping, source hashes, selection description and all attempts. `results.json.gz` contains every model/arm/race result. These are research records; outcome fields never enter scoring.

Reproduce without reading source PDFs:

```sh
node scripts/evaluate-drf-pace.mjs --replay research/drf-pace-comparison-20261021/feature-freeze.json.gz /tmp/drf-pace-replay.json
npm test
```

The source adapter can also run against the development manifest schema documented by `freezeInputs`: each row needs a development-only role, unique key, cohort, parsed DRF race, actual top four, and archived Contender order. It rejects missing program identities and never silently renumbers runners.

Current-engine baseline scores/order are verified before removal; Contender also reproduces its prior archived order on every included actual-starter field. Source immutability and field identity are asserted. Tests verify isolated feature removal, V4.4c adjustment clipping, and exact reproduction of all 1,860 model/arm/race rows. Full suite: **404 passing tests**. Production code, weights, PASS rules, probability calibration and betting permissions remain unchanged.
