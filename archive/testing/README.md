# Archived testing systems — October 18, 2026

The main website now displays only V4.4c and Contender. MIX1 and V4.4c-Pace, the experimental Race Selector and Brisnet pace challengers are retained for research, not offered on the main page. Model coefficients, parsers, historical evidence and scoring tests are unchanged.

`index.html` preserves the previous testing interface, including the three-model freeze, research-log export and archived betting tools. It is not linked from the main website. Serve the repository root and open `/archive/testing/index.html` when intentionally testing. Its base URL points at the root modules; keep this directory with the repository. `browser-qa.mjs` preserves the former browser checks as a reference; the active smoke checks are in `scripts/browser-qa.mjs`.

Scoring implementations remain in their original paths so existing test imports and historical reproducibility continue to work:

- MIX1: `mix1-rankings.js`
- V4.4c-Pace: `v44c-pace.js`, `v44c-pace-display.js`
- Supporting experiments: `race-selector*.js`, `brisnet-pace-candidate*.js`
- Previous quote/freeze tools: `research-builder*.js`, `wager-engine.js`, odds adapters

Run `npm test` from the repository root to test both active and archived scoring systems. Tests of the retired interface explicitly read this archived HTML. Existing saved cards, notes, research logs and freezes retain their storage keys and are not deleted. The testing interface shares the same browser-local storage; export records before intentional research edits. The main page no longer imports the quote recorder, betting builder or odds adapters, and no longer fetches or displays tote snapshots. Morning lines and official entry/scratch updates remain available.
