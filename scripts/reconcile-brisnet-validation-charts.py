"""Reconcile downloaded full official chart PDFs; does not issue trusted signatures.
Usage: python scripts/reconcile-brisnet-validation-charts.py charts-directory results.json freezes-directory
Requires Poppler pdftotext. Raw charts remain private.
"""
import json, pathlib, subprocess, re, sys, hashlib, datetime
root,result_file,freezes=map(pathlib.Path,sys.argv[1:])
results=json.loads(result_file.read_text());manifest=json.loads((root/'manifest.json').read_text());rows=[]
saved={}
for f in freezes.glob('NYRA_FREEZE_*.json'):
    for r in json.loads(f.read_text())['races']:saved[(r['date'],r['race'])]=r
# Printed country suffixes are retained in chart_order but optional in PP names.
def norm(s):return re.sub(r'[^a-z0-9]','',re.sub(r'\s+\([A-Z]{2,3}\)$','',s).lower())
for source in manifest:
    row={**source,'certified':False,'trusted_issuer_signature':False};rows.append(row)
    try:
        if source.get('error'):raise ValueError(source['error'])
        pdf=root/source['file'];assert hashlib.sha256(pdf.read_bytes()).hexdigest()==source['sha256']
        text=subprocess.check_output(['pdftotext','-layout',str(pdf),'-']).decode()
        date=source['date'];race=source['race'];result=next(r for r in results if r['date']==date and r['race']==race)
        heading=' '.join(text.splitlines()[:2]);assert f'October {int(date[-2:])}, 2026' in heading and re.search(rf'Race {race}\b',heading)
        assert 'belmontpark' in norm(heading),'Track mismatch'
        header=next(l for l in text.splitlines() if l.startswith('Last Raced') and 'Horse Name' in l)
        pos=header.index('Pgm');table=text.split(header,1)[1].split('Fractional Times:',1)[0]
        entries=[]
        for line in table.splitlines():
            match=re.match(r'^\s*(\d+[A-Z]?)\s+(.+?)\s+\([^()]+\)\s+\d{2,3}\b',line[max(0,pos-1):])
            if match:entries.append({'program':match[1],'name':match[2]})
        assert len(entries)>=4 and len({e['program'] for e in entries})==len(entries),'Ambiguous chart table'
        assert [e['program'] for e in entries[:4]]==[e[0] for e in result['finish']],'First four program mismatch'
        assert [norm(e['name']) for e in entries[:4]]==[norm(e[1]) for e in result['finish']],'First four name mismatch'
        assert {e['program'] for e in entries}==set(result['starters']),'Full final field mismatch'
        roster={str(e['number']):e['name'] for e in saved[(date,race)]['starters']}
        missing=[e for e in entries if e['program'] not in roster]
        wrong=[e for e in entries if e['program'] in roster and norm(e['name'])!=norm(roster[e['program']])]
        off=re.search(r'Off at:\s*([0-9:]+)',text)
        row.update(status='CHART_RESULT_RECONCILED',starter_count=len(entries),chart_order=entries,first_four_matched=True,full_starter_programs_matched=True,printed_local_off_time=off[1] if off else None,freeze_roster_missing=missing,freeze_roster_name_conflicts=wrong)
    except Exception as e:row.update(status='HOLD',error=str(e))
report={'schema':'brisnet-official-chart-reconciliation-v1','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'certified':False,'scope':'Official downloaded PDF bytes reconciled by operator. No independent signed attestation; off-time string is retained without inferring a UTC pre-off certification.','summary':{'charts':len(rows),'reconciled':sum(r['status']=='CHART_RESULT_RECONCILED' for r in rows),'holds':sum(r['status']=='HOLD' for r in rows)},'rows':rows}
(root.parent/'chart-reconciliation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report['summary']));
for r in rows:
    if r['status']=='HOLD' or r.get('freeze_roster_missing') or r.get('freeze_roster_name_conflicts'):print(r['date'],r['race'],r.get('error'),r.get('freeze_roster_missing'),r.get('freeze_roster_name_conflicts'))
if report['summary']['holds']:sys.exit(1)
