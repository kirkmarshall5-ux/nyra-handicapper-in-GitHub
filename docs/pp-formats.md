# PP uploads and provider-specific ratings

Upload the original text-based PDF in Upload Past Performances, click Analyze PDF, review the detected provider, track, date, race count, runner count and warnings, then Replace Active Card. Parsing failures preserve the active card. Refreshing preserves a supported adapter's saved card. Current scratches and live prices remain separate inputs.

Supported adapters: the existing DRF parser, unchanged; Brisnet Ultimate positioned-text parser v1. The Brisnet adapter was verified against the supplied 36-page Santa Anita March 17, 2007 sample (10 races, 79 entrants). This is format support, not proof that every modern Brisnet edition parses. A materially different layout must pass the same admission checks.

Brisnet evidence appears separately above Projected Race Set Up. Brisnet-only uploads show PASS in V4.4c and Contender: there are no verified Beyers and no validated Brisnet replacement model. Brisnet Speed is never written to Beyer fields; E1/E2/Late never populate Timeform fields. First-time starters remain Unknown. A former Scratch Watch entry never marks a current scratch.

Each normalized card carries provider, source filename/SHA-256, import time, adapter version, source page and rating-row text. Numeric zero is retained; missing or ambiguous values are null. The sample's old encoded digit six is sometimes discarded by PDF.js: affected class/race-shape cells remain Unknown, never repaired by inference. Different rating scales cannot be compared, averaged or spliced together. Unresolved source rows remain visible in the normalized evidence file.

## Adding another layout

1. Collect a representative original PDF and an independently checked roster, condition headings, a few running lines and edge cases. Do not use outcomes to tune parsing or scores.
2. Add a provider fingerprint and a new positioned-text adapter in pp-format-router.js. Keep existing adapters intact. Unknown/scanned layouts stop with an actionable message; OCR is a future review path, not silently trusted data.
3. Normalize identities, dates, entry status, race conditions, connections and source-specific rating families into the existing card schema. Keep an unrecognized value Unknown; establish FTS only from the career record. Reconcile runner headers with career records; reject conflicting identities and dates.
4. Validate every extracted numerical field against an independent reader, especially signed shapes, zero, column offsets, continuation pages, AE/MTO and nonstandard past distances. Preserve source hashes and a coverage report. Add admission/mutation tests and run all existing tests plus real DRF parity.
5. Review the upload on the website before releasing the adapter. Then test any new handicap features under a new model ID, with frozen forecasts, untouched cards, all six paper betting structures, coverage arms, official outcomes and source-priced returns. Do not activate a winning candidate from one sample.

## Proposed research, in order

Use E1/E2 and run style/Quirin points for early-position and pressure research. Use E2 minus E1 for turn-time research. Use Late plus early pressure for second-place/exacta coverage. Use signed historical race shapes to investigate pace-assisted or pace-disadvantaged efforts; store notes first, without automatic figure points. Compare E1/E2/Late with printed pars as source-relative context. Test Race Rating/Class Rating as class/opposition candidates, keeping the pre-race version frozen because BRIS says those ratings are updated with later performances. Keep Prime Power as a separate benchmark; adding it alongside component figures can duplicate information.

Contender is the broader research host for these features, using provider-specific coefficients and matched lines. V4.4c remains the control. A validated same-card DRF/Brisnet join may enrich context later, using track/date/race/horse identity and surface/distance checks; automatic joining is not enabled in this release.

Official reference pages:
- https://support.brisnet.com/hc/en-us/articles/360056536831-BRIS-Pace-Ratings-FAQ
- https://support.brisnet.com/hc/en-us/articles/360056536691-BRIS-Race-Shapes-FAQ
- https://support.brisnet.com/hc/en-us/articles/9803583657101-Run-Style-FAQ
- https://support.brisnet.com/hc/en-us/articles/360056090332-BRIS-RACE-CLASS-RATINGS-FAQ
