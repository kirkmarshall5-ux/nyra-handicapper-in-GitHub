# Historical Results — first implementation

## Review of the earlier research work
- research-builder-ui.js / research-builder.js: local quote log, budget preview, and strict pre-race freeze. The freeze deliberately rejects past post times and snapshots older V44C/CONTENDER/MIX1 models. It is not an old-card replay UI.
- SIMULATION_VALIDATION_PLAN.md / simulation-validator.js: per-call simulation validation, not a model win/place/exacta recap.
- SIMULATION_STAGE2_EVIDENCE.md: historical PP inventory and chart pairing remained in progress at its recorded audit. No completed, independently verified pilot chart was claimed.
- simulation-chart-reconciliation.js: existing strict source-reconciliation concepts; its per-call requirements are separate from betting settlement.
- paper-results.js: current $2 win / two $1 exactas, complete-field eligibility and named missing-data exclusions. Reused unchanged.

This reviews the repository copy of the earlier work. Files existing only on the Dell were not accessible.

## Implemented workflow
Historical Results is a separate tab in index.html.
1. Upload historical Brisnet and/or DRF PDFs to isolated in-memory source slots.
2. Check scratches and actual surface/distance across all races.
3. Save retrospective model snapshots with source PDF SHA-256, parser versions, capture time and model versions. No past post-time restriction is applied to retrospective research.
4. Import a results PDF as local text reference, then manually enter and confirm official race identity, complete starter roster/order and payout denominations. This version does not automatically certify or settle parsed chart text.
5. Compare ROI by wager and combined, wins, exact runner-up-at-rank-2, runner-up top-two/top-four coverage, top-two exacta coverage and RR companion misses.
6. Save locally, export/import a JSON backup, or print/save a landscape PDF via the device's browser print sheet.

A Freeze All Models JSON can also be imported. Its captured timestamp is retained, but it is never upgraded to verified pre-race evidence.

Strategies: $2 win + $2 total exacta box ($4); $2 win/place + $2 total exacta box ($6, default); $2 win/place ($4). Each box direction costs $1. Rankings mean model positions, not program numbers.

## Integrity and limits
- No live scoring formulas, live provider storage, original freeze files or old research files are changed.
- Validation pending alone is not an exclusion. Genuine PASS/HOLD, missing model evidence, incomplete rankings or source mismatch exclude that model-race from ROI and show named unranked runners/reasons.
- Each model's eligibility denominator is shown. Missing/unconfirmed official results contribute no stake and no return.
- Dead heats, coupled entries, refunds and other nonstandard settlements require further adjudication support.
- Result corrections retain previous official values in backup revision history. Snapshot identities cannot overwrite different saved rankings.
- Storage belongs to the current device/browser; export to Files for a durable backup and transfer.
- PDF text extraction needs the same PDF.js CDN used by the existing PP uploader; completely offline first-use is not promised.
- Automatic official-chart extraction, combined multi-card research totals, grading thresholds and native Safari/device testing remain follow-up work. Chromium viewport emulation is not native iOS Safari verification.

## Verification
historical-results.test.js tests retrospective capture, source preservation, Prime Power, both exacta directions/denominations, place settlement, eligibility, pending results, incorrect identities and safe report HTML.
scripts/historical-browser-qa.mjs exercises the actual tab, JSON import, manual settlement, strategy changes, failed-result preservation, export and saved reload at desktop/iPad/iPhone viewports using synthetic data.
The browser CI workflow runs these after the existing browser checks. No synthetic return is a real historical performance claim.
