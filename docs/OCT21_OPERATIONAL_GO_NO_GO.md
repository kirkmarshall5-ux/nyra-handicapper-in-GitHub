# October 21 operational go/no-go gate

## Verified on branch (2026-10-20)
- Regression tests: PASS (run 39506935426)
- Locked V4.4c parity: PASS (run 39506935243)
- Chromium browser smoke: PASS (run 39506935248)
- Brisnet source-PDF parity: FAIL (run 39506935378), specifically "Enforce source-PDF execution gate"; production importer audit step itself succeeded but does not establish private original PDFs were supplied.
- PR #116: DRAFT, unmerged, 41 commits and 26 changed files at checkpoint. These green runs are **branch checks**, not proof of live GitHub Pages deployment.

## Source cards already inventoried
- Finger Lakes Oct 21 Brisnet `flx1021p.pdf`, SHA-256 `1c9e3bedecd761d2a825c4513642c4aeb31d477cfde56695df725a9ecc43637a`.
- Finger Lakes Oct 21 DRF `FL--10-21-2026.pdf`, SHA-256 `c5a1d507b388bb1df9116da1a6596f6b2d3c2c6cc11b0edcf62dbf49e5ac6a5e`.
- Both PDF indexes independently show eight races, 52 entrants and matching horse-name sets. This is not production PDF.js parity. The actual acceptance script is `scripts/verify-finger-lakes-oct21.mjs` and must be run against exact original PDF bytes.

## Remaining highest-priority gates
1. Restore exact private source PDFs to authorized CI and execute `node scripts/verify-finger-lakes-oct21.mjs <Brisnet PDF> <DRF PDF>`. Never commit licensed PDF bytes to a public repository. Until PASS, importer readiness remains HOLD.
2. Verify live GitHub Pages revision and fresh upload behavior on Chrome and iPad. Correct date/track/races and populated boxes are required; browser smoke alone is insufficient.
3. Confirm all six DRF/Brisnet panels display complete model rankings from the appropriate provider. If any panel is empty or stale, HOLD; do not freeze or bet.
4. Obtain current official scratches, changes and race conditions from the track; reconcile all eight fields.
5. Freeze models before first actual off time, preserve original independent timestamp receipt and export; do not overwrite or retrospectively certify.
6. Only after review and successful acceptance, request explicit merge/deployment authorization.

## Fail-closed status
**NOT YET READY FOR CERTIFIED LIVE TEST.** Do not treat a successful regression suite as a successful card upload. October 16 remains diagnostic only. No scoring, betting, or deployment changes in this note.
