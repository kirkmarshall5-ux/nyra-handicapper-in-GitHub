# Recorder acceptance evidence — 2026-10-20

## Automated checks
- PR #115 commit c48441aa9f7a53a8965a185e7aff11ff5690fd4b: GitHub regression tests SUCCESS, V4.4c locked parity SUCCESS, Chromium smoke QA SUCCESS.
- These are automated source/test checks, not evidence of a genuine live pre-race freeze.
- Six-panel adapter tests cover BRISNET/DRF × V44C/CONTENDER/FINISHER, rank order, raw scores, identity, missing evidence, PASS/HOLD and complete-field constraints.
- Current browser smoke QA is Chromium automation. A physical iPad acceptance run is not recorded.

## Outstanding blockers (do not merge)
1. **Actual card parity:** Load one original Brisnet Premium Plus card and one DRF card, verify card identity and scratches independently. For each provider, record the displayed V4.4c, Contender, and Finisher rank order, model ID, unrounded score, decision and full/partial field status; compare each row with a research-only frozen export. Pass only with exact provider-specific matches. A unit fixture is not sufficient.
2. **Genuine pre-race independent receipt:** For a FUTURE race, verify official post time and field; freeze before scheduled post; export the JSON; post its exact SHA-256 digest to a new GitHub issue BEFORE post; verify the actual GitHub issue created_at and updated_at both precede scheduled post, issue body matches digest, and local recordedAt precedes issue creation. Do not use fabricated GitHub issue fixtures to certify.
3. **Device acceptance:** Run Chrome desktop and a physical iPad. Check both PP upload paths, source switching, race switching, reload persistence, PASS/HOLD, duplicate freeze, post-time refusal, export and receipt validation, and no wager action.
4. **Finger Lakes scratch exception:** FL 2026-10-19 Race 8 Ringgood scratch reconciliation is deferred and must remain HOLD; it cannot serve as a certified sample.
5. **Real PDF importer:** PR #116 acceptance runner requires original source PDF plus pdfjs-dist in same execution environment. CI smoke tests alone do not certify 8 races/56 entries.

## Decision
**HOLD / NOT DEPLOYABLE** until all real-card, receipt and physical-device checks have evidence. No change to scoring, wagering or locked models.
