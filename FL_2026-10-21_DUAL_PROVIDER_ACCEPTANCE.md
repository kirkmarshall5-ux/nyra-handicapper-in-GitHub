# October 21, 2026 Finger Lakes dual-provider acceptance inputs

Source PDFs received from user and inspected independently with PyMuPDF on 2026-10-20. This is a source audit, **not** a successful production PDF.js importer execution.

| Provider | Source filename | Pages | SHA-256 |
|---|---|---:|---|
| DRF / TimeformUS | FL--10-21-2026.pdf | 17 | c5a1d507b388bb1df9116da1a6596f6b2d3c2c6cc11b0edcf62dbf49e5ac6a5e |
| Brisnet Premium Plus | flx1021p.pdf | 18 | 1c9e3bedecd761d2a825c4513642c4aeb31d477cfde56695df725a9ecc43637a |

Both sources identify Finger Lakes on Wednesday 2026-10-21 and races 1–8. Race 8 is 1 mile 70 yards (8 + 70/220 = 8.3181818... furlongs), printed in differing formats. DRF page 1 includes an index; Brisnet page 18 includes ancillary/index material; do not equate page count to race count.

## Gate requirements
1. Execute actual PDF.js + production parser against both original binary PDFs (SHA-256 must match above), and assert date, track, eight races, distances, runner identities, and source provider isolation.
2. Verify each race's eligible field against independently sourced official scratches/changes before freezing. Do not infer scratch state from the PPs alone.
3. For each race, compare six displayed Race Day panels against research-only recorder output: Brisnet and DRF V4.4c, Contender, Finisher, with exact ranking order, raw score, model ID, decision and field completeness.
4. Freeze before verified scheduled post time; independent GitHub issue receipt must have server creation/update before post and matching SHA-256. Never backfill.
5. Chrome and physical iPad acceptance; no production merge until all gates pass.

## Current status
Source identity and PDF readability: VERIFIED. Production PDF.js parsing: NOT EXECUTED in this environment (pdfjs-dist unavailable). Official scratches: NOT VERIFIED. Six-panel real-card parity: NOT VERIFIED. Timestamp: NOT VERIFIED. Physical iPad: NOT VERIFIED. PR #116 and PR #115 remain unmerged.

## Cross-provider source index reconciliation (2026-10-20)
Both PDF indexes independently contain exactly 52 horses: races 1–8 have [6,6,6,6,8,7,6,7]. The 52 horse-name sets match exactly, race by race. Brisnet final page is an index/scratch-watch appendix, not race 9. These checks use PyMuPDF source text, **not** the production PDF.js parser. The scratch-watch list is historical and cannot certify current scratches. Production importer gate remains OPEN.
