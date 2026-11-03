import collections,csv,gzip,hashlib,json,pathlib,re
from build_and_validate import norm,CHART,AUDIT
root=pathlib.Path('.');x=json.loads(gzip.decompress((root/'prediction-freeze.json.gz').read_bytes()));e=json.loads((root/'evaluation.json').read_text())
rows=[]
for r in x['predictions']:
 d=r['primary'];rows.append({'race':r['key'],'field_size':d['field_size'],'program_identity_complete':r['program_identity_complete'],'known_early':d['known_early'],'highest_early_ids':'|'.join(d['highest_early_ids']),'highest_early':d['highest_early'],'top_two_gap':d['top_two_gap'],'within_five':d['front_cluster_count'],'geometry':d['geometry'],'interpretation':d['interpretation'],'geometry_stable_across_policies':r['geometry_stable_across_policies']})
for name,rr in [('race-diagnostics.csv',rows),('chart-evaluation.csv',e['evaluation'])]:
 with (root/name).open('w') as f:w=csv.DictWriter(f,fieldnames=list(rr[0]));w.writeheader();w.writerows(rr)
source=json.load(open(AUDIT/'audit.json'));targets={(r['date'],r['card'].split('_')[0],r['race'],norm(h['name'])):(r,h) for r in x['predictions'] for h in r['field']};links=[]
for c in source['cards']:
 for h in c['horses']:
  for l in h['source']['historical_lines']:
   m=re.match(r'\d{1,2}.\d{2}=\s*(\d+)\s*([A-Za-z]+)',l['raw'])
   if not m or not l['calls']:continue
   key=(l['date'],m[2].upper(),int(m[1]),norm(h['name']))
   if key not in targets:continue
   r,runner=targets[key];assert c['date']>r['date']
   links.append({'target':r['key'],'horse':h['name'],'target_source_id':runner['source_id'],'later_card':c['card'],'later_source_sha256':c['pdf_sha256'],'page':l['page'],'y':l['y'],'status':'EVALUATION_CANDIDATE_ONLY_CALL_LABELS_NOT_CERTIFIED'})
linkinfo={'observations':len(links),'target_races':len({r['target'] for r in links}),'unique_target_horses':len({(r['target'],r['target_source_id']) for r in links}),'used_for_current_accuracy':False,'reason':'Need explicit distance-specific physical call mapping and duplicate/conflict review. No generic slot is assumed to represent a universal first call.','links':links}
(root/'later-line-candidates.json').write_text(json.dumps(linkinfo,indent=2)+'\n')
summary={**e['summary'],'visually_reviewed_chart_races':11,'visually_reviewed_chart_positions':76,'diagnostic_tests_passed':11,'later_line_candidates':{k:v for k,v in linkinfo.items() if k!='links'},'scoring_ready':False,'remaining_gates':['Independently reviewed lead-seeking/tactical style evidence','Actual fast/slow tempo labels independent of finishing result','Wider dates/tracks and stable thresholds before scoring'],'source_chart_sha256':hashlib.sha256(CHART.read_bytes()).hexdigest()}
(root/'SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
files=['protocol.json','setup_diagnostic.py','build_and_validate.py','test_setup_diagnostic.py','prediction-freeze.json.gz','evaluation.json','chart-review.json']
(root/'HASHES.json').write_text(json.dumps({p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files},indent=2)+'\n')
print({k:v for k,v in linkinfo.items() if k!='links'});print('freeze bytes',(root/'prediction-freeze.json.gz').stat().st_size)
