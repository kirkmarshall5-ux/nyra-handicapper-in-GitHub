# Race-day estimated win line v1

Each Top 4 panel displays Fair Odds and True Chance (est.) alongside its own unchanged ranking. These are research estimates, not measured true probabilities or approved overlays.

For every eligible runner i, use stable softmax:

`p_i = exp((s_i - max(s))/T) / sum_j exp((s_j - max(s))/T)`

V4.4c uses its unrounded rating, with T = 10 rating points. Contender uses its V2 matched-trend score, with T = 1 score unit. These separate, fixed scales are transparent starting assumptions; they were not fitted to race results and have no out-of-sample calibration approval. Contender's ranking head was built for contention, so its converted line especially requires independent win-probability evaluation. Do not interpret either scale as proven accuracy.

`True Chance (est.) = 100 * p_i`

`Fair Odds (net, to 1) = (1 - p_i) / p_i`

For example, 20% implies 4/1 and 25% implies 3/1. No takeout or bookmaker margin is added to this fair line. Fair odds and the probability must always be algebraic inverses; independent conflicting estimates would create misleading overlays.

Normalize across all eligible runners, never just the Top 4. Scratch or field changes cause both lines to be recomputed from current model results. AE/MTO eligibility follows existing scoring exclusions. All source/PASS rules remain in force: PASS/HOLD/provisional results, missing scores, incomplete identity coverage, duplicate identities, fewer than two runners, or numerical range failures return unavailable. Partial-field estimates are not displayed.

Both model outputs remain `calibrated: false` and `bettingEnabled: false`. Best Value and all wagering gates remain unchanged. These fields do not certify final starters. Coupled runners are horse-level chances, not aggregated betting-interest probabilities, and must be reconciled before any live overlay comparison.

Before promoting to live value: build verified complete final-field score/result records; fit each scale on a defined training cohort; evaluate card-grouped held-out log loss, Brier score, reliability and uncertainty against uniform and recorded-price references; freeze parameters and cohort identities; then test prospectively with timestamped current tote quotes. Prior failed calibration gates are not closed by adding this screen.

Verification: 184 regression tests including full-field normalization, inverse odds, model scales, score translation invariance, scratch recalculation, unavailable field guards, and both UI bindings. Browser visual QA unavailable in this execution environment.

Method reference: https://scikit-learn.org/stable/modules/calibration.html (temperature-scaled softmax; a scale must be learned and tested before claiming calibration).
