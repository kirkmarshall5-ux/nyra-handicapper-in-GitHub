# Finger Lakes 2026-11-17: Nine previously non-comparable RR source checks

Original PP: `flx1117p.pdf`; freeze: `NYRA_FREEZE_2026-11-17_2026-11-17T16-40-11-186Z.json`. These are source-document checks, not a browser replay. The horse-level audit CSV was generated as a conversation artifact.

| Race | Program | Horse | Original PP evidence | Frozen RR evidence | Resolution |
|---|---:|---|---|---|---|
| 1 | 1 | Muscle Shoals | 09Nov26 6f dirt E1=92 E2=96 LP=74 | E1=92 LP=74 | Match |
| 1 | 2 | Skyler's Starship | 15Sep26 6f dirt E1=82 E2=85 LP=87 | E1=82 LP=87 | Match |
| 1 | 3 | Paschal Moon | No qualifying dirt pace among recent starts | E1=null LP=null | Legitimate no matched pace, still RR ranked |
| 1 | 4 | Isomarshall | 09Nov26 5.5f dirt E1=78 E2=58 LP=51 | E1=78 LP=51 | Match |
| 1 | 5 | Not for Hire | 07Oct26 5.5f dirt E1=85 E2=91 LP=76 | E1=85 LP=76 | Match |
| 1 | 6 | Lord King | 09Nov26 5.5f dirt E1=98 E2=99 LP=76 | E1=98 LP=76 | Match |
| 4 | 1 | Nice Try Cat | 20Oct26 5.5f dirt, Speed=-18, E1=46 E2=6 LP=57 | Unranked; latest Speed fails nonnegative gate | Source-supported gate exclusion; investigate whether signed Speed is valid BRIS data |
| 4 | 7 | Winning Rose | 20Oct26 5.5f dirt, Speed=-1, E1=54 E2=25 LP=57 | Unranked; latest Speed fails nonnegative gate | Source-supported gate exclusion; investigate signed Speed |
| 7 | 6 | Sugarpapi | First-time starter | Unranked, no historical pace | Expected |

Across the original 60 same-date RR E1/LP comparisons plus these five new source matches: **65 directly comparable runner lines matched, zero figure discrepancies**. The four other cases are explained by missing qualifying pace, signed negative Speed source-validation, or FTS; they are not additional numeric matches.

**Critical caution:** source-to-freeze agreement does not independently prove that all imported historical lines, source dates, eligibility decisions or rank order are correct. No live model changes. Continue with the negative-Speed policy research, explicit RR 1f versus research-display 0.5f tolerance labeling, complete Hidden Form variant validation, automated tests and physical browser freeze certification before merge/publish.
