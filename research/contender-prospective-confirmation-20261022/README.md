# One prospective confirmation: Contender without current context

**Status: protocol registered; zero prospective predictions, zero graded races. The candidate is NOT confirmed.** No future eligible pre-race card with an independently verified pre-off snapshot has been captured. This is preparation for an actual prospective comparison, not a relabeling of reused historical tests as prospective.

## The one candidate

Compare **CURRENT_CONTENDER** with **NO_CONTEXT**: remove only the existing contribution at index 8. Keep the other 18 contributions, their weights, speed/pace matching, trend, eligibility and tie-breaking identical. Keep direct Early and Late inputs. Do not add the bounded replacement term or the historical-effort reward. MIX1 is excluded.

Selection uses exposed development results: no-context had 438/744 correct actual-top-four pairs versus 435/744 and mean rank error 1.941532 versus 1.953629. Its coverage was worse (327 versus 329 covered horses; 93 versus 95 winner-in-four). These small mixed findings justify checking one candidate, not deploying it. The historical-effort rule changed no orders and supplied one qualifying closer; it is not added to this confirmation candidate.

Verified main's `contender-rankings.js` and `contender-model.js` are byte-identical to production reference commit `91f9bc0460ca07521b5eedb6c42905f42242ac3e`; Git blob identifiers are pinned in the protocol. Any relevant engine/input-pipeline change requires a new protocol and sample, not silently substituting a new control. Neither model implementation is changed here.

## Fixed test

Use consecutive eligible races from every registered future DRF card for AQU/BAQ/BEL/SAR/KEE/CD. Minimum five starters; all experienced; complete verified program identities and target surface/distance; flat Thoroughbred only; both models rank the same whole field. Rankable PASS races remain in the test. Log every race and exclusion before racing. All 30 sealed holdout PDFs remain inventory-only and unused; registration does not release them.

Register the protocol externally before the first prediction. Capture both full predicted orders, unchanged parent contributions and trend, source PP hash, engine identifiers, field, conditions and scheduled off before the card's first scheduled off. Publish each frozen snapshot to independent timestamped storage, such as a GitHub commit, before that off. Verify the publication receipt from the independent source; a typed timestamp or local file date does not establish that predictions were pre-race. The evaluator also checks publication precedes each actual off. No overwrite of local frozen artifacts is permitted.

Freeze complete cards to avoid selecting races after seeing earlier results. Later scratches, surface/distance changes, cancellations or ambiguous top-four outcomes are explicit logged exclusions, not opportunities to substitute a retrospective snapshot. Missing eligible pre-race data invalidates that card's primary inclusion and must remain visible in the all-card registry. This initial implementation does not automate card discovery, PDF parsing, source verification, export from the live UI or independent receipt verification. It accepts reviewed production feature vectors; those external checks remain required.

End at the first completed card where **at least 100 eligible graded races and 20 contributing cards** are available; include that entire card. No interim comparative results or outcome-based extension, threshold adjustment, subgroup selection or winner-based stopping. This is an initial confirmation attempt, not a promise that 100 races are statistically sufficient. Lack of evidence at the endpoint remains inconclusive/not confirmed.

## Judge finishing order directly

Primary: for each actual first-four finisher, find its rank in the model's full predicted field; take the absolute difference from its actual finishing position, average over four, then average equally across races. Lower mean absolute rank error is better. Outsiders ranked ahead of the actual four incur an error, even if their six internal pairs are ordered correctly.

Confirmation requires all of:

1. Completed fixed endpoint and verified pre-off snapshots and official results.
2. Candidate minus control mean rank error below zero, with the upper bound of a paired whole-card 95% bootstrap interval also below zero (10,000 replicates, seed 20261022).
3. No decline in actual-top-four pair order, exact ordered top-four hits, top-four horse coverage or winner-in-four coverage.

Report exactas, trifectas, finishing-slot hits, underneath pairs and first-choice winners as secondary measures. Publish descriptive field-size (5–7 / 8+) and surface breakdowns without selecting a subgroup winner. A winner-count gain alone cannot pass. No rank changes cannot pass. Failed safeguards mean not confirmed; an interval including zero does not demonstrate improvement. No automatic production promotion or betting changes even if the candidate clears this research gate.

## Recorder and evaluator

`confirmation.py` provides `freeze` and `evaluate` commands. `protocol.json` contains the exact registered rules. `ledger.json` explicitly records no prospective observations yet.

Freeze input is a card with `card_id`, `date`, `track`, `provider: DRF`, `data_role: FUTURE_LIVE_CARD`, `source_pp_sha256`, `source_review_verified`, pinned `engine_blob_shas`, `first_scheduled_off_utc` and all `races`. Every eligible race includes verified conditions/identity, surface, distance, the current `production_order` and each runner's program, name, lifetime starts, 19 current contributions and trend. Excluded races need an explicit pre-race reason. Extra outcome fields are rejected. The generated control must reproduce the current production order exactly.

Run `python confirmation.py freeze reviewed-card.json freeze.json`. The output path must not already exist. Publish this exact freeze independently before first off; preserve it and its publication receipt. Keep all cards and exclusions in an independently verified registry, including cards that cannot enter primary grading.

The evaluation bundle contains `protocol_receipt`, `registry`, and `cards`. Each card entry includes `freeze`, `receipt` and `official_results` for every registered race. Receipt fields include `independently_verified`, `url`, `published_at_utc` and the canonical sorted-key compact-JSON freeze SHA256. The protocol receipt similarly identifies the protocol SHA256 and its verified publication timestamp. Official results include source URL, verification status, actual off, full final field, surface/distance and unambiguous top four, or an allowed explicit exclusion reason.

Run `python confirmation.py evaluate reviewed-bundle.json evaluation.json`. The evaluator replays every frozen score, validates protocol/receipt/field consistency, enforces the fixed endpoint and withholds comparative metrics before it. It cannot independently authenticate a URL, verify a source PDF from a hash alone, prove the registry is exhaustive, or trust an editable `verified` flag as external proof. The operator must perform and retain those independent checks; synthetic unit fixtures do not satisfy them.

## Validation

Run `python -m unittest discover -s . -p 'test_*.py' -v`. **17 checks passed.** Checks cover removal of exactly context, no refitting/mutation, parity with the selected saved development arm, source/engine/experience/identity gates, outcome contamination, pre-off freeze and publication ordering, protocol publication before predictions, no overwrites, omitted registered cards, changed fields, outsider rank penalties, no interim comparison, no-change nonconfirmation and coverage safeguards. The development replay is an implementation check and contributes zero prospective races. All other unit fixtures are explicitly synthetic.

**Next dependency:** an eligible new live DRF card and its complete pre-race evidence, captured after this protocol's independent publication and before racing. Until then, confirmed candidates = 0. This work does not run unattended or monitor upcoming cards automatically.
