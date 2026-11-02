# Expanded DRF Contender ordering study — source inventory and admission gate

Status: STARTED (2026-11-02). Retrospective research only. No production-model modifications.

## Verified repository evidence

| Cohort | Evidence located | Admission status | Next action |
|---|---|---|---|
| Belmont Oct 22 | 8-race original DRF source with pinned SHA-256; official finish/payout references; six-race locally executed four-variant replay | 6 rateable; 2 excluded in the executed replay | Preserve local `reconstructed.json`, `variants.json`, `roi.json`, and exclusions; execute `audit-oct22-ordering.mjs` on that workspace |
| Belmont Oct 25 | `audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json`: nine published finishing orders, scratch/roster checks; frozen evidence is Brisnet and marked PASS | **Not admitted to DRF replay**: no verified DRF source and not a certified DRF pre-race freeze | Locate original DRF PP, verify SHA and pre-race timing; reconstruct DRF features independently |
| Belmont Oct 23, 24, 28, 29, 31 | Prior project discussions reference results/cards/freezes, but `research/OCTOBER_DRF_RECOVERY_MANIFEST.md` reports unrecovered DRF PDFs for these dates | **Not admitted** | Recover original DRF source, immutable pre-race evidence, final starter identities and payouts per card |
| Churchill / Keeneland Oct 28–31 | Prior project discussions reference cards, freezes and results; no independently verified DRF replay inputs in this inventory | **Not admitted** | Recover and validate source/provider per card before reconstructing DRF scores |
| Historical Saratoga / Aqueduct / other archived cohorts | Mentioned in project history; no eligible horse-level signed DRF contribution dataset verified by this inventory | **Not admitted** | Inventory exact source files and labels; protect unused holdout cards |

**Important:** The six Oct 22 races are an exploratory *development* sample. Do not treat their late-emphasis ROI as independent validation or combine Brisnet rankings with DRF scores.

## Per-race admission checklist (all required)
1. Original DRF source bytes and SHA-256, with date/track/race identification.
2. Pre-race timestamp/provenance recorded; no post-race data used in scoring.
3. Complete final starter roster reconciled by name and program number, including scratches and drawn-in AEs.
4. Surface, distance, race type and first-time starters checked against actual race.
5. Original DRF Contender score reconstructed from signed 19-feature contributions; score parity passes.
6. PASS (>20% FTS) and other unrated/incomplete races excluded with reasons, not silently omitted.
7. Official finishing order and win/exacta payouts independently verified.
8. Research cohort labeled development or untouched holdout before analysis.

## Expansion sequence
- **A. Oct 22 audit:** execute paired race-level audit; explain each win-return delta and exclusions.
- **B. Belmont dates:** recover DRF PDFs, provenance and results; run same fail-closed parser and four variants for each date.
- **C. Churchill/Keeneland:** same process, track-stratified.
- **D. Historical archives:** admit only source-complete, parity-verified races; keep untouched holdout separate.
- **E. Aggregate:** report per-model winner #1, top-4, exacta, stakes, profit, ROI, max drawdown and uncertainty; show coverage/exclusions by track, surface, distance, FTS and race type. Never optimize on the holdout.

No aggregate performance estimate is authorized until at least two distinct verified cards are admitted. A larger sample is desirable but does not by itself guarantee statistical significance.


## 2026-11-02 project-file discovery (availability only; not replay certification)

The Project/Library file search located additional **DRF-named Belmont PDF files** not yet admitted to the controlled workspace:

| File | Indexed bytes | Status |
|---|---:|---|
| `BEL--10-25-2026.pdf` | 1,317,609 | Located; provider/page contents, SHA-256, starter parity and timing still to verify |
| `BEL--10-28-2026.pdf` | 1,328,154 | Located; same checks pending |
| `BEL--10-29-2026.pdf` | 1,257,293 | Located; same checks pending |
| `BEL--10-31-2026.pdf` | 1,468,413 | Located; same checks pending |

These are file-discovery facts, not proof of pre-race certification. They supersede the *availability* gap in the earlier October recovery manifest for these four dates, but **do not** establish horse-level inputs or model results. Oct 23/24 DRF source still not located in this search; `bel1024p.pdf` is not automatically equivalent to DRF.

Next: verify bytes and actual provider/content for each PDF, recover final-field and official payouts, then run controlled parser and signed-score parity on each date. Do not merge Brisnet PP inputs into the DRF study.
