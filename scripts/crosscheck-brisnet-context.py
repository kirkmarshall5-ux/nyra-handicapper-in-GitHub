import json,fitz,re,pathlib,collections,sys,datetime
root=pathlib.Path(sys.argv[2]); specs=json.load(open(sys.argv[1]));results=[]
fractions={'½':.5,'¼':.25,'¾':.75,'ˆ':1/16,'„':1/8,'‰':3/16,'‚':1/4,'…':3/8}
for spec in specs:
 path=pathlib.Path(spec['path']);pdf=fitz.open(path);words=[p.get_text('words') for p in pdf];card=json.load(open(root/(spec['id']+'-card.json')));row={'id':spec['id'],'checked':0,'unresolved':[],'mismatches':[],'matched_early_available':0,'matched_late_available':0,'experienced_runners':0}
 for race in card['races'].values():
  for h in race['horses']:
   for l in h['ratings']['lines']:
    src=l['source'];pn=src['page']-1;y=pdf[pn].rect.height-src['y'];w=sorted([w for w in words[pn] if abs(w[3]-(y+1.8))<1.2 and w[0]<100],key=lambda w:w[0]);text=' '.join(w[4] for w in w);m=re.search(r'([à•šæÌ˜~]?)\s*(\*?)(\d+(?:[½¼¾ˆ„‰‚…ÑÐ]|\.\d+)?)([fm]?)\s+(ft|fm|gd|sy|my|yl|sf|hy|wf|sl)(?:s)?\b',text)
    if not m:row['unresolved'].append({'race':race['race'],'horse':h['n'],'date':l['date'],'text':text});continue
    marker,about,tok,unit,going=m.groups();base=float(re.match(r'\d+(?:\.\d+)?',tok)[0]);glyph=tok[-1];dist=8+(70 if glyph=='Ñ' else 40)/220 if glyph in ['Ñ','Ð'] else (base+fractions.get(glyph,0))*(1 if unit=='f' or base>=4 else 8)
    surface='Turf' if marker in ['à','•','˜','~'] else 'Synth' if marker in ['æ','Ì'] else 'Dirt' if marker=='š' else 'Turf' if going in ['fm','yl','sf','hy'] else 'Dirt'
    row['checked']+=1
    if l.get('furlongs') is None or abs(dist-l['furlongs'])>1e-8 or surface!=l.get('surface') or going!=l.get('going'):row['mismatches'].append({'race':race['race'],'horse':h['n'],'date':l['date'],'text':text,'expected':[dist,surface,going],'production':[l.get('furlongs'),l.get('surface'),l.get('going')]})
 results.append(row)
report={'schema':'brisnet-second-engine-condition-check-v1','scope':'Separate PDF reader and reference decoder; glyph semantics still require external/expert confirmation. No scoring change or prospective certification.','certified':False,'cards':results,'summary':{'checked':sum(r['checked'] for r in results),'unresolved':sum(len(r['unresolved']) for r in results),'mismatches':sum(len(r['mismatches']) for r in results)}}
(root/'context-crosscheck.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report['summary']));print([(r['id'],r['unresolved'][:2],r['mismatches'][:2]) for r in results])

checks=[]
evidence=json.load(open(root/'pace-model-evidence.json'))
for spec in specs:
 card=json.load(open(root/(spec['id']+'-card.json')))
 for race in card['races'].values():
  model=next(x['model'] for x in evidence[spec['id']] if x['race']==race['race'])
  for ranked in model['rankings']:
   h=next(h for h in race['horses'] if str(h['n'])==str(ranked['n']));e=ranked['evidence'];today=datetime.date.fromisoformat(race['date']);distance=race.get('distance_furlongs');matched=[]
   for line in h['ratings']['lines'][:5]:
    d=line.get('furlongs');age=(today-datetime.date.fromisoformat(line['date'])).days
    if distance is not None and d is not None and 0<age<=365 and line.get('surface')==race['surface'] and (d>=8)==(distance>=8) and abs(d-distance)<=1:matched.append(line)
   key='e2' if distance is not None and distance>=8 else 'e1'
   early=next((l for l in matched if isinstance(l.get(key),(int,float))),None);late=next((l for l in matched if isinstance(l.get('late'),(int,float))),None)
   expected=[early['date'] if early else None,early[key] if early else None,late['date'] if late else None,late['late'] if late else None];actual=[e.get('early_date'),e.get('early'),e.get('late_date'),e.get('late')]
   checks.append({'card':spec['id'],'race':race['race'],'program':h['n'],'early_available':early is not None,'late_available':late is not None,'matched':expected==actual})
report['pace_selection']={'checked':len(checks),'mismatches':[c for c in checks if not c['matched']],'early_available':sum(c['early_available'] for c in checks),'late_available':sum(c['late_available'] for c in checks)}
(root/'context-crosscheck.json').write_text(json.dumps(report,indent=2)+'\n');print(report['pace_selection'])
