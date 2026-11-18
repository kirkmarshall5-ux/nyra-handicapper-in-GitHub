# Strict-field Hidden Speed + Hidden Form retest — Finger Lakes 2026-11-17

**Status: retrospective exploratory; not certified browser replay or ROI.** This test joins the previously extracted source-pace CSV and separate five-speed-line history audit to the frozen RR ranking and official result order. The local reproducibility script is `/mnt/data/full_hidden_form_strict_retest.py`, with separately exported CSVs `FL_2026-11-17_Full_Hidden_Form_Strict_Retest.csv` and `FL_2026-11-17_Full_Hidden_Form_Strict_Summary.csv`. Those local files are not automatically committed to this repository.

Eligible races: **2,3,5,6,8,9**; require every official starter RR-ranked and measured in the variant. R1, R4, R7 are excluded under the complete-field rule.

- Hidden Speed: RR #3/#4, measure within 3 points of the maximum in eligible field.
- Hidden Form: RR #3/#4, at least 5 prior Speed lines, range <=15, measure within 6 points of field maximum.
- Combined: either flag. Official finish was used *only to score outcomes*, not to select flags.

| Variant | Hidden Speed flags | Hidden Form flags | Combined flags | Combined winners | Combined second-place |
|---|---:|---:|---:|---:|---:|
| A E1 | 2 | 2 | 3 | 0 | 1 |
| B E2 | 5 | 2 | 5 | 0 | 3 |
| C E1 sprint / E2 route | 5 | 3 | 6 | 0 | 3 |
| D (E2+LP)/2 | 4 | 6 | 8 | 0 | 2 |

**Important D limitation:** The CSV-based D values come from the source audit's selected historical E2/LP columns. They have not yet been independently certified as same-line *for every runner* against the actual browser import. The research UI now refuses D where the selected E2 and LP dates/pages differ; therefore these D counts are **not certified as the UI's post-fix results**.

The preliminary B/C second-place counts are **flags, not successful exacta wagers**. No independent bet selections, exacta ROI, or #1 improvement is claimed. The small sample is insufficient to authorize model changes.

Next: reconstruct exact imported historical lines, verify D same-line provenance, execute actual JS tests, validate full browser/recorder workflow in Dell Chrome and iPad, then CI/review/merge. **Live Brisnet RR remains unchanged; PR stays draft.**
