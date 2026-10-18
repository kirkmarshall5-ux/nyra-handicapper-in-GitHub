# DRF distance input correction test — October 18, 2026

Purpose: verify and correct distance extraction in a separate research input test before changing weights. The user prioritizes winners, exact first-two pairs and first-through-third accuracy; fourth-place accuracy remains a secondary tradeoff.

Frozen: V4.4c control, original Finisher predictions, 60/25/15 factor weights, latest-five recent weights, all eligibility rules, 365-day lookback, half-furlong match tolerance, 90-day matching-speed decay, neutral missing-input treatment and name-based tie break. No production model/parser files or website imports are changed.

Only the DRF matching-speed input is recomputed. Recent speed and TimeformUS Late are copied exactly from the frozen evidence. The old going/surface anchor and first-five proof rows are retained. Unsupported or unverified formats stay unknown. No weight fitting, outcome-based threshold search, provider pooling, betting ROI or live promotion.

Verified sources:

- `Saratoga_Ten_Card_Retest_Evidence/upload/SAR--06-04-2026(1).pdf`, PDF page 5, Noble Dynasty's April 19 Keeneland row: extracted `1±`, printed 1 3/16 miles (9.5 furlongs).
- Same PDF, page 13, Race 7 header: extracted `1´ MILES`, printed 1 3/8 miles (11 furlongs).
- `Saratoga_Ten_Card_Retest_Evidence/upload/SAR--07-12-2026.pdf`, PDF page 3, Race 2 header: extracted `1 ¶ MILES`, printed 1 1/2 miles (12 furlongs).

Corrections: support the missing 3/8 glyph, allow space before a fractional glyph, decode `±` as 3/16 rather than 1/8, and decode `¶` as 1/2 rather than 3/16. Ordinary supported formats retain their meaning. ASCII and Unicode fraction equivalents are tested. Unobserved unsupported legacy symbols remain unknown rather than guessed.

Primary comparisons: same 130 historical races, shown separately for 58 full-order DRF, 47 Saratoga first-four, and 25 Keeneland full-order cohorts. Additional check: 11 October 17 Belmont DRF races, preserving final starters and actual surface/distance. October 17 Belmont R7 uses the chart-verified actual 1 3/16-mile distance override, because the race was transferred from 1 1/2-mile turf to all-weather. This is the same actual-distance condition intended in the original replay; no outcome or new surface assumption is introduced. Native Brisnet distance parsing is outside this DRF test and unchanged.

Metrics: winner first, winner in first three, correct first/second/third slots separately, exact first two in order, first-two set regardless of order, actual first two both covered by selected first three, exact first three, and first-three coverage. Also retain fourth-slot and top-four coverage plus full-field error where complete orders exist. No finishes are invented for the Saratoga first-four cohort.

Freeze this decoder/protocol before inspecting outcome changes. Keep original and corrected-input rankings as separate records. Evaluate all cases under the same fixed rules, not just known misses. Results are retrospective development because the historical outcomes were previously reviewed.
