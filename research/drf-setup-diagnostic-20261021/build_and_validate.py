import collections,copy,csv,datetime,gzip,hashlib,json,pathlib,re
import fitz
from fractions import Fraction
from setup_diagnostic import diagnose
ROOT=pathlib.Path(__file__).resolve().parent
AUDIT=ROOT.parent/'drf-source-audit-20261021'
if not AUDIT.exists():AUDIT=ROOT.parent/'drf_source_audit'
CHART=pathlib.Path('/workspace/scratch/e211cc869cf2/upload/BEL101726USA.pdf')
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def norm(s):return re.sub('[^a-z0-9]','',re.sub(r'\s*\([A-Z]{2,3}\)','',s,flags=re.I).lower())

def build_freeze():
 source=json.loads(gzip.decompress((AUDIT/'source-evidence.json.gz').read_bytes()));assert source['holdout_files_used']==0
 policy=json.loads((ROOT/'protocol.json').read_text());policies=[policy['primary_policy'],*policy['sensitivity_policies']]
 predictions=[]
 for c in source['cards']:
  assert c['role']=='DEVELOPMENT_PREVIOUSLY_ANALYZED'
  groups=collections.defaultdict(list)
  for h in c['horses']:
   # Whitelist only declared source features; never copy later lines or outcomes.
   groups[h['race']].append({'source_id':c['card']+'_R'+str(h['race'])+':'+norm(h['name']),'name':h['name'],'program':h['archived_program'] or None,'early':h['archived_early'],'life_starts':h['life_starts'],'verified_style':None,'style_evidence_status':'UNVERIFIED','reviewed_line_count':0})
  for rn,field in sorted(groups.items()):
   before=copy.deepcopy(field);outputs=[diagnose(field,**p,race_date=c['date']) for p in policies];assert field==before
   predictions.append({'key':c['card']+'_R'+str(rn),'card':c['card'],'date':c['date'],'race':rn,'source_sha256':c['pdf_sha256'],'program_identity_complete':all(h['program'] is not None for h in field),'field':field,'primary':outputs[0],'sensitivity':outputs[1:],'geometry_stable_across_policies':len({o['geometry'] for o in outputs})==1})
 return {'classification':policy['classification'],'protocol_sha256':sha(ROOT/'protocol.json'),'source_audit_sha256':sha(AUDIT/'source-evidence.json.gz'),'holdout_files_used':0,'prediction_input_whitelist':['source_id','name','program','early','life_starts','verified_style','style_evidence_status','reviewed_line_count'],'predictions':predictions}

def numeric_margin(text):
 if not text:return None
 if text in ['Head','Neck','Nose']:return None
 try:return sum(float(Fraction(v)) for v in text.split())
 except (ValueError,ZeroDivisionError):return None

def extract_chart():
 races={};attempts=[]
 for pi,page in enumerate(fitz.open(CHART)):
  text=page.get_text();m=re.search(r'October 17, 2026\s*-\s*Race\s+(\d+)',text[:150])
  if not m:continue
  rn=int(m[1]);spans=[s for b in page.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
  anchors=[s for s in spans if 'Past Performance Running Line Preview' in s['text']]
  if len(anchors)!=1:attempts.append({'race':rn,'reason':'PREVIEW_NOT_UNIQUE','page':pi+1});continue
  ay=anchors[0]['bbox'][1];headers=sorted([s for s in spans if ay+8<s['bbox'][1]<ay+16],key=lambda s:s['bbox'][0])
  columns={s['text'].strip():s['bbox'][0] for s in headers};start=min(columns.values());hy=min(s['bbox'][1] for s in headers)
  main_headers=[s for s in spans if s['text'].strip()=='Start' and s['bbox'][1]<ay]
  distance_match=re.search(r'Distance:\s*([^\n]+)',text);distance=distance_match[1] if distance_match else ''
  # Use the race distance and explicit table headers, not the number of printed slots.
  first='1/2' if re.search(r'\bMiles?\b',distance) else '1/4' if re.search(r'\bFurlongs?\b',distance) else None
  if first not in columns:attempts.append({'race':rn,'reason':'FIRST_CALL_COLUMN_UNRESOLVED','columns':columns});continue
  x=columns[first];next_x=min(v for v in columns.values() if v>x)
  footers=[s['bbox'][1] for s in spans if s['bbox'][1]>hy and s['text'].strip().startswith('Trainers:')];end=min(footers) if footers else hy+200
  pgms=[s for s in spans if hy+8<s['bbox'][1]<end and abs(s['size']-7)<.05 and start<s['bbox'][0]<start+15 and re.fullmatch(r'\d+[A-Z]?',s['text'])]
  entries=[]
  for p in pgms:
   y=p['bbox'][1];positions=[s for s in spans if abs(s['size']-7)<.05 and abs(s['bbox'][1]-y)<.5 and abs(s['bbox'][0]-x)<1]
   if len(positions)!=1 or not positions[0]['text'].isdigit():continue
   pos=int(positions[0]['text']);ms=[s for s in spans if abs(s['size']-6)<.05 and abs(s['bbox'][1]-(y-2.3))<.8 and x+2<s['bbox'][0]<next_x-1];mt=' '.join(s['text'] for s in sorted(ms,key=lambda s:s['bbox'][0])).strip()
   margin=0 if pos==1 else numeric_margin(mt);near=True if pos==1 or mt in ['Head','Neck','Nose'] else margin<=1 if margin is not None else None
   entries.append({'program':p['text'],'first_call_position':pos,'beaten_lengths':margin,'margin_label':mt if mt in ['Head','Neck','Nose'] else None,'margin_text':mt,'near_lead_within_one_length':near,'page':pi+1,'y':round(y,3),'call':first})
  if len(entries)<2 or len({e['program'] for e in entries})!=len(entries) or sorted(e['first_call_position'] for e in entries)!=list(range(1,len(entries)+1)):
   attempts.append({'race':rn,'reason':'POSITION_FIELD_NOT_COMPLETE','entries':entries});continue
  races[rn]={'source_sha256':sha(CHART),'source':'Previously analyzed official chart, PP-preview table','page':pi+1,'header_columns':columns,'distance_text':distance,'first_call':first,'first_call_basis':'QUARTER_MILE_SPRINT_HALF_MILE_ROUTE','entries':entries}
 return races,attempts

def validate(predictions,labels):
 rows=[]
 for rn,label in sorted(labels.items()):
  p=next((r for r in predictions if r['card']=='BEL_2026-10-17' and r['race']==rn),None)
  if not p:continue
  assert {e['program'] for e in label['entries']}=={h['program'] for h in p['field']},'Chart field mismatch'
  top=p['primary']['highest_early_ids'];by_program={e['program']:e for e in label['entries']};tops=[by_program[h['program']] for h in p['field'] if h['source_id'] in top]
  if p['primary']['geometry']=='INCOMPLETE_EARLY_EVIDENCE':continue
  count=len(p['field']);near=[e for e in label['entries'] if e['near_lead_within_one_length'] is True];unknown=sum(e['near_lead_within_one_length'] is None for e in label['entries'])
  rows.append({'key':p['key'],'field_size':count,'geometry':p['primary']['geometry'],'top_two_gap':p['primary']['top_two_gap'],'front_cluster_count':p['primary']['front_cluster_count'],'top_early_programs':[e['program'] for e in tops],'top_early_observed_positions':[e['first_call_position'] for e in tops],'top_early_top3_credit':sum(e['first_call_position']<=3 for e in tops)/len(tops),'top_early_leader_credit':sum(e['first_call_position']==1 for e in tops)/len(tops),'top_early_normalized_position':sum((e['first_call_position']-1)/(count-1) for e in tops)/len(tops),'uniform_random_top3_reference':min(3,count)/count,'observed_near_lead_count':len(near),'unknown_near_lead_count':unknown,'actual_first_call':label['first_call'],'actual_near_lead_programs':[e['program'] for e in near],'actual_tempo_label':None})
 return rows

if __name__=='__main__':
 freeze=build_freeze();(ROOT/'prediction-freeze.json.gz').write_bytes(gzip.compress(json.dumps(freeze,separators=(',',':')).encode(),mtime=0))
 # Predictions are frozen before target-race chart extraction or evaluation.
 labels,attempts=extract_chart();rows=validate(freeze['predictions'],labels)
 review=json.loads((ROOT/'chart-review.json').read_text());assert review['source_pdf_sha256']==sha(CHART)
 for rn,label in labels.items():
  expected=review['expected'][str(rn)];assert expected['page']==label['page'];assert expected['first_call']==label['first_call']
  assert expected['entries']==[{k:e[k] for k in ['program','first_call_position','beaten_lengths','margin_label','margin_text']} for e in label['entries']]
  label['source_review_status']='VISUALLY_CHECKED_AGAINST_ORIGINAL'
 summary={'predicted_races':len(freeze['predictions']),'geometry_counts':dict(collections.Counter(p['primary']['geometry'] for p in freeze['predictions'])),'interpretation_counts':dict(collections.Counter(p['primary']['interpretation'] for p in freeze['predictions'])),'stable_geometry_races':sum(p['geometry_stable_across_policies'] for p in freeze['predictions']),'identity_incomplete_races':sum(not p['program_identity_complete'] for p in freeze['predictions']),'official_chart_races_extracted':len(labels),'evaluation_races':len(rows),'evaluation_horses':sum(r['field_size'] for r in rows),'highest_early_top3_credit':sum(r['top_early_top3_credit'] for r in rows),'highest_early_leader_credit':sum(r['top_early_leader_credit'] for r in rows),'mean_normalized_early_position':sum(r['top_early_normalized_position'] for r in rows)/len(rows) if rows else None,'mean_uniform_random_top3_reference':sum(r['uniform_random_top3_reference'] for r in rows)/len(rows) if rows else None,'actual_fast_slow_labels':0,'models_changed':False,'holdout_files_used':0}
 result={'classification':'POSTHOC_DIAGNOSTIC_EVALUATION_NOT_INDEPENDENT_VALIDATION','summary':summary,'chart_attempts':attempts,'chart_labels':labels,'evaluation':rows}
 (ROOT/'evaluation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(summary,indent=2));print('chart exclusions',attempts)
