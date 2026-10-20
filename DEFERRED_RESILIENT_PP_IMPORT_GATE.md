# Deferred gate: resilient multi-format PP importing

Status: **BACKLOG — do not implement as part of current Finger Lakes importer or recorder PRs.**

## Scope and sequencing

1. Finish the exact Brisnet Premium Plus and DRF/TimeformUS real-PDF import acceptance gates and six-panel pre-race recorder validation.
2. Later, inventory additional user-supplied PP versions with explicit parser/version identification and representative samples.
3. Separate **core race/runner identity acceptance** (track, date, race, program, horse, distance, surface) from **optional handicapping evidence extraction** (figures, pace, trainer/jockey, workouts, etc.).
4. Preserve unknown/unreadable optional statistics as **Unknown** with provenance and parser diagnostics; never infer or invent figures or map Brisnet figures to Beyer/Timeform.
5. Permit safe card display when optional evidence is missing, but HOLD/PASS any model lacking required validated inputs. Never silently substitute another race, runner, surface, distance, or PP provider.
6. Keep prior provider cards safe on failure; verify full race and runner identities, scratches separately, and all model rankings against real PDFs before release.

## Acceptance criteria (future gate)

- New optional statistic or changed optional layout does not discard an otherwise verified card.
- Missing or unverified core identity never becomes an accepted or wagerable race.
- Per-field source/provenance, Unknown markers, and per-model missing-input reasons are visible.
- Golden PDF fixtures for each supported version, regression tests, browser QA, and unchanged locked-model parity all pass.
- No deployment or additional PP format support is claimed until independently tested with supplied source PDFs.
