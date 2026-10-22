# Step 1 — DRF source and running-style audit

Completed source inventory and verification audit for the selected prior development population. This is not a new handicapper test or a declaration that all extracted call positions are ready for scoring.

## Scope and result

| Check | Finding |
|---|---:|
| Previously analyzed cards | 25 |
| Previously analyzed races | 141 |
| Selected experienced runners | 1,036 |
| Original PDFs located | 25/25 |
| Horse headers uniquely matched | 1,036/1,036 |
| Archived TimeformUS Early/Late pairs | 1,034 |
| Disagreements after independent PDF re-extraction | 0 |
| Stored styles matching the parser's rating-threshold rule | 1,034 |
| Runners with raw historical running-line text | 1,036 |
| Runners with structured historicalCalls in current archive | 0 |
| Historical source rows identified | 9,082 |
| Standard five-slot position candidates | 8,268 |
| Position rows visually checked against original rendering | 25 |
| Blank-program races / runners | 17 / 115 |
| New audit tests passing | 8 |
| Models run / holdout files used / live changes | 0 / 0 / 0 |

The previously reported 124-race, 921-runner comparison excludes the 17 blank-program races. Adding their 115 runners gives this source audit's 141 races and 1,036 runners. This is a selected historical population, not an inventory or certification of every DRF PP in the user's larger archive. No first-time starters occur in this selected population.

Nineteen original PDF hashes match a hash preserved in their archived card metadata. The remaining six cards do not carry that historical hash in the selected JSON; their source filenames, dated card identity, horse headers and printed summary values were checked, and their current hashes are recorded. They are not falsely labeled historical hash matches.

## What is confirmed

**Summary pace extraction is sound in this set.** Every selected horse header was independently found in the original PDF. Printed TimeformUS Early/Late pairs were re-extracted by their page coordinates and compared with the archive. All 1,034 pairs agree. The other two experienced runners have no summary pair: R Ruth of My Life and Merlin Monroan on the October 10 Keeneland card.

**Stored running style is a proxy.** The production parser at commit 91f9bc0460ca07521b5eedb6c42905f42242ac3e sets E from Early >=105, EP from Early >=90, S from Late >=85, otherwise P. The 1,034 available pairs reproduce their stored style labels. The two missing-pair runners also have the default P label. These labels do not independently establish need-for-lead behavior. This audit marks every verified historical style UNKNOWN and keeps style_usable_for_pressure false rather than silently treating those proxies as observations.

**Historical positions exist as source evidence but are not structured scoring inputs.** All 1,036 runners have archived raw running-line text. The selected JSON has no structured historicalCalls records. Source inspection identifies positions at start, first call, second call, stretch and finish in many standard historical rows. No new features were connected to production.

**Program-number absence is real for the excluded source cards.** BAQ June 21, BAQ June 26 and Saratoga June 7 have blank archived program numbers for the 115 selected runners. No separate program labels were found alongside their source horse headers; the three printed layouts were also visually inspected. Their original PDFs do not supply a program-number recovery. No roster ordering, finish result or guessed numbering was substituted. This does not prove an official independent entry/chart source could never resolve them; it means the original-PP route is exhausted. The earlier 124-race results remain unchanged.

## Research extraction added

The read-only extractor anchors on unique horse names, prior dates and post/field tokens, then accepts only the five standard call slots with positions bounded by field size. Ambiguous/nonstandard rows abstain. It stores PDF hash, horse, card, page and vertical coordinate for every candidate.

It preserves source margin glyphs, decodes the visually checked digit/fraction mapping, and distinguishes LEAD_MARGIN for a leader from BEATEN_MARGIN for a trailing runner. HEAD and NECK remain categorical; another small-margin glyph remains explicitly unverified. Missing margins are not zero. Tokens containing unrelated text are rejected. All 25 sampled rows' five positions were visually checked against rendered originals, covering all 25 cards. That is 125 checked call positions, not proof that every candidate row is correct.

There are 8,268 standard candidates. The other 814 identified rows remain unresolved/nonstandard. Candidate histories must not be compressed into a latest-five-start window: foreign or unusual starts may be unparsed, so chronological sequence completeness is not certified. Retain source start slots when implementing any recency rule.

The compact evidence freeze retains all identified rows' dates, coordinates, statuses and accepted call tokens. Numeric margins and call fields can be reconstructed with parse_call_tokens. Only the 25 visually reviewed rows receive positions_reviewed_against_original=true. No runner has been promoted to an independently verified running style yet.

## Remaining gates and Step 2 handoff

1. Use the source-verified TimeformUS summaries to develop a field-relative setup diagnostic, with unknown style explicitly represented. Do not require a Brisnet historical-line LP filter for these summary ratings.
2. Validate a historical-call extraction pipeline and review sufficient recent lines per runner before claiming committed lead-seeking, tactical flexibility or a verified style. The 25-row sample confirms source availability and basic mapping; it does not certify 1,036 styles.
3. Establish a verified glyph dictionary for historical race-shape symbols. Visible raw tokens are retained as candidates; no speed-/closer-favoring meanings are assigned here.
4. Individual historical TimeformUS sectional pace figures are not certified by this audit. Do not treat raw fractional times, Beyers, summary Early/Late, historical shape symbols or program numbers as interchangeable fields. Lack of certification is not a claim that every PDF lacks those figures.
5. Keep the 17 races excluded from program-keyed scoring until an independently verified identity source resolves them. Name-based source evidence remains usable for the audit, with no fabricated program ID.

Step 1's audit deliverable is complete. The full historical-call extraction, verified-style dataset and setup/scoring tests remain open work for the subsequent steps. Current rankings and weights remain unchanged. All 30 sealed holdouts remain inventory-only.

## Evidence and reproduction

- SUMMARY.json: exact counts and remaining uncertainty.
- card-manifest.csv: the 25 explicit source identities, hashes and per-card counts.
- horse-availability.csv.gz: source/feature status for all 1,036 runners.
- source-evidence.json.gz: compact source extraction, all candidate statuses and reviewed flags.
- review-sample.json: the 25 visually reviewed historical rows, including source text and page coordinates.
- PROTOCOL.json: scope, parent code versions and evidence hashes.
- audit_drf_sources.py: read-only extraction and conservative margin decoder.
- test_drf_source_audit.py: boundary, identity, date, margin and frozen-evidence tests.
- finalize_audit.py and make_review_sheets.py: evidence packing and review-sheet generation.

Run python3 -m unittest test_drf_source_audit.py in this directory. Eight tests pass, including validation of every saved candidate's field bounds/date and the exact 25 reviewed flags. Source collection requires the explicitly named prior development JSON paths and the matching original PDFs; it does not search/open holdout content. The audit uses PyMuPDF; visual review used Poppler because the retrieved PDFs rendered more reliably there. No model suite was rerun or new prediction success claimed for this source-only change.
