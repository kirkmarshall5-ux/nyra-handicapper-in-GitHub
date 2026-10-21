# Brisnet PDF.js audit — private input handoff
Research only. Does not deploy or change handicapping models.

## Required inputs
Place these three original Brisnet Premium Plus PDFs at the **top level** of a .tar.gz archive (not in a subfolder):
- Bel-10-16-2026 Premium Plus.pdf
- Bel-10-17-2026 Premium Plus.pdf
- KEE-10-17-2026 Premium Plus.pdf

The runner never checks the PDF files into Git. It processes them in its temporary directory and uploads only JSON audit outputs, not the PDFs.

## Preferred handoff: short-lived signed HTTPS URL
1. Create a .tar.gz archive containing the three PDFs. On macOS/Linux: `tar -czf brisnet-audit-input.tar.gz 'Bel-10-16-2026 Premium Plus.pdf' 'Bel-10-17-2026 Premium Plus.pdf' 'KEE-10-17-2026 Premium Plus.pdf'`. On Windows, 7-Zip can create a tar archive and then gzip it.
2. Upload the archive to a **private** storage service that supports a short-lived, read-only, signed HTTPS download URL (for example, an S3 presigned URL). Prefer a URL that expires in an hour. Do not paste the URL into a public issue, PR, or chat.
3. In GitHub, open the repository → Settings → Secrets and variables → Actions → New repository secret. Name it `BRISNET_AUDIT_BUNDLE_URL` and paste the signed URL as its value. Save.
4. Open Actions → “Brisnet PDF.js source parity (research only)” → Run workflow. Select the PR branch `fix/finger-lakes-premium-1m70yds-20261020` if available. Workflow_dispatch may require the workflow to exist on the default branch; if the Run workflow control is missing, rerun the pull_request workflow after setting the secret by updating the branch or ask a maintainer to dispatch it. Do not merge this PR just to enable a run.
5. Inspect the run and download the `brisnet-pdfjs-research-audit` artifact. A red run means the audit did not pass; the JSON may still be uploaded for investigation.

## Alternative for very small archives only
Set `BRISNET_AUDIT_PDFS_BASE64` to the base64 encoding of the compressed archive. GitHub Actions repository secrets are size-limited (48 KB), so this is **usually unsuitable for multi-card PDF bundles**. The URL secret takes precedence.

## Safety and acceptance
- Keep the storage object private; revoke the URL or delete the secret after use.
- The workflow requires at least three PDF inputs. It fails closed when no PDFs are supplied or the audit flags an issue.
- A successful PDF.js import does **not** establish source-to-importer field parity. Independent date, distance, surface, Speed, E1/E2/LP comparisons remain required.
- Audit artifacts may contain horse names and imported text/figures. Check storage/access permissions before sharing.
