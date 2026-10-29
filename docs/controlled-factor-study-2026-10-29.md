# First controlled factor study — October 29, 2026

Research only. Production scoring, parsers, weights and betting controls remain unchanged. Original freezes and their earlier performance reports are not replaced.

## Design

Original DRF and Brisnet PDFs are paired for Belmont October22,25,28. Official full chart program/name identities, distance and surface establish the identical final field for both providers. All final starters, including confirmed AEs, are reconstructed in separate research copies; this does not repair historical freezes. Six races fail complete numerical coverage (Oct22 R3/R5, Oct25 R2/R4, Oct28 R2/R3), leaving 19 races on three dates. No outcome-based race exclusions.

Each baseline uses the current unchanged model. Each counterfactual neutralizes exactly one score component, preserving the field, all other contributions, coefficients, trend, scaling and native tie-break. No weights are fitted or redistributed. Finisher's removed Late component is replaced by its existing neutral percentile (50), retaining the 60/25/15 formula structure. Fourteen outputs include the three baselines. Inputs are deep-copied, source immutability is checked, and DRF contribution reconstruction must match the production score within 1e-10.

This is post-hoc sensitivity analysis on known outcomes, not an untouched test. It tests effects of score contributions, not whether copying Timeform values into Brisnet would work. No provider mixing is performed. It does not establish that providers evaluated the same historical performance equivalently.

## Results on the identical 19-race cohort

| Model / one-factor variant | Exact first | Exact second | Exact third | Exact fourth | Individual top-four coverage | All-four sets |
|---|---:|---:|---:|---:|---:|---:|
| Brisnet baseline | 8 | 0 | 4 | 2 | 55/76 | 4 |
| Brisnet Early neutral | 7 | 2 | 0 | 3 | 54/76 | 4 |
| Brisnet Late neutral | 8 | 4 | 6 | 4 | 56/76 | 4 |
| DRF Contender baseline | 7 | 4 | 2 | 1 | 54/76 | 5 |
| DRF placing record neutral | 8 | 5 | 3 | 1 | 55/76 | 6 |
| DRF surface win record neutral | 10 | 4 | 2 | 0 | 52/76 | 4 |
| DRF distance win record neutral | 7 | 4 | 2 | 1 | 54/76 | 5 |
| DRF workout count neutral | 7 | 5 | 2 | 1 | 53/76 | 4 |
| DRF workout rank neutral | 9 | 4 | 2 | 3 | 53/76 | 3 |
| DRF pressure fit neutral | 7 | 4 | 2 | 1 | 54/76 | 5 |
| DRF Early neutral | 9 | 4 | 2 | 3 | 53/76 | 4 |
| DRF Late neutral | 7 | 5 | 1 | 2 | 57/76 | 6 |
| DRF Finisher baseline | 10 | 5 | 3 | 2 | 54/76 | 3 |
| DRF Finisher Late neutral | 9 | 5 | 4 | 2 | 53/76 | 3 |

Counts are per 19 races, not directly comparable to the earlier 45-race saved-prediction table. The dates, completeness rules and final-field reconstruction differ. In particular, October23/24 are absent; this cohort does not represent the entire archive. The Finisher baseline winning 10 versus Brisnet eight also demonstrates why the earlier apparent hierarchy cannot be assumed across cohorts.

## Findings and counterexamples

1. Brisnet Late is the most interesting candidate for further research here. Neutralizing it improves second-place hits 0 to4, third4 to6, fourth2 to4, with first-choice wins unchanged in aggregate at8. It loses the October22 R8 winner and gains October25 R6; the identical winner total does not mean identical winners were retained. All-four sets remain4, so this is not a broad superfecta breakthrough.
2. The four new second-place hits occur Oct22 R2/R7, Oct25 R8 and Oct28 R5. In Oct28 R5, original Brisnet 12-6-10-3 becomes12-10-6-3: Languid moves third to second, matching the result, while Duty remains first. This isolates a Late-score contribution to that particular ordering error; it does not establish that Late pace is generally unhelpful.
3. Removing Brisnet Early hurts first-choice wins and eliminates all four exact third-place hits in this cohort. Removing both pace figures is not supported by this experiment.
4. DRF placing-record removal improves, rather than weakens, its aggregate ordering here. The earlier hypothesis that Brisnet needs that missing feature is not supported by this first test. It could still help other races; native Brisnet extraction/admission would need independent verification before a separate experiment.
5. Finisher Late removal loses a winner and one covered finisher overall. Its contribution behaves differently under that model's fixed formula. A result from Brisnet must not be transferred to Finisher automatically.

## Next experiment

Keep production unchanged. Preserve baseline and predeclared Late-neutral Brisnet shadow outputs on genuinely new complete fields, independently anchored before racing. Compare them on the same races for all four exact positions, membership, all-four sets and coverage availability. Review Late figure age, its source line and matching quality before proposing any reliability rule. Any such rule must be frozen before a separate untouched test. Do not choose a new coefficient from these 19 known outcomes or promote the most favorable of multiple exploratory variants.

## Reproduction

```sh
node research/prepare-controlled-drf.mjs /path/to/private-data-root
python research/prepare-controlled-charts.py /path/to/private-data-root
node research/controlled-factor-study.mjs /path/to/private-data-root
```

The private data root contains `research-controlled/chart-reference.json`, paired parsed cards under the paths recorded in the script, and an existing output directory. Source PDFs were replayed with production PDF.js/restored-page/router methods. The chart-reference file comes from complete official Equibase PDFs and records the final full order, distance/surface text and chart SHA256. Public aggregate results, cohort/exclusion identifiers, PDF/card/module hashes are in `audits/controlled-factor-study-2026-10-29.json`; licensed PDFs and raw histories stay private.
