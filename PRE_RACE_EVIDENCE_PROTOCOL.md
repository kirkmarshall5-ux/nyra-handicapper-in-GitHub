# Gate #43 — prospective research evidence protocol (schema v3)

**Research only. No betting authorization.** Locked V4.4c/Contender scoring is unchanged. An ordinary Race Day **Freeze All Models** JSON (for example `nyra-local-research-freeze-v1`) is **not** the sealed Research Log export described here. Do not label an ordinary freeze as certified even when its file SHA-256 was posted to GitHub.

## Required schema and provider scope

The implementation in `pre-race-provider-freeze.js` uses `FREEZE_SCHEMA = 3`. A valid research export is `{schemaVersion:3,mode:'RESEARCH_ONLY',records,digestSha256,anchorStatus:'UNVERIFIED_LOCAL_EXPORT'}`. Its SHA-256 is calculated over the UTF-8 bytes of `JSON.stringify({schemaVersion:3,mode:'RESEARCH_ONLY',records})`, **not** over the entire exported file and not over the ordinary Race Day freeze file. Verify with `verifyResearchExport`.

Each record requires a verified provider (`BRISNET` or `DRF`), provider PDF source name and SHA-256, original and active field identities, verified scratches/surface, an official scheduled-post reference URL and explicit timezone, and provider-specific V44C/CONTENDER/FINISHER model-family outputs including PASS/HOLD and incomplete-field evidence. The schema requires all three **provider model families**; do not assume the Race Day Brisnet Contender/Brisnet-RR/Brisnet Finisher trio is interchangeable with this schema. A Brisnet-only card can be researched, but it must satisfy the actual schema and available model outputs; do not invent absent models or DRF data.

`freezeResearchSnapshot` rejects snapshots made at or after scheduled post, missing attestations, duplicate provider/card/race keys and inconsistent model/field data. Existing frozen snapshots cannot be overwritten. Exporting locally does not independently authenticate the device clock.

## Before the scheduled post (iPad or desktop)

1. Upload the correct provider PP and confirm track, card date, race, active runners, scratches and surface. Independently confirm each race's **scheduled** post time and official source URL, with timezone.
2. Preserve the source PDF and the original Race Day freeze if using that workflow. **Check whether the deployed interface actually exposes the schema-v3 Research Log freeze/export controls**. If it does not, stop: the Race Day export alone cannot satisfy Gate #43. Record this as a deployment/UI blocker; do not reconstruct a sealed export after racing.
3. In a working schema-v3 recorder, freeze each race with the verified field and model evidence before scheduled post, then **Export Research Log**. Preserve the exact exported file unchanged.
4. Validate the export with `verifyResearchExport`. Copy the exact `digestSha256` **from the sealed export**. For a multi-race export, every record's scheduled post must be later than the GitHub comment creation and last edit; the safest practice is to export/anchor each race separately.
5. Before the relevant scheduled post, create a **new** comment on [issue #43](https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/43) in this format:

   `Card YYYY-MM-DD | Track | Race # | scheduled post YYYY-MM-DDTHH:MM:SS-05:00 | SHA-256 <64 hex characters>`

   Use the correct timezone offset for that date (e.g., Eastern -04:00 during daylight saving, -05:00 during standard time). GitHub's `created_at` and `updated_at` are server timestamps; an issue's creation timestamp is not a substitute for the comment timestamp. Never publish the full export, private screenshots or account details.
6. Retain the exact export, source PDF and source/field/scratch evidence. If predictions or fields change, generate and anchor a **new** valid export before scheduled post; never silently replace an earlier freeze.

## After the race

- Retrieve the **real comment resource** from GitHub's API; do not treat user-supplied JSON that merely resembles a comment as independently authenticated evidence.
- Run `verifyResearchExport` and `scripts/gate43-comment-receipt.mjs`'s `verifyGate43CommentReceipt` on the sealed export and authentic issue #43 comment. The latter verifies export seal, digest presence, comment identity, timestamps and pre-scheduled-post timing; it intentionally returns `prospectiveCertified:false`.
- Independently reconcile scheduled post, actual off time, official starters, scratches, surface, result chart and retained source evidence. A server comment before actual off time alone does **not** establish compliance if the comment was at/after scheduled post.
- PASS/HOLD and partial-field races remain excluded from betting ROI. Do not upgrade research rankings into actionable bets or prospective certification.
- Record explicit per-race pass/fail findings and remaining blockers. Close Gate #43 only after a genuine sealed, independently anchored, post-race reconciled prospective race meets all requirements.

## Finger Lakes 2026-11-10 precedent

Two ordinary Race Day freezes were independently anchored before racing and their original-file SHA-256 hashes later matched GitHub comments #6772570533 and #6772779709. They are valuable **supporting** evidence, but neither is a schema-v3 sealed Research Log export. The race card's PASS decisions also prevent certified betting ROI. See audit comment #6780562159 on issue #43. **Do not retroactively certify this card.**

## Remaining implementation / acceptance gate

Before relying on the next iPad race, demonstrate that a **deployed** iPad-compatible workflow can create a valid schema-v3 record, export it, and expose its digest for a new GitHub comment. Test actual device/browser download, retained bytes, timestamp safeguards and no changes to live scoring. If no usable recorder UI exists, engineering must add or expose it and pass regression, locked parity and browser QA before claiming readiness.
