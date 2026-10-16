# Native Brisnet research rankings v1 — October 16, 2026

## Scope

Fixes the gap between successful Brisnet import and empty ranking panels. Race Day automatically selects three separate native Brisnet research adapters on either Premium Plus or Ultimate cards, including cards already saved on the device. Original DRF/Beyer/Timeform model files and weights are unchanged. Never relabel Brisnet figures as Beyers or Timeform. These are candidate variants, not established control-model results.

IDs:
- V44C-BRISNET-BASE-20261016-v1
- CONTENDER-BRISNET-20261016-v1
- MIX1-BRISNET-20261016-v1

All return PASS, research_only=true, provisional=true, probabilityCalibrated=false, bettingEnabled=false. Numerical ranks are available separately from betting eligibility. No Fair Odds or win percentage conversion is supplied. Snapshot/quote context uses the same native model IDs and scores shown on Race Day; it must not silently export the DRF engines' empty outputs.

## Explicit initial specifications

V4.4c-Brisnet base uses latest native Speed (40 weight points), best Speed in latest three actual starts (22), verified local jockey win percent times three capped at 100 (7), same trainer input (8). Missing components redistribute weights. The original Beyer context adjustments and trainer angles are omitted.

Contender-Brisnet reuses the frozen Contender coefficients on field-relative native analogues: latest Speed, weighted recent five (.50/.25/.15/.07/.03, missing values retain actual-start positions), best three, decayed same-surface and same-surface/distance Speed, surface peak within 90 days, matched early/LP, reliable jockey/trainer rates and layoff. Connection rates retain the existing shrinkage rule and minimum 25 starts, annual preferred when verified. Missing career splits, pressure fit, workouts, trips and opposition are neutral. Trend adds .10 times a centered percentile of matched Speed slope when at least three comparable starts exist. This transfers a model structure, not evidence that the old coefficients predict outcomes with this provider.

MIX1-Brisnet uses recent-two Speed average 37%, best Speed from actual starts 3–5 12%, jockey 7%, trainer 17%, matched early pace 17%, and matched surface/distance Speed average 10%. Inputs use within-field percentiles and available weights are renormalized. At least two comparable Speed starts are needed for surface/distance. The original Beyer-context multiplier is omitted.

Pace uses the latest available E1 in sprints or E2 in routes, LP separately, among the first five actual starts, within 365 days, same surface and category, within .5 furlong. Route threshold is eight furlongs. No unmatched fallback, no hard-coded Timeform thresholds. E1 and E2 are different calls; see https://support.brisnet.com/hc/en-us/articles/360056540451-BRIS-PACE-RATINGS-FAQ . E1/E2/LP are not averaged together. Race shape and Quirin remain review evidence and receive no new score weight.

## Missing data and presentation

Exclude scratches, AE/MTO and excluded entries. First-time starters, invalid source histories and runners without a verified latest Speed stay explicitly unrated. Do not give debut runners invented pace or rank them from connections alone. Show rated/eligible counts, top four, remaining ranked runners in a disclosure, and unrated reasons. Equal scores use deterministic name ordering; this tie-break is not a claim of differing ability.

Belmont October 16 source check: 9 races; 79 headers; 65 experienced horses ranked by each native adapter and 14 first-time starters explicitly unrated. This is a functionality check, not a performance test. No results were consulted or used to fit these variants. Keep these candidates separate from the V4.4c control, Contender V2 and MIX1 Timeform archives.

## Next validation gate

Freeze native rankings before outcomes, retain source provider and exact variant ID, independently anchor the freeze, verify final starters/results/prices, then assess rank accuracy by surface/distance. Calibrate whole-field probabilities separately before any overlay or betting claim. Today's saved predictions alone do not constitute independent timestamp proof or untouched outcome validation.
