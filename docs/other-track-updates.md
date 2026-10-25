# Keeneland, Churchill Downs and Gulfstream Park updates — STAGED / NOT READY TO DEPLOY

User request: two new buttons on Load NYRA, with scratch and odds updates for
these three venues. The two actions are **Update Odds** and **Update Scratches**;
the loaded PP card supplies track, date and selected race. Existing NYRA behavior
and all model coefficients remain unchanged. Do not merge or publish this work
until the acquisition and live browser gates below pass and the user authorizes
deployment.

## Implemented

- Separate source routing for KEE/Keeneland, CD/Churchill Downs and
  GP/Gulfstream Park. NYRA and unsupported venues cannot invoke this adapter.
- Both buttons on Load NYRA, with loaded-race identity and status. The NYRA
  track/date controls above them still describe the separate NYRA page link;
  these new actions always use the loaded PP race, never that link's selection.
- Independent odds-only and scratch-only application. Odds never substitute
  projected, morning-line or final prices; scratch updates leave active prices
  and all PP figure inputs intact. Previously scratched runners cannot reactivate.
- Exact complete-field program/name validation against each matching PP source.
  A mismatched paired source aborts the update before either source changes.
- Strict retrieval/source-observation clocks, Eastern card date, open-market
  status, official source hosts and explicit scratch states. Missing timestamps
  and undated feeds are rejected rather than relabeled fresh.
- Atomic two-source IndexedDB persistence, with session/notes retained and
  no added full-card localStorage copies. Memory updates after successful save.
- Request guard for card/race/source changes. No odds or scratch fallback from
  unverified content. No requests place wagers or enable betting safeguards.
- Staged read-only endpoint contract in `services/other-track-endpoint.js`.
  It has **zero certified connectors** and returns 503 until one is supplied.
  The current production service does not yet mount `/track-update`.

## Verification completed locally, October 25, 2026

- Node regression: 457 tests passed, including 33 new track validation tests
  and 3 new service-contract tests. No failures.
- Chromium preview: new controls visible on Load NYRA; disabled for Belmont;
  enabled with a synthetic Gulfstream card; odds request failure displays
  “Previous odds and scratches retained” and re-enables both controls.
- Synthetic fixture is `scripts/fixtures/other-track-preview.html`; it uses
  invented two-runner fields and must only be opened on a disposable preview
  origin. No new/held-out PP cards were analyzed.
- No production website or backend changes deployed. No complete successful
  real-data browser refresh has been demonstrated. Physical iPad acceptance,
  browser happy-path persistence/rollback/race-switch tests, and production
  response CORS checks remain open. Fixture/unit passes are not live feed proof.

## Concrete acquisition blockers found

1. Keeneland's official odds dashboard distinguishes morning line, live and
   projected prices. Direct retrieval currently returns HTTP 403 in this
   environment; the search-rendered page contains no runner tote payload.
   No verified current-tote connector is implemented.
   Source: https://www.keeneland.com/odds
2. Churchill Downs' public scratch page is dated September 25, not October 25.
   Importing its numbers into today's card would be wrong. The racing page
   directs live odds users to TwinSpires; no authenticated or public tote feed
   has been connected for automatic use.
   Sources: https://www.churchilldowns.com/scratches-and-changes/ and
   https://www.churchilldowns.com/racing/
3. Gulfstream's official information page says entries update hourly and points
   real-time users to a login. The public Equibase mobile scratch page retrieved
   here includes runner changes but lacks a card date and has an empty Updated
   field. It cannot satisfy date/freshness validation. Equibase's desktop page
   returns an explicit bot-protection interstitial; do not bypass it.
   Sources: https://www.gulfstreampark.com/racing-information/ and
   https://eqbwireless.equibase.com/html/scratchesGP.html

## Deployment gate — all required

- [ ] Connect a verified source for **each of six combinations** (three venues
      × odds/scratches), using explicit upstream date/time and runner identities.
- [ ] Retrieve representative genuine pre-race odds and scratches for each
      venue; manually reconcile program/name, current price, scratch state,
      race/date and observation time against the official source.
- [ ] Exercise late scratches, coupled entries, AE activation, stale pages,
      wrong dates, missing runners, cancellation, closed/final markets and
      no-racing days; no substitution or resurrection.
- [ ] Mount the staged endpoint on the existing read-only service only during
      the authorized eventual release, preserving `/odds` behavior and CORS.
      Do not publish any service change now.
- [ ] Successful browser refresh of both matching sources, source-switch and
      reload persistence, storage rollback/retry, and navigation during pending
      requests; desktop and tablet viewport, followed by physical iPad check.
- [ ] Run full regression and locked parity checks on the final candidate.
- [ ] Notify the user that all gates pass; await deployment authorization.

## Endpoint wire contract

GET `/track-update?track=keeneland|churchill|gulfstream&date=YYYY-MM-DD&race=1..20&kind=odds|scratches`

JSON requires `schemaVersion:2`, exact track/date/race/kind, `dateVerified:true`,
`fieldComplete:true`, `sourceUrl`, `fetchedAt`, actual source `observedAt`,
`raceStatus`, and complete `runners:[{program,name,scratched,odds?}]`.
Odds also require `priceType:CURRENT_TOTE` and raceStatus OPEN. Retrieval must be
within 60 seconds; odds observation within 60 seconds, scratches within 10
minutes. All times must correspond to today's Eastern card. Do not manufacture
an upstream observation time from request time. A source unable to establish
these fields remains disconnected (503), not “working with a warning.”

## Integration note

The production service source was read to confirm it supports only NYRA. It was
not edited or pushed. Its future route must call `handleOtherTrackRequest`
before the existing `/odds` branch and supply only verified server-owned
connectors. Never accept arbitrary upstream URLs from browser query parameters.
