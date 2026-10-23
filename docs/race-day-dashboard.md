# Race day dashboard

The dashboard summarizes the existing Brisnet Contender, DRF Contender and DRF
Finisher forecasts above the unchanged four comparison panels. It introduces no
rating, model weighting, probability estimate or wager authorization.

## Reading the panel

- **Ranked / eligible** measures input completeness, not finishing-position
  coverage. Full field does not override PASS or research status.
- The table shows each model's full-field rank and the morning-line rank.
  A dash means unavailable or unranked. Models top 4 counts the three named
  models; morning line is a separate reference. The two DRF models share inputs.
- The shortlist is the union of the three model top fours and the morning-line
  top four. It is sorted by top-four agreement, then program number. This is a
  display order, not a fourth predictive model. Six rows are visible initially.
- Different dates, tracks, race numbers, surfaces, known numeric distances,
  active entrants or scratches exclude the affected source from this dashboard.
  Existing provider panels are retained for inspection. Program and horse name
  must both match; punctuation and trailing country codes may differ.
- A duplicate or unmatched runner in a forecast excludes the forecast rather
  than silently shifting its ranks.

## Paper strategy costs

The expandable panel uses one selected model or the morning line. It lists the
user's four parallel tests: $2 win plus $2 place on rank 1 ($4), $2 place on
rank 2 ($2), a $1 two-horse exacta box ($2), and a $1 three-horse exacta box
($6). All four cost $14 when at least three ranks exist. Missing ranks omit
unsupported tickets. Coupled/nonnumeric programs require an entry-level check.
Costs are illustrations, including for PASS forecasts; they authorize no bets.

## Research export

Freeze full card calls the existing Freeze All Models export. Existing v1
fields remain intact. Each race additionally contains `notes` and `dashboard`:

- `schema: nyra-race-dashboard-v1`
- confirmed eligible `field` and race identity
- `models` with full ranked orders, scores, model IDs, decision and completeness
- `morning_line` with the chosen source, full available order and declared odds
- `shortlist`, field/source issues, and each source's `paper_plans`
- `source_cards` with card IDs, parser versions and import times
- `betting_enabled: false`

Export uses an unverified browser clock, not independent proof of capture before
post time. The selected race and model-panel contents are restored after export.
This first version supplies the forecast records for later coverage, order and
profitability scoring; it does not import results or claim a historical edge.

## Verification

`npm test` covers field matching, completeness, odds separation, full orders,
exacta combinations, coupled entries, escaping and production FTS/PASS behavior.
The existing browser smoke workflow also checks dashboard rendering, paper-source
selection, freeze download contents, selected-race restoration and narrow layout
using synthetic fixtures. No holdout cards are needed for these checks.
