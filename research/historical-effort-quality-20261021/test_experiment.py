import copy,gzip,json,pathlib,unittest
import experiment as ex
ROOT=pathlib.Path(__file__).resolve().parent
P=json.loads((ROOT/'protocol.json').read_text())
def call(pos,margin=None,label=None):return {'position':pos,'numeric_margin':margin,'margin_label':label}
def row(shape='C',positions=(2,2,2,2,2),margins=(None,1,1,1,1),date='2026-05-01',raw=None):
 return {'date':date,'raw':raw or '1Ü26=2Aqu fst 6f C 22 :45','field_size':7,'shape_candidate_tokens':[shape] if shape else [],'calls':dict(zip(['raw_slot_1','raw_slot_2','raw_slot_3','stretch','finish'],[call(p,m) for p,m in zip(positions,margins)]))}
class HistoricalEffortTests(unittest.TestCase):
 def test_early_resilience(self):self.assertTrue(ex.qualify(row(),P)['qualifies'])
 def test_late_against_flow(self):self.assertTrue(ex.qualify(row('S',(5,5,5,4,2),(None,5,6,4,1)),P)['qualifies'])
 def test_advantaged_closer_not_rewarded(self):self.assertFalse(ex.qualify(row('C',(5,5,5,4,2),(None,5,6,4,1)),P)['qualifies'])
 def test_advantaged_early_not_rewarded(self):self.assertFalse(ex.qualify(row('S'),P)['qualifies'])
 def test_unknown_flow_not_neutral(self):
  x=ex.qualify(row(None),P);self.assertFalse(x['qualifies']);self.assertEqual(x['historical_flow'],'UNKNOWN_NOT_NEUTRAL')
 def test_finish_far_behind_rejected(self):self.assertFalse(ex.qualify(row(margins=(None,1,1,1,8)),P)['qualifies'])
 def test_winner_lead_not_beaten_margin(self):
  r=row(positions=(1,1,1,1,1),margins=(1,2,4,6,9));self.assertTrue(ex.qualify(r,P)['qualifies']);self.assertEqual(ex.beaten(list(r['calls'].values())[-1]),0)
 def test_head_neck_bounds_no_invented_lengths(self):
  r=row();r['calls']['finish']=call(2,None,'NECK');self.assertTrue(ex.qualify(r,P)['qualifies']);self.assertIsNone(ex.beaten(r['calls']['finish']))
 def test_unverified_small_margin_withheld(self):
  r=row();r['calls']['finish']=call(2,None,'SMALL_MARGIN_UNVERIFIED');self.assertFalse(ex.qualify(r,P)['qualifies'])
 def test_missing_calls_rejected(self):
  r=row();r['calls']=None;self.assertFalse(ex.qualify(r,P)['usable'])
 def test_no_future_same_day_or_old_lines(self):
  rs=[row(date='2026-06-01'),row(date='2026-06-02'),row(date='2024-01-01')];self.assertEqual(ex.horse_evidence(rs,'2026-06-01','Dirt',6,P)['selected_rows'],[])
 def test_strict_surface_distance(self):
  rs=[row()];self.assertEqual(ex.horse_evidence(rs,'2026-06-01','Turf',6,P)['selected_rows'],[]);self.assertEqual(ex.horse_evidence(rs,'2026-06-01','Dirt',7,P)['selected_rows'],[])
 def test_insufficient_history_neutral(self):self.assertEqual(ex.horse_evidence([row()],'2026-06-01','Dirt',6,P)['delta'],0)
 def test_weights_missing_not_rescaled(self):
  rs=[row(date='2026-05-01'),row(None,date='2026-04-01')];x=ex.horse_evidence(rs,'2026-06-01','Dirt',6,P);self.assertEqual(x['delta'],.025)
 def test_do_not_replace_bad_selected_line(self):
  rs=[row(date='2026-05-01'),row(date='2026-04-01'),row(date='2026-03-01'),row(date='2026-02-01')];rs[0]['calls']=None;rs[1]['calls']=None;self.assertEqual(ex.horse_evidence(rs,'2026-06-01','Dirt',6,P)['delta'],0)
 def test_surface_distance_decoding(self):
  self.assertEqual(ex.numeric_distance('1Â MILES'),8.5);self.assertEqual(ex.numeric_distance('6ô Furlongs'),6.5);self.assertEqual(ex.historical_context('1Ü26=2Aqu fm 1 Ñ C 23 :46')['surface'],'Turf');self.assertIsNone(ex.historical_context('1Ü26=2GP fst 6f 22 :45'))
 def test_all_frozen_predictions_and_context_unchanged(self):
  f=json.loads(gzip.decompress((ROOT/'prediction-freeze.json.gz').read_bytes()));parent=json.loads(gzip.decompress(ex.context.PARENT.read_bytes()));by={r['key']:r for r in parent['races']};self.assertEqual(len(f['races']),124)
  for r in f['races']:
   original={e['n']:e for e in by[r['key']]['contender_entries']};self.assertEqual(r['orders'][ex.ARMS[0]],by[r['key']]['baseline_orders']['contender'])
   for e in r['entries']:
    self.assertEqual(e['contributions'],original[e['n']]['contributions']);self.assertEqual(e['trend'],original[e['n']]['trend']);self.assertAlmostEqual(e['candidate_score']-e['current_score'],e['evidence']['delta']);self.assertLessEqual(e['evidence']['delta'],.05)
    if not r['target_surface_consistent']:self.assertEqual(e['evidence']['delta'],0)
    ev=e['evidence']
    if ev['status']!='WITHHELD_TARGET_SURFACE_DISAGREEMENT':
     replay=ex.horse_evidence(ev['selected_rows'],r['date'],r['surface'],r['distance_furlongs'],P);self.assertEqual(replay,ev)
 def test_all_recorded_metrics(self):
  data=json.loads(gzip.decompress((ROOT/'results.json.gz').read_bytes()))
  for r in data['rows']:
   for arm in ex.ARMS:self.assertEqual(ex.metrics(r['orders'][arm],r['actual']),r['grades'][arm])
  self.assertEqual(data['paired_comparison']['changed_orders'],sum(r['orders'][ex.ARMS[0]]!=r['orders'][ex.ARMS[1]] for r in data['rows']))
if __name__=='__main__':unittest.main()
