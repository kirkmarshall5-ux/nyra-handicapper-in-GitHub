# Frozen-model winner disagreement review

User instruction: preserve V4.4c as control and Finisher at 60/25/15. No model, parser, eligibility or website changes were made.

## What was compared

Across 130 historical races, the models selected the same first horse in 66 races (17 winners). They selected different horses in 64 races: Finisher alone won 18, V4.4c alone won 12, and neither pick won 34. The 30 exclusive-win cases are the diagnostic focus; they are not all disagreement races.

| Archive | Finisher-only winners | V4.4c-only winners | Net |
| --- | ---: | ---: | ---: |
| 58-race archive | 7 | 6 | +1 |
| Saratoga 47 | 7 | 3 | +4 |
| Keeneland 25 | 4 | 3 | +1 |

## Findings

- Reordering matters: 16 of Finisher's 18 exclusive winners were V4.4c rank 2 or 3; the other two were rank 5. This is mostly promotion of existing strong contenders, not discovery of completely excluded horses.
- V4.4c also rescued horses Finisher already liked: 10 of its 12 exclusive winners were Finisher rank 2 or 3, one was rank 4 and one was rank 6.
- In the 18 Finisher-only wins, the largest positive contribution to its score margin over V4.4c's pick came from recent speed 12 times, matching speed 5 times and late pace once. Those margins are arithmetic explanations of the selected order, not proof that the factor caused the race outcome.
- The same preference can fail: recent speed was the largest Finisher score-margin contributor in 9 of its 12 losses to V4.4c; matching speed was largest in the other 3. The actual winner had the higher recent-speed average in only 2 of these 12 races.
- Finisher's winner had a higher recent-speed average than V4.4c's pick in 13/18 exclusive wins, but a lower latest figure in 9/18. This is consistent with a steadier recent record sometimes beating a stronger single latest figure. It is not a universal rule.
- Both picks had matching-speed data in only 9/18 Finisher wins and 6/12 V4.4c wins. Missing optional matching data was present in exactly half of each group. The gain cannot be attributed simply to one group having more complete matching data.
- Its advantage appeared on dirt (11 vs 7 exclusive winners) and turf (7 vs 5), but these are small counts of switches, not surface-specific performance rates. Cohort contributions differ: Saratoga supplies four of the six net winners.

## Decision

Keep both specifications frozen. Do not infer a new weight, minimum score gap, betting rule, provider switch or automatic model-selection rule from these 30 races. Archive the full score-margin explanations and examine future disagreements under the same rules. Current evidence supports a hypothesis about ranking stable recent form; it does not establish a dependable advantage.

## Reproduction

Run `python3 research/finisher-v1/disagreements.py /path/to/archive-workspace`. Predictions come from the already-frozen EVALUATION evidence. The script reads source feature archives only to add original figures and control scores. It never reranks horses. Each contribution margin is checked against the exact Finisher score difference. Program numbers missing in old records remain unknown; name IDs are not public program numbers. Saratoga outcomes outside the official first four remain unknown rather than receiving invented finishes.

`DISAGREEMENTS.json` contains all 30 cases, factor values and margins, original control scores, observed finish positions, source cohorts and missing-input counts. `CONTROL_AND_CHALLENGER_LOCK.json` records the instruction and unchanged model/control SHA-256 digests.
