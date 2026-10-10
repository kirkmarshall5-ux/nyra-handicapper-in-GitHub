# Stage 3: Reviewed historical running-style evidence (research only)

## Status
Implemented and unit-tested historical-style evidence gate. **Not a validated improvement in forecast accuracy**. It does not alter V4.4c, live odds, bets, or the frozen v0.2 pace formula.

## Original-PP workflow
1. Open the **pre-race** DRF PDF for the target date. Identify a horse by race number, program number and name.
2. Candidate extractor may surface past-running lines with original text and line number. These are **unverified candidates**, not fractional positions.
3. Human reviewer reads the PDF layout to distinguish **post/gate/start** from the **first fractional call** and records only the latter as `earlyPosition`. Attach `sourceId`, 1-based `page`, `lineNumber`, `date` (ISO), `fieldSize`, `reviewedAgainstOriginalPP: true`, and `reviewedBy`. Do not infer date glyphs from corrupted text.
4. Require **two or more reviewed past races**, both strictly before the target race. Reject later lines, missing provenance, impossible field positions and ambiguous call mapping. Optional same-surface requirement.
5. Normalize early position by field size: `(earlyPosition-1)/(fieldSize-1)`; median across qualifying races. Fixed research categories: E <= .15; EP <= .35; P <= .65; S otherwise. These are **provisional rules, not fitted to winners**.
6. Do not assign a historical style to first-time starters. Do not overwrite complete TimeformUS pace pairs or an existing properly sourced style. Pass enriched field into the separate v0.2 missingness simulator.
7. Preserve the original PP file, manual-review evidence, and pre-race input freeze; run prospective untouched races before assessing accuracy.

## Pilot Saratoga August 31, 2024
Race 1 Executive Order and Race 2 Early Adopter (GB) each have **Life 0** in the supplied pre-race DRF; they cannot have two prior running lines. Race 2 Authentic Gallop has **Life 1**; one prior race cannot satisfy the minimum. These horses must remain missing/uncertain unless directly measured pace data are available. **Do not retrofit** their styles from how they ran on August 31.

The pilot fields were reconstructed retrospectively and official Equibase chart PDF verification is outstanding. No independent performance lift can be claimed.

## Next gate
Complete original-PP manual line review on a separate set of experienced runners with >=2 starts, preserve pre-race frozen inputs, and compare v0.2 versus evidence-enriched v0.3 on an untouched set. Publish race-level sample counts and metrics even when the new evidence makes predictions worse.
