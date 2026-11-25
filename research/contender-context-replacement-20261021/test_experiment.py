import copy,gzip,json,pathlib,unittest
from experiment import ARMS,PARENT,centered,score_field,metrics,summarize
ROOT=pathlib.Path(__file__).parent
POLICY=json.loads((ROOT/'protocol.json').read_text())
def entry(n,early,late,life=5):return {'n':str(n),'name':'Horse '+str(n),'early':early,'late':late,'life_starts':life,'contributions':[.01]*19,'trend':.03}

class ContextTests(unittest.TestCase):
 def test_removes_only_context_before_replacement(self):
  field=[entry(1,100,80),entry(2,90,70)];x=score_field(field,POLICY)
  for e in field:
   a=next(r for r in x['arms'][ARMS[0]] if r['n']==e['n']);b=next(r for r in x['arms'][ARMS[1]] if r['n']==e['n'])
   self.assertAlmostEqual(a['score']-b['score'],e['contributions'][8])
 def test_pressure_rewards_relative_late_and_respects_cap(self):
  x=score_field([entry(1,100,60),entry(2,99,90),entry(3,98,75)],POLICY)
  d={r['n']:r['replacement'] for r in x['deltas']};self.assertAlmostEqual(d['1'],-.05);self.assertAlmostEqual(d['2'],.05);self.assertEqual(d['3'],0)
  self.assertEqual(x['setup']['clear_lead_proxy'],0)
 def test_clear_advantage_only_rewards_unique_fastest(self):
  x=score_field([entry(1,110,60),entry(2,90,90),entry(3,85,80)],POLICY)
  self.assertEqual(x['setup']['pressure_proxy'],0);self.assertEqual([r['replacement'] for r in x['deltas']],[.05,0,0])
 def test_intermediate_setup_has_no_adjustment(self):
  x=score_field([entry(1,100,60),entry(2,93,90)],POLICY)
  self.assertEqual(x['setup']['type'],'NO_CONTEXT_TRIGGER');self.assertTrue(all(r['replacement']==0 for r in x['deltas']))
 def test_fts_or_unknown_field_early_withholds_all(self):
  for field in [[entry(1,140,100,life=0),entry(2,80,60)],[entry(1,None,100),entry(2,80,60)]]:
   x=score_field(field,POLICY);self.assertEqual(x['setup']['type'],'WITHHELD_MISSING_EARLY_OR_FTS');self.assertTrue(all(r['replacement']==0 for r in x['deltas']));self.assertEqual(x['arms'][ARMS[1]],x['arms'][ARMS[2]])
 def test_missing_late_is_neutral_not_zero_figure(self):
  x=score_field([entry(1,100,None),entry(2,100,90),entry(3,100,60)],POLICY)
  self.assertEqual(x['deltas'][0]['replacement'],0);self.assertEqual(centered(None,[90,60]),0)
 def test_equal_late_does_not_generate_pressure_score(self):
  x=score_field([entry(1,100,80),entry(2,99,80)],POLICY)
  self.assertTrue(x['setup']['pressure_proxy']>0);self.assertTrue(all(r['replacement']==0 for r in x['deltas']))
 def test_field_size_alone_does_not_create_pressure(self):
  f=[entry(i,140-i*10,80) for i in range(10)];x=score_field(f,POLICY);self.assertEqual(x['setup']['pressure_proxy'],0)
 def test_sources_are_immutable_and_extra_outcomes_do_not_affect_scores(self):
  f=[entry(1,100,80),entry(2,97,90)];before=copy.deepcopy(f);x=score_field(f,POLICY);self.assertEqual(f,before)
  for h in f:h['actual_finish']=1;h['stored_style']='S'
  self.assertEqual(score_field(f,POLICY),x)
 def test_ties_use_same_parent_name_order(self):
  f=[entry(2,100,80),entry(1,100,80)];x=score_field(f,POLICY)
  for arm in ARMS:self.assertEqual([h['n'] for h in x['arms'][arm]],['1','2'])
 def test_saved_ranking_replay_and_complete_coverage(self):
  f=json.loads(gzip.decompress((ROOT/'prediction-freeze.json.gz').read_bytes()));r=json.loads(gzip.decompress((ROOT/'results.json.gz').read_bytes()));parent=json.loads(gzip.decompress(PARENT.read_bytes()));pb={r['key']:r for r in parent['races']}
  self.assertEqual(len(f['inputs']),124);self.assertEqual(f['holdout_files_used'],0)
  for inp,pred,row in zip(f['inputs'],f['predictions'],r['rows']):
   out=score_field(inp['entries'],POLICY)
   for k in ['setup','deltas','arms']:self.assertEqual(out[k],pred[k])
   self.assertEqual(row['orders'][ARMS[0]],pb[row['key']]['baseline_orders']['contender'])
   for arm in ARMS:self.assertEqual(row['grades'][arm],metrics(row['orders'][arm],row['actual']));self.assertEqual(set(row['orders'][arm]),set(pb[row['key']]['actual_field']))
   for d in out['deltas']:self.assertLessEqual(abs(d['replacement']),.05)
  self.assertEqual(summarize(r['rows']),r['summary'])
 def test_pair_metric_counts_six_actual_top4_pairs(self):
  x=metrics(['2','1','3','4','5'],['1','2','3','4']);self.assertEqual(x['top4_pairs_correct'],5);self.assertEqual(x['underneath_pairs_correct'],3)

if __name__=='__main__':unittest.main()
