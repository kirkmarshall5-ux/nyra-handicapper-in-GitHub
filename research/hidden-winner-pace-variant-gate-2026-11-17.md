# Hidden Winner pace-variant gate — 2026-11-17 Finger Lakes

Status: PARTIAL / NOT CERTIFIED. Research only. Live Brisnet RR unchanged.

## Data provenance
- `hidden_winner_pace_evidence_2026-11-17.csv` and `hidden_winner_speed_form_candidates_2026-11-17.csv` from earlier exploratory analysis, cross-referenced with `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json` and the original `flx1117p.pdf`.
- `FL_2026-11-17_three_model_results.csv` provides retrospective finish outcomes. This is **not** forward-tested performance.
- Original source PPs supplied, but an independent horse-by-horse match of E1, E2, LP, and dated qualifying pace lines to the live UI remains unfinished.

## A — E1 all distances (previous exploratory screen)
- Unrestricted retrospective sample: 9 flagged horses, 2 winners (22.2% candidate hit rate), from 8 races with a flag. **This is not a certified result** because some ranked fields are incomplete.
- Strict *recorded* complete ranked field + E1 present for all ranked runners: races 3, 5, 6 (3 races). Three flagged RR #3/#4 horses: Senegal (R3), Seams Like Destiny (R3), Tiz Goldy (R5). **0 winners / 3 flagged horses**.
- Race 1 has 6/6 RR ranks but only 5/6 E1 values. Races 2, 4, 7, 8, 9 have incomplete ranked-field coverage and cannot be scored under the strict gate.
- This historical CSV is not a fresh execution of the currently committed browser selector; candidate logic and source qualification must be reconciled before declaring reproducibility.

## B/C/D — NOT SCORED
- B: E2 for all distances.
- C: E1 for sprints, E2 for routes.
- D: (E2 + LP)/2.
- The available *prior derived candidate table* lacks independent matched E2 for each runner; using E1 as a substitute or using unmatched PDF pace lines would invalidate comparisons.
- A valid evaluation requires per-horse E1, E2 and LP from the current matching/surface/distance/recency rules, dated source-line provenance, complete active field, locked RR ranks, official winner and runner-up, and exactly the same eligibility across variants.
- The UI currently offers selectable variants, but it has not undergone real-device testing or full historical rerun.

## Next gate
1. Produce source-verified per-runner matched E1/E2/LP extraction from the original PPs and frozen card, including source date/page and qualifying rule.
2. Apply all four variants to the **same eligible races** and compare candidate hits, false positives, RR #3/#4 winners, companion #2 finishes and exacta-box outcomes. Keep ROI separate and never infer payouts.
3. Replicate on independent cards and test Dell Chrome and iPad; leave draft PR unpublished until certified.

Conclusion: **No winning pace variant selected**. The earlier 2/9 E1 hit rate is exploratory and collapses to 0/3 on the strictly covered subset; the sample is much too small to optimize thresholds.
