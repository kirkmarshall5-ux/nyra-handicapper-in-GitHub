# Finisher 3F v1 — fixed development specification

V4.4c remains the unchanged control. This is one research challenger; it is not added to the live site. Contender remains available for comparison.

Three field-relative inputs, fixed before this evaluation:

| Input | Weight | Meaning |
| --- | ---: | --- |
| Recent speed | 60% | Verified latest-five weighted average: 50/25/15/7/3, normalized for available figures without shifting start positions |
| Surface/distance speed | 25% | Average of matching lines among the latest five, within 365 days and half a furlong, using a 90-day decay half-life |
| Late pace | 15% | DRF's extracted TimeformUS Late; Brisnet's latest matching LP from the same five-start window |

Scores use within-field percentiles, with tied observations at their average percentile. Missing optional inputs contribute neutral 50 at their fixed weight; a verified zero is an observation. No runner-specific redistribution. Missing mandatory recent speed leaves the horse unranked. A field with any such runner is partial, not a complete finishing-order forecast. One observed optional value gives neutral 50 because it provides no within-field comparison.

No best-of-three peak, speed trend, jockey, trainer, workout, pedigree, trip, class, career placing, early-pressure, post-position, morning-line, live-odds or result-based bonuses. Matched speed has an intentional second role: current-condition suitability, at a bounded 25%. No interactions or race-specific weight changes. Highest raw score ranks first; exact-score ties use horse name, with no rounding before ranking.

DRF uses the existing source extraction and verification functions, not Contender's coefficients. Its recent-five extraction preserves the established latest-figure fallback if actual-start correspondence is unverified. Brisnet uses native Speed and LP; figures from different providers are never numerically pooled. Brisnet LP is condition matched; the available DRF TimeformUS Late is not independently matched to today's conditions. These source differences are reported separately.

Brisnet source checks cover the five-start scoring window. A source-printed negative figure is retained as a number; an unrelated sixth-oldest negative figure does not invalidate the recent history. This behavior is isolated to this challenger. V4.4c and Contender are unchanged.

Primary evaluation: top-four exact slots and mean absolute finishing-rank error on complete official orders. Also report pairwise order accuracy, top-four coverage, exact first two, exact first four and winners. Full-order metrics require the exact same complete field; do not invent finishes for DNF or dead heats. First-four-only archives support only the first-four metrics. Keep incomplete fields and condition changes labeled separately. Deduplicate races by track/date/race and separate PP providers.

This is development on previously examined historical races. Do not call these untouched or genuine pre-race tests. Freeze v1 after this run rather than adjusting weights to individual misses. Promotion requires consistent finishing-order improvement without a material loss of contender coverage, followed by new races whose results have not been used to develop the model.
