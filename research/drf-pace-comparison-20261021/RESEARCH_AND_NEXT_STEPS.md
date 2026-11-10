# Combining late strength with projected race setup
Research synthesis and proposed sequence — October 21, 2026

## Recommendation

Develop one provider-specific, field-relative pace-context candidate for Contender, using DRF as the primary development base. Preserve V4.4c and Finisher (60% recent speed / 25% matched speed / 15% late) as controls. Keep current production and all 30 sealed holdout PDFs unchanged. Keep MIX1 out of current comparisons.

The proposed prediction chain is: overall ability → likely early competition → each horse's likely position and exposure → available late strength → finishing order. A strong late rating is one piece of this chain, not a sufficient winner-selection rule.

This document is a research proposal, not a fitted model, a completed new backtest, or a deployment recommendation.

## Evidence we already have

The October 21 DRF removal comparison includes 124 previously analyzed zero-FTS races on 22 cards, after excluding 17 archived races with blank program identities. Late ratings exist for 919 of 921 rated runners and 123 of 124 winners. Missing late ratings are not the main obstacle in this selected DRF sample.

Finisher current: 33 winners, 10 exactas, 5 trifectas, 3 superfectas. Removing direct late: 30 winners, 11 exactas, 7 trifectas, 5 superfectas. Late helps winner selection here, while some ordered-finish metrics move in the other direction.

Contender current: 26 winners and 7 exactas. No direct late: 30/5; no context: 29/8; no late or context: 29/4; no pace terms: 32/8. Direct-late removal retains late information in the interaction; it is not a pure all-late removal. Cohort effects vary. These are selected reused development races, not independent proof that pace is harmful.

The Brisnet matching comparison is separate: only 33/102 rated runners have an LP surviving strict historical matching; wider Speed with strict pace yields Finisher 9/15 winners versus 8/15 control, with the extra winner confined to one race. Averaging qualifying LP adds no winner/exacta hits.

Earlier retrieved chats and available reports support the same caution: blanket LP increases did not reliably improve order; some early/context candidates showed small historical gains; a previous strict Brisnet pressure interaction produced zero eligible triggered races. Its neutral outputs therefore did not test the pressure hypothesis. That historical experiment involved MIX1 and is not an active-model recommendation.

Current source also contains a DRF Contender pressure heuristic based on Early >=95 and a raw Late-minus-Early interaction. This is a candidate for replacement, not a verified description of actual energy expenditure. DRF style labels inferred from fixed Early/Late cutoffs are proxies; they must not be treated as independent observed running-style evidence.

## What the primary sources support

1. TimeformUS summary Early/Late ratings combine multiple performances and incorporate style, distance and surface. They are designed for horse-to-horse comparison in an upcoming field. Their construction differs from per-race TimeformUS pace figures. Do not rebuild the summary by applying Brisnet's LP line-selection filter. [1,2]

2. The figure maker recommends assessing competition for the lead before emphasizing late kick. Relative gaps between likely leaders matter; a high Early rating alone does not establish a duel. Tactical flexibility also matters. [2,3]

3. Brisnet E1/E2/LP describe different race segments. E1 and E2 call distances differ between sprints and routes. Brisnet race-shape numbers describe the leader's historical pace relative to expectations for that race's final time. They can contextualize a performance but do not directly forecast today's pace. [4,5]

4. Printed Brisnet E, E/P, P and S styles distinguish need-for-lead from flexible pressing and sustained running. Speed points describe historical first-call behavior; they are not the same as a pace rating. An E/P runner should not automatically count as a committed speed rival. [6]

5. DRF historical race-shape symbols indicate which styles the flow favored and incorporate post-race chart checks. They do not simply measure early pace speed; absence does not establish neutral flow. Their target-race values cannot be prediction inputs. [7]

6. Equine pacing research supports a mechanism linking effort distribution, energy availability and the late finish. The cited study uses detailed tracking from roughly ten French synthetic-track races. It supports the mechanism, not a validated U.S. PP-based finishing-order formula. [8]

7. Ranking models can directly learn relative order and support partial observed rankings. This is a later methodological option, not evidence that a named algorithm will outperform our models. [9]

## Design principles inferred from that evidence

Distinguish finishing capacity, habitual position, and opportunity. A stalker can be a strong finisher without being a deep closer. A horse can pass tired runners late while lacking enough total ability to win. Good LP after an easy early trip is different evidence from sustaining a finish after pressure.

Keep overall speed as the ability foundation. Test finishing strength as a conditional effect when the setup gives it a plausible opportunity. Do not apply an S-style bonus or assume that two fast horses necessarily exhaust each other.

Use separate early and late field comparisons. A raw Late-minus-Early number should not be called stamina, fatigue, or an energy reserve. Brisnet E2-minus-E1 has a defined turn-time interpretation, but it is not a substitute for late ability. Do not sum TimeformUS Early and Late into a speed figure.

Retain within-provider numeric gaps as well as rankings. Percentiles alone can make a tiny lead appear as important as a large lead. Never pool raw DRF and Brisnet values or transfer fitted pace coefficients automatically.

Model uncertainty explicitly. FTS remain unknown. They do not require invented ratings or automatic exclusion from all reporting, but their presence weakens the certainty of a pace forecast. Missing experienced-runner evidence is also not zero. An uncertain field cannot establish a confident lone-lead claim.

## Work sequence

### 1. Audit the existing DRF evidence before adding features

Use the approved previously analyzed archive; create a manifest with source IDs, dates, roles, provider, race identity and known results. Deduplicate repeated cards across earlier reports. Record every attempted race.

Verify whether each DRF PDF contains summary ratings only, individual TimeformUS pace figures, historical shape symbols, or usable positions/beaten lengths. Do not assume a Formulator feature is printed in every uploaded PDF.

Review the missing program identities in the 17 excluded archived races. Recover identities only from independently supported sources; never infer program numbers from the result or silently renumber runners.

For a source-reviewed sample, extract first-call/second-call/stretch/finish position and beaten lengths, with distance, surface and provenance. Mark threshold-derived style as proxy. Use historical behavior to distinguish committed leaders, flexible pressers, stalkers and deep closers. Unknown stays unknown.

Deliverable: a source/feature availability table and an audit of style labels, not a changed ranking.

### 2. Validate a race-setup diagnostic before scoring it

Estimate contested pace, clear lead, or uncertain/ordinary setup using:
- magnitude of gaps among the highest Early ratings;
- how many plausible lead-seeking horses are clustered near the fastest;
- verified evidence that those horses need or regularly seek the lead;
- E/P flexibility where supported;
- current field, surface, distance, scratches and unknown runners.

Use first-call evidence and rating semantics consistently; a projected leader at first call is not necessarily the horse sustaining speed to second call.

Record expected pressure and likely exposure separately. Field size is a covariate and reporting subgroup, not an automatic closer bonus. Do not infer measured slow/fast pace solely from the count of front-runners.

Validate the diagnostic against independently derived actual pace/position labels from charts, appropriate pace figures or reviewed replay evidence. Actual outcomes may be evaluation labels, never features. Do not label 'hot' merely because a closer won. Log triggered, uncertain and non-triggered races separately.

### 3. Test one replacement context rule for Contender

Compare three arms on identical fields:
A. Current Contender.
B. Current Contender with existing context term removed.
C. Replace that context term with a small, bounded field-relative interaction.

Candidate C tests late strength when projected competitive pressure is high, and early advantage when the evidence supports a clear lead. Retain the existing direct speed, early, late, connections and trend terms initially. This isolates context before a separate late-weight experiment.

Conceptually:
candidate = current minus old context
            + bounded(pressure × relative late strength
                      + clear-lead evidence × relative early strength).

This is a specification outline; thresholds, centering, maximum adjustment, coefficients and missing-data rules must be written and locked before validation. Fit at most a small number of parameters on development data, penalize unnecessary complexity, and choose settings using card/date splits. Do not pick a score cap or bonus by looking at a missed winner.

No independent style information: evaluate a clearly labeled ratings-only diagnostic, without pretending that its style was observed. Uncertain field: zero/withheld context adjustment and explicit uncertainty. Do not make all otherwise rateable horses disappear because the context overlay is unavailable.

Keep Finisher fixed as a comparison. A future conditional-Finisher variant would need a separate version; it would not silently alter the frozen 60/25/15 model.

### 4. Add historical effort context only after the first interaction test

Second experiment, separate from Step 3:
- closers whose recent results were limited by slow historical flow;
- leaders who sustained credible overall speed despite pressure;
- apparently strong late figures earned behind an extreme collapse;
- whether a horse consistently makes its move early enough to challenge for the desired finishing position.

For Brisnet, require E1/E2/LP/Speed and shape values from the same historical start when evaluating sustained effort. Do not construct an imagined race by combining one start's best E2 with another's best LP.

For DRF, use printed summary Late initially. Add historical shape/sectional/position context only where independently parsed and verified. Do not penalize the same performance twice through correlated features.

### 5. Evaluate finishing order directly

Prespecify:
- primary: top-four relative-order accuracy across all six pairs, with coverage reported;
- underneath diagnostic: three pairs among actual places 2–4;
- safeguards: first-choice winner rate, winner in top four, and top-four set coverage;
- secondary: exacta, trifecta, superfecta and mean top-four rank error.

Report gains and losses race by race, not just net totals. Show 5–6, 7–8, and 9+ runner groups; separate dirt/turf/synthetic and sprint/route where supported. Small groups remain descriptive rather than independently tuned models.

Known top four does not supply the rest of the field's order. With fewer confirmed positions, grade only supported comparisons and report the denominator. Any unranked penalty is a declared metric, not a fabricated finish.

Only after contextual features show repeatable value should we compare a small regularized pairwise or ranking model against the fixed-score system. That would learn finishing order explicitly; its predictive probabilities would require separate calibration before Fair Odds/True Chance use.

### 6. Confirm outside the repeatedly examined races

Use chronological whole-card development/validation splits; no same card in both sides. Keep all target-race results out of feature construction. Report repeated-horse and card dependence when assessing uncertainty.

Retrospective splits on already reviewed cards remain development evidence. Finish by freezing one candidate on genuinely future races before off time. Continue until the predeclared sample and number of pressure-triggered races are reached; do not stop when results look favorable. Review earlier 30-race milestones only for mechanics/coverage, not promotion.

Choose the final validation sample from expected effect size, event frequency and observed variance; 30 or 100 races is not automatically sufficient for rare exact-order hits. Use paired whole-card uncertainty intervals.

The 30 sealed holdout PDFs remain inventory-only. A future separately authorized holdout release would require a locked protocol first. Prospective racing allows confirmation without opening them.

## Decisions now

Proceed first with DRF evidence/style audit and field-relative setup diagnostic. The next scoring experiment is Contender's replacement context term, compared against both current and no-context controls. Retain the two existing models as controls.

Continue Brisnet wider-Speed/strict-pace research separately. Defer wholesale LP weight increases, extensive parameter grids, synthetic-to-turf transfers, track-bias bonuses from later races, elaborate simulations and probability claims until the basic context interaction earns its place.

No new predictive improvement is claimed by this research memo. No production code, weights or model permissions are changed.

## Sources

[1] Craig Milkowski, TimeformUS, The Early/Late Ratings: Goal, Scale and Relationship to Pace Figures (2018):
https://timeformus.wordpress.com/2018/01/30/the-timeformus-early-late-ratings-the-goal-the-scale-and-the-relationship-to-our-pace-figures/

[2] DRF, Q&A with Craig Milkowski on Early and Late Pace Ratings (2017):
https://www.drf.com/news/qa-timeformuss-craig-milkowski-early-and-late-pace-ratings

[3] DRF, TimeformUS Pace Projector: Filly and Mare Sprint, Mile could favor closers (2017):
https://www.drf.com/news/timeformus-pace-projector-filly-and-mare-sprint-mile-could-favor-closers

[4] BRISNET, Pace Ratings FAQ (updated 2025):
https://support.brisnet.com/hc/en-us/articles/360056540451-BRIS-PACE-RATINGS-FAQ

[5] BRISNET, Race Shapes FAQ (updated 2025):
https://support.brisnet.com/hc/en-us/articles/360056536691-BRIS-Race-Shapes-FAQ

[6] BRISNET, Run Style FAQ (updated 2025):
https://support.brisnet.com/hc/en-us/articles/9803583657101-Run-Style-FAQ

[7] DRF, New symbols more clearly define Race Shape feature (2016):
https://www.drf.com/news/new-symbols-more-clearly-define-race-shape-feature

[8] Mercier and Aftalion, Optimal speed in Thoroughbred horse racing, PLOS ONE (2020):
https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0235024

[9] Turner et al., Modelling rankings in R: the PlackettLuce package:
https://arxiv.org/abs/1810.12068

Project evidence:
research/drf-pace-comparison-20261021/README.md
research/matching-20261021/strict-late/README.md
Available prior October 16 Contender LP and pressure-interaction reports, plus retrieved prior project discussions; their historical candidate names do not reactivate MIX1.
