import json,pathlib,re,subprocess,hashlib,sys
root=pathlib.Path(sys.argv[1]);rows=[]
for day,ns in [('22',8),('25',9),('28',8)]:
 for rn in range(1,ns+1):
  p=root/('research-controlled/charts/R'+str(rn)+'.pdf') if day=='28' else root/f'validation-output/official-charts/2026-10-{day}-R{rn}.pdf'
  text=subprocess.check_output(['pdftotext','-layout',str(p),'-']).decode();heading=' '.join(text.splitlines()[:2]);assert f'October {int(day)}, 2026' in heading and re.search(rf'Race {rn}\b',heading) and 'belmontpark' in re.sub('[^a-z]','',heading.lower());header=next(l for l in text.splitlines() if l.startswith('Last Raced') and 'Horse Name' in l);pos=header.index('Pgm');table=text.split(header)[1].split('Fractional Times:')[0];horses=[]
  for line in table.splitlines():
   m=re.match(r'^\s*(\d+[A-Z]?)\s+(.+?)\s+\([^()]+\)\s+\d{2,3}\b',line[max(0,pos-1):])
   if m:horses.append({'n':m[1],'name':m[2]})
  assert len(horses)>=4 and len(set(h['n']for h in horses))==len(horses)
  distance=re.search(r'Distance:\s*(.*?)\s+On The\s+([^\n]+)',text);assert distance,(day,rn)
  rows.append({'date':'2026-10-'+day,'race':rn,'track':'Belmont Park','field':horses,'actual':[h['n']for h in horses[:4]],'distance_text':distance[1],'surface_text':distance[2],'chart_sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(root/'research-controlled/chart-reference.json').write_text(json.dumps(rows,indent=2));print([(r['date'],r['race'],r['distance_text'],r['surface_text'])for r in rows])
