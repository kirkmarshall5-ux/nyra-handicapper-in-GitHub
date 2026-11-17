# Historical Results

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
4. Import the original text-based Equibase full-chart PDF. All matching races populate and settle automatically after checks of track/date, actual distance/surface, full program/name roster, finish order, win/place identities, winner odds and explicit exacta denomination/winning pair. No routine results entry or confirmation is required. Specific unreadable or conflicting races stay pending. Optional corrections remain under a collapsed inspector.
5. Compare ROI by wager and combined, wins, exact runner-up-at-rank-2, runner-up top-two/top-four coverage, top-two exacta coverage and RR companion misses.
6. Save locally, export/import a JSON backup, or print/save a landscape PDF via the device's browser print sheet.

A Freeze All Models JSON can also be imported. Its captured timestamp is retained, but it is never upgraded to verified pre-race evidence.

Strategies: $2 win + $2 total exacta box ($4); $2 win/place + $2 total exacta box ($6, default); $2 win/place ($4). Each box direction costs $1. Rankings mean model positions, not program numbers.

## Integrity and limits
- No live scoring formulas, live provider storage, original freeze files or old research files are changed.
- Validation pending alone is not an exclusion. Genuine PASS/HOLD, missing model evidence, incomplete rankings or source mismatch exclude that model-race from ROI and show named unranked runners/reasons.
- Each model's eligibility denominator is shown. Missing/unconfirmed official results contribute no stake and no return.
- Dead heats, coupled entries, refunds, image-only PDFs and other nonstandard/unreadable charts remain pending with specific reasons; they are never assumed to be losses. Explicit disqualification notices are applied before comparing the official win and exacta tables. The standard Equibase $2 WPS convention is cross-checked against the printed winner odds. This is consistency checking, not independent authentication of a PDF.
- Automatic imports retain the PDF filename, SHA-256, parser version and source page numbers. Corrections/import replacements retain previous results in backup revision history. An unreadable race in a replacement PDF becomes pending; races absent from a partial PDF retain previously saved results. Wrong track/date PDFs are rejected before changing saved results.
- Ranking snapshots remain immutable. Starter or actual-condition mismatches require a corrected retrospective snapshot; importing results does not silently recalculate saved selections.
- Result corrections retain previous official values in backup revision history. Snapshot identities cannot overwrite different saved rankings.
- Storage belongs to the current device/browser; export to Files for a durable backup and transfer.
- PDF text extraction needs the same PDF.js CDN used by the existing PP uploader; completely offline first-use is not promised.
- Combined multi-card research totals, grading thresholds and native Safari/device testing remain follow-up work. Chromium viewport emulation is not native iOS Safari verification.

## Verification
historical-results.test.js tests retrospective capture, source preservation, Prime Power, both exacta directions/denominations, place settlement, eligibility, pending results, incorrect identities and safe report HTML.
scripts/historical-browser-qa.mjs exercises the actual tab, JSON import, automatic PDF import, optional manual correction, strategy changes, failed-result preservation, export and saved reload at desktop/iPad/iPhone viewports using synthetic data.
The browser CI workflow runs these after the existing browser checks. No synthetic return is a real historical performance claim.

## Automatic Equibase import verification
- equibase-results-parser.test.js covers automatic settlement, both exacta payout bases, missing data, wrong identities/fields/distances, duplicate charts, nonstandard races, disqualifications and zero-stake pending results.
- scripts/check-equibase-results.mjs replays original PDF bytes through the same positioned-text reader used in the browser.
- Local real-chart audit: 117 races across saved Belmont, Finger Lakes and Churchill PDFs; 115 parsed with complete finish order, win payout, exacta base and exacta payout matching the existing independent chart audit exactly. Two dead-heat races stayed pending. Real Belmont November 13 browser upload imported all eight races without typed results. These checks validate extraction, not prospective model profitability.
- Browser CI also imports a clearly labeled synthetic PDF through PDF.js at desktop, iPad and iPhone viewports, checks settlement, backup/reload and optional corrections. Native iOS Safari remains unverified.
