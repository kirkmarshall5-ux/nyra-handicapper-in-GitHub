# Brisnet Contender: neutral best-three and surface peak research

Candidate: BRIS-CONTENDER-NEUTRAL-BEST3-PEAK-v1-20261101.

Production is unchanged. The research module is offline and is not imported by the application. The candidate subtracts existing feature contributions at indices 2 (best_three) and 5 (same_surface_peak_90_days) from the full precision baseline score. All other coefficients, inputs, percentiles, matched-speed trend, eligibility and native name tie-break remain unchanged. No weights are fitted or redistributed.

## Retrospective results

Original October31 Brisnet PDFs were parsed and scored against each uploaded freeze's eligible field. All 17 baseline ranking orders and individual scores match the uploaded freezes within 1e-10. Belmont results cover the official 11-race chart; Keeneland covers only the six screenshot results supplied. No other cards or holdout sets were used.

| Cohort | Variant | First-choice winners | Runners-up in top four | Top-four coverage | Risk | Return | Net | ROI |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Belmont 11 races | Live baseline | 5 | 1 | 22/44 | $118 | $77.28 | -$40.72 | -34.5% |
| Belmont 11 races | Research | 5 | 3 | 25/44 | $118 | $77.28 | -$40.72 | -34.5% |
| Keeneland R1-R6 | Live baseline | 1 | 2 | 12/24 | $52 | $12.56 | -$39.44 | -75.8% |
| Keeneland R1-R6 | Research | 1 | 1 | 11/24 | $49 | $12.56 | -$36.44 | -74.4% |
| Combined 17 races | Live baseline | 6 | 3 | 34/68 | $170 | $89.84 | -$80.16 | -47.2% |
| Combined 17 races | Research | 6 | 4 | 36/68 | $167 | $89.84 | -$77.16 | -46.2% |

Both variants have zero exact second-choice/second-finisher matches and zero all-four sets. Belmont gains runner-up coverage in R7 (#4 Repentless) and R8 (#10 Uncle Jim); Keeneland loses R4 (#5 Foie Gras). These are top-four membership changes, not successful rank-two predictions. No exacta or trifecta boxes win under either variant. The candidate's $3 lower risk is solely a refunded Keeneland R3 trifecta involving scratched #5; it is not additional payout or better betting selection.

Paper stakes: $4 win rank1, $2 each exacta permutation of top2, $.50 each trifecta permutation of top3. Refund affected combinations; never replace or promote a frozen selection. Races with fewer than three ranked runners have no trifecta stake. PASS races remain in all-race diagnostics.

## Complete-field cohort

Restricting to races where the baseline Brisnet freeze has equal ranked and eligible counts leaves ten races: Belmont R1/R3/R4/R5/R8/R9/R10 and Keeneland R2/R3/R4. Candidate eligibility is identical.

- First-choice winners: 4 versus4.
- Runners-up covered: 3 versus3.
- Overall top-four coverage: 22/40 versus23/40.
- Baseline: $103 risk, $48.60 return, -$54.40 net, -52.8% ROI.
- Candidate: $100 risk, $48.60 return, -$51.40 net, -51.4% ROI.
- Seven incomplete-field races are preserved separately in the machine-readable rows, never deleted.

## Interpretation and next test

The Belmont improvement does not transfer cleanly to Keeneland. Combined coverage improves only two finishers, and runner-up coverage improves only one. The two terms are not proven unnecessary. October31 Belmont was used to choose this hypothesis; neither cohort is a sealed holdout, and these results cannot validate a live change. Belmont R1 freeze is within the chart's printed off-time minute; device timing is unverified.

Keep this exact candidate fixed. On newly supplied cards, capture baseline and research rankings before outcomes on identical fields, retaining PASS/unrated runners and scratch timestamps. Record exact positions, winner and runner-up inclusion, top-four coverage, all-four sets, and separate win/exacta/trifecta ROI. Report the complete-field cohort separately from all-race diagnostics. Do not add placing-record changes, late-neutral changes or retune coefficients within this candidate. No future pre-race capture is claimed until actually performed.

## Reproduction

Install the repository's PDF.js dependency, then run:

    node research/evaluate-neutral-best3-peak.mjs PRIVATE_SOURCE_DIRECTORY OUTPUT_JSON

The private directory must contain the original bel1031p.pdf, kee1031p.pdf and the two October31 freeze files named in the script. The script asserts baseline score/ranking parity, preserves source inputs, and emits per-race picks, payouts, refunds and coverage without raw licensed histories. Source PDF and freeze SHA256 hashes are in the audit JSON. Unit tests verify exact two-term neutralization, source preservation and tie behavior. Production model files are unchanged.
