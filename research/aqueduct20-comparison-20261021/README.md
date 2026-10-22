# Twenty released Aqueduct cards: Contender, morning line and recent-three figures

**Completed: all 20 authorized source cards assessed; all 169 race dispositions resolved.** Thirteen scheduled races were officially canceled, leaving 156 completed races on 19 dates and 1,032 actual starters. All models and input policies were held fixed; no production scoring was changed.

## Result that matters for Contender

Compare the current production Contender with the single candidate that removes only its existing context contribution (index 8). Both retain all other 18 contributions, direct Early/Late inputs, trend, field, source matching and tie-breaking.

| Finishing-order measure, same 131 complete-field races | Current | No context |
|---|---:|---:|
| Correct relative order among actual top-four pairs | 477/786 | 480/786 |
| Mean absolute full-field predicted-rank error, lower better | 1.6145 | 1.6126 |
| First-choice winners | 38 | 38 |
| Exactas in order | 14 | 14 |
| Trifectas in order | 5 | 5 |
| Exact top four in order | 4 | 4 |
| Top-four horses covered | 378/524 | 379/524 |
| Winner selected in first four | 109/131 | 109/131 |

Only nine full rankings change. Mean rank error improves in two races and worsens in one; the other 128 are unchanged on that metric. The candidate-minus-current rank-error difference is -0.0019084, with paired whole-card bootstrap 95% interval [-0.00844595, 0.00403226] (10,000 replicates, seed 20261021). The interval includes zero. The candidate gains three pair comparisons and one covered finisher, with no additional exact ordered finishes. **This does not establish a finishing-order improvement. Keep current Contender live.**

Eight completed races had four starters, making top-four membership automatic. Removing those leaves 123 complete-field Contender races: the candidate still does not establish improvement; rank-error delta -0.00203252, interval [-0.00892857, 0.00427350]. In the 25 complete-field races with eight or more starters, current versus candidate coverage is 59 versus 60 of 100 finishers; neither gets the exact top four. These small descriptive subgroup counts do not justify selecting or promoting a subgroup model.

Twenty-five completed races have only a partial Contender ranking under existing source/experience gates. Keep those forecasts visible in the race details but exclude them from primary whole-field performance. Do not call a partial ranking a complete model test or silently remove unrated runners from the actual finish.

## Morning-line baseline

Select the four shortest source-printed fractional morning-line prices among verified actual starters. Scratched horses are removed; final betting odds are never used. Break equal morning-line prices by ascending program number, including suffix; flag ties. There are 25 fourth/fifth selection-boundary ties, so some top-four sets depend on that fixed tie rule.

Across all 156 completed races, those four horses filled **465/624 actual top-four slots (74.5%)**, averaging 2.981 hits per race.

| Number of the four selections finishing in the actual top four | Races |
|---|---:|
| 0 | 1 |
| 1 | 2 |
| 2 | 27 |
| 3 | 95 |
| 4 | 31 |

The winner was among the four in 134/156 races. The first morning-line choice won 58. Ordered exacta/trifecta/top-four hits are 16/5/1. Membership success should not be confused with getting all four in exact order.

| Morning-line rank | Finished 1st | 2nd | 3rd | 4th | Outside top four |
|---|---:|---:|---:|---:|---:|
| 1 | 58 | 42 | 23 | 17 | 16 |
| 2 | 36 | 30 | 30 | 24 | 36 |
| 3 | 20 | 27 | 31 | 23 | 55 |
| 4 | 20 | 25 | 31 | 28 | 52 |

On the **same 131 complete-field Contender races**, morning line covers 388/524 finishers versus current Contender's 378/524; morning-line rank error is 1.5324 versus 1.6145, and pair order is 486/786 versus 477/786. Contender has more exact ordered exacta/trifecta/top-four hits: 14/5/4 versus morning line's 12/4/1. The useful benchmark is mixed by objective, not a claim that one method dominates every outcome.

## Strict recent-three pace/Beyer request

The user chose a 50/50 combination of within-race ranks of last-three average pace and last-three average Beyer. After the source limitation was explained, the user explicitly chose to keep the last-three requirement and run average Beyer separately where pace was unavailable.

These 20 DRF Classic cards contain individual historical Beyers and **summary** TimeformUS Early/Late ratings. They do not supply three individual historical pace figures per horse. No average of Early/Late summaries, raw fractional times, DRF speed-rating/track-variant pair or older figures is substituted. The requested equal pace/Beyer model is **NOT TESTABLE on this input: zero qualifying combined forecasts, not zero predictive hits**.

For the authorized **Beyer-only diagnostic**, use exactly the three most recent actual prior race rows, regardless of distance or surface. Require all three dated strictly before the target card, in chronological order and aligned to certified source Beyer proofs. Arithmetic mean, equal weight, descending average; ascending program tie break. Never skip a missing recent figure in favor of an older one. Six selection-boundary ties are flagged.

Among 1,032 actual starters:

* 147 have fewer than three starts: 41 first-time starters, 55 with one start, 51 with two. Excluded and individually listed.
* 39 have at least three starts but a certified Beyer is missing in the exact recent three rows. Excluded separately, not described as fewer-than-three-start horses.
* 846 have the three required Beyers.

There are 135 races with at least four eligible selections; 21 have fewer than four and are marked insufficient, not padded with excluded runners. Across those 135 races, average-Beyer selections cover **391/540 top-four slots (72.4%)**, average 2.896 hits, and select the winner in 107/135. The first choice wins 33; ordered exacta/trifecta/top-four hits are 9/4/0. Hit-count distribution for 0/1/2/3/4 is 0/7/26/76/26.

Only 104 of those races have all four actual finishers present in the diagnostic's eligible ranking, so its 353/624 pair score and 1.6442 mean rank error have a different denominator. No invented rank is assigned to an excluded horse. Do not compare these conditional ordering numbers directly with the full Contender cohort.

For a descriptive same-race view where all four methods rank all four actual finishers, 102 races qualify. Current/no-context/morning-line/Beyer-only coverage is 300/301/303/308 out of 408; pair ordering is 366/367/373/342 out of 612. Average Beyer finds more members but orders them less accurately here. This cohort is conditioned on the actual finishers having sufficient history and the Beyer ranking excludes other ineligible horses, so it is not a universal forecast-quality comparison or a reason to promote the diagnostic.

## Source and result verification

The source-pinned production engine is commit `91f9bc0460ca07521b5eedb6c42905f42242ac3e`; engine Git blob hashes are retained in `engine-sources.json`. Every parsed card has a source PDF SHA256 and its original Library identity in the release manifest. Exactly the 20 AQU January-April cards uploaded October 21 were released by the user's instruction. All 20 are now **used research data**, including the canceled card whose PPs were analyzed. The other ten reserved CD/FG/DEL/FL cards remain unopened.

All 20 PDFs parse: 169 scheduled races, 1,240 listed horses, no card parse errors or race blockers. An independent MuPDF source-column pass agrees on every horse's program, morning line, starts and printed Early/Late pair. It also verifies all **3,051 individual Beyer cells** used in the source-field recent-three calculation. One leading-space source token required whitespace normalization in the auditing script; the extracted figure was already correct and no model input changed. Source labels and averages are not inferred from outcomes.

Official NYRA pages resolve all 156 completed final fields, top-four program/name identities and 112 scratches. Final fields total 1,032 starters. The remaining 96 listed entries belong to the 13 canceled races. All completed races are officially Dirt; source and official target surfaces agree. Final-field research scores are recomputed on the same verified starters for both Contender arms, rather than just deleting scratched horses from old field-relative scores. Source-field orders are also retained separately.

January 17 R5-R9 cancellation: https://www.nyra.com/aqueduct/news/remainder-of-saturday-card-canceled-at-aqueduct-racetrack/

February 22 whole-card cancellation: https://www.nyra.com/aqueduct/news/live-racing-at-aqueduct-canceled-on-sunday-feb-22-due-to-winter-storm/

Every completed race's official URL and program/name field are in `official-results.json.gz`; there are no unresolved completed-race results. Retrieval began with public result access checks and daily pages before the source-field scoring freeze; models and test rules were fixed, with no outcome-based fitting or retuning. Accordingly, this is **newly released historical-card retrospective validation, not an outcomes-blind or pre-race prospective test**. It does not count toward the separately registered future pre-off protocol, whose ledger remains unchanged.

## Evidence and reproduction

`protocol.json` preserves the fixed rules. `source-manifest.json` identifies the 20 released PDFs and their prior sealed status; `source-orders.json.gz` retains all source-field orders plus the original full source-freeze hash. `final-prediction-freeze.json.gz` contains final-field input contributions, trend, raw features, source names, morning lines, exact recent-three proofs/averages, exclusions and full predicted orders, without actual finishing labels. `results.json.gz` adds every graded metric and cancellation disposition. The metric denominators in `SUMMARY.json` are explicit. `race-comparison.csv`, `morning-line-horses.csv`, `recent3-beyer-horses.csv` and `excluded-horses.csv` supply reviewable per-race/per-horse details. Compressed source audit and official field files retain independent checks; `HASHES.json` binds retained files.

Run `node parse_cards.mjs`, `node predict.mjs source`, `python audit_sources.py`, `python collect_results.py`, `node predict.mjs final`, and `python grade.py` with the original authorized PDFs, parsed cards and saved official retrievals available. Raw original PDFs remain in their existing Library identities; local paths are not portable. The engine is included and pinned; the parser uses the installed PDF.js runtime. The collector's downloaded raw web responses are working inputs, not supplied as unbounded copied articles. Frozen evaluation can be replayed directly from retained final inputs and official facts.

Run `python -m unittest discover -s . -p 'test_*.py' -v`. **20 checks pass**, including all card/race dispositions, independent source/Beyer cells, unchanged context-only candidate, exact date/figure alignment, no missing-figure backfill, source-price morning lines/ties, partial-field gates, no padded selections, missing-rank handling, every race metric, hit distributions and freeze hashes. These checks validate the computation; they do not establish model improvement.

**Decision: no live model or weight change.** Removing context is not confirmed by finishing order on this sample. Morning line is a useful comparison baseline. The simple recent-three Beyer selection has some membership value but weaker ordering in the descriptive common cohort. The requested strict combined pace/Beyer model needs genuine per-race pace inputs before it can be tested.
