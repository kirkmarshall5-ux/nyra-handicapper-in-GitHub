# Step 2 — DRF field-relative setup diagnostic

The diagnostic is implemented and its first early-position check is complete. It is research-only, does not alter rankings, and is not yet a validated fast/slow pace forecast or a production closer adjustment.

## Population and frozen rules

Reuses the Step 1 source-audited 141 races, 25 cards and 1,036 experienced runners. No additional PP cards, sealed holdouts or model scoring runs are introduced. Predictions use only target-card identity, career-start status, printed TimeformUS Early and independently verified style when available. Late ratings, finishing results and target-race chart data are excluded from prediction inputs. The 17 blank-program races remain flagged; name-based research diagnostics do not invent program numbers or restore them to model comparisons.

The primary exploratory rule describes the Early-rating distribution:

- CLEAR_EARLY_RATING_GAP: highest Early exceeds the next highest by at least 10 points.
- CLOSE_TOP_EARLY_RATINGS: otherwise, at least two runners are within 5 points of the highest Early.
- INTERMEDIATE_GEOMETRY: neither pattern.
- INCOMPLETE_EARLY_EVIDENCE: any runner has unknown/invalid Early, is FTS, or fewer than two runners are known.

These cutoffs are engineering hypotheses, not a provider-calibrated conversion or probabilities. The fixed sensitivity policies (gap 15 / cluster 3, and gap 5 / cluster 7) are all reported. No policy was chosen by how well it explained an outcome. The source material has already been analyzed in earlier work; freezing this replay cannot make it a prospective test.

Stored threshold-derived E/EP/P/S labels are ignored. A source-style gate requires at least two distinct reviewed prior dates and source references; current audit records do not satisfy that gate. The output therefore distinguishes rating geometry from a certified setup. Field size alone adds no pressure; FTS remain unknown even if an input incorrectly supplies them with a number. No Early-95 threshold is used.

## Coverage and sensitivity

| Pattern | Primary gap 10 / band 5 | Gap 15 / band 3 | Gap 5 / band 7 |
|---|---:|---:|---:|
| Clear rating gap | 60 | 29 | 94 |
| Close top ratings | 55 | 39 | 45 |
| Intermediate | 24 | 71 | 0 |
| Incomplete | 2 | 2 | 2 |

Only 70/141 labels are stable across all policies; that includes the two incomplete fields, leaving 68/139 complete-field labels stable. This sensitivity is a reason to keep numeric gaps and clusters, not promote a hard category directly to a scoring bonus.

All 139 numerically complete fields retain UNCERTAIN_UNVERIFIED_STYLES, and two retain UNCERTAIN_MISSING_EARLY. No confident lone leader, committed duel, collapse or hot/slow tempo is certified. A clear rating gap is an opportunity indicator, not proof of an uncontested lead.

## Actual early-position check

Used the already analyzed October 17 Belmont official chart, whose full fields match all 11 source races: 76 horses. Extraction uses the chart's **Past Performance Running Line Preview**, with explicit quarter-mile columns for these sprints and half-mile columns for these routes. The normal chart's gap-to-next-horse margins are not substituted for cumulative beaten lengths. Normal-size position digits are separated from superscript margins by font size and coordinates. HEAD/NECK/NOSE remain categorical; a leader's beaten distance is zero, not its margin ahead of second place.

All 11 preview tables and 76 extracted early positions/margins were visually checked against rendered originals. Field identity and position permutations are asserted, and the reviewed labels are preserved separately with the chart hash. A DNF finish does not erase a supported early position; no finish is inferred from this evaluation.

| Check | Result |
|---|---:|
| Highest-Early horse in first three at the selected early call | 9/11 |
| Highest-Early horse leading at that call | 6/11 |
| Mean normalized early position, zero = leader | 0.151 |
| Clear-gap races | 5 |
| Clear-gap races where highest-Early horse led | 4/5 |
| Clear-gap races with at least two horses within one length | 2/5 |
| Close-rating races | 5 |
| Close-rating races with at least two horses within one length | 4/5 |

There were no highest-Early ties in these 11 races; the evaluator averages credit across ties rather than choosing a favorable tied horse. The per-race uniform-random top-three reference averages 44.3%; it is a descriptive reference, not a trained comparator or a significance test.

The result supports investigating Early ratings as positional evidence. It does not establish winner/finishing-order improvement or accuracy of a fast-pace forecast. This is one reused day across small fields, with only five examples in each main pattern.

The distinction is observable: R4 had an 18-point Early gap, but the highest-Early horse was second and two horses were within one length at the half-mile. R8 had a 12-point gap, the highest-Early horse led, and another horse remained within one length. Rating superiority did not guarantee isolation. Conversely, R10 had close top ratings but only one runner within a length at the selected call. These are positional observations; neither proves fast or slow fractions.

## Call-label correction and later evidence

The chart review exposed an important limitation in Step 1's research extraction: five printed slots cannot universally be called Start / First / Second / Stretch / Finish. Physical calls vary by distance; some route tables omit Start or include additional intermediate calls. Step 1's numerical position tokens remain source evidence, but their generic early-slot names must not be used to infer physical distance.

This diagnostic's scored check bypasses those generic slots and selects explicitly named chart columns. No production parser or previous model result depended on the new Step 1 slot labels, and no live scores change. Historical source extraction still needs distance-specific slot mapping before it can supply reviewed styles or tempo evidence.

The later-line inventory finds additional candidate observations in previously analyzed cards. They are kept evaluation-only, date-checked, and not included in the 9/11 or 6/11 results. They require physical-call mapping, duplicate/conflict checks and coverage review before use. A partial selection of horses that raced again cannot establish a race's uncontested lead or full-field pressure. See later-line-candidates.json for exact counts and references.

## What remains before scoring

1. Independently review historical lead-seeking and tactical flexibility, using correct distance-specific calls and source margins. Do not derive style from Early/Late and then count it as independent evidence for the same ratings.
2. Build actual tempo labels from appropriate adjusted pace figures/pars or an independently reviewed race-flow process. Do not call a race fast because multiple horses ran near the lead, or because a closer won.
3. Replicate across more already analyzed dates/tracks and report uncertainty, threshold sensitivity and incomplete fields. The 30 sealed holdout PDFs remain unopened and unused.
4. Only then test the proposed Contender context replacement against current and no-context controls. V4.4c and Finisher's frozen 60/25/15 blend remain unchanged.

Step 2's diagnostic and initial positional validation are complete; the pace-context feature has not passed its scoring-readiness gate. There are no claimed improvements in winners, exactas, trifectas, superfectas, ROI or calibrated probabilities.

## Files and checks

protocol.json records rules and exclusions; prediction-freeze.json.gz preserves the whitelisted source features and all three policies; race-diagnostics.csv records every race. evaluation.json and chart-review.json preserve the full chart extraction, source hashes, explicit call columns, review status and metrics. HASHES.json identifies code/evidence versions. The later-line inventory is a separate ungraded research resource.

Run python3 -m unittest test_setup_diagnostic.py. Eleven tests pass: relative-gap invariance, ties, FTS/missing/invalid inputs, proxy-style rejection, dated reviewed-style gates, future-evidence rejection, unrelated-Late/outcome invariance, field size, source IDs, small-margin handling, all 141 saved diagnostics and all 76 chart positions. build_and_validate.py needs the Step 1 source freeze and the original previously used chart; its reviewed expectations reject changed chart labels. No production files are edited.
