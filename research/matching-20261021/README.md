# Matching tolerance development experiment — October 21, 2026

**Current active-model report:** [V4.4c, Finisher and Contender only](active-three/README.md). The earlier four-model experiment below is retained as historical evidence.

**Decision: retain the live matching rule.** Wider matching improves evidence
coverage substantially but provides too little ordering improvement to promote.
This is retrospective development analysis, not a blind validation or a replay
of the original frozen forecasts. All coefficients and connection rules are from
the current `20261021-input-v2` adapters. No holdout files were opened.

## Protocol and sample

Six predefined combinations: latest five versus all available historical starts,
each at 0.5, 1 and 1.5 furlongs. Keep the same surface, sprint/route category,
365-day cap, scoring weights, eligibility checks and missing-input handling.
The recent-speed windows do not change when matching uses deeper history.

Previously analyzed Belmont October 16 (nine races) and October 21 (eight races)
provide the input cards. Sixteen races have observed top-four results; October
21 race 8 is ungraded. Ten races with matching scheduled/result surfaces form
the main comparison. Five October 16 races moved from turf to Tapeta: they are
separate scheduled-surface diagnostics, not included in the main comparison.
October 21 race 2 is separate because Santagata is in the saved field but absent
from the provided result list; no scratch is inferred from that omission.

These records do not certify official final fields or pre-off forecasts.
Reported October 16 scratches are applied equally to every candidate. October
21 uses the saved export's field flags. The reported DNF in October 16 race 4
does not enter the top-four pair metric. No order outside the observed top four
is invented. No ROI, probability or predictive-significance claim is made.

## Main results — ten races

The pair score checks the six relative-order comparisons among each race's
observed first four. Eight of the 60 possible pairs involve unranked horses and
remain unscorable under every variant. Show both coverage and correct pairs;
unscorable pairs are not silently counted as correct or excluded from order
credit (correct / 60, giving every race equal weight).

| Model | Matching | First-choice winners | Exacta order | Correct pairs / 52 comparable | Matched Speed coverage |
|---|---|---:|---:|---:|---:|
| Finisher | Latest five, 0.5f control | 5/10 | 1/10 | 32/52 | 32/62 |
| Finisher | Latest five, 1f | 5/10 | 1/10 | 32/52 | 41/62 |
| Finisher | Latest five, 1.5f | 6/10 | 1/10 | 33/52 | 42/62 |
| Contender | Latest five, 0.5f control | 5/10 | 1/10 | 31/52 | 32/62 |
| Contender | Latest five, 1f | 5/10 | 1/10 | 32/52 | 41/62 |
| Contender | Latest five, 1.5f | 5/10 | 1/10 | 32/52 | 42/62 |

All three settings have zero exact-order trifectas and superfectas for both
models. Finisher's order credit is 32/60, 32/60 and 33/60 respectively;
Contender's is 31/60, 32/60 and 32/60.

Finisher's extra winner at 1.5f is entirely October 21 race 4: Maria Callas moves
from second to first. Its top four changes 5–2–1–6 to 2–5–6–1; the actual order
is 2–4–6–1, so runner-up #4 remains missing from the selections.
Contender's extra correctly ordered pair is October 21 race 6; it does not add
an exacta or a first-choice winner.

### Field sizes

Three main races have five or six saved starters; seven have seven to nine.
There are no ten-plus-starter races in the main comparison. Finisher's extra
winner is in the small-field group; it gains no winners or pair-order accuracy
in the seven-to-nine group. Contender gains one pair in that larger group but
no winners. The sample does not establish improved large-field performance.

### Other variants

Deeper matched history at 1.5f raises Finisher matched-speed coverage to 43/62,
but drops its first-choice winners back to 5/10. It retains 33 correct pairs,
and adds no exacta or trifecta. Deeper history provides no consistent advantage.
V4.4c's numerical scores and rankings are unchanged for every variant because
its current formula does not consume these matching features. Research MIX1's
main first-choice count is 4/10 at control, 5/10 at latest-five/1f and 4/10 at
latest-five/1.5f; it adds no exacta. Full variants and diagnostic cohorts are
included in the adjacent summary and race comparison files.

## Recommendation

Retain the live control. Keep latest-five/1f and latest-five/1.5f as fixed
research candidates for later evaluation on additional development cards with
verified final fields, especially larger fields. Do not select new weights from
these results. Reserve all 30 holdout cards for a separately locked final test.

## Reproduction and integrity

Run `node scripts/evaluate-brisnet-matching.mjs MANIFEST_JSON OUTPUT_JSON` from
the repository. The manifest declares `holdout_files_used: 0`, a protocol, and
`cards` containing `role: DEVELOPMENT_PREVIOUSLY_ANALYZED`, a `card_path`, and
`results` records (`race`, `top4`, `cohort`, `notes`). Source hashes and complete
protocol appear in `summary.json`. The 408 rows in `race-comparison.csv` include
all four models, six variants and all 17 source races, including ungraded rows.

The harness creates temporary research copies of the adapters and removes them
after use. Live source files are never rewritten. It asserts complete control
parity, unchanged V4.4c scores/order under every matching variant, unchanged input
objects, and disabled betting/probability flags. Baseline model IDs are recorded
as parents; separate candidate IDs label every experiment result.
