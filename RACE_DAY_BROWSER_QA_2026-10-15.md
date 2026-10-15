# Race Day deployment/browser acceptance — October 15, 2026

Status: **NOT YET ACCEPTED**. Automated Node checks and GitHub Pages deployment are not browser acceptance. Record a result, screenshot, time and tested commit for each case. Do not record a PASS without observing it.

## Preconditions
- Use the exact published GitHub Pages URL and record the main commit shown in GitHub.
- Test desktop Chrome and iPad Chrome separately. Use an ordinary browser tab (not only a cached PWA); refresh after deploying.
- Preserve any live research exports before clearing local storage. Never overwrite frozen observations.
- Use one known DRF card and one known Brisnet Ultimate card with independent program/horse counts, plus the bundled sample clearly identified as unverified. Do not use historical results to adjust models.
- Keep betting disabled and all locked model weights unchanged.

## Acceptance checklist

| ID | Browser acceptance action | Expected outcome | Desktop Chrome | iPad Chrome |
| --- | --- | --- | --- | --- |
| D01 | Open published site and reload | No uncaught errors; current version, all navigation tabs accessible | Pending | Pending |
| D02 | Check Race Day cards | Three candidate panels V4.4c, Contender V2, MIX1 visible; requested jockey/trainer/pairings/angles panels hidden | Pending | Pending |
| D03 | Open PP Lab; analyze a known DRF PDF, then Replace Active Card | Track/date/races/program/name/scratches match independently checked source; no stale previous card | Pending | Pending |
| D04 | Repeat with Brisnet Ultimate PDF | Provider recognized; Brisnet E1/E2/Late never passed off as TimeformUS; unsupported fields PASS | Pending | Pending |
| D05 | Switch races 1→2→1 and change active card | Race header, contenders, odds, notes, and research identity follow active card/race; no cross-card note leakage | Pending | Pending |
| D06 | Verify FTS and missing pace | Unknown / omitted from pace map, not fabricated fractional projections | Pending | Pending |
| D07 | Check scratches and MTO/AE eligibility | Scratched/ineligible runners excluded from scored eligible field; actual starters checked separately | Pending | Pending |
| D08 | Check candidate tables on rateable and PASS races | Rankings visible as appropriate; PASS remains PASS; estimated win line clearly uncalibrated; no provisional fair odds | Pending | Pending |
| D09 | Inspect Bet Builder and cost calculator | BETTING: PASS, research only; no live wager placement; price/odds do not override PASS | Pending | Pending |
| D10 | Freeze a **future** race before post (if available) | Field/surface attestations required; duplicate freeze blocked; export contains SHA-256 and UNVERIFIED_LOCAL_EXPORT | Pending | Pending |
| D11 | Externally anchor digest **before** scheduled/actual off time | GitHub issue #43 comment server timestamp precedes post; JSON hash recomputes; retain original screenshots separately | Pending | Pending |
| D12 | Reject invalid quote inputs | Post-time, future-time, missing source, missing evidence, invalid odds rejected without approving a bet | Pending | Pending |
| D13 | Test odds source routing and refresh | NYRA only when supported; other tracks manual; stale/failing requests do not silently overwrite valid quotes | Pending | Pending |
| D14 | Rotate iPad, scroll candidate tables and navigate back | No inaccessible controls, overlapping data, clipped action buttons, or lost race context | Pending | Pending |
| D15 | Reload and verify persisted notes/export | Per-card/per-race notes intact; no false claim of independently verified evidence | Pending | Pending |

## Required evidence
For each failure record: browser/version, device, commit, card filename and source hash if available, race, reproduction steps, expected/actual behavior, screenshot, and whether the issue could affect identity, model display, or wagering safety.

**Release decision:** PASS only after both browser columns have evidence for critical cases D01–D09, D12–D15. D10–D11 require a genuine future race and are separate prospective-evidence gates. Keep wagering disabled regardless of browser QA outcome. No prospective race counts without an independently anchored pre-race digest and official result.
