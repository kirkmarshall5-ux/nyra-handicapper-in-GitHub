# DRF Research Lab — PR #215 certification guide

**Status:** Draft, research-only. The Race Day page includes **Export DRF Research Lab Data** and the separate `drf-research-lab.html` page imports the exported JSON. Neither page modifies live Contender, Finisher, V4.4c, wagers, or pre-race freezes. Do not merge or deploy solely because automated tests pass.

## Export and test

1. On a served checkout of this branch, upload an original DRF card in Race Day and confirm the intended track/date, runners, scratches and also-eligibles.
2. Select **Export DRF Research Lab Data**. Only fully rateable DRF races with complete Contender and Finisher evidence are included. The export records excluded races and reasons. A zero-race export is blocked.
3. Open `drf-research-lab.html`, upload the JSON, select the Contender Late multiplier, and run the scenarios. The Lab checks the original per-runner Contender and Finisher baseline scores before producing comparisons. Export the results CSV if needed.
4. For a **historical freeze parity** check, use `compareDrfReplayWithFreeze(dataset,freeze)` from `drf-research-freeze-parity.js` with the *original* DRF local research freeze and the fresh production export. It requires matching card identity, complete frozen fields, unique programs, exact names, baseline scores within the specified tolerance, and full rank ordering for both models. The function throws on mismatch.
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
