# Belmont source completeness repair — October 21, 2026

Original development PDF: `bel1021p.pdf`, SHA-256
`f054f4965f1585102a680eb5a2eb2c7525b93f1a10ebb46eb679a18264759253`.
No holdout PDFs or race outcomes were used.

## Historical source review

All 412 historical lines were re-parsed. The 14 previously reported unresolved
rating rows have explicit source explanations: ten five-furlong rows omit E1
and the shape figures, two other rows have blank source ratings, one has blank LP
and printed negative Speed, and one has printed negative E2. Source blanks and
negative exclusions stay null for scoring; no numeric ratings are manufactured.
They now have per-cell reasons and `PARTIAL_RATINGS_SOURCE_VERIFIED` status rather
than an undifferentiated unresolved label. Ambiguous numeric columns still hold.

The sole unknown historical condition was Good Bali's 28 March 2026 race: PDF
inspection confirms 1 3/8 miles, represented as `1…` in the Premium Plus text
layer. The historical decoder now reads it as 11 furlongs. This row remains
outside the latest-five scoring window on this card.

## Workout extraction

The parser produces 741 structured workout records for 62 source entries, with
zero unresolved workout records on this PDF. Independent PyMuPDF text extraction
found exactly 741 workout-date tokens, with matching counts on every page and
within every horse block. Visual PDF review checked training-track annotations,
times, fifth-second glyphs, methods and ranks. Unit tests cover adjacent horse
boundaries, printed years, year rollover, invalid calendar dates, rank conflicts,
nonstandard entries and retained unresolved source text.

Each workout retains its original text, page and row position, printed time,
parsed seconds, distance, track text, going, method, rank and bullet marker.
Fifty-five workout dates explicitly print a year. Other years are labeled as
inferred from the card and descending workout dates. Workouts remain unscored;
no model coefficients or feature contributions are changed by this extraction.

## Matching coverage experiment — no rankings or weights changed

Coverage counts below use the saved card's scratch/exclusion flags and 56
rateable horses. Each variant retains same surface, sprint/route category,
verified figures and the 365-day limit. Coverage is not predictive validation.

| History window | Distance tolerance | At least one matched Speed / LP | Two matched Speed starts (MIX1) |
|---|---:|---:|---:|
| Latest five starts | 0.5 furlong (current) | 30/56 | 21/56 |
| Latest five starts | 1 furlong | 40/56 | 28/56 |
| Latest five starts | 1.5 furlongs | 41/56 | 30/56 |
| All available starts | 0.5 furlong | 32/56 | 22/56 |
| All available starts | 1 furlong | 40/56 | 29/56 |
| All available starts | 1.5 furlongs | 42/56 | 31/56 |

Distance tolerance explains most recoverable coverage here. One furlong is the
first candidate for a later development-data ranking test. The production
half-furlong filter is retained until a separate versioned candidate demonstrates
better ordering on validation cards. Some horses genuinely have no comparable
history; those absences remain explicit.

## Integrity and rollout

- 2,472 historical numeric cells compared before/after: zero changes.
- All 32 outputs (V4.4c, Finisher, Contender and MIX1 across eight races) are
  exactly unchanged when preserving the saved card's field flags.
- Premium parser advances to `BRISNET-PREMIUM-PLUS-positioned-v3`.
- Existing v2 cards remain supported and preserved. Re-upload the original PP
  to obtain v3 workout records, gap reasons and the corrected historical distance.
- Source export includes per-cell gap reasons. No betting or probability gates
  are enabled, no locked engine changes, and no frozen records are rewritten.
