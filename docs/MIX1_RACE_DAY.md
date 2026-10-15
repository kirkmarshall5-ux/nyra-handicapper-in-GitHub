# MIX1 Race Day comparison

MIX1 is an experimental Timeform comparison alongside the unchanged V4.4c and Contender models. Race Day now displays experimental Fair Odds and True Chance estimates; betting and overlay recommendations remain disabled.

The retained formula uses 37% mean latest up to two Beyers, 12% best figure from starts three through five, 7% existing jockey score, 17% existing trainer score, 17% Timeform Early and 10% surface/distance matched Beyers. Each component is a 0–100 midrank percentile within the eligible field. A sole observed value scores 50. Missing components are omitted and available weights normalized per runner; verified zero is measured, not missing.

The surface/distance component averages the latest up to three qualifying proofs within the first five and 365 days, on today's surface and within half a furlong. It requires two proofs. Other history components preserve the archived MIX1 definitions, without adding a new lookback restriction. Non-pace V4.4c signals sum to a capped -6…+6 and map linearly to a 0.85…1.15 multiplier. The original pace-fit signal is excluded from that multiplier. Trainer-context has no separate component.

The original V4.4c PASS rules apply. MIX1 requires matched verified Beyer proof rows; old cards without them request a PP re-upload. Unconfirmed AE/MTO and scratched horses remain excluded. Brisnet speed and pace are not substituted for Beyer or Timeform inputs.

Race Day recomputes against the current eligible field as scratches change, just as the existing controls do. Historical replay parity was checked on original frozen fields, before results: all 63 rateable Saratoga test races / 554 runner scores matched the retained MIX1 evidence within 1e-10, including every complete ranking. This is implementation parity, not evidence of profitability or probability calibration.

Validation: `npm test` includes component history, missing/zero inputs, percentile ties, adjustment cap, provider/PASS/scratch guards, original-model non-mutation and Race Day wiring checks.

## Experimental win-line display

`MIX1-research-softmax-v1` applies stable softmax to unrounded MIX1 scores over every eligible runner, with temperature 10. The 10-point scale is an explicit provisional assumption shared with the V4.4c display, not a fitted or calibrated MIX1 probability model. Percentages sum to 100% across the complete field; fair fractional odds are `(1-p)/p`. The displayed top four are not renormalized. Scratch changes recompute the line. PASS/HOLD, incomplete fields, missing scores and source blockers withhold estimates. Neither this display nor the name “True Chance” establishes validated win probabilities or betting approval. Ranking weights and order remain unchanged.
