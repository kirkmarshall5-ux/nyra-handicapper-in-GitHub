# DRF Research Lab — draft MVP

Open `drf-research-lab.html` in a served checkout. The lab is isolated from the Race Day application and never writes production model weights or freezes.

## Input

Upload UTF-8 JSON with this shape:

```json
{
  "races": [
    {
      "id": "BEL-2026-10-28-R5",
      "contender_coefficients": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      "actual": ["12","10","6","3"],
      "runners": [
        {
          "program": "12",
          "name": "Example horse",
          "contender": {"raw": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null], "trend_adjustment": 0},
          "finisher": {"recent_speed": 75, "matched_speed": 70, "late_pace": 90}
        }
      ]
    }
  ]
}
```

This is a **shape example, not actual model evidence**. Supply all active runners, all 19 native Contender feature values, the *actual* 19 coefficients from the matching production model, and the original trend adjustment. For baseline verification, add `contender_baseline:[{"program":"12","score":0.123}]` for **every** runner. A real race needs at least two runners. If `actual` is omitted, the lab shows rankings without grading.

**Important:** Research Lab v1 accepts already-extracted horse-level evidence; it does not yet extract original DRF PDFs or automatically retain scoring inputs at upload time. The next engineering increment is a read-only export adapter at the DRF parsing/scoring boundary, followed by baseline-parity tests and browser QA. Until then the lab is a working test harness, not a one-click historical-data importer.

## Study design

Contender neutralizations: surface win record (feature index 9), workout rank (16), early pace (6); all singles and combinations. Optional Late coefficient multiplier. Finisher: original Late weight, neutral Late, +25% and +50%. Contender normalization uses original within-race midrank center and missing-neutral behavior. Finisher uses within-race 0–100 midrank percentile, missing-neutral 50.

Metrics: exact first, exact second, ordered exacta, runner-up among first four, and actual top-four members covered. No outcome-based selection or model deployment.

## Known limitations

This is a draft, not deployed or regression-certified. A complete test suite, verified feature index parity, strict official-field and eligibility validation, Finisher baseline parity, persistent source evidence, and direct upload integration are still required. All retrospective results must remain clearly labeled as such.
