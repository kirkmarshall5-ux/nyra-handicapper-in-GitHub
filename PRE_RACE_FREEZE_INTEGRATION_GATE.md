# Race Day Freeze Predictions — integration gate (issue #114)

Status: **NOT DEPLOYABLE**. Foundation and model adapter exist on draft PR #115. The Race Day button is not connected.

## User interface
A single subdued `Freeze Predictions` button alongside the race selector, plus small status text (not a new tab). Button must never place or suggest a wager. A separate research export action may be available from a disclosure.

## Critical requirements before enabling
- The current race data exposes `race.post` as a human-readable clock label. This is **not** an independently verified offset-aware scheduled post timestamp. Do not infer a timezone or use today's clock time. The freeze must remain disabled until an authoritative race date/time/timezone has been supplied and verified.
- The existing Race Day view uses `rankBrisnetModels`, `releaseRace`, `rankContenders`, and `rankFinishers`. The adapter must be tested for exact parity with all six visible panels, including source-specific PASS/HOLD and missing-input behavior.
- A source's active field may differ from its paired source due to scratches/AE/MTO. Verify each separately; never copy eligibility from the other card.
- The new validator requires official field and surface verification. Parsed PP alone must not set `fieldVerified` or `surfaceVerified` to true.
- A local SHA-256 export is integrity evidence **only**. Anchor the digest independently before off-time (GitHub issue #43 or equivalent immutable external service). Otherwise show `UNVERIFIED`, never `CERTIFIED`.
- The freeze must be per source, card, race and model family, and must survive reload. No silent overwrite.
- Do not alter model coefficients, baseline, odds, bet builder, or bankroll gates.

## Verification
1. `node --test pre-race-provider-freeze.test.js`; `npm test`.
2. Compare serialized snapshots to the exact displayed six-panel output for a fully rateable race, PASS race, and FTS-heavy race, both providers.
3. Verify duplicates, after-post rejection, scratched/conditional runners, invalid time zones, local storage failure, independent anchor status, and reproducible export digest.
4. Run browser tests for Chrome and iPad; obtain physical-device confirmation.
5. Only then mark PR ready, review, merge and deploy.

Until then **do not use this code as proof of prospective performance**.

## Deferred follow-up — manual official scratches (2026-10-19)
- User explicitly deferred manual scratch verification; do not implement as part of the timestamp gate.
- Finger Lakes 2026-10-19 Race 8: official change sheet marked #3 Ringgood scratched at 11:01 AM ET, while uploaded DRF card still listed #3 active.
- No manual scratch editor currently exists under Manage saved cards; NYRA automatic updates do not support Finger Lakes.
- Keep the Race 8 prospective freeze on HOLD. Do not claim certified field or rankings until official scratches are reconciled. Revisit as separate priority after timestamp work.
