"""Research-only pre-race freeze and finishing-order confirmation evaluator.

External receipt/source verification is an explicit human/connector gate, not
inferred from a user-editable timestamp. Never reads PP PDFs or changes a model.
"""
import argparse,collections,datetime,hashlib,json,math,pathlib,random,re
ROOT=pathlib.Path(__file__).resolve().parent
CONTROL='CURRENT_CONTENDER';CANDIDATE='NO_CONTEXT'
def digest_bytes(b):return hashlib.sha256(b).hexdigest()
def digest(path):return digest_bytes(pathlib.Path(path).read_bytes())
def utc(s):
 d=datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
 if d.tzinfo is None:raise ValueError('Timezone required')
 return d.astimezone(datetime.timezone.utc)
def finite(v):return type(v) in [int,float] and math.isfinite(v)
def policy():return json.loads((ROOT/'protocol.json').read_text())
def write_new(path,value):
 # Refuse overwrite: a new freeze must never replace the original local artifact.
 with pathlib.Path(path).open('x') as f:json.dump(value,f,indent=2);f.write('\n')
def score(entries):
 if len(entries)<5:raise ValueError('At least five runners required')
 if len({e['n'] for e in entries})!=len(entries):raise ValueError('Duplicate program')
 if len({e['name'] for e in entries})!=len(entries):raise ValueError('Duplicate name')
 out={CONTROL:[],CANDIDATE:[]}
 for e in entries:
  if not e['n'] or not e['name'] or not finite(e['starts']) or e['starts']<=0:raise ValueError('Unknown identity/experience')
  c=e['contributions'];t=e['trend']
  if len(c)!=19 or not all(finite(x) for x in c) or not finite(t):raise ValueError('Invalid parent contribution vector')
  for arm,s in [(CONTROL,sum(c)+t),(CANDIDATE,sum(v for j,v in enumerate(c) if j!=8)+t)]:out[arm].append({'n':e['n'],'name':e['name'],'score':s})
 for values in out.values():values.sort(key=lambda x:(-x['score'],x['name'].encode('utf-16-be')))
 return out
def freeze_card(card,now=None):
 p=policy();now=now or datetime.datetime.now(datetime.timezone.utc)
 if set(card)!={'card_id','date','track','provider','data_role','source_pp_sha256','source_review_verified','engine_blob_shas','first_scheduled_off_utc','races'}:raise ValueError('Unexpected card keys, including possible outcome contamination')
 if card['data_role']!='FUTURE_LIVE_CARD' or card['provider']!='DRF' or card['track'] not in p['eligibility']['tracks']:raise ValueError('Not eligible prospective source')
 if card['source_review_verified'] is not True or not re.fullmatch('[0-9a-f]{64}',card['source_pp_sha256']):raise ValueError('Unverified source')
 if card['engine_blob_shas']!=p['engine_blob_shas']:raise ValueError('Engine differs from frozen control')
 if card['date']<utc(p['registered_at_utc']).date().isoformat():raise ValueError('Historical cards not prospective')
 if not utc(p['registered_at_utc'])<=now<utc(card['first_scheduled_off_utc']):raise ValueError('Freeze must follow registration and precede first scheduled off')
 if len({r['race'] for r in card['races']})!=len(card['races']) or not card['races']:raise ValueError('Missing or duplicate race registration')
 races=[]
 for r in card['races']:
  if r['eligibility']!='ELIGIBLE':
   if not r.get('exclusion_reason'):raise ValueError('Every excluded race needs a pre-race reason')
   races.append({'race':r['race'],'eligibility':'EXCLUDED_PRE_RACE','exclusion_reason':r['exclusion_reason']});continue
  if set(r)!={'race','eligibility','surface','distance_furlongs','identity_verified','conditions_verified','flat_thoroughbred','entries','production_order'}:raise ValueError('Unexpected eligible-race fields')
  if not all(r[k] is True for k in ['identity_verified','conditions_verified','flat_thoroughbred']):raise ValueError('Identity/conditions unresolved')
  if r['surface'] not in ['Dirt','Turf','Synth'] or not finite(r['distance_furlongs']) or r['distance_furlongs']<=0:raise ValueError('Invalid target context')
  if any(set(e)!={'n','name','starts','contributions','trend'} for e in r['entries']):raise ValueError('Unexpected runner data')
  scores=score(r['entries']);orders={a:[e['n'] for e in values] for a,values in scores.items()}
  if orders[CONTROL]!=r['production_order']:raise ValueError('Current order fails production parity')
  races.append({**r,'scores':scores,'orders':orders})
 return {'protocol_id':p['id'],'protocol_sha256':digest(ROOT/'protocol.json'),'created_at_utc':now.isoformat(),'card':{k:v for k,v in card.items() if k!='races'},'races':races,'holdout_files_used':0,'production_changed':False}
def grade_order(order,actual):
 if len(actual)!=4 or len(set(actual))!=4 or not set(actual)<=set(order):raise ValueError('Require unambiguous official first four in frozen field')
 rank={n:i+1 for i,n in enumerate(order)}
 return {'rank_error':sum(abs(rank[n]-(i+1)) for i,n in enumerate(actual))/4,'pairs':sum(rank[actual[i]]<rank[actual[j]] for i in range(4) for j in range(i+1,4)),'underneath_pairs':sum(rank[actual[i]]<rank[actual[j]] for i in range(1,4) for j in range(i+1,4)),'coverage':len(set(order[:4])&set(actual)),'winner4':int(actual[0] in order[:4]),'exacta':int(order[:2]==actual[:2]),'trifecta':int(order[:3]==actual[:3]),'superfecta':int(order[:4]==actual),'winner':int(order[0]==actual[0]),'slots':[int(order[i]==actual[i]) for i in range(4)]}
def aggregate(rows):
 out={}
 for arm in [CONTROL,CANDIDATE]:
  gs=[r['grades'][arm] for r in rows]
  out[arm]={'races':len(rows),'rank_error':sum(g['rank_error'] for g in gs)/len(gs),'slots':[sum(g['slots'][i] for g in gs) for i in range(4)],**{k:sum(g[k] for g in gs) for k in ['pairs','underneath_pairs','coverage','winner4','exacta','trifecta','superfecta','winner']}}
 return out
def decision(rows,minima_met,replicates=None):
 p=policy()
 if not rows:return {'status':'AWAITING_PROSPECTIVE_DATA','confirmed':False,'graded_races':0}
 if not minima_met:return {'status':'AWAITING_FIXED_ENDPOINT','confirmed':False,'graded_races':len(rows),'comparative_metrics_withheld':True}
 cards=collections.defaultdict(list)
 for r in rows:cards[r['card_id']].append(r)
 summary=aggregate(rows)
 n=replicates or p['uncertainty']['replicates'];rng=random.Random(p['uncertainty']['seed']);keys=sorted(cards);deltas=[]
 for _ in range(n):
  sample=[r for k in rng.choices(keys,k=len(keys)) for r in cards[k]]
  deltas.append(sum(r['grades'][CANDIDATE]['rank_error']-r['grades'][CONTROL]['rank_error'] for r in sample)/len(sample))
 deltas.sort();interval=[deltas[int(n*.025)],deltas[int(n*.975)-1]];diff=summary[CANDIDATE]['rank_error']-summary[CONTROL]['rank_error']
 gates={k:summary[CANDIDATE][k]>=summary[CONTROL][k] for k in ['pairs','superfecta','coverage','winner4']}
 confirmed=diff<0 and interval[1]<0 and all(gates.values())
 return {'status':'CONFIRMED_FOR_REVIEW_ONLY' if confirmed else 'NOT_CONFIRMED','confirmed':confirmed,'production_changed':False,'summary':summary,'primary_difference':diff,'paired_card_bootstrap_95':interval,'safeguards':gates,'changed_orders':sum(r['orders'][CONTROL]!=r['orders'][CANDIDATE] for r in rows)}
def evaluate(bundle):
 """Bundle contains EVERY registered card, complete official results, and verified receipts.

 Caller must independently verify receipt publication and official-result provenance;
 this tool validates consistency, not remote signatures or unprovided source bytes.
 """
 p=policy();rows=[];exclusions=[];seen=set();endpoint=False
 prereg=bundle['protocol_receipt']
 if prereg['protocol_sha256']!=digest(ROOT/'protocol.json') or prereg['independently_verified'] is not True or not prereg['url']:raise ValueError('Protocol publication not independently verified')
 prereg_time=utc(prereg['published_at_utc'])
 if prereg_time<utc(p['registered_at_utc']):raise ValueError('Protocol receipt predates registration')
 registry=bundle['registry']
 if registry['independently_verified'] is not True or not registry['url']:raise ValueError('Unverified all-card registry')
 if sorted(registry['card_ids'])!=sorted(x['freeze']['card']['card_id'] for x in bundle['cards']):raise ValueError('Registered card omitted or unregistered card added')
 cards=sorted(bundle['cards'],key=lambda b:(b['freeze']['card']['date'],utc(b['freeze']['card']['first_scheduled_off_utc']),b['freeze']['card']['card_id']))
 for item in cards:
  f=item['freeze'];card=f['card'];cid=card['card_id'];receipt=item['receipt']
  if cid in seen:raise ValueError('Duplicate card')
  if endpoint:raise ValueError('Bundle includes cards beyond fixed endpoint')
  seen.add(cid)
  if prereg_time>utc(f['created_at_utc']):raise ValueError('Prediction predates public protocol registration')
  if f['protocol_sha256']!=digest(ROOT/'protocol.json') or f['protocol_id']!=p['id']:raise ValueError('Protocol changed')
  rebuilt=freeze_card({**card,'races':[{k:v for k,v in r.items() if k not in ['scores','orders']} if r['eligibility']=='ELIGIBLE' else {'race':r['race'],'eligibility':'EXCLUDED','exclusion_reason':r['exclusion_reason']} for r in f['races']]},utc(f['created_at_utc']))
  if rebuilt!=f:raise ValueError('Freeze fails independent score replay')
  canonical=json.dumps(f,sort_keys=True,separators=(',',':')).encode()
  if receipt['freeze_canonical_sha256']!=digest_bytes(canonical) or receipt['independently_verified'] is not True or not receipt['url']:raise ValueError('Unverified receipt')
  published=utc(receipt['published_at_utc'])
  if not utc(f['created_at_utc'])<=published<utc(card['first_scheduled_off_utc']):raise ValueError('Receipt not pre-off')
  labels={r['race']:r for r in item['official_results']}
  if len(labels)!=len(item['official_results']) or set(labels)!={r['race'] for r in f['races']}:raise ValueError('Missing or duplicate official race disposition')
  for r in f['races']:
   label=labels[r['race']]
   if label['verified'] is not True or not label['source_url']:raise ValueError('Unverified official result')
   if r['eligibility']!='ELIGIBLE':continue
   if published>=utc(label['actual_off_utc']):raise ValueError('Not frozen before actual off')
   if label.get('exclusion_reason'):
    if label['exclusion_reason'] not in ['CANCELLED','FIELD_CHANGED','SURFACE_CHANGED','DISTANCE_CHANGED','AMBIGUOUS_TOP_FOUR']:raise ValueError('Unregistered post-race exclusion')
    exclusions.append({'card_id':cid,'race':r['race'],'reason':label['exclusion_reason']});continue
   if len(label['final_field'])!=len(set(label['final_field'])) or set(label['final_field'])!=set(r['orders'][CONTROL]) or label['surface']!=r['surface'] or label['distance_furlongs']!=r['distance_furlongs']:raise ValueError('Field/context changed; explicit exclusion required')
   rows.append({'card_id':cid,'race':r['race'],'surface':r['surface'],'field_size':len(r['entries']),'orders':r['orders'],'actual':label['top4'],'grades':{a:grade_order(r['orders'][a],label['top4']) for a in [CONTROL,CANDIDATE]}})
  contributing_cards=len({r['card_id'] for r in rows})
  endpoint=len(rows)>=p['endpoint']['minimum_eligible_races'] and contributing_cards>=p['endpoint']['minimum_independent_cards']
 result=decision(rows,endpoint);result.update(registered_cards=len(cards),contributing_cards=len({r['card_id'] for r in rows}),exclusions=exclusions,holdout_files_used=0)
 if endpoint:
  result['race_details']=rows
  strata=collections.defaultdict(list)
  for r in rows:
   strata['field_5_7' if r['field_size']<=7 else 'field_8_plus'].append(r);strata['surface_'+r['surface']].append(r)
  result['descriptive_breakdowns_no_subgroup_selection']={k:aggregate(v) for k,v in strata.items()}
 return result
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('action',choices=['freeze','evaluate']);parser.add_argument('input');parser.add_argument('output');args=parser.parse_args();data=json.loads(pathlib.Path(args.input).read_text())
 out=freeze_card(data) if args.action=='freeze' else evaluate(data)
 write_new(args.output,out)
