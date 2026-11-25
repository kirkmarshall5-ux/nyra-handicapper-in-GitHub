# Wider Speed, strict pace, and late-pace averaging

Exploratory research for V4.4c, Finisher and Contender only. No production rules, weights, or parser fields changed. MIX1 is excluded. All 30 sealed holdout PDFs remain unopened and unused.

## Design and limits

Reuse the two previously analyzed October 16 and October 21 development cards. Main comparison: 15 races, actual-condition retrospective replay. October 21 R2 remains a separate field-uncertain diagnostic; R8 remains ungraded. These are repeated tests on the same sample, not independent validation. Official full finish charts and pre-race timing verification remain incomplete.

Six policies cross Speed tolerance 0.5/1/1.5f with latest LP versus arithmetic mean of up to three most recent observed qualifying LP values. Pace always stays within 0.5f, same surface, same sprint/route category, within 365 days, within the latest five actual starts. Missing LP stays missing; missing slots never become zero or move older starts into the five-start window. All model weights, early-pace selection, connections, source gates, and eligibility stay fixed. Speed trend follows Speed tolerance as in the preceding factor-isolation test.

The mean changes only the late feature; early and late are not subtracted or assumed to come from the same start. Horse evidence lists each contributing start's paired early/late/Speed values and printed run style. A high LP figure is evidence of late capacity, not proof that the horse habitually closes or will win. No sectional-position parsing, pace-pressure score, or closer bonus has been added. The next hypothesis needs a complete verified field pace picture and must be specified before outcome scoring.

## Main results

| Model | Speed tolerance | Latest LP: first-choice winners / exactas | Mean-three LP: first-choice winners / exactas | Top-four rank error, latest → mean |
|---|---:|---:|---:|---:|
| V4.4c | all | 6/15 / 0 | 6/15 / 0 | 2.500 → 2.500 |
| Finisher | 0.5f | 8/15 / 2 | 8/15 / 2 | 2.250 → 2.233 |
| Finisher | 1.0f | 8/15 / 2 | 8/15 / 2 | 2.233 → 2.233 |
| Finisher | 1.5f | 9/15 / 2 | 9/15 / 2 | 2.183 → 2.183 |
| Contender | 0.5f | 8/15 / 1 | 8/15 / 1 | 2.250 → 2.233 |
| Contender | 1.0f | 8/15 / 1 | 8/15 / 1 | 2.217 → 2.217 |
| Contender | 1.5f | 8/15 / 1 | 8/15 / 1 | 2.217 → 2.217 |

No trifecta or superfecta in any policy. Averaging adds no correct exact finishing slots or underneath-order pairs at any Speed tolerance. With Speed 1.5f, averaging changes only one Finisher full ranking: October 21 R7 swaps the horses ranked fourth and fifth; no scored outcome improves. Contender full rankings are unchanged at that tolerance. Other score changes need not change order.

The wider-Speed Finisher advantage is still concentrated in October 21 R4: 5-2-1-6 becomes 2-5-6-1 against actual 2-4-6-1. The winner and third/fourth slots improve, but the actual runner-up is still absent from the predicted top four. This is one race, not independent evidence for multiple improvements.

## Why closer identification is limited

Strict LP is available for 33 of 102 rated horses; 23 have at least two qualifying LP values. Only 6 of 15 winners have strict LP; 14 winners are rated. Of the 69 rated horses lacking strict LP, 39 lack a same-surface start within the five-start/365-day window, 15 lack the same sprint/route category, and 15 have no start within 0.5f. No additional horses gain LP from averaging.

The five October 16 races moved to synthetic make up much of the surface shortage. Missing evidence is not evidence of weak finishing ability. The 102 denominator counts rated horses; first-time starters and other unranked runners are not silently assigned pace.

V4.4c's current native Brisnet score has no LP term. Finisher gives LP a fixed 15% weight, with missing values neutral. Contender has a positive frozen LP coefficient (0.14536183174709905 on its centered feature); this is not a percentage weight.

October 21 R7 illustrates why simply favoring the biggest LP is insufficient: winner #7 Long Legged Queen has printed style P, latest strict LP 72 and mean-three LP 78.67. #8 Aperitif has style E/P, latest LP 84 and mean-three LP 82.33. Both LP versions favor #8; all three models still rank #8 first. The source-designated S runner #1 Arinata has LP 72 and finished fourth. The result alone does not establish how the winner gained ground during the race.

Keep wider Speed with strict pace as a research candidate. Neither this averaging test nor this small reused sample supports deploying a closer adjustment.

## Reproduction and checks

Run `node scripts/evaluate-strict-late-pace.mjs MANIFEST_JSON OUTPUT_JSON` with the authorized development manifest schema used by the preceding factor-isolation experiment. It rejects non-development roles and nonzero holdout use. The JSON includes full rankings and start-level LP evidence. This directory provides a compact protocol, summary, race orders and evidence.

Runtime assertions verify stable eligibility/unrated runners, source immutability, missing-LP masks, fixed weights/recent Speed, unchanged early pace and all non-LP Contender features against the same-Speed control, unchanged V4.4c scores, and disabled betting/probabilities. All latest-LP rankings/scores independently reproduce the preceding factor-isolation results across 17 races and three models. The full test suite passes 401 tests, including boundary cases for missing LP, the three-value cap, route/category/surface exclusion and the five-start limit.
