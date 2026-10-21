# Brisnet input integrity repair — October 21, 2026

The model-input export previously advertised Finisher but exported MIX1 instead.
The v2 export includes the actual Finisher adapter inputs, component values,
neutral handling, scores and model ID. Displayed models are explicitly listed as
V4.4c, Finisher and Contender; MIX1 remains separately identified research output.

V4.4c-Brisnet and MIX1-Brisnet now require 25 verified local connection starts,
otherwise using verified annual counts with at least 25 starts. Insufficient or
unverified records remain unknown; zero wins in a sufficient sample remain zero.
No unverified all-time record is invented. The percentage scaling and scoring
weights are unchanged. Contender's existing reliable-record selection is retained.
Native model IDs advance to `20261021-input-v2`; the locked DRF engines and old
frozen records are not rewritten. These input corrections can change new ranks.

Every historical line in the export now has matching exclusion reasons. Strict
filters remain the latest five actual starts, 365 days, same surface, same
sprint/route category, within 0.5 furlong. Finisher needs one matched Speed start;
MIX1 surfaceDistance needs two. This intentional difference explains why a horse
can have matched pace and still lack MIX1 surfaceDistance. Workouts and unresolved
historical ratings are not fabricated; broader matching requires a separate
versioned experiment on development data.

## Validation

- `npm test`: 385 passed, zero failed.
- Reconstructed all eight races from the saved October 21 model-input export,
  retaining its source text, page references, scratch flags and contexts.
- Finisher ranked 56 horses. Its top four for races 1–5 exactly reproduced the
  pre-race screen selections previously transcribed in the results comparison.
- 26/56 ranked Finisher horses lack matched Speed and matched LP under the
  existing strict filters. Missing inputs retain fixed neutral percentiles.
- 11 jockey and 32 trainer entries selected verified annual fallback records;
  one jockey and seven trainer entries remain unknown under the minimum rule.
- Source objects remained unchanged; all four exported models remained PASS,
  betting disabled and probabilities uncalibrated.
- No holdout cards, race outcomes or new weight fitting were used in validation.

## Remaining limits

This is a saved-card recomputation, not a new pre-race freeze or official live
scratch verification. Fourteen source-unresolved historical lines and workout
extraction still need source-level work. This patch does not claim to fix those
gaps or establish predictive improvement.
