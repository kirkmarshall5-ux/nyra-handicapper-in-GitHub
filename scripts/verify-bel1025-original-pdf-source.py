#!/usr/bin/env python3
"""Original BEL 2026-10-25 Brisnet source-only identity audit. Not a production JS importer replay."""
import argparse
import hashlib
import json
import re
from pathlib import Path

EXPECTED_SHA = '13930fbc15ee9263777a1a20d16051f8cd6196f8ece396bca38b62fde409705a'
ENTRIES = [
 ('1','Bouquetry'),('2','Best Not Miss'),('3','Sinead'),('4','Golden Beach'),
 ('5','Meadowlark Drive'),('6','Scorch'),('7','Juliet On Approach'),
 ('8',"Leslie's Star"),('9','Clap Back'),('10',"Heaven's Bolt"),
 ('11','Five Dozen Roses'),('12','On a Summer Day'),
 ('13','Cocoa Mills'),('14',"It's Nancytime Now")
]

def verify(pdf_path):
    import fitz
    source = Path(pdf_path).read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    if digest != EXPECTED_SHA:
        raise ValueError(f'Unexpected source SHA256: {digest}')
    doc = fitz.open(stream=source, filetype='pdf')
    if len(doc) != 24:
        raise ValueError(f'Expected 24 pages, found {len(doc)}')
    # Horse PPs are on pages 20-23. Page 24 is an index and must not
    # count as independent proof that a horse's PP was parsed.
    pages = [doc[i].get_text() for i in range(19,23)]
    findings = []
    for number, name in ENTRIES:
        matched_pages = [index + 20 for index, text in enumerate(pages)
                         if re.search(re.escape(name), text, re.I)]
        if len(matched_pages) != 1:
            raise ValueError(f'Expected one source PP for #{number} {name}, found {matched_pages}')
        findings.append({'program': number, 'name': name,
                         'source_page': matched_pages[0],
                         'source_name_found': True,
                         'source_ae_marker': number in ('13','14')})
    text = pages[3]
    for number, name in ENTRIES[-2:]:
        match = re.search(rf'(?m)^\s*{number}\s*\n{re.escape(name)}\s*\([^\n]+\)(.*?)(?=\n(?:13|14)\n|\Z)', text, re.S)
        if not match or not re.search(r'\$40,000\s+AE\s+B\.\s*f\.\s*3', match.group(1)):
            raise ValueError(f'AE marker absent from #{number} {name} on page 23')
    return {
        'schema_version': 1, 'source_sha256': digest, 'source_bytes': len(source),
        'pages': len(doc), 'source_horse_identity_matches': len(findings),
        'findings': findings, 'method': 'PyMuPDF original PDF text extraction',
        'production_importer_executed': False,
        'production_model_input_parity_verified': False,
        'historical_rankings_certified': False,
        'status': 'SOURCE_IDENTITY_VERIFIED_PRODUCTION_REPLAY_PENDING'
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf')
    args = parser.parse_args()
    print(json.dumps(verify(args.pdf), indent=2))
