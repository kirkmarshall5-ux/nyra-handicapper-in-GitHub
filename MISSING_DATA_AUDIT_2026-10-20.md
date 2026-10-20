# Missing-data audit — 2026-10-20

Scope: static source-code audit only. No real-card frequency measurements, no change to locked formulas, no wagering certification. Reviewed `data-corrected-research.js`, `rankings-release.js`, `contender-rankings.js`, `brisnet-models.js`, `finisher-inputs.js`, `finisher-model.js`, and `finisher-drf-distance.js`.

| Model | Hard prerequisite / unrated | Optional / neutral or reweighted | Race decision or coverage consequence |
|---|---|---|---|
| DRF V4.4c | Verified career starts >0, nonempty valid Beyer figures, source review for exceptional figures; no invalid optional supplied fields; no parser blockers | Missing jockey/trainer percentages and trainer context omitted from weighted average; missing Timeform early/late allowed | Any unrated runner or parser blocker => whole-race PASS; otherwise RATEABLE. A supplied but invalid optional input can block. |
| DRF Contender | V4.4c baseline; contender evidence must exist on every considered runner | Missing surface/distance, pace, connection, workouts, trips, opposition, trend contributes neutral field-relative effect | Baseline PASS returns PASS (with optional partial display); absent contender evidence => HOLD; otherwise RATEABLE or provisional PASS. |
| Brisnet native V4.4c/Contender/MIX1 | Provider identity, verified career starts >0, ordered and sourced lines, latest Speed, valid card date, unique field identities | Base/MIX1 weights renormalize for missing jockey/trainer, matched pace/speed and older history; Contender unavailable signals neutral | **Always PASS** because experimental/research-only, even with complete ratings. Missing Speed produces unrated runner; cannot interpret all PASS as parser failures. |
| Finisher DRF | Valid baseline-rated runner with verified recent speed; race parser blockers => HOLD | Missing matched surface/distance speed and late pace => neutral percentile 50 | No rated runners => HOLD; partial => PARTIAL_FIELD; full => COMPLETE_FIELD. Recorder maps non-complete to PASS. |
| Finisher Brisnet | Verified date/surface/provider/starts, sourced and ordered historical lines, latest Speed, no disallowed blockers | Matched speed and late pace missing => neutral percentile 50 | No rated runners => HOLD; partial => PARTIAL_FIELD; complete field still research-only, recorder PASS for Brisnet. |

## Concrete risk findings

1. **Classification conflation**: Brisnet PASS is a deliberate research gate, not evidence that pace or Speed is missing. Display separate `research_only`, `unrated`, and `missing_inputs` categories before any coverage optimization.
2. **Contender evidence gap**: DRF Contender requires an evidence object for each eligible rated runner; missing source extraction can cause HOLD despite baseline evidence. Diagnose parser vs genuine absence before relaxing.
3. **Different missing-input policies**: DRF V4.4c omits missing weighted optional factors; Brisnet native models reweight; Finisher assigns neutral percentile 50. Never describe these as interchangeable or silently replace one with another.
4. **Race-wide fail-closed**: DRF V4.4c PASSes if any entrant lacks verified Beyer or is FTS; this is intentional full-field policy and not proof that the entire PDF failed.
5. **Strict comparability**: Brisnet pace uses same surface, sprint/route, <=0.5 furlong and <=365 days; absent comparable pace is not necessarily a missing printed statistic. DRF Finisher uses its own matched-distance logic.
6. **Provenance**: A source-verified absent number differs from a PDF parsing failure. Current code does not provide a complete cross-provider, per-runner coverage dashboard; this audit cannot quantify how many PASS/HOLD races each cause without real-card instrumentation.

## Recommended later follow-up (not implemented here)

Build a research-only per-runner matrix of required vs optional input presence, source-page provenance, parser-blocker reason, comparable-start count, and model decision. Count separate causes on verified real PDFs, then propose changes only where missing evidence is due to extraction failure. Preserve all locked model formulas and betting gates.
