import copy,datetime,json,pathlib,tempfile,unittest,gzip
import confirmation as c
def synthetic_card():
 p=c.policy();now=c.utc(p['registered_at_utc'])+datetime.timedelta(days=1)
 entries=[{'n':str(i),'name':'Synthetic '+str(i),'starts':3,'contributions':[float(6-i)]+[0.0]*18,'trend':0.0} for i in range(1,6)]
 card={'card_id':'SYNTHETIC_NOT_A_REAL_CARD','date':now.date().isoformat(),'track':'BEL','provider':'DRF','data_role':'FUTURE_LIVE_CARD','source_pp_sha256':'0'*64,'source_review_verified':True,'engine_blob_shas':p['engine_blob_shas'],'first_scheduled_off_utc':(now+datetime.timedelta(hours=2)).isoformat(),'races':[{'race':1,'eligibility':'ELIGIBLE','surface':'Dirt','distance_furlongs':6,'identity_verified':True,'conditions_verified':True,'flat_thoroughbred':True,'entries':entries,'production_order':['1','2','3','4','5']}]}
 return card,now
def synthetic_bundle():
 card,now=synthetic_card();freeze=c.freeze_card(card,now);published=(now+datetime.timedelta(minutes=1)).isoformat()
 receipt={'freeze_canonical_sha256':c.digest_bytes(json.dumps(freeze,sort_keys=True,separators=(',',':')).encode()),'independently_verified':True,'url':'synthetic:test-only','published_at_utc':published}
 results=[{'race':1,'verified':True,'source_url':'synthetic:test-only','actual_off_utc':card['first_scheduled_off_utc'],'final_field':['1','2','3','4','5'],'surface':'Dirt','distance_furlongs':6,'top4':['1','2','3','4']}]
 return {'protocol_receipt':{'protocol_sha256':c.digest(c.ROOT/'protocol.json'),'independently_verified':True,'url':'synthetic:test-only','published_at_utc':c.policy()['registered_at_utc']},'registry':{'independently_verified':True,'url':'synthetic:test-only','card_ids':[card['card_id']]},'cards':[{'freeze':freeze,'receipt':receipt,'official_results':results}]}
class ConfirmationTests(unittest.TestCase):
 def test_only_context_removed(self):
  card,_=synthetic_card();entries=card['races'][0]['entries'];entries[0]['contributions'][8]=10;before=copy.deepcopy(entries);out=c.score(entries)
  for j,e in enumerate(entries):
   a=next(x for x in out[c.CONTROL] if x['n']==e['n']);b=next(x for x in out[c.CANDIDATE] if x['n']==e['n']);self.assertEqual(a['score']-b['score'],e['contributions'][8])
  self.assertEqual(entries,before)
 def test_reproduces_selected_development_arm_without_refit(self):
  source=c.ROOT.parent/'contender_context_experiment/prediction-freeze.json.gz'
  if not source.exists():source=c.ROOT.parent/'contender-context-replacement-20261021/prediction-freeze.json.gz'
  data=json.loads(gzip.decompress(source.read_bytes()));expected={r['key']:r for r in data['predictions']};checked=0
  for r in data['inputs']:
   if len(r['entries'])<5:continue
   entries=[{'n':e['n'],'name':e['name'],'starts':e['life_starts'],'contributions':e['contributions'],'trend':e['trend']} for e in r['entries']]
   out=c.score(entries)
   for arm in [c.CONTROL,c.CANDIDATE]:self.assertEqual(out[arm],expected[r['key']]['arms'][arm])
   checked+=1
  self.assertGreater(checked,0)
 def test_freeze_requires_pre_off(self):
  card,now=synthetic_card()
  with self.assertRaises(ValueError):c.freeze_card(card,c.utc(card['first_scheduled_off_utc']))
 def test_holdout_and_historical_rejected(self):
  card,now=synthetic_card();card['data_role']='SEALED_HOLDOUT'
  with self.assertRaises(ValueError):c.freeze_card(card,now)
  card['data_role']='FUTURE_LIVE_CARD';card['date']='2026-10-17'
  with self.assertRaises(ValueError):c.freeze_card(card,now)
 def test_engine_change_rejected(self):
  card,now=synthetic_card();card['engine_blob_shas']={}
  with self.assertRaises(ValueError):c.freeze_card(card,now)
 def test_outcome_contamination_rejected(self):
  card,now=synthetic_card();card['actual']=['1','2','3','4']
  with self.assertRaises(ValueError):c.freeze_card(card,now)
 def test_first_time_missing_and_duplicates_rejected(self):
  card,_=synthetic_card();entries=card['races'][0]['entries']
  for invalid in [0,None]:
   x=copy.deepcopy(entries);x[0]['starts']=invalid
   with self.assertRaises(ValueError):c.score(x)
  x=copy.deepcopy(entries);x[0]['contributions'][2]=float('nan')
  with self.assertRaises(ValueError):c.score(x)
  x=copy.deepcopy(entries);x[1]['n']=x[0]['n']
  with self.assertRaises(ValueError):c.score(x)
 def test_production_parity_required(self):
  card,now=synthetic_card();card['races'][0]['production_order'].reverse()
  with self.assertRaises(ValueError):c.freeze_card(card,now)
 def test_append_only_freeze(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'freeze.json';c.write_new(p,{'first':True})
   with self.assertRaises(FileExistsError):c.write_new(p,{'first':False})
 def test_full_rank_error_penalizes_outsiders(self):
  a=c.grade_order(['5','1','2','3','4'],['1','2','3','4']);self.assertEqual(a['pairs'],6);self.assertEqual(a['rank_error'],1)
 def test_no_interim_comparative_results(self):
  out=c.evaluate(synthetic_bundle());self.assertEqual(out['status'],'AWAITING_FIXED_ENDPOINT');self.assertNotIn('summary',out)
 def test_late_receipt_and_tampering_rejected(self):
  x=synthetic_bundle();x['cards'][0]['receipt']['published_at_utc']=x['cards'][0]['freeze']['card']['first_scheduled_off_utc']
  with self.assertRaises(ValueError):c.evaluate(x)
  x=synthetic_bundle();x['cards'][0]['freeze']['races'][0]['orders'][c.CANDIDATE].reverse()
  with self.assertRaises(ValueError):c.evaluate(x)
 def test_registry_missing_card_rejected(self):
  x=synthetic_bundle();x['registry']['card_ids'].append('MISSING')
  with self.assertRaises(ValueError):c.evaluate(x)
 def test_protocol_must_be_published_before_prediction(self):
  x=synthetic_bundle();x['protocol_receipt']['published_at_utc']=x['cards'][0]['receipt']['published_at_utc']
  with self.assertRaises(ValueError):c.evaluate(x)
 def test_changed_field_requires_explicit_exclusion(self):
  x=synthetic_bundle();x['cards'][0]['official_results'][0]['final_field'].remove('5')
  with self.assertRaises(ValueError):c.evaluate(x)
  x['cards'][0]['official_results'][0]['exclusion_reason']='FIELD_CHANGED';self.assertEqual(len(c.evaluate(x)['exclusions']),1)
 def test_no_change_never_confirmed(self):
  rows=[{'card_id':str(i),'orders':{c.CONTROL:['1','2','3','4','5'],c.CANDIDATE:['1','2','3','4','5']},'grades':{a:c.grade_order(['1','2','3','4','5'],['1','2','3','4']) for a in [c.CONTROL,c.CANDIDATE]}} for i in range(3)]
  self.assertFalse(c.decision(rows,True,100)['confirmed'])
 def test_finish_order_gain_confirmation_and_coverage_guard(self):
  rows=[{'card_id':str(i),'orders':{c.CONTROL:['2','1','3','4','5'],c.CANDIDATE:['1','2','3','4','5']},'grades':{c.CONTROL:c.grade_order(['2','1','3','4','5'],['1','2','3','4']),c.CANDIDATE:c.grade_order(['1','2','3','4','5'],['1','2','3','4'])}} for i in range(3)]
  self.assertTrue(c.decision(rows,True,100)['confirmed'])
  for r in rows:r['grades'][c.CANDIDATE]['coverage']=3
  self.assertFalse(c.decision(rows,True,100)['confirmed'])
if __name__=='__main__':unittest.main()
