# Brisnet Pace & Ratings display — 2026-10-16

The Pace & Ratings tab now chooses the active source. Brisnet cards display native E1, E2, LP, printed styles, early-speed points and historical call ranks. The original Timeform display remains available for DRF cards. This release changes presentation only; no model coefficients, probability conversion, eligibility gates or frozen forecasts change.

## Definitions and limits

Official sources reviewed October 16, 2026:
- https://support.brisnet.com/hc/en-us/articles/360056540451-BRIS-PACE-RATINGS-FAQ
- https://support.brisnet.com/hc/en-us/articles/9803583657101-Run-Style-FAQ

E1 measures start to first call (2f in sprints, usually 4f in routes). E2 measures start to second call (4f in sprints, usually 6f in routes). LP measures second call to finish: it is not always the final quarter. Higher pace ratings are faster; Brisnet uses two points per length. The turn index is E2 minus E1 in the same historical race, not elapsed seconds. Printed E/E-P/P/S styles and 0–8 early-speed points are separate source descriptions. No Timeform conversion or new projected finish order is inferred.

## Existing native model consumption

| Model | Early | LP | Other display-only pace evidence |
|---|---|---|---|
| V4.4c-Brisnet base | No pace component | No | Styles, points, turn index |
| Contender-Brisnet | E1 sprint / E2 route; retained field-relative coefficient | Retained field-relative coefficient | Styles, points, turn index |
| MIX1-Brisnet | E1 sprint / E2 route; 17 nominal weight points | No | Styles, points, turn index |

Missing inputs are handled by each existing model. MIX1 reweights available components, so 17 nominal points do not guarantee a 17% effective contribution. No changes to original Beyer/Timeform controls. Betting and probability validation remain pending. Only runners accepted by the native model validation gates contribute to model scoring.

Historical matching is the latest five actual starts, within 365 days, same surface, same sprint/route category (route >=8f), and within 0.5f. E1, E2 and LP each use the latest available matching value, with individual dates/pages. Turn index uses a single line containing both E1 and E2. Ties share competition rank. Unmatched latest history remains visible as source context; it adds no matched pace score. First-time starters retain Unknown pace/style.

## Verification

- Independent PDF audit: 1,866 source cells checked; no mismatches (E1/E2/LP, race shapes and Speed).
- October 16 card: 9 races, 79 runners, 65 experienced, 14 first-time starters. 36 runners have matching early and LP evidence under the existing rule.
- R1: 0/7 matching route histories. Its source sprint figures now appear as unmatched context, rather than an empty Timeform-only panel.
- Recomputed all 27 native model rankings against the previously frozen nine-race capture: identical horse orders and unrounded scores.
- Compared 195 actual native model pace inputs to display selections, including source dates: no differences. Display generation does not mutate source cards.
- Added seven unit tests and browser checks for Brisnet pace display, unknown first-time starters, unmatched source visibility, and switching back to original source rules.

Adding pace to V4.4c-Brisnet, adding LP to MIX1-Brisnet, or relaxing the matching rule requires a separate versioned experiment. Those are not included in this display repair.
