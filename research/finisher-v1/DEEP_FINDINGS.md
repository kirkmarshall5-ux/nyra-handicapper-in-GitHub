# All 64 disagreements: deeper investigation

Weights and code remain frozen. This diagnostic adds no model or selection rule.

## New findings

| Correct finish slot | V4.4c | Finisher | Change |
| --- | ---: | ---: | ---: |
| 1 | 29 | 35 | +6 |
| 2 | 23 | 29 | +6 |
| 3 | 24 | 23 | -1 |
| 4 | 27 | 20 | -7 |

Finisher gains six correct firsts and six correct seconds but loses one third and seven fourths. Exact first-two pairs remain only 8 versus 10 across 130 races; more correct seconds do not mean the first two were jointly right.

The 64 different-top-pick races show 44 / 57 correct slots and 168 / 167 actual top-four horses covered (V4.4c / Finisher). The 66 same-top-pick races show 59 / 50 correct slots and 185 / 175 coverage. Thus ten of the net eleven lost top-four horses come from races where the models agreed on the top horse. Winner disagreement alone does not explain the coverage weakness.

## What drives the switches

Finisher recent speed is its largest favorable score-margin component in 49/64 disagreements; matching speed in 12 and late pace in 3. V4.4c connections are its largest favorable margin component in 38/64, latest figure in 20, best-of-three in 3 and adjustments in 3. These are arithmetic explanations, not causal explanations of race wins. In Finisher-only wins, connections lead V4.4c's margin in eight cases; the same is true in eight V4.4c-only wins. This does not justify deleting or restoring connection weights based on this review alone.

Among the 34 neither-pick-won disagreements, the actual winner was in both selected fours 11 times, only Finisher's four 7 times, only V4.4c's four 4 times and neither four 12 times. Some misses are slot-selection errors; others are broader contender-selection failures.

## Data audit

All three Finisher input values reproduce from the source archives for all 960 historical runner appearances: no stored-feature differences were found. The historical comparisons are reproducible, but reproducible input limitations still matter.

Fifty-nine runner appearances use the existing latest-figure fallback because a complete recent actual-start sequence is not verified. A top pick uses that fallback in five of the 64 disagreements (three Finisher-only wins and two neither-won cases). Do not describe every recent-speed input as a verified five-start average.

The current distance routine cannot decode six scheduled header lines across the 130 races: BAQ May 23 R6, BAQ June 18 R5, BAQ June 21 R2, SAR June 4 R7, SAR July 12 R2, and KEE October 9 R9. Four are top-pick disagreements and neither pick won in all four. All six have neutral/unknown matching-speed inputs across the field. Visual inspection of SAR July 12 PP page 3 confirms 1 1/2 miles; stored text is `1 ¶ MILES`, which the current expression does not decode. The fractions containing `´` are also unsupported in the current routine.

The historical `¶` distance token also maps to 3/16 in the existing shared extractor, inconsistent with the confirmed source font. One potential false historical match was flagged for Otello in BAQ May 23 R8, a race where the top picks agreed. That row needs source review; it is not silently corrected in these results.

## Named cases

- BAQ June 25 R2: both top picks had latest Beyer 57, but Lady Wisdom's recent average was 56.16 versus 51.62 for That'sthefactjack. V4.4c's pick had a local trainer record of 3 wins from 6 starts, contributing the capped trainer value 100; Lady Wisdom's trainer was 1/10. Finisher selected Lady Wisdom and won. This is a concrete small-sample connection-versus-form case, not proof to ignore all trainers.
- SAR July 3 R11: V4.4c selected winner Brokealltherules. Latest Beyer 77 and Early 105 received +0.95 field-relative, +2 pace-fit and +2 lightly-raced-upside. Finisher preferred Dividend Recap's steadier recent average and Late 91 versus 57, dropping the winner to sixth. The reproduced +4.95 adjustment equals the archived score residual.
- KEE October 10 R4: both missed Money Supply. Its Late 94 beat the two top picks' 71 and 76, but it had lower recent speed than Finisher's choice. It finished first from V4.4c rank four and Finisher rank three. This illustrates a plausible pace/condition context for further study, not evidence that a larger Late weight is warranted.
- CD April 30 R9: both correctly selected Lagynos. V4.4c included actual fourth Minaret Station; Finisher ranked it eighth and included Balnikhov, who finished sixth. Minaret Station's figures were improving (65, 69, 78, 83 chronologically), but its recent average and matching speed were lowest in this experienced field. This is an underneath-ranking failure despite agreement on the winner.

## Next priority

Keep V4.4c and 60/25/15 frozen. First prepare a separate source-decoding correction and verify distances/retained history against the PPs. Then compare corrected-input results under the same frozen weights, with original predictions retained as a separate record. Do not adjust weights until these data issues and the fourth-slot losses are understood. No production changes or corrected-input replays were made in this investigation.

The CSV lists all 64 cases. JSON evidence contains exact components, source history, archived outcomes and a visual-source-check reference. Scripts are read-only diagnostics.
