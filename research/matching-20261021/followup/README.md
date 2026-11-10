# Controlled matching follow-up — actual surfaces and robustness

**Decision: retain the live half-furlong rule.** The fixed 1f and 1.5f candidates
still show little ordering benefit. Getting the actual surface right has a
larger effect on these development races than widening distance tolerance.

## What was checked

NYRA's dated October 16 results pages confirm that races 3, 5, 6, 8 and 9 ran on
Tapeta, at 8.5, 6, 8, 6 and 8.5 furlongs respectively. Top-four and Also Rans
program sets reconcile exactly to the saved card after the explicitly listed
scratches (#5 in R5, #4 in R6, #3 in R8). All nine October 16 listed fields now
reconcile at the NYRA result-page level. This does not certify full finishing
order, the reported DNF, or that forecasts preceded the surface announcements.
Equibase chart access returned 403. October 21 R2's uncertain field remains
separate: its dated page was unavailable; no scratch was inferred.

Evidence URLs and program sets are recorded in `condition-evidence.json`.
No new independent Brisnet cards were found ready for grading; this follow-up
reuses the same two development cards. No holdout file was inspected.

## Actual-surface replay

Recompute each of the five switched races with Synth/Tapeta, the verified
distance and the same field, retaining all weights and eligibility rules. This
is a retrospective input sensitivity check, not a pre-race forecast. The six
matching candidates are identical to the first experiment.

| Five switched races | Scheduled-turf control | Actual-Tapeta control | Actual Tapeta with 1f or 1.5f |
|---|---:|---:|---:|
| Finisher first-choice winners | 2/5 | 3/5 | 3/5 |
| Finisher exacta order | 0/5 | 1/5 | 1/5 |
| Contender first-choice winners | 1/5 | 3/5 | 3/5 |
| Contender exacta order | 0/5 | 0/5 | 0/5 |

Finisher R3 changes 4–8–1–2 to 8–4–1–6 when the actual surface is used; the
observed first four are 8–4–5–2. That recovers the winner and exacta order.
Contender gains first-choice winners in R6 and R9 after the surface correction.
Widening distance tolerance adds no further Finisher or Contender winner or
exacta in this five-race replay. Only 1/40 rated horses has matched Speed/LP at
0.5f on the actual synthetic surface; 1f and 1.5f each cover 4/40. Wider matching
cannot manufacture synthetic history for horses whose prior starts were turf.

## Combined 15-race actual-conditions sensitivity

Combine the original ten main races with the five corrected-surface replays,
counting each race once. October 21 R2 remains excluded and R8 ungraded. These
are 15 previously observed races, not 15 new tests on unseen data.

| Model | Latest-five tolerance | First-choice winners | Exacta order | Correct top-four pairs / 77 comparable |
|---|---:|---:|---:|---:|
| Finisher | 0.5f control | 8/15 | 2/15 | 52/77 |
| Finisher | 1f | 8/15 | 2/15 | 52/77 |
| Finisher | 1.5f | 9/15 | 2/15 | 53/77 |
| Contender | 0.5f control | 8/15 | 1/15 | 47/77 |
| Contender | 1f | 8/15 | 1/15 | 48/77 |
| Contender | 1.5f | 8/15 | 1/15 | 48/77 |

There are 90 possible top-four pairs; 13 involve unranked runners and remain
unscorable under every candidate. Equal-race order credit therefore uses 90 as
the denominator: Finisher 52/90 to 53/90, Contender 47/90 to 48/90. No candidate
adds an exact-order trifecta or superfecta. V4.4c scores and ranking order remain
identical across matching variants. Research MIX1 loses a first-choice winner
under wider matching in the five actual-Tapeta races, another reason not to
promote a general tolerance change.

## Robustness checks

- **Leave one race out:** Finisher's 1.5f winner and pair gains disappear when
  October 21 R4 is omitted. Contender's one-pair gain disappears when October
  21 R6 is omitted. These are isolated gains, not a consistent improvement.
- **Field size:** three races have 5–6 starters, eleven have 7–9, and one has
  10+ (12). Finisher's extra winner is entirely in the small-field group. No
  variant adds a winner or exacta in the two larger groups. The 12-runner race
  alone is insufficient evidence of large-field performance.
- **Race type:** Finisher's extra winner comes from a sprint. It adds none
  in eight routes. Contender's extra pair comes from a route, with no new win.
- **Coverage:** nine races have fully rated fields and six have partial fields.
  The partial-field subset gains no winner or pair ordering from wider matching.
- **Date split:** the wider Finisher and Contender policies add no winner in
  the nine October 16 actual-condition replays. The single Finisher win gain is
  on October 21. Deeper history does not change the general conclusion.

All six variants and every subgroup are retained in `subgroup-comparison.csv` and
`leave-one-race-out.csv`, including the uncertain-field diagnostic. The five
actual-surface races are in `actual-surface-races.csv`; condition effects and
run metadata are preserved in the adjacent CSV/JSON files.

## Engineering checks and next gate

397 tests pass. The adapter harness reproduces its control exactly and verifies
unchanged source objects, V4.4c numerical scores/order, and betting/probability
safeguards. The robustness analyzer rejects duplicate race/model/variant rows
and tests that omitting the sole gain race removes its apparent advantage.
No production scoring file or site behavior is changed by this follow-up.

Before another predictive comparison, verify actual race conditions and listed
starters. Additional independent development cards with verified fields are
needed to test the fixed candidates, particularly larger turf and dirt fields.
Keep the 30 holdout cards sealed until a separate final-test protocol is locked.

Reproduce with `scripts/evaluate-brisnet-matching.mjs` for each input scenario,
then `scripts/analyze-matching-robustness.mjs ORIGINAL_JSON ACTUAL_JSON OUTPUT_JSON`.
