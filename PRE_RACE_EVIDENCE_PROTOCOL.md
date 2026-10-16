# Three-Model Pre-Race Evidence Integrity Gate (research only)

Purpose: This protocol is NOT betting authorization. V4.4c scoring stays locked, as do Contender V2 and MIX1; all automated wagering decisions remain PASS. Browser clocks and localStorage can be modified. A local SHA-256 hash is only tamper-evident after independent pre-race anchoring.

## Before scheduled post time
1. Load an untouched race card, verify official field, scratches and surface, and enter scheduled post time with timezone (e.g. -04:00).
2. Check the field and surface attestations and click **Freeze All 3 Models**. This stores one local snapshot with the verified active field, full source-field identities and scratch flags, each model's ordered rankings and raw scores, each model's RATEABLE/PASS/HOLD status and reasons, local timestamp and scheduled post. In PASS/HOLD races an empty or partial model ranking is explicitly marked as not a full-field ranking. If any model output is unavailable or inconsistent, the freeze fails closed. It does not overwrite an existing snapshot for that card/race.
3. For genuine live tote quotes only: enter observed odds, tote source, evidence reference and quote timestamp with timezone. Check live-tote attestation only when true. Keep the actual screenshot separately. Recorder rejects quotes at/after post and submissions at/after scheduled post.
4. Export Research Log. Retain the JSON and referenced source evidence. It includes both freezes and quotes. The 64-character SHA-256 digest covers the UTF-8 JSON.stringify({schemaVersion:2,mode:'RESEARCH_ONLY',records,freezes}) payload. Export time is a LOCAL timestamp, not independent evidence.
5. BEFORE scheduled post: submit that exact digest as a new comment in a dedicated GitHub research-evidence issue. Include card date, track, race and scheduled post time. GitHub comment created_at (server time) must precede scheduled and independently established actual off time. Retain the comment URL. Do not use Git commit author timestamps as independent evidence.
6. If new quotes or changes are recorded, export and anchor a new digest before post. If this is impossible, label the race UNVERIFIED / EXCLUDE. Do not retroactively certify.

## After the race
- Recompute SHA-256 from the exported payload; compare with JSON digest and exact GitHub comment. Check the comment's server timestamp, independently sourced actual off time, and saved screenshot evidence.
- Independently verify that the race was untouched, the runners/scratches/surface were correct, and no results were available when the observations were made.
- A digest establishes consistency of bytes with the anchor, NOT truth of quoted odds, validity of the device clock, or untouched status. Unanchored and historical local records are audit-only, not prospective validation.
- GitHub issues are public in a public repository. Post only the digest and nonsensitive race metadata, never personal data, account information, screenshots, or full research files.

## Acceptance
- Three-model freeze and recorder post-time guards: implementation subject to regression, locked parity and live browser acceptance. Existing older one-model local freezes are not retroactively three-model snapshots.
- Reproducible SHA-256 research export with UNVERIFIED_LOCAL_EXPORT marker: implemented; pending CI.
- Deployment and desktop Chrome / iPad Chrome controls: pending acceptance on the new version.
- At least one genuine future race with GitHub-server pre-post digest anchor and independent review: pending. Cannot be completed before a live future race.
## Version / interpretation
- New freeze records have `schemaVersion: 2` and `models.V44C`, `models.CONTENDER`, `models.MIX1`. `rankingSnapshot` remains a legacy V4.4c-only compatibility field. An old schemaVersion 1 freeze **does not** prove three-model predictions.
- `models.*.fullFieldRanked` is true only for a RATEABLE model that ranked every eligible runner; provisional PASS subsets are not full-field predictions.
- The export SHA-256 covers every freeze in the exported payload and is invalidated by any later modification. Re-export and post a **new** digest before post if data changes; do not overwrite earlier anchored evidence.
- Neither local export nor server timestamp establishes that the race was untouched, the source entries were accurate, or any model has validated win probabilities.
