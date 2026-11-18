# Finger Lakes November 17 source audit / physical-device checkpoint

## Independent local source check
Compared the 63 rows of `FL_2026-11-17_Pace_Source_Audit_R2-R9.csv` with `flx1117p.txt`, the text extracted from uploaded `flx1117p.pdf`. Each row's entire `source_line` appears as an exact substring in the extracted PP text: **63/63**. Every recorded source line includes both E2 and LP fields: **63/63**. Rows cover races 2–9 (6, 6, 7, 9, 7, 7, 10, 11 respectively); R1 is not included. This validates the research audit's source-line transcription and its E2/LP co-location, **not** the website's actual imported JSON/DOM selections. Races 4 and 7 remain excluded from strict complete-field research comparisons where applicable.

## Automated evidence already passed
Commit `6a6c243`: regression 702/702; locked V4.4c parity workflow passed; desktop Chromium and iPad Chromium-emulation smoke QA passed, including D19 structured recorder success export, duplicate rejection, two-provider source isolation, and quota-safe session migration. Browser QA artifact ID 14393632964.

## Outstanding physical and end-to-end evidence
- Re-import original PP PDF in deployed research-capable browser; compare each selected E2 and LP source line with the original historical race; confirm Variant D only combines values from the same source line. Date/page equality alone is not guaranteed unique source-line identity.
- Physical Dell Chrome: repeat previously observed failures, verify real downloaded freeze JSON, single-race isolation, exact timestamp/timezone, immutable original record and SHA-256 digest.
- Physical iPad: open site, load PP, verify all model columns and FTS fields, navigate races, perform structured export/download, reopen exported JSON and verify race isolation. A passing emulated viewport does not substitute for physical iPad evidence.

Keep PR #243 draft; no live Brisnet RR model changes.