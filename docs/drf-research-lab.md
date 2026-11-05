# DRF Research Lab — PR #215 certification guide

**Status:** Draft, research-only. The Race Day page includes **Export DRF Research Lab Data** and the separate `drf-research-lab.html` page imports the exported JSON. Neither page modifies live Contender, Finisher, V4.4c, wagers, or pre-race freezes. Do not merge or deploy solely because automated tests pass.

## Export and test

1. On a served checkout of this branch, upload an original DRF card in Race Day and confirm the intended track/date, runners, scratches and also-eligibles.
2. Select **Export DRF Research Lab Data**. Only fully rateable DRF races with complete Contender and Finisher evidence are included. The export records excluded races and reasons. A zero-race export is blocked.
3. Open `drf-research-lab.html`, upload the JSON, select the Contender Late multiplier, and run the scenarios. The Lab checks the original per-runner Contender and Finisher baseline scores before producing comparisons. Export the results CSV if needed.
4. For a **historical freeze parity** check, run `node scripts/verify-drf-replay.mjs fresh-export.json original-freeze.json report.json`. This executable check rejects missing complete frozen races and writes a machine-readable pass/block report. Underlying score comparison uses `compareDrfReplayWithFreeze(dataset,freeze)` from `drf-research-freeze-parity.js` with the *original* DRF local research freeze and the fresh production export. It requires matching card identity, complete frozen fields, unique programs, exact names, baseline scores within the specified tolerance, and full rank ordering for both models. The function throws on mismatch.
5. Preserve the original DRF PDF, frozen JSON, exported dataset, excluded-race list, test results, and GitHub commit SHA as separate audit artifacts.

The browser export is a **current replay**, not a reconstruction of the pre-race environment. Changes in scratches, entries, parser versions or source data can invalidate historical comparison. Never silently substitute the freeze's ranking scores for newly computed scores.

## Scenario definitions

Contender neutralizations use frozen feature indices: surface win record (9), workout best rank within 30 days (16), and early pace (6), individually and in combinations. The optional Late multiplier applies to feature 7. Finisher scenarios are original Late weight, Late neutral, Late x1.25, and Late x1.5. All variants are **research-only**. The 19 Contender feature labels are checked against the frozen production feature order in regression tests.

The Lab reports first-place winner accuracy, exact runner-up placement, ordered exactas, runner-up covered among the top four, and number of actual top-four finishers covered. Without supplied results, comparisons are ungraded. The export intentionally does **not** include results.

## Validation and certification boundaries

Automated CI covers regression tests, locked V4.4c parity, and Chromium browser smoke QA. Passing CI establishes code checks, **not** historical DRF score parity or independent pre-race timestamp certification.

`compareDrfReplayWithFreeze` explicitly returns `independent_timestamp_verified:false`; a browser-device clock is not an independent timestamp. For October 28 Belmont, complete the original-PDF-to-production-parser replay and compare all eligible runners' scores to the original freeze before declaring this gate closed. Races with incomplete evidence or PASS classifications must remain excluded, not scored as failures or promoted to full-field certified races.

## Input contract

The production export uses `schema:'drf-research-lab-v1'` with `races[]`. Each race has `id`, `metadata` (source, track, card date, race number), 19 `contender_coefficients`, `contender_baseline`, `finisher_baseline`, and `runners[]`. Each runner contains program, name, Contender `raw[19]`, `trend_adjustment`, and Finisher `recent_speed`, `matched_speed`, `late_pace`. Historical `actual[]` finish order is optional and must come from reconciled official results.

Do not create synthetic evidence and call it an original-card replay. Test fixtures are only for unit tests.

## October 28 Belmont production-export reconciliation (November 3, 2026)

A user-generated export of `BEL--10-28-2026.pdf` has SHA-256 `560748d2d30b1e378ce63d262b378abef2986757e6770fec34a23b8d8a4b834e`, identical to the archived original PDF. It includes R1/R4/R5/R6/R7/R8 and excludes PASS R2/R3. The original freeze timestamp is browser-device-unverified.

The current export includes one additional runner relative to each original frozen dashboard field in R1 (#5 Essence L Vee), R4 (#4 Osbourne), R5 (#4 Old Time Rocknroll), R7 (#8 Hardspun Reason), and R8 (#4 Quell). The freeze `starters` lists those horses, but the frozen `dashboard.field` and model rankings omit them. **The cause of exclusion has not been independently verified; do not label them scratched without corroboration.** R6 fields agree.

For diagnostic purposes only, remove those five extra runners from the fresh export's raw feature arrays, then recompute field-relative Contender centering and Finisher percentiles. This yields **98/100 exact model score matches** and **12/12 original model/race rank orders**. DRF Finisher is exact in all six races. DRF Contender is exact except R4 #8 Sin Nombre (recomputed minus frozen = -0.016666666666666732) and R4 #1 Graywing (-0.033333333333333326). These two discrepancies require feature/trend/field-state inspection. This diagnostic is **not a certified parity pass**, because it reconstructs a historical field and has unresolved score differences. No production model coefficients or deployment should change.

Next: verify original R1/R4/R5/R7/R8 scratch/entry status and isolate R4 feature or trend differences. Keep PR #215 draft until the original historical field can be justified and every eligible frozen score matches.
