# Pace display source/label checkpoint — November 17 research branch

## Implemented correction
In `brisnet-pace-display.js`, corrected text previously claiming the displayed 0.5-furlong matched historical figures were the **native model inputs**. The display now labels them **research figures** and explicitly states the native Brisnet RR engine uses a 1-furlong distance tolerance. This is a UI description correction only, not a ranking or scoring change. Commit `d6d5804`.

## Actual Node execution
Ran `node --test` inside `/mnt/data/pace_js_validation`, a local reconstruction with `brisnet-pace-display.js` and `tests/brisnet-pace-ordering.test.mjs`: **4 passed, 0 failed**. Checks newest five actual dated starts, surface mismatch, first-time starter and same-line E1/E2 turn index. This is **not** `npm test` against a complete checkout and does not establish full repository CI success.

## Provenance review
The retrospective source audit CSV `FL_2026-11-17_Pace_Source_Audit_R2-R9.csv` includes a single `source_line` per selected E2 and LP pair, so its D arithmetic is based on the *same text-extracted line* in that audit. This does **not** independently prove that the browser's separate latest-comparable E2 and LP selections share the same historical line. The current UI guard compares date and page; additional exact source-line identity would provide stronger proof if the importer exposes an identifier. Preserve missing values rather than imputing.

## Open certification gates
Full repository `npm test` and CI; imported PDF historical-line comparison; UI D source identity and browser rendering; Dell Chrome and iPad checks; freeze recorder timestamp/timezone, JSON download, race isolation and SHA-256 verification. Do not merge or publish while these remain unverified.
