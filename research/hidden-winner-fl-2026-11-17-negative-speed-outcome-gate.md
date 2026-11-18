# Negative Brisnet Speed eligibility — Finger Lakes 2026-11-17 controlled gate

Research-only; no changes to Brisnet RR coefficients or eligibility.

## Verified evidence
- Official Equibase chart `FL111726USA(1).pdf` Race 4: #7 Winning Rose **5th**, #1 Nice Try Cat **7th**.
- Original Brisnet PP `flx1117p.pdf` 2026-10-20 5.5f lines: Winning Rose printed Speed **-1**; Nice Try Cat printed Speed **-18**.
- Pre-race freeze `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json` RR `unrated` entries for both: **Latest start has no verified Brisnet Speed**.
- Source engine `brisnet-models.js` rejects a negative speed at historical line validation; when missing latest speed, it refuses to rank that horse. No imputation or replacement with an older Speed is authorized.
- Race 7 #6 Sugarpapi: first-time starter, officially finished **8th**; no historical pace available.

## Outcome
Neither negative-Speed excluded horse won or finished second on this one card. This is not evidence that the exclusion rule improves ROI, only that these two exclusions did not conceal the Race 4 winner/exacta companion. Avoid backfilling negative Speed as zero, swapping in older Speed, or changing the live RR model.

## Remaining controlled tests
1. Inventory negative printed Speed cases on additional pre-race frozen cards and reconcile to original PPs, official scratches and finish order.
2. For any candidate alternative, define an explicit research-only treatment of negative Speed and recalculate *entire fields*, not just excluded runners. Record #1/#2 ordering, winners, exacta outcomes, coverage, and ROI against baseline with identical race eligibility.
3. Compare pace research display's 0.5f rule to actual RR model's 1f rule; label both accurately. Verify full Hidden Form logic and source provenance.
4. Execute tests and complete Dell/iPad freeze recorder/browser certification before merge.

**Status:** This two-horse outcome check is complete. Broader rule-effect/ROI test and PR publication gates are not certified.
