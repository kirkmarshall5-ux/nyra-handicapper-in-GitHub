# Race Simulation Validator — Stage 1 (research only)

## What is built
A **separate**, strict validator for frozen pre-race projections paired with independent official result charts. It does **not** run a simulation, scrape official charts, infer missing call positions, adjust V4.4c, or activate betting.

The input is a JSON **array** of race records. Each record requires:
- `raceId`, `track`, `date`, `surface`, `distance`, `modelVersion`
- `predictionFrozenAt` (ISO time **before** official chart publication) and a unique `predictionArtifactId` referencing the preserved prediction
- `officialChartId`, `chartPublishedAt` (ISO), optional HTTPS `chartSourceUrl`
- `datasetSplit`: `development` or `holdout`
- `calls`: named calls in their race-specific order, **ending in `finish`**
- `runners`: the complete confirmed field; each has `program`, `name`, `predicted` and `actual` dictionaries of **1-based ordinal positions for every call**, and optional `winProbability` (must be present for every runner and sum to 1 if used)

A valid position table must have one and only one runner in each position at each call. Incomplete, ambiguous, dead-heat, coupled-entry, non-finish, or mismatched-chart cases are **not graded** until an explicit adjudication policy is defined. Scratch and eligibility reconciliation must happen **before** constructing the paired record. The validator does not itself prove that the timestamp or source document is authentic; evidence custody must be independently verified.

### Example (synthetic — NOT historical validation data)
```json
[
  {
    "raceId": "DEMO-2026-10-10-R1",
    "track": "Demonstration Track",
    "date": "2026-10-10",
    "surface": "dirt",
    "distance": "6F",
    "modelVersion": "simulation-prototype-0",
    "predictionFrozenAt": "2026-10-10T15:00:00Z",
    "predictionArtifactId": "sha256:DEMONSTRATION-NOT-VERIFIED",
    "officialChartId": "synthetic-demo-chart",
    "chartPublishedAt": "2026-10-10T16:00:00Z",
    "datasetSplit": "development",
    "calls": ["quarter", "half", "stretch", "finish"],
    "runners": [
      {"program": "1", "name": "Sample A", "predicted": {"quarter": 1, "half": 1, "stretch": 2, "finish": 2}, "actual": {"quarter": 1, "half": 2, "stretch": 2, "finish": 2}},
      {"program": "2", "name": "Sample B", "predicted": {"quarter": 2, "half": 2, "stretch": 1, "finish": 1}, "actual": {"quarter": 2, "half": 1, "stretch": 1, "finish": 1}}
    ]
  }
]
```

Run: `node scripts/grade-simulation.mjs records.json holdout` (or `development`). If no eligible records exist, returns `NO_VALIDATION_DATA` and null metrics.

### Metrics
- Per-call **mean absolute position error** (smaller is better).
- Per-call **leader accuracy**.
- Finish **top-3 recall** (among all actual top-three finishers).
- Finish **top-1 winner accuracy**.
- Optional full-field **win-probability Brier score** and **log loss**.
- Split-specific evaluation, duplicate-race/artifact rejection.

## Next stages
1. **Evidence inventory**: audit the user's DRF PP source text for actual historical call positions, beaten lengths, and pace times; record coverage and missingness. No assumptions about data not extracted.
2. **Chart pairing**: obtain licensed/authorized official charts and reconcile race IDs, call conventions, track/surface/distance, runners, scratches, coupled entries, dead heats and non-finishers. Verify artifact hashes and chronological freeze evidence.
3. **Baseline simulation**: fit an interpretable running-style/TimeformUS baseline using *development* races only. Freeze the baseline and parameters before touching holdout charts.
4. **Blind holdout evaluation**: compare against simple pace-style and morning-line baselines, report metrics by sprint/route and surface, sample sizes and uncertainty intervals. Do not claim validated until sufficient independent holdout evidence exists.
5. **Prospective shadow mode**: save timestamped pre-race projections before post; later pair charts; never alter historical predictions. Keep all simulation output informational until separate betting validation.

This module does not change locked V4.4c rankings, PASS decisions, odds or betting recommendations.
