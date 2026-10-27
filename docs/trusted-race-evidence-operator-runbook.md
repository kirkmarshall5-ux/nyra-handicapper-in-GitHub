# Independently signed race evidence — operator runbook

**State:** verification code is implemented; there are **no production trusted issuers or independently anchored October 25 freezes** established by this repository. No real race is certified. Never upload licensed Brisnet PDFs or private signing keys to this public repository.

## Input contract

The offline command consumes five local files, in order:
1. Research race record JSON (race ID, prediction artifact ID, prediction freeze time, chart publication time, official chart ID).
2. Gradeability evidence JSON with `provenance` and `attestations` for `originalPdfReplay`, `officialChart`, and `independentFreeze`.
3. Exact bytes of the production PDF replay artifact.
4. Exact bytes of the official chart artifact.
5. Exact bytes of the externally anchored freeze artifact.

The **trust store** is a separate, operator-controlled JSON file mapping pre-approved issuer key IDs to `{ "kind": "pdf-replay" | "official-chart" | "external-freeze-anchor", "publicKeyPem": "-----BEGIN PUBLIC KEY-----..." }`. Keys must be independently vetted and distributed out-of-band. Do not load trust keys from a race upload or from a signer-controlled evidence bundle.

```bash
NYRA_TRUST_STORE=/secure/approved-issuers.json \
  node scripts/verify-race-evidence.mjs \
  record.json evidence.json replay.json official-chart.json externally-anchored-freeze.json
```

Exit 0: signatures, declared digests and provenance contract verified. **This is not automatic factual certification of a chart or of the underlying racing results.** Exit 1: not verified. Exit 2: configuration or file error. Never treat exit 1 or 2 as gradeable.

## Issuer responsibilities

- PDF replay issuer: independently execute the production importer on the original SHA-256-pinned source, verify complete starter/AE/scratch identity, then sign the exact replay artifact digest.
- Official chart issuer: independently obtain the chart from the official authority, verify race identity and complete finish order, retain the chart artifact and sign its digest.
- External timestamp issuer: anchor the complete frozen prediction bytes **before post time** with an independent service, retain the signed proof and sign the exact snapshot digest. A self-generated browser timestamp does not qualify.

The verifier checks Ed25519 signatures and SHA-256 hashes but cannot establish that a signing organization is genuinely independent. Operators must approve keys and audit issuance processes separately. A signed freeze made after the race is not a valid pre-race freeze even if cryptographically intact.

## October 25 Belmont Race 9

The uploaded original `bel1025p.pdf` SHA-256 is `13930fbc15ee9263777a1a20d16051f8cd6196f8ece396bca38b62fde409705a`, 24 pages. A direct PyMuPDF inspection found #13 Cocoa Mills and #14 It's Nancytime Now on page 23. This **does not substitute for running the production pdfjs importer**. The original pre-race field omitted #13, so historical prospective certification is not available merely because later UI rankings include the horse.
