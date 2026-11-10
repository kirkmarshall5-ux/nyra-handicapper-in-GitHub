"""Separate fixed historical flow-effort experiment. Never modifies production."""
import collections,datetime,gzip,hashlib,json,pathlib,re,sys,csv,importlib.util
ROOT=pathlib.Path(__file__).resolve().parent
context_dir=ROOT.parent/'contender_context_experiment'
if not context_dir.exists():context_dir=ROOT.parent/'contender-context-replacement-20261021'
spec=importlib.util.spec_from_file_location('context_experiment',context_dir/'experiment.py')
context=importlib.util.module_from_spec(spec);spec.loader.exec_module(context)
metrics,paired=context.metrics,context.paired
ARMS=['CURRENT_CONTENDER','CURRENT_PLUS_HISTORICAL_QUALITY']
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def norm(s):return re.sub('[^a-z0-9]','',re.sub(r'\s*\([A-Z]{2,3}\)','',s,flags=re.I).lower())
def numeric_distance(s):
 s=s.strip()
 s=s.replace('ô','.5').replace('1Â','1 1/16').replace('1°','1 1/8')
 m=re.fullmatch(r'(\d+(?:\.\d+)?)\s+Furlongs?',s,re.I)
 if m:return float(m[1])
 m=re.fullmatch(r'(\d+)(?:\s+(\d+)/(\d+))?\s+Miles?',s,re.I)
 if m:return 8*(int(m[1])+(int(m[2])/int(m[3]) if m[2] else 0))
 return None
def historical_context(raw):
 # Only known printed standard distances and an explicit conservative surface gate.
 m=re.match(r'^\d{1,2}.\d{2}=\s*\d+([A-Za-z]+)\s+(\S+)\s+(\S+)',raw)
 if not m:return None
 track,condition,token=m.groups()
 disttoken=token.rstrip('êÑú')
 distances={'5f':5,'5ôf':5.5,'6f':6,'6ôf':6.5,'7f':7,'7ôf':7.5,'1':8,'1Â':8.5,'1°':9}
 if disttoken not in distances:return None
 if 'ú' in token:return None
 # A separate course glyph can follow distance, especially at one mile.
 after=raw[m.end():].lstrip().split(' ',1)[0]
 if any(c in token or after==c for c in ['ê','Ñ']):surface='Turf'
 elif track in ['Aqu','BAQ','Sar','Bel','CD','Kee'] and condition.rstrip('ø') in ['fst','gd','my','sly','wf','sy','ft']:surface='Dirt'
 else:return None
 return {'track':track,'surface':surface,'distance_furlongs':distances[disttoken]}
def beaten(call):
 if call['position']==1:return 0.0
 if call.get('numeric_margin') is not None:return call['numeric_margin']
 # HEAD/NECK satisfy bounds but are never turned into invented numeric lengths.
 return None
def within(call,limit):
 return call['position']==1 or call.get('margin_label') in ['HEAD','NECK'] or (beaten(call) is not None and beaten(call)<=limit)
def qualify(row,policy):
 calls=row.get('calls')
 if not calls or len(calls)!=5 or not row.get('field_size') or row['field_size']<4:return {'usable':False,'qualifies':False,'reason':'UNRESOLVED_CALLS_OR_SMALL_FIELD'}
 values=list(calls.values());a,b,finish=values[1],values[2],values[4]
 if not all(1<=c['position']<=row['field_size'] for c in values):return {'usable':False,'qualifies':False,'reason':'INVALID_POSITION'}
 tokens=row.get('shape_candidate_tokens',[]);shape=policy['shape_map'].get(tokens[0]) if len(tokens)==1 else None
 good=finish['position']<=3 and within(finish,3)
 early=all(c['position']<=2 and within(c,2) for c in [a,b])
 late=all(c['position']>=4 and beaten(c) is not None and beaten(c)>=2 for c in [a,b])
 gain=b['position']-finish['position']
 lengthgain=beaten(b)-beaten(finish) if beaten(b) is not None and beaten(finish) is not None else None
 kind=None
 if shape and 'CLOSERS' in shape and early and good:kind='EARLY_RESILIENCE_AGAINST_FLOW'
 if shape and 'SPEED' in shape and late and good and gain>=2 and lengthgain is not None and lengthgain>=2:kind='LATE_GAIN_AGAINST_FLOW'
 return {'usable':True,'qualifies':kind is not None,'reason':kind or 'NO_QUALIFYING_AGAINST_FLOW_EFFORT','historical_flow':shape or 'UNKNOWN_NOT_NEUTRAL','good_finish':good,'position_gain_from_raw_slot_3':gain,'beaten_length_gain_from_raw_slot_3':lengthgain}
def horse_evidence(lines,target_date,surface,distance,policy):
 date=datetime.date.fromisoformat(target_date);matched=[];seen={}
 for row in lines:
  ctx=historical_context(row['raw'])
  if not ctx or ctx['surface']!=surface or distance is None or abs(ctx['distance_furlongs']-distance)>policy['matched_distance_tolerance_furlongs']:continue
  past=datetime.date.fromisoformat(row['date']);days=(date-past).days
  if not 0<days<=policy['lookback_days']:continue
  identity=(row['date'],ctx['track'],re.match(r'^\d{1,2}.\d{2}=\s*(\d+)',row['raw'])[1])
  if identity in seen:
   if seen[identity]['raw']!=row['raw']:raise AssertionError('Conflicting historical line')
   continue
  seen[identity]=row;matched.append({**row,'context':ctx})
 selected=sorted(matched,key=lambda x:x['date'],reverse=True)[:3]
 reviewed=[{**r,**qualify(r,policy),'weight':policy['row_weights'][i]} for i,r in enumerate(selected)]
 usable=sum(r['usable'] for r in reviewed)
 quality=sum(r['weight']*r['qualifies'] for r in reviewed) if usable>=policy['minimum_usable_rows'] else 0.0
 return {'selected_rows':reviewed,'usable_rows':usable,'quality':quality,'delta':policy['cap_score_points']*quality,'status':'AVAILABLE' if usable>=policy['minimum_usable_rows'] else 'WITHHELD_INSUFFICIENT_MATCHED_HISTORY'}
def target_metadata():
 base=pathlib.Path('/workspace/scratch/e211cc869cf2/review_extract');hist=base/'Beyer_Three_Tests_Finishing_Order_Evidence/priority2/priority2/historical_run'
 cards=json.loads((hist/'predictions.json').read_text())['cards']+json.loads((hist/'supplemental_predictions.json').read_text())['cards']
 cards+=json.loads((base/'Saratoga_Ten_Card_Retest_Evidence/ten_card_test_run/ALIGNED_FROZEN_CARDS.json').read_text())['cards']
 for d in ['09','10','11','14','15']:cards.append(json.loads((base/f'Keeneland_Five_Card_Test_20261017/keeneland_five_v1/cards/2026-10-{d}.json').read_text()))
 cards.append(json.loads(pathlib.Path('/workspace/scratch/e211cc869cf2/oct17_work/BEL_DRF_card.json').read_text()))
 out={};tracks={'Belmont at the Big A':'BAQ','Churchill Downs':'CD','Saratoga':'SAR','Keeneland':'KEE','Belmont Park':'BEL'}
 for c in cards:
  if c['track'] not in tracks:continue
  for rn,r in c['races'].items():
   key=tracks[c['track']]+'_'+c['date']+'_R'+str(rn)
   row={'distance_text':r.get('dist',''),'distance_furlongs':numeric_distance(r.get('dist','')),'surface':r.get('surface')}
   if key in out:assert out[key]==row
   out[key]=row
 return out
def build():
 policy=json.loads((ROOT/'protocol.json').read_text());parentpath=ROOT.parent/'contender_context_experiment/parent-feature-freeze.json.gz'
 assert sha(parentpath)=='cebad325ea7bf29dad440d2c051230013bc0a0251eb60e8f6999600b4ae6f801'
 parent=json.loads(gzip.decompress(parentpath.read_bytes()));auditpath=ROOT.parent/'drf_source_audit/audit.json';audit=json.loads(auditpath.read_text());meta=target_metadata()
 assert parent['holdout_files_used']==audit['holdout_files_used']==0
 sources={c['card']+'_R'+str(h['race'])+':'+norm(h['name']):(c,h) for c in audit['cards'] for h in c['horses']}
 races=[]
 for r in parent['races']:
  m=meta[r['key']];surface_consistent=m['surface']==r['surface'];entries=[]
  for e in r['contender_entries']:
   c,h=sources[r['key']+':'+norm(e['name'])];assert c['role']=='DEVELOPMENT_PREVIOUSLY_ANALYZED';assert h['archived_program']==e['n']
   assert h['archived_early']==e['raw'][6] and h['archived_late']==e['raw'][7]
   evidence=horse_evidence(h['source']['historical_lines'],r['date'],r['surface'],m['distance_furlongs'],policy)
   if not surface_consistent:evidence={'selected_rows':[],'usable_rows':0,'quality':0.0,'delta':0.0,'status':'WITHHELD_TARGET_SURFACE_DISAGREEMENT'}
   current=sum(e['contributions'])+e['trend'];assert 0<=evidence['delta']<=policy['cap_score_points']
   entries.append({'n':e['n'],'name':e['name'],'contributions':e['contributions'],'trend':e['trend'],'current_score':current,'candidate_score':current+evidence['delta'],'evidence':evidence})
  orders={ARMS[0]:[e['n'] for e in sorted(entries,key=lambda e:(-e['current_score'],e['name']))],ARMS[1]:[e['n'] for e in sorted(entries,key=lambda e:(-e['candidate_score'],e['name']))]}
  assert orders[ARMS[0]]==r['baseline_orders']['contender']
  races.append({'key':r['key'],'cohort':r['cohort'],'date':r['date'],'frozen_parent_surface':r['surface'],'target_surface_consistent':surface_consistent,'parent_race_source_sha256':r['source_sha256'],'source_pdf_sha256':c['pdf_sha256'],'pdf_matches_archived_sha256':c['matches_archived_sha256'],**m,'entries':entries,'orders':orders})
 freeze={'classification':policy['classification'],'protocol_sha256':sha(ROOT/'protocol.json'),'parent_sha256':sha(parentpath),'audit_sha256':sha(auditpath),'holdout_files_used':0,'production_changed':False,'races':races}
 (ROOT/'prediction-freeze.json.gz').write_bytes(gzip.compress(json.dumps(freeze,separators=(',',':')).encode(),mtime=0))
 return freeze
def grade():
 freeze=json.loads(gzip.decompress((ROOT/'prediction-freeze.json.gz').read_bytes()));assert freeze['protocol_sha256']==sha(ROOT/'protocol.json')
 review=json.loads((ROOT/'source-review.json').read_text());assert review['prediction_freeze_sha256']==sha(ROOT/'prediction-freeze.json.gz') and review['all_qualifying_rows_visually_checked'] is True
 expected=[{'key':r['key'],'program':e['n'],'name':e['name'],'date':x['date'],'page':x['page'],'y':x['y'],'source_pdf_sha256':r['source_pdf_sha256'],'shape_token':x['shape_candidate_tokens'],'positions':[c['position'] for c in x['calls'].values()],'calls':list(x['calls'].values()),'reason':x['reason']} for r in freeze['races'] for e in r['entries'] if e['evidence']['delta'] for x in e['evidence']['selected_rows'] if x['qualifies']]
 assert review['expected']==expected
 parent=json.loads(gzip.decompress(context.PARENT.read_bytes()));assert sha(context.PARENT)==freeze['parent_sha256'];actuals={r['key']:r['actual'] for r in parent['races']};rows=[]
 for r in freeze['races']:
  a=actuals[r['key']];rows.append({**r,'actual':a,'grades':{arm:metrics(order,a) for arm,order in r['orders'].items()}})
 summary=[]
 for cohort in ['ALL',*sorted({r['cohort'] for r in rows})]:
  rr=[r for r in rows if cohort=='ALL' or r['cohort']==cohort]
  for arm in ARMS:
   gs=[r['grades'][arm] for r in rr];s={'cohort':cohort,'arm':arm,'races':len(rr)}
   for k in ['win','winner4','top4_coverage','exacta','trifecta','superfecta','top4_pairs_correct','underneath_pairs_correct']:s[k]=sum(g[k] for g in gs)
   s['slot_hits']=[sum(g['slot_hits'][i] for g in gs) for i in range(4)];s['mean_top4_rank_error']=sum(g['top4_rank_error'] for g in gs)/len(gs);summary.append(s)
 entries=[e for r in rows for e in r['entries']];selected=[x for e in entries for x in e['evidence']['selected_rows']];rewarded=[x for e in entries if e['evidence']['delta'] for x in e['evidence']['selected_rows'] if x['qualifies']]
 coverage={'races':len(rows),'horses':len(entries),'matched_target_distances':sum(r['distance_furlongs'] is not None for r in rows),'horses_with_two_usable_matched_rows':sum(e['evidence']['status']=='AVAILABLE' for e in entries),'horses_rewarded':sum(e['evidence']['delta']>0 for e in entries),'races_with_rewards':sum(any(e['evidence']['delta']>0 for e in r['entries']) for r in rows),'selected_historical_rows':len(selected),'selected_rows_with_known_flow':sum(x.get('historical_flow','UNKNOWN_NOT_NEUTRAL')!='UNKNOWN_NOT_NEUTRAL' for x in selected),'rewarded_row_occurrences':len(rewarded),'rewarded_types':dict(collections.Counter(x['reason'] for x in rewarded))}
 coverage['unique_rewarded_historical_horse_events']=len({(norm(e['name']),x['date'],x['context']['track']) for r in rows for e in r['entries'] if e['evidence']['delta'] for x in e['evidence']['selected_rows'] if x['qualifies']})
 coverage['target_surface_disagreements']=[{'key':r['key'],'parent_surface':r['frozen_parent_surface'],'parsed_pp_surface':r['surface']} for r in rows if not r['target_surface_consistent']]
 result={'classification':freeze['classification'],'holdout_files_used':0,'production_changed':False,'coverage':coverage,'summary':summary,'paired_comparison':paired(rows,ARMS[1],ARMS[0]),'rows':rows}
 # Keep full historical inputs in the prediction freeze, rather than duplicate them.
 saved={**result,'rows':[{k:v for k,v in r.items() if k!='entries'} for r in rows]}
 (ROOT/'results.json.gz').write_bytes(gzip.compress(json.dumps(saved,separators=(',',':')).encode(),mtime=0));(ROOT/'SUMMARY.json').write_text(json.dumps({k:v for k,v in result.items() if k!='rows'},indent=2)+'\n')
 with (ROOT/'race-comparison.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['race','actual','current','historical_quality','win_delta','pair_delta','rewarded_horses'])
  for r in rows:w.writerow([r['key'],'-'.join(r['actual']),'-'.join(r['orders'][ARMS[0]]),'-'.join(r['orders'][ARMS[1]]),r['grades'][ARMS[1]]['win']-r['grades'][ARMS[0]]['win'],r['grades'][ARMS[1]]['top4_pairs_correct']-r['grades'][ARMS[0]]['top4_pairs_correct'],','.join(e['n'] for e in r['entries'] if e['evidence']['delta']>0)])
 print(json.dumps({k:v for k,v in result.items() if k!='rows'},indent=2))
 return result
if __name__=='__main__':
 if sys.argv[1:] == ['build']:build()
 elif sys.argv[1:] == ['grade']:grade()
 else:raise SystemExit('Use build then visually review qualifying source lines before grade')
