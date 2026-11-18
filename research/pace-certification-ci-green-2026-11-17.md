# Certification checkpoint — commit 6a6c243 (2026-11-17)

GitHub Actions evidence for branch `research/pace-hidden-winners-ui-20261117` at commit `6a6c2435da2a1933d85b2e9cebff1c8e24a27b28`:

- Regression tests, run 44228193667, job 134546459543: **success; 702 tests, 702 pass, 0 fail, 0 skipped**.
- V4.4c locked parity, run 44228193685, job 134546459683: **success**; the workflow's `npm test` step passed.
- Chromium browser smoke QA, run 44228193573, job 134546459265: **success**. Browser QA report/screenshot artifact ID 14393632964, sha256 artifact digest `68230121d96bc6a3ab2e585e3d457d116be21d0cb21f887621c5a34a4c47c5d9`.
- Browser job log explicitly shows PASS for D19 structured recorder interface acceptance, success export and duplicate rejection, two-provider retention/source isolation, quota-safe session migration/source switch on **desktop Chromium** and **iPad Chromium emulation**. It also shows PASS for PDF routing, scratch controls, and current-card print.

**Scope limits:**
- Automated browser smoke checks are not a physical Dell Chrome test or physical iPad Safari/Chrome test.
- Artifact ZIP digest identifies the CI artifact, **not** a user-generated freeze JSON or its SHA-256 seal.
- The CI original-PDF replay step validates the script and source manifest only; original PDFs are not in CI. Therefore original Finger Lakes PP-to-import pace provenance and Variant D exact same-line source matching are **not yet certified**.
- Earlier user-observed Dell Chrome checkpoint 4 had failed JSON download and race isolation. Automated D19 success is useful but cannot by itself overrule the historical physical failure; repeat on Dell with real card and verify exported bytes, race isolation, timezone and SHA-256.
- Live Brisnet RR scoring unchanged; keep draft PR pending these remaining manual/source evidence gates.

CI URLs:
- https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/actions/runs/44228193667
- https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/actions/runs/44228193685
- https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/actions/runs/44228193573
