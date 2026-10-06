# Restored V4.4c website parity

The upload and ranking path now uses restored V4.4c, not V4.2 field scaling.

- Base: latest verified Beyer 40, best of latest three 22, PP jockey 7, PP trainer 8. Trainer context 12 only at two or fewer career starts. Missing components omitted and weights renormalized.
- Adjustments: field-relative, latest unexplained collapse, pace fit, rebound protection, lightly raced upside; combined cap ±6. No standalone trajectory bonus.
- Rank unrounded totals descending, then horse name ascending. Python rounding is used only for display and the locked field-relative adjustment.
- Exclude unconfirmed MTO/AE. Any included unrated runner/parser blocker causes full-race PASS. Debut runners stay unrated. Hurdle races are unsupported.
- Read only each uploaded card's own PP; date/race owner anchors, explicit bold Beyer-to-post boundaries. Foreign Timeform ratings are not Beyers.
- The V4.4c browser storage namespace isolates previous V4.2 edits. Verified numeric inputs and scoring weights are read-only. Re-upload old cards to establish verified inputs. The bundled legacy demonstration has unknown career starts and therefore passes until replaced with a verified PDF.
- Fair odds and automated wager recommendations are unavailable while the separate betting engine is unvalidated. The manual ticket-cost calculator remains available.

Validation: all 20 supplied PDFs, 208 races, 2,099 entrants, 139 rated top-four lists and 69 PASS decisions match the immutable pre-results freeze. No measured-input or selection mismatches. The full audit and pre-results fixtures remain in the original project artifacts, outside the public website. The private parity run passed all 43 tests, including the locked 36-race/274-runner final-field scores and ranks, the 56-race historical replay and 208-race frozen batch. Public `npm test` covers synthetic parser/rating guard cases and existing regressions. Historical PDF roundtrip remains unavailable; its stored inputs are used.

To repeat the full PDF check, install the pinned PDF.js development dependency and run `node scripts/check-pdf-parity.mjs /path/to/frozen-artifacts`; that directory must contain the original freeze JSON and `upload/` PDFs. Source PDFs and result prices are not shipped to the public website. No horse-level scoring fixtures or source PDFs are published in this release.
