import copy,json,gzip,pathlib,unittest
from setup_diagnostic import diagnose
from build_and_validate import numeric_margin,validate
DATE='2026-10-17'
def horse(n,e,**kw):return dict(source_id=str(n),name=str(n),life_starts=5,early=e,**kw)
def run(field,**kw):return diagnose(field,race_date=DATE,**kw)

class DiagnosticTests(unittest.TestCase):
 def test_uses_gap_not_absolute_95_threshold(self):
  a=run([horse(1,80),horse(2,65),horse(3,60)])
  b=run([horse(1,130),horse(2,115),horse(3,110)])
  self.assertEqual(a['geometry'],'CLEAR_EARLY_RATING_GAP');self.assertEqual(a['geometry'],b['geometry'])
  self.assertEqual(a['top_two_gap'],b['top_two_gap'])
 def test_equal_early_is_not_clear_lead(self):
  x=run([horse(1,90),horse(2,90),horse(3,89)])
  self.assertEqual(x['geometry'],'CLOSE_TOP_EARLY_RATINGS');self.assertEqual(x['highest_early_ids'],['1','2'])
 def test_fts_cannot_become_leader_from_supplied_number(self):
  field=[horse(1,140),horse(2,80)];field[0]['life_starts']=0;x=run(field)
  self.assertEqual(x['geometry'],'INCOMPLETE_EARLY_EVIDENCE');self.assertEqual(x['interpretation'],'UNCERTAIN_MISSING_EARLY');self.assertEqual(x['highest_early_ids'],['2'])
 def test_missing_and_invalid_values_hold(self):
  for v in [None,float('nan'),True,-1]:self.assertEqual(run([horse(1,v),horse(2,80)])['geometry'],'INCOMPLETE_EARLY_EVIDENCE')
 def test_proxy_styles_cannot_certify_duel(self):
  f=[horse(1,100,verified_style='E',style_evidence_status='THRESHOLD_PROXY'),horse(2,99,verified_style='E',style_evidence_status='THRESHOLD_PROXY')]
  self.assertEqual(run(f)['interpretation'],'UNCERTAIN_UNVERIFIED_STYLES')
 def test_verified_prior_styles_can_flag_possible_competition(self):
  kw=dict(verified_style='E',style_evidence_status='REVIEWED_PRIOR_CALLS',reviewed_line_count=2,reviewed_source_ids=['source'],reviewed_prior_dates=['2026-09-01','2026-09-20'])
  self.assertEqual(run([horse(1,100,**kw),horse(2,99,**kw)])['interpretation'],'POSSIBLE_COMPETITIVE_LEAD_SEEKERS')
 def test_target_or_future_style_evidence_rejected(self):
  kw=dict(verified_style='E',style_evidence_status='REVIEWED_PRIOR_CALLS',reviewed_line_count=2,reviewed_source_ids=['source'],reviewed_prior_dates=['2026-09-01',DATE])
  self.assertEqual(run([horse(1,100,**kw),horse(2,99,**kw)])['verified_style_count'],0)
 def test_late_results_and_field_size_do_not_invent_pressure(self):
  f=[horse(1,100),horse(2,85)];before=copy.deepcopy(f);base=run(f)
  for h in f:h.update(late=999,finish=1,stored_style='S')
  self.assertEqual(run(f),base);self.assertEqual(before,[{k:v for k,v in h.items() if k not in ['late','finish','stored_style']} for h in f])
  self.assertEqual(run([horse(0,100)]+[horse(i,90-i*5) for i in range(1,10)])['geometry'],'CLEAR_EARLY_RATING_GAP')
 def test_duplicate_id_and_single_horse(self):
  with self.assertRaises(ValueError):run([horse(1,100),horse(1,90)])
  self.assertEqual(run([horse(1,100)])['geometry'],'INCOMPLETE_EARLY_EVIDENCE')
 def test_cumulative_margins_and_categorical_small_values(self):
  self.assertEqual(numeric_margin('1 1/2'),1.5);self.assertEqual(numeric_margin('3/4'),.75)
  self.assertIsNone(numeric_margin('Head'));self.assertIsNone(numeric_margin('bad'))
 def test_saved_predictions_replay_and_chart_field_identity(self):
  root=pathlib.Path(__file__).parent;x=json.loads(gzip.decompress((root/'prediction-freeze.json.gz').read_bytes()));e=json.loads((root/'evaluation.json').read_text())
  self.assertEqual(len(x['predictions']),141)
  for r in x['predictions']:self.assertEqual(diagnose(r['field'],race_date=r['date']),r['primary'])
  labels={int(k):v for k,v in e['chart_labels'].items()};self.assertEqual(validate(x['predictions'],labels),e['evaluation'])
  self.assertEqual(sum(len(r['entries']) for r in labels.values()),76)
  for rn,r in labels.items():self.assertEqual(sorted(h['first_call_position'] for h in r['entries']),list(range(1,len(r['entries'])+1)))
  self.assertEqual(next(h for h in labels[1]['entries'] if h['program']=='3')['beaten_lengths'],.5)
  self.assertEqual(labels[4]['first_call'],'1/2');self.assertEqual(labels[1]['first_call'],'1/4')

if __name__=='__main__':unittest.main()
