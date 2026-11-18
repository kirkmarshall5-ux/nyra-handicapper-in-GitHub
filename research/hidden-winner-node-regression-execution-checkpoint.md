# Node regression execution checkpoint — 2026-11-17 pace research

Node v22.16.0. Ran `node --test tests/brisnet-pace-ordering.test.mjs` against a **local reconstruction of the relevant exported function** from the current research-branch `brisnet-pace-display.js`, not an actual checked-out GitHub working tree. Four tests passed, zero failed:

1. Newest five actual dated starts, not importer array order.
2. No unmatched-surface pace fallback.
3. FTS cannot gain historical pace metrics.
4. Turn index E2-E1 from same line.

**Important qualification:** This is a focused, partial source reconstruction and matching test file. It is *not* a complete CI or repository-wide test run. It does not test the full HTML research view, post-fix sustained E2+LP UI integration, the PDF parser, full-field provenance, or recorder/cryptographic freeze requirements. Do not mark any of those certified.

Next gate: obtain a full checkout and run `npm test`, verify imported historical lines against original PPs and exact same-line sustained D calculations, then perform physical Dell Chrome/iPad browser and recorder checks. Live RR remains locked; PR remains draft.
