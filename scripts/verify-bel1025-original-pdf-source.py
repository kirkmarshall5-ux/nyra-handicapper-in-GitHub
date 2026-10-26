#!/usr/bin/env python3
"""Verify original BEL 2026-10-25 Brisnet AE markers; NOT production JS importer."""
import argparse
import hashlib
import json
import re
from pathlib import Path

EXPECTED_SHA = '13930fbc15ee9263777a1a20d16051f8cd6196f8ece396bca38b62fde409705a'
ENTRIES = [('13', 'Cocoa Mills'), ('14', "It's Nancytime Now")]

def verify(pdf_path):
    import fitz
    source = Path(pdf_path).read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    if digest != EXPECTED_SHA:
        raise ValueError(f'Unexpected source SHA256: {digest}')
    doc = fitz.open(stream=source, filetype='pdf')
    if len(doc) != 24:
        raise ValueError(f'Expected 24 pages, found {len(doc)}')
    text = doc[22].get_text()
    findings = []
    for number, name in ENTRIES:
        match = re.search(rf'(?m)^\s*{number}\s*\n{re.escape(name)}\s*\([^\n]+\)(.*?)(?=\n(?:13|14)\n|\Z)', text, re.S)
        if not match:
            raise ValueError(f'Missing horse header {number} {name} on page 23')
        if not re.search(r'\$40,000\s+AE\s+B\.\s*f\.\s*3', match.group(1)):
            raise ValueError(f'AE marker absent from {number} {name} block')
        findings.append({'program': number, 'name': name, 'source_page': 23, 'ae_marker': True})
    return {'source_sha256': digest, 'pages': len(doc), 'findings': findings,
            'method': 'PyMuPDF direct original PDF text extraction',
            'production_importer_executed': False, 'historical_rankings_certified': False}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf')
    args = parser.parse_args()
    print(json.dumps(verify(args.pdf), indent=2))
