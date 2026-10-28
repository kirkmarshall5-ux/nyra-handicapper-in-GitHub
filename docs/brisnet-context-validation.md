# Brisnet Contender context validation follow-up — October 28, 2026

No model, parser, coefficient or betting-gate changes.

A second-engine extraction/reference decoder checked historical distance, surface and going against the production card on seven original PDFs. Of 3,864 historical line occurrences, 3,854 decoded and matched, with zero mismatches. Ten occurrences contain unsupported fraction tokens (`Š`, `ƒ`, `†`); they remain unknown in production too. They are not assigned guessed distances or admitted into matched pace inputs. These counts include repeated historical starts across separate cards, not 3,864 independent races. Printed sealed-track `s` suffixes are treated separately from the base going code in the reference comparison.

An independently implemented selection-rule check verified all 514 ranked horse entries against current model evidence: same surface, same sprint/route category, within one furlong, within 365 days and among the latest five actual starts. Early uses E1 for sprints and E2 for routes; Early and Late can come from different qualifying lines. Zero selected-date/value mismatches. Early was available for 390 entries (75.9%); Late for 392 (76.3%). Missing pace is not invented and does not necessarily prevent a Speed-based numerical ranking. The coverage gaps should be examined in the untouched forward cohort before changing anything.

This is implementation and extraction validation, not external confirmation of every glyph's racing meaning, a new independent current-race heading audit, or predictive certification. The ten unresolved occurrences need original-page/official-history review before any separately versioned parser proposal.

The existing historical profitability finding remains positive: Brisnet Contender paper profit +$94.29, ROI +24.3% for the previously defined October22–25 wager test. This is an observed historical advantage over the tested alternatives; its persistence is unproven. Ranking accuracy, profitability, input availability and timestamp certification are separate questions.

Reproduce with the original private source manifest and prior production-parser outputs:

```sh
node scripts/export-brisnet-pace-evidence.mjs manifest.json private-output
python scripts/crosscheck-brisnet-context.py manifest.json private-output
```

Paths in the manifest resolve from the working directory. Requires PyMuPDF. Exact counts and unresolved occurrence identifiers are in `audits/brisnet-context-validation-2026-10-28.json`. No licensed raw histories are included in that public summary. Full pre-race evidence and forward validation remain open.
