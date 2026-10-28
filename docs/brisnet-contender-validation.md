# Brisnet Contender validation — October 28, 2026

Status: source checks passed on the audited cards; prospective performance validation remains open. No scores, coefficients, field gates, probability flags or wagering controls changed.

See `audits/brisnet-contender-validation-2026-10-28.json` for measured counts, source hashes and current blockers. The October26 worklist remains a historical record with a dated follow-up; its original pending flags are not the current replay status.

## Completed now

- Replayed seven original Premium Plus PDFs through production PDF.js extraction, the format router, parser and unchanged native scoring: 65 races, 564 entries, 3,864 running lines. All replays passed; 52 races have complete numerical coverage of the initially eligible PP field, before official scratch verification.
- A separate PyMuPDF extraction matched 564 identities/program numbers, 564 career-start counts, 2,256 local/annual connection records and 23,184 E1/E2/LP/1c/2c/Speed cells. Zero mismatches or unresolved comparisons. This is a second-engine extraction check by the same operator, not an independent signing authority or exhaustive validation of condition interpretation.
- Executed the original October25 PDF replay: Race9 imports both AE #13/#14 and reproduces the documented final 12-starter field after recorded corrections. The historical freeze remains missing #13 and is not repaired or certified.
- Replayed the larger saved October21 model-input audit: eight races, 32 model/race outputs, zero live-module parity or safeguard failures. This does not certify that historical versions produced identical predictions.
- Downloaded all 37 full Equibase charts linked by the official results pages. Reconciled every complete starter list and first-four program/name identity against the result archive and frozen PP rosters. Printed country suffixes are preserved in the chart records and normalized only when comparing names. Zero chart reconciliation holds. Printed local off times are retained, not silently converted into authenticated UTC evidence. Trusted issuer attestations are still missing.
- Audited all 37 saved October22–25 forecasts without recomputing scores, replacing scratches or deleting losing races. Twenty-two have complete archived rankings matching final program numbers; 15 do not. Seventeen lack explicit model-version metadata. All 37 lack the supplied independent pre-off and authenticated chart evidence required for certification.

## Diagnostic result, not prospective validation

| Metric, 37 saved races | Brisnet Contender | Morning line |
|---|---:|---:|
| First choice won | 16 | 16 |
| Second pick finished second | 8 | 5 |
| Third pick finished third | 10 | 2 |
| Fourth pick finished fourth | 5 | 5 |
| Actual top-four finishers included | 103/148 | 101/148 |
| All four finishers selected | 3 | 8 |
| First four in exact order | 0 | 0 |

Morning-line comparison uses the existing archive: October22/23 reconstructed from published ML among final starters, October24/25 original saved ML selections. It is not an untouched pre-race benchmark. The 22-race program-matched subset has Brisnet 9 first-choice winners versus ML 11, and three all-four sets versus ML five. Subsetting does not create prospectivity. These results support investigating fourth-place coverage and full top-four sets; they do not establish a consistent advantage or validated wagering profitability.

## Forward evaluation protocol, version 1

1. Keep `CONTENDER-BRISNET-20261021-input-v2` and the recorded source/coefficient hashes fixed. Any scoring or parsing change creates a new cohort. Preserve prior predictions and record the exact deployed parser/module hashes.
2. Register eligible untouched cards after this protocol, using every race at the selected tracks rather than selecting favorable outcomes. Preserve PASS races, unrated runners and exclusion reasons. Today’s cards qualify only if complete evidence is genuinely captured and independently anchored before post; no backdating.
3. Finish independent surface/distance and matching-context review. Retain original PDFs privately, verify all final program/name identities and scratches, and resolve AE/MTO status. Keep later field/surface changes as append-only records, never overwrite a frozen forecast.
4. Before post, preserve full field, all rankings/raw scores, model/parser/input hashes, source PDF hash, timestamps, scheduled post with timezone and a separately frozen ML benchmark. Obtain independent anchoring/provenance accepted by the existing verifier. A PDF printout, local clock, local hash, or operator-created signing key alone is insufficient.
5. After racing, archive official full charts and independently establish actual off time, final starters, first four and any dead heats/nonfinishers. Apply the existing provenance and race-gradeability checks. Do not treat caller booleans or an extraction success as certification.
6. Primary ranking report: top-four membership per race, all-four set hit rate, exact first-through-fourth positions, exact first-two/first-four ordering. Compare Brisnet and frozen ML on identical eligible races. Report incomplete-field availability separately; do not promote provisional subsets to full-field forecasts.
7. Review by track, date, surface, sprint/route and field size. Use paired comparisons and uncertainty grouped by card date. Target an initial review at 30 new races and a fuller assessment at 100 races across at least 20 dates; these are research checkpoints, not guarantees of statistical adequacy or automatic promotion. Sparse strata remain inconclusive.
8. A validation review must explicitly assess useful improvement over ML and its uncertainty. The current evidence does not support a numerical promotion threshold; record one before any model-selection experiment. No automatic removal of PASS. Probability calibration and verified payout/ROI testing are separate gates before any fair-odds or wagering authorization.

## Reproduction

Keep licensed PDFs and parsed cards outside the public repository. Use a local manifest array with `id`, `path`, `date`, `track` and optional expected `sha256`.

```sh
node scripts/validate-brisnet-sources.mjs manifest.json local-output
python scripts/crosscheck-brisnet-pdf.py manifest.json local-output
node scripts/replay-bel1025-brisnet.mjs /private/bel1025p.pdf
node scripts/replay-brisnet-model-audit.mjs /private/model-input-audit.json
node scripts/audit-brisnet-freezes.mjs results.json private-freezes local-output/freeze-audit.json optional-archived-comparison.json
python scripts/reconcile-brisnet-validation-charts.py private-charts results.json private-freezes
node --test
```

The PDF crosscheck requires PyMuPDF and is intentionally scoped to the audited Premium Plus layout. Different layouts require new column measurements and review. Public summaries contain aggregate evidence and hashes; no licensed PDF bytes or raw PP histories.
