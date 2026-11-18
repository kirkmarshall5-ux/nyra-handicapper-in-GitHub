# Brisnet RR source and ranking audit — Finger Lakes, 2026-11-17

## Scope and evidence
Read-only comparison of the frozen November 17 race-card RR evidence against the separately extracted original Brisnet PP historical pace figures. Source CSV: `FL_2026-11-17_Corrected_Source_Starter_Audit_v2.csv`; freeze: `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json`. The per-horse output `FL_2026-11-17_RR_Source_vs_Freeze_Audit.csv` is a separately generated conversation artifact, not stored in this repository.

- Frozen active field: 69 horses across nine races; 66 have RR rankings.
- 60 source-to-freeze **same-date** comparisons of RR early pace (E1 sprint / E2 route): **60 matched, 0 mismatched**.
- 60 same-date comparisons of RR LP: **60 matched, 0 mismatched**.
- Nine other horses lacked independently comparable same-date source evidence in this specific audit. Do not infer that they passed.
- RR-unranked: Race 4 #1 Nice Try Cat; Race 4 #7 Winning Rose; Race 7 #6 Sugarpapi (FTS).
- No direct proof of a frozen RR score/rank change from the pace-display chronological fix: `rankBrisnetResearch` calls `rankBrisnetModels`, not `brisnetPaceDisplay`. The RR feature engine explicitly rejects source running lines not strictly descending by date; the display module previously assumed ordering and now sorts dates before taking the latest five.

## Important rule discrepancy to resolve in research UI
`brisnet-models.js` matches historical pace with **up to 1 furlong** distance tolerance, while `brisnet-pace-display.js` currently matches with **up to 0.5 furlong**. Thus the display/research screen can disagree with the *actual RR input evidence* even when both implement their own documented rules. Do **not** silently change RR's 1f model rule. Research UI should explicitly label its 0.5f rule and distinguish it from RR's 1f rule, or derive the displayed RR evidence directly from frozen RR ranking evidence. This is a presentation/research parity gate, not evidence of a live RR ranking defect.

## Remaining gates
1. Inspect the nine unmatched source comparisons and independently audit all RR-ranked runners' historical selected lines, not just the latest source-audit line.
2. Investigate R4 unranked horses' source-validation reasons without changing RR eligibility gates.
3. Re-run the full Hidden Form screen using identical field eligibility, explicit 0.5f versus 1f source-rule labels, and same-line E2/LP provenance.
4. Execute the automated tests, validate Dell Chrome/iPad and freeze recorder behavior, and obtain CI/review before merging/publishing.

**Conclusion:** No observed same-date RR source pace mismatch in the comparable sample; no live RR formula change authorized. PR remains draft.
