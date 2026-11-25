# October 2026 DRF ordering research: source recovery manifest

Status: PARTIAL; retrospective research only, not a certified frozen comparison.

## Verified original source
- Date: 2026-10-22; track: Belmont Park; DRF PDF basename: BEL--10-22-2026.pdf.
- Source is in the user's research-file library, **not** committed to this repository.
- SHA-256 of recovered original PDF: `d89a8d574551519777ec00cb25fb5a71fcfba1f02c27bc52a0850660b9cf9762`.
- PDF page count: 20; card race count from visible race headers: 8.
- Post times in source: R1 1:10, R2 1:42, R3 2:16, R4 2:49, R5 3:23, R6 3:57, R7 4:31, R8 5:05 ET.
- The DRF PP is an early pre-race source; entries, scratches, surface changes and final starters require official reconciliation.

## Unverified / missing
- DRF source PDFs for Oct 23, 24, 25, 28, 29 and 31 have **not** been recovered into the local research workspace.
- A previously uploaded Oct 24 freeze identifies source=BRISNET, not DRF; never treat it as a DRF source.
- Full official results, exacta payouts, final field identities and race metadata have not been joined to the original PDF.
- Original signed 19-feature contributions have not been recovered or reproduced for any October race.
- Do not execute or report ROI until source-to-final-field parity and score parity pass.

## Reproduction plan
1. Copy the recovered PDF into `controlled-inputs/BEL--10-22-2026.pdf` in a temporary local workspace (not the public repo).
2. Run the existing DRF PDF parser (`research/prepare-controlled-drf.mjs`); its current script also requires the Oct 25 PDF, so adapt the research-only runner to accept one date before execution.
3. Reconcile official finish positions, scratches, names, distance, surface, FTS and complete starter count in a verified reference JSON.
4. Run `research/prepare-drf-ordering-input.mjs`, inspect every exclusion, and verify original score parity.
5. Run `research/drf-ordering-stratified.mjs` and `research/drf-ordering-roi.mjs` only after official payout basis and sources are verified.

This manifest documents source availability only; it is not a claim that the replay has been run.
