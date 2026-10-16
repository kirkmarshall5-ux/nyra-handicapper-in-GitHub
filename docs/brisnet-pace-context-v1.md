# BRIS-PACE-CONTEXT-v1 — surface/distance hypothesis model

Status: experimental candidate, not a replacement for V4.4c, Contender, MIX1 or Race Selector. All parent engines, frozen forecasts, probability restrictions and betting gates are unchanged. Proposed coefficients have not been trained or shown to improve results. No win probability, fair odds or bet is produced.

## Research review

Official primary sources reviewed October 16, 2026:
- [BRIS Pace Ratings FAQ](https://support.brisnet.com/hc/en-us/articles/360056540451-BRIS-PACE-RATINGS-FAQ)
- [Run Style FAQ](https://support.brisnet.com/hc/en-us/articles/9803583657101-Run-Style-FAQ)
- [Using Ultimate PPs to your advantage](https://www.brisnet.com/racing/news/handicappers-library-using-ultimate-pps-to-your-advantage/)

Correct the submitted research before testing:
1. Sprint E1 measures start to 2f; E2 measures start to **4f**, not 3f. Most routes use 4f/6f, with exceptions at unusual distances. LP measures second call to finish, which varies with distance; it is not universally the final quarter or stretch only.
2. E2 minus E1 is Brisnet's turn index in rating points. Compute it from one historical race. It does not establish physical acceleration or psychological effects on rivals.
3. Dirt early speed, turf late pace and race-shape interaction are useful hypotheses. They do not guarantee outcomes. Turf sprints can favor speed; route layouts need not all have two turns. Low E1/E2 ratings alone do not establish a paceless race.
4. Universal thresholds such as E2 90, LP 95, or an automatic exclusion for LP 74 are not validated selection rules across classes, tracks, distances and conditions. Use within-field comparisons in this first test; retain numerical thresholds only as labeled review hypotheses.
5. A four-point E1/E2 edge is a candidate signal, not proven lone speed. Unknown runners or missing pace can invalidate that inference. Never discard a horse solely because of one pattern.

## Source and classification

The existing PDF upload router supports Brisnet Premium Plus and Ultimate, preserving the separate DRF parser. It creates source-tagged native E1/E2/LP/Speed and printed running styles. This candidate consumes those fields directly, not summary best-pace headings, race-shape columns, Beyers or Timeform aliases.

Classify the current race from verified surface and distance. Under 8f = sprint; 8f and longer = route. Verify source condition conflicts; compact distances such as 6F and 1 1/16M are parsed and checked against source furlongs. Contradictions, unknown surface/distance, hurdles and source blockers HOLD. Synthetic is recognized but HOLD: no synthetic weighting profile was supplied or established. Going is retained as context, not a trained wet/firm adjustment. Track bias, posts, traffic, rail placement, class effects and actual fractional projections are not modeled.

Parent native validation governs career counts, chronological source sequence, dates, source identity, latest Speed, roster and parser blockers. Scratches, unconfirmed AE/MTO and excluded entrants are omitted. First-time starters remain unrated. Partial-field rankings are explicitly labeled and excluded from full-field performance grading.

Pace uses the **latest available value separately for E1, E2 and LP** among the latest five actual starts: within 365 days, same surface, same sprint/route category and within 0.5f. Each cell retains its own date and source page. Turn uses the latest matched line containing both E1 and E2. No unmatched fallback. This keeps historical selection fixed while testing weighting. Recent-figure averages, wider matching and consistency bonuses belong to later separate tests.

## Proposed formula

Convert the unchanged native V4.4c-Brisnet base rating to a within-field midrank percentile. Convert each native pace figure to the same percentile scale among source-validated rated runners. Equal values share a percentile. If a figure is missing, its raw value remains Unknown and its scoring percentile is neutral 50; it never becomes zero or an invented figure. With no pace anywhere, base order is preserved. Missingness and partial fields must be reported alongside performance.

**CONDITION rating = 75% base percentile + 25% pace score.** These are proposed research weights, not professionally established or fitted optimal coefficients.

| Profile | E1 share of pace | E2 share of pace | LP share of pace |
|---|---:|---:|---:|
| Dirt sprint | 45% | 40% | 15% |
| Turf sprint | 15% | 30% | 55% |
| Dirt route | 10% | 45% | 45% |
| Turf route | 10% | 25% | 65% |

The shares above are within the 25% pace block. Example: dirt sprint E1 has an 11.25% final-rating share. Scores break ties by the unchanged native base score, then horse name. Ratings are not probabilities.

## Registered versions and test order

| ID suffix | Change from previous arm | Purpose |
|---|---|---|
| BASE | Base percentile only | Reproduce native V4.4c-Brisnet order |
| FLAT | 75% base + 25% equal E1/E2/LP | Does adding pace help? |
| CONDITION | Change only pace mix to the table above | Does surface/distance weighting help? |
| TURN | 90% of CONDITION pace + 10% turn percentile, retaining 75/25 overall blend | Does same-line turn evidence help? |

BASE, FLAT, CONDITION and TURN have distinct full model IDs and export together. CONDITION is the visible candidate on Pace & Ratings. Existing Freeze All 3 Models continues to freeze the same models and selector; the candidate has its own all-card export including source race inputs and all three parent outputs. Local captures remain explicitly unverified until independently anchored before post.

Review-only flags (zero score effect in v1):
- Clear early: E/E-P runner ahead of every other eligible runner by at least four points in both E1 and E2. Requires complete source-validated field pace; no FTS/unrated omission.
- Turf sprint tactical/late: E/P or P, E2 within three points of field high, LP percentile at least 75.
- Turf sprint early/late imbalance: E1 percentile at least 75 and LP percentile at most 25. Review, not elimination.
- Dirt route balance: E2 and LP percentiles both at least 60.
- Competitive E pressure: at least two printed E types with E2 within five points of field high. Style-pressure classification requires complete field pace and styles; it is not a forecast of actual fractions.
- Turf route low style pressure: exactly one E/E-P in a fully observed field. Do not call low raw ratings proof of a paceless race.
- Sprint-to-route history: latest start was a same-surface sprint. Show the transition; never substitute its sprint pace into a route profile.

Review one flag at a time after CONDITION is assessed; register a new version before changing any score. Do not promote TURN or scenario bonuses because of an attractive result on a small reused sample.

## Repeatable evaluation

1. Upload a supported PP, verify current surface/distance and final field, inspect coverage and export before racing. Independently anchor the exact export/hash before post. A local timestamp is not proof. Do not overwrite prior frozen snapshots.
2. Keep races grouped into the four surface/distance buckets. Grade all arms and parent models on the exact same complete-field races; report partial/unmatched/held counts separately. Count duplicate track/date/race records once; reconcile conflicts before grading.
3. Primary measures: full-field absolute rank error (lower is better), first-choice winner, correctly ordered first two, correctly ordered first four. Also report correct first-four set irrespective of order and whether the winner was anywhere in the first four; those are different measures. First-four exact/set metrics require at least four runners.
4. Review after at least 30 eligible races across five dates per bucket; this is a review trigger, not proof. Report paired changes and race/day uncertainty, then confirm any promising rule on a later untouched batch before adoption. Dirt routes retain priority. Contender's turf-route expanded exacta remains a separate existing candidate.
5. This tool does not infer ticket results or ROI. Betting comparisons need the previously fixed structures, verified official dividends, unit sizes, scratches and actual ticket costs; ranking improvement alone does not establish betting value.

CLI examples:

```sh
node scripts/brisnet-pace-evaluate.mjs parsed-card.json candidate-export.json
node scripts/brisnet-pace-evaluate.mjs candidate-export.json graded.json verified-results.json
```

Grading accepts a **preserved candidate export**, never newly regenerated forecasts from a parsed card. Results schema: `{"records":[{"race_key":"Belmont Park|2026-10-16|7","actual_order":["2","1","6","5","3","4","7"],"forecast_pre_off_verified":true,"final_field_verified":true,"official_order_verified":true}]}`. This is a schema example, **not an official result**. Review independent pre-off evidence before setting attestations. Duplicate results reject. Missing evidence, mismatched identities/orders, partial forecasts, dead heats and nonfinishers HOLD. The script trusts reviewed attestations; it does not certify them itself.

## Implementation verification

- Automated tests cover all four profiles, input-driven ranking changes, source/condition contradictions, missing versus zero figures, FTS, scratches/AE, same-line turn values, review-only flags, safe display, export preservation and seven-arm paired grading.
- An end-to-end positioned Premium Plus fixture verifies PDF text -> existing parser -> source validation -> candidate figures and ranks.
- Freshly re-parsed the October 16 Premium Plus card: all 933 E1/E2/LP cells agree with the previously independently audited parse. Nine races classify correctly. R3/R7/R8 have complete native rated fields; six races remain partial. Only 36/79 runners have matching pace under the fixed historical rule.
- Today is an engineering/readiness check, not evidence of improved selection. This model was created after R1 started; preserve timing labels and use properly anchored future forecasts for performance evaluation.
- All 27 parent-model orders and unrounded scores remain identical to the earlier frozen nine-race capture.
