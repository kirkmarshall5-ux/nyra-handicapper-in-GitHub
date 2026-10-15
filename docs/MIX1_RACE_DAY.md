# MIX1 Race Day comparison

MIX1 is an experimental Timeform comparison alongside the unchanged V4.4c and Contender models. It does not enable betting, Fair Odds, True Chance or overlay recommendations.

The retained formula uses 37% mean latest up to two Beyers, 12% best figure from starts three through five, 7% existing jockey score, 17% existing trainer score, 17% Timeform Early and 10% surface/distance matched Beyers. Each component is a 0–100 midrank percentile within the eligible field. A sole observed value scores 50. Missing components are omitted and available weights normalized per runner; verified zero is measured, not missing.

The surface/distance component averages the latest up to three qualifying proofs within the first five and 365 days, on today's surface and within half a furlong. It requires two proofs. Other history components preserve the archived MIX1 definitions, without adding a new lookback restriction. Non-pace V4.4c signals sum to a capped -6…+6 and map linearly to a 0.85…1.15 multiplier. The original pace-fit signal is excluded from that multiplier. Trainer-context has no separate component.

The original V4.4c PASS rules apply. MIX1 requires matched verified Beyer proof rows; old cards without them request a PP re-upload. Unconfirmed AE/MTO and scratched horses remain excluded. Brisnet speed and pace are not substituted for Beyer or Timeform inputs.

Race Day recomputes against the current eligible field as scratches change, just as the existing controls do. Historical replay parity was checked on original frozen fields, before results: all 63 rateable Saratoga test races / 554 runner scores matched the retained MIX1 evidence within 1e-10, including every complete ranking. This is implementation parity, not evidence of profitability or probability calibration.

Validation: `npm test` includes component history, missing/zero inputs, percentile ties, adjustment cap, provider/PASS/scratch guards, original-model non-mutation and Race Day wiring checks.
