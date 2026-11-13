# Model validation and race eligibility

As of November 13, 2026, native Brisnet rankings and Finisher record race evidence separately from model validation.

- `decision: RATEABLE`: a nonempty eligible field has all required ranking evidence.
- `decision: PASS`: some active starters remain unranked, including first-time starters or experienced runners lacking required evidence.
- `decision: HOLD`: no numerical rankings can be released, including source or identity failures and empty fields.
- `validation_status: PENDING`: model performance validation remains open. This alone does not cause PASS/HOLD.

The legacy `research_only`, provisional and ranking-status fields remain for compatibility. They describe validation, not evidence eligibility. Probability calibration and betting-enabled flags remain false. A RATEABLE decision does not establish pre-race timing, immutable provenance, or validated profitability. Those requirements remain separate when evaluating ROI. Previously captured freezes are unchanged and retain the statuses recorded at capture.

No scoring coefficient, required input, neutral missing-feature treatment, horse order, or scratch rule changed. Shared Selections, individual model panels and new exports use the separated status.

Validation: 682 Node tests passed, including complete fields with missing optional pace, FTS, missing required Speed, scratches, source blockers, duplicate identities and empty fields. Original November 12 Belmont PP replay: all 171 ranked rows across eight races and three active Brisnet models matched the prior scores and ordering exactly.
