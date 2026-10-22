"""One fixed DRF research candidate. No production imports, fitting, or PP access."""
import collections,copy,gzip,hashlib,json,math,pathlib,random
ROOT=pathlib.Path(__file__).resolve().parent
ARMS=['CURRENT_CONTENDER','NO_CONTEXT','BOUNDED_REPLACEMENT']
PARENT=ROOT/'parent-feature-freeze.json.gz'
if not PARENT.exists():PARENT=ROOT.parent/'drf-pace-comparison-20261021/feature-freeze.json.gz'
EXPECTED_PARENT_SHA='cebad325ea7bf29dad440d2c051230013bc0a0251eb60e8f6999600b4ae6f801'
def finite(x):return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)
def centered(value,observed):
 if not finite(value) or len(observed)<=1 or len(set(observed))<=1:return 0.0
 return 2*(sum(x<value for x in observed)+.5*(sum(x==value for x in observed)-1))/(len(observed)-1)-1

def score_field(entries,policy):
 """Input contains only identifiers, current contributions, raw Early/Late and starts."""
 assert len({e['n'] for e in entries})==len(entries)>1
 before=copy.deepcopy(entries);cap=policy['cap'];valid=all(finite(e['early']) and e['early']>=0 and finite(e['life_starts']) and e['life_starts']>0 for e in entries)
 ordered=sorted(entries,key=lambda e:(-e['early'],e['name'])) if valid else []
 gap=ordered[0]['early']-ordered[1]['early'] if valid else None
 cluster=sum(ordered[0]['early']-e['early']<=policy['early_cluster_band'] for e in ordered) if valid else None
 pressure=(cluster-1)/(len(entries)-1) if valid and gap<=policy['early_cluster_band'] else 0.0
 clear=min(1,gap/policy['clear_strength_saturation_gap']) if valid and gap>=policy['clear_early_gap'] else 0.0
 assert not (pressure and clear)
 lates=[e['late'] for e in entries if finite(e['late'])]
 outputs={a:[] for a in ARMS};deltas=[]
 for e in entries:
  current=sum(e['contributions'])+e['trend']
  no_context=sum(v for j,v in enumerate(e['contributions']) if j!=8)+e['trend']
  delta=cap*pressure*centered(e['late'],lates)+cap*clear*int(valid and e['n']==ordered[0]['n'])
  assert abs(delta)<=cap+1e-12
  deltas.append({'n':e['n'],'old_context':e['contributions'][8],'replacement':delta,'centered_late':centered(e['late'],lates)})
  for arm,score in zip(ARMS,[current,no_context,no_context+delta]):outputs[arm].append({'n':e['n'],'name':e['name'],'score':score})
 for values in outputs.values():values.sort(key=lambda e:(-e['score'],e['name']))
 assert entries==before
 return {'setup':{'all_early_verified':valid,'top_two_gap':gap,'front_cluster_count':cluster,'pressure_proxy':pressure,'clear_lead_proxy':clear,'type':'WITHHELD_MISSING_EARLY_OR_FTS' if not valid else 'PRESSURE_PROXY' if pressure else 'EARLY_ADVANTAGE_PROXY' if clear else 'NO_CONTEXT_TRIGGER','support':'SUMMARY_RATINGS_PROXY_NOT_VERIFIED_STYLE_OR_TEMPO'},'deltas':deltas,'arms':outputs}

def metrics(order,actual):
 rank={n:i+1 for i,n in enumerate(order)};assert all(n in rank for n in actual)
 pairs=sum(rank[actual[i]]<rank[actual[j]] for i in range(4) for j in range(i+1,4))
 under=sum(rank[actual[i]]<rank[actual[j]] for i in range(1,4) for j in range(i+1,4))
 return {'win':int(order[0]==actual[0]),'winner4':int(actual[0] in order[:4]),'top4_coverage':len(set(order[:4])&set(actual)),'exacta':int(order[:2]==actual[:2]),'trifecta':int(order[:3]==actual[:3]),'superfecta':int(order[:4]==actual),'slot_hits':[int(order[i]==actual[i]) for i in range(4)],'top4_pairs_correct':pairs,'underneath_pairs_correct':under,'top4_rank_error':sum(abs(rank[n]-(i+1)) for i,n in enumerate(actual))/4}

def summarize(rows):
 out=[]
 for cohort in ['ALL',*sorted({r['cohort'] for r in rows})]:
  rr=[r for r in rows if cohort=='ALL' or r['cohort']==cohort]
  for arm in ARMS:
   gs=[r['grades'][arm] for r in rr];n=len(gs)
   s={'cohort':cohort,'arm':arm,'races':n}
   for k in ['win','winner4','top4_coverage','exacta','trifecta','superfecta','top4_pairs_correct','underneath_pairs_correct']:s[k]=sum(g[k] for g in gs)
   s.update(slot_hits=[sum(g['slot_hits'][i] for g in gs) for i in range(4)],top4_pairs_possible=n*6,underneath_pairs_possible=n*3,mean_top4_rank_error=sum(g['top4_rank_error'] for g in gs)/n)
   out.append(s)
 return out

def paired(rows,arm,control,seed=20261021,replicates=5000):
 cards=collections.defaultdict(list)
 for r in rows:cards[r['key'].split('_R')[0]].append(r)
 rng=random.Random(seed);keys=sorted(cards);samples={'pair_accuracy':[],'winner_rate':[]}
 for _ in range(replicates):
  rr=[r for k in rng.choices(keys,k=len(keys)) for r in cards[k]]
  samples['pair_accuracy'].append(sum(r['grades'][arm]['top4_pairs_correct']-r['grades'][control]['top4_pairs_correct'] for r in rr)/(6*len(rr)))
  samples['winner_rate'].append(sum(r['grades'][arm]['win']-r['grades'][control]['win'] for r in rr)/len(rr))
 intervals={}
 for k,values in samples.items():values.sort();intervals[k]=[values[int(replicates*.025)],values[int(replicates*.975)-1]]
 return {'arm':arm,'control':control,'races':len(rows),'cards':len(cards),'changed_orders':sum(r['orders'][arm]!=r['orders'][control] for r in rows),'wins_gained':sum(r['grades'][arm]['win'] and not r['grades'][control]['win'] for r in rows),'wins_lost':sum(not r['grades'][arm]['win'] and r['grades'][control]['win'] for r in rows),'better_top4_pair_order':sum(r['grades'][arm]['top4_pairs_correct']>r['grades'][control]['top4_pairs_correct'] for r in rows),'worse_top4_pair_order':sum(r['grades'][arm]['top4_pairs_correct']<r['grades'][control]['top4_pairs_correct'] for r in rows),'descriptive_card_bootstrap_95':intervals,'replicates':replicates,'seed':seed}

def run():
 policy=json.loads((ROOT/'protocol.json').read_text());parent_bytes=PARENT.read_bytes();assert hashlib.sha256(parent_bytes).hexdigest()==EXPECTED_PARENT_SHA;parent=json.loads(gzip.decompress(parent_bytes));assert parent['holdout_files_used']==0;assert len(parent['races'])==124
 setup_path=ROOT.parent/'drf_setup_diagnostic/prediction-freeze.json.gz'
 if not setup_path.exists():setup_path=ROOT.parent/'drf-setup-diagnostic-20261021/prediction-freeze.json.gz'
 setup=json.loads(gzip.decompress(setup_path.read_bytes()));by_key={r['key']:r for r in setup['predictions']}
 predictions=[];inputs=[]
 for r in parent['races']:
  assert by_key[r['key']]['program_identity_complete'];field={h['program']:h for h in by_key[r['key']]['field']}
  assert set(field)==set(r['actual_field']);entries=[]
  for e in r['contender_entries']:
   h=field[e['n']];assert h['name']==e['name'];assert h['early']==e['raw'][6]
   entries.append({'n':e['n'],'name':e['name'],'early':e['raw'][6],'late':e['raw'][7],'life_starts':h['life_starts'],'contributions':e['contributions'],'trend':e['trend']})
  out=score_field(entries,policy);assert [h['n'] for h in out['arms'][ARMS[0]]]==r['baseline_orders']['contender']
  predictions.append({'key':r['key'],'cohort':r['cohort'],'date':r['date'],'surface':r['surface'],**out});inputs.append({'key':r['key'],'entries':entries})
 freeze={'classification':policy['classification'],'protocol_sha256':hashlib.sha256((ROOT/'protocol.json').read_bytes()).hexdigest(),'parent_sha256':hashlib.sha256(parent_bytes).hexdigest(),'setup_source_sha256':hashlib.sha256(setup_path.read_bytes()).hexdigest(),'holdout_files_used':0,'inputs':inputs,'predictions':predictions}
 (ROOT/'prediction-freeze.json.gz').write_bytes(gzip.compress(json.dumps(freeze,separators=(',',':')).encode(),mtime=0))
 # Actuals are joined only after predictions are persisted.
 actuals={r['key']:r['actual'] for r in parent['races']};rows=[]
 for r in predictions:
  orders={arm:[h['n'] for h in r['arms'][arm]] for arm in ARMS}
  rows.append({'key':r['key'],'cohort':r['cohort'],'date':r['date'],'surface':r['surface'],'setup':r['setup'],'deltas':r['deltas'],'orders':orders,'actual':actuals[r['key']],'grades':{arm:metrics(order,actuals[r['key']]) for arm,order in orders.items()}})
 comparisons=[paired(rows,ARMS[1],ARMS[0]),paired(rows,ARMS[2],ARMS[0]),paired(rows,ARMS[2],ARMS[1])]
 result={'classification':policy['classification'],'holdout_files_used':0,'live_rule_changed':False,'summary':summarize(rows),'paired_comparisons':comparisons,'trigger_counts':dict(collections.Counter(r['setup']['type'] for r in rows)),'races_with_nonzero_replacement':sum(any(abs(h['replacement'])>0 for h in r['deltas']) for r in rows),'rows':rows}
 (ROOT/'results.json.gz').write_bytes(gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0));(ROOT/'SUMMARY.json').write_text(json.dumps({k:v for k,v in result.items() if k!='rows'},indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k not in ['rows','summary']},indent=2));print(json.dumps([r for r in result['summary'] if r['cohort']=='ALL'],indent=2))
 return result

if __name__=='__main__':run()
