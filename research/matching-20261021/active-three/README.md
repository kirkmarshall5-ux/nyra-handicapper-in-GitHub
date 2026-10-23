# Current matching test: V4.4c, Finisher and Contender only

**Decision: retain the live rule.** The useful new distinction is between
matching prior Speed figures and matching prior pace figures. Widening those
two inputs together masked an adverse pace-only change in Finisher.

This report supersedes the earlier four-model comparison for current work.
MIX1 is excluded from the experiment's output, metrics and recommendations.
Earlier files remain historical evidence, not the current active-model set.

## Fixed experiment

Nine combinations: Speed distance tolerance 0.5/1/1.5 furlongs crossed with
pace tolerance 0.5/1/1.5 furlongs. Keep latest five starts, same surface, same
sprint/route category, the 365-day limit, all weights, recent-speed features,
connection inputs, eligibility and missing-value policies fixed. Finisher pace
means LP; Contender pace means E1/E2 and LP. Speed includes Contender's matched
speed/trend. V4.4c numerical rankings are the unchanged control.

Use the same two previously analyzed development cards, including the five
October 16 actual-Tapeta replays documented in the preceding follow-up. There
are 15 graded main races, one uncertain-field diagnostic (October 21 R2) and
one ungraded race (October 21 R8). Repeating these races is exploratory factor
isolation; it is not additional independent validation. No holdout files were
opened. The main races contain 102 rated horse records under every setting.

## Finisher: widening pace alone harms this sample

| Speed tolerance | Pace tolerance | Winners first | Exacta order | Second slot correct | Third slot correct | Fourth slot correct | Underneath pairs correct |
|---|---|---:|---:|---:|---:|---:|---:|
| 0.5f control | 0.5f control | 8/15 | 2/15 | 3/15 | 0/15 | 1/15 | 22/39 |
| 0.5f | 1f | 7/15 | 1/15 | 2/15 | 0/15 | 1/15 | 22/39 |
| 0.5f | 1.5f | 7/15 | 1/15 | 2/15 | 0/15 | 1/15 | 22/39 |
| 1f | 0.5f | 8/15 | 2/15 | 3/15 | 0/15 | 1/15 | 22/39 |
| 1.5f | 0.5f | 9/15 | 2/15 | 3/15 | 1/15 | 2/15 | 23/39 |
| 1.5f | 1.5f | 9/15 | 2/15 | 3/15 | 1/15 | 2/15 | 23/39 |

There are 45 possible pair comparisons among actual positions 2–4. Six involve
unranked runners and remain unscorable under every candidate. Correct/45 is
the conservative equal-race order credit; the table also exposes the 39-pair
coverage denominator. Every variant has zero exact-order trifectas/superfectas.

The pace-only widening reverses October 21 R1's first two picks from 1–6 to
6–1, losing both winner and exacta. The actual first two were 1–6. Keeping pace
at 0.5f while widening Speed avoids this loss. The earlier joint widening hid
that interaction because Speed and pace changes offset each other in this race.

All added exact finishing-position hits from 1.5f Speed come from October 21
R4: the predictions change 5–2–1–6 to 2–5–6–1 against actual 2–4–6–1. First,
third and fourth become correct; runner-up #4 remains outside the top four.
Those are three positional hits in one race, not three independent successes.

Mean top-four rank error (lower is better) moves from 2.250 to 2.183 with 1.5f
Speed/0.5f pace. It improves in three races, worsens in one and is unchanged in
eleven. Widening pace alone moves it to 2.300: zero improvements, two declines,
thirteen unchanged. Unranked horses receive eligible-field-size + 1 solely as
an explicitly declared evaluation penalty; no finishing order is invented.

## Contender: small ordering effects, no new exacta

Contender stays at 8/15 first-choice winners and 1/15 exactas for all nine
combinations. Second/third/fourth exact-position hits remain 2/15, 2/15 and
4/15. Underneath pairs go from 18/39 to 19/39 when pace is widened, entirely
from October 21 R6, with no additional exacta or trifecta. Widening Speed alone
does not add a correctly ordered underneath pair, but reduces mean rank error
from 2.250 to 2.217 (two improved races, zero declines, thirteen unchanged).
Pace-only widening reduces error to 2.233 (two improvements and one decline).

V4.4c stays at 6/15 first-choice winners for every combination, with identical
numerical scores and ranking order. These optional matching features do not
enter its current native formula; matching coverage is therefore not applicable.

## Interpretation and next gate

Do not widen all matching inputs as one change. Retain 1f and 1.5f Speed-only
matching with strict pace as research candidates for later independent testing;
the better-looking 1.5f Finisher result still depends on a single small-field
race. The third/fourth-place changes do not establish consistent underneath
improvement. Preserve the 30-card holdout until its final-test protocol is locked.

Source and field limitations from the preceding reports still apply. There are
no new cards or extra graded races in this round, and no site/scoring changes.

## Reproduction and checks

Run `node scripts/evaluate-speed-pace-matching.mjs MANIFEST_JSON OUTPUT_JSON`.
The manifest declares `active_models: [v44c, finisher, contender]`,
`holdout_files_used: 0`, protocol and explicit development card paths/results.
Source hashes and all nine policies appear in `protocol.json`. The three-model
outputs are preserved in `summary.csv`, `race-comparison.csv` (459 rows, full
rank order) and `changed-races.json`.

399 tests pass. The harness asserts exact baseline parity, unchanged source
objects, unchanged recent speed and connection features, constant eligibility,
unchanged V4.4c scores/order and disabled betting/probability flags. It also
asserts that speed-only changes leave pace inputs fixed and pace-only changes
leave matched-speed inputs fixed. Secondary metric tests cover reversed
underneath order and explicit unranked penalties.
