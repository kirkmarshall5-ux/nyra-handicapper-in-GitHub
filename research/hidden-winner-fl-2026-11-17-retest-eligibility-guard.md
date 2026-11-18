# Pace research retest and eligibility guard — Finger Lakes 2026-11-17

## Research UI change
Commit d2388b7 requires E2 and LP selected metrics to share date and source page before calculating the D sustained figure. The page now distinguishes research 0.5f from RR 1f distance matching. RR engine untouched.

## Executed local exploratory scripts
- `hidden_winner_four_variant_retest.py`: six complete-field eligible races (2,3,5,6,8,9); A 2 flags/0 winners/1 second; B 5/0/3; C 5/0/3; D 4/0/2. These results use the separate CSV-based retrospective screen, **not** the newly changed browser UI code. No certified ROI.
- `hidden_winner_speed_form_test.py`: older broad exploratory screen produced nine flags, two winners (R4 Lady On the Lam, R7 Solo Street). **DO NOT PRESENT as certified performance:** R4 has unranked RR horses and R7 has an FTS/unranked horse, so those two winners come from races excluded by the strict full-field comparison. Also the older script uses E1-only pace and a different eligibility/coverage policy.

## Outstanding
1. Re-run *full Hidden Form* under the exact current browser logic and certified complete-field eligibility, with same-line D provenance. The older broad screen is not a valid substitute.
2. Execute JS test suite from an actual checked-out branch and record pass/fail; local Python scripts do not execute JS regression tests.
3. Independently verify browser import, JSON recorder isolation, timestamp/timezone and SHA-256 freeze; Dell Chrome and iPad certification remain open.
4. Obtain CI/PR review and publish only after gate completion.

**Merge: blocked.** No change to live Brisnet RR formula or ranking.
