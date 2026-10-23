import collections,gzip,hashlib,json,pathlib,re,unittest
import grade as g
ROOT=pathlib.Path(__file__).resolve().parent
def load_gz(name):return json.loads(gzip.decompress((ROOT/name).read_bytes()))
class ReleasedCardTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.f=load_gz('final-prediction-freeze.json.gz');cls.rs=[r for r in cls.f['races'] if 'orders' in r];cls.result=load_gz('results.json.gz');cls.s=cls.result['summary'];cls.official=g.read_json(ROOT/'official-results.json')
 def test_exact_authorized_card_scope(self):
  m=json.loads((ROOT/'source-manifest.json').read_text());self.assertEqual(len(m),20);self.assertTrue(all(x['file'].startswith('AQU--') for x in m));self.assertEqual(len({x['sha256'] for x in m}),20)
 def test_complete_dispositions(self):
  self.assertEqual(len(self.f['races']),169);self.assertEqual(len(self.rs),156);self.assertEqual(sum(x['status']=='CANCELLED_OFFICIALLY' for x in self.official.values()),13);self.assertEqual(json.loads((ROOT/'pending-results.json').read_text()),[])
 def test_cancelled_races_never_graded(self):
  self.assertEqual(len(self.result['rows']),156)
  for r in self.result['rows']:self.assertEqual(self.official[r['key']]['status'],'VERIFIED_COMPLETE_FIELD_AND_TOP4')
 def test_full_program_and_name_dispositions(self):
  for r in self.rs:
   o=self.official[r['key']];self.assertEqual(set(r['source_programs']),{h['n'] for h in o['final_field']});self.assertFalse(set(r['source_programs'])&{h['n'] for h in o['scratches']})
 def test_all_source_audit_checks(self):
  rows=g.read_json(ROOT/'source-audit.json');self.assertEqual(len(rows),1240);self.assertFalse(any(x['issues'] for x in rows));self.assertEqual(sum(len(x['recent_three_beyer_column_checks']) for x in rows),3051)
 def test_context_only_removal_and_sort(self):
  for r in self.rs:
   for e in r['feature_entries']:
    self.assertEqual(len(e['contributions']),19);self.assertAlmostEqual(e['score'],sum(e['contributions'])+e['trend']);self.assertAlmostEqual(e['no_context_score'],sum(v for j,v in enumerate(e['contributions']) if j!=8)+e['trend'])
   for arm,key in [('CURRENT_CONTENDER','score'),('NO_CONTEXT','no_context_score')]:self.assertEqual(r['orders'][arm],[e['n'] for e in sorted(r['feature_entries'],key=lambda e:(-e[key],e['name']))])
 def test_no_result_inputs_in_freeze(self):
  for r in self.rs:self.assertNotIn('actual',r);self.assertNotIn('grades',r)
 def test_morning_line_uses_source_fraction_and_program_tie(self):
  for r in self.rs:
   for h in r['morning_lines']:
    a,b=h['ml'].split('/');self.assertAlmostEqual(h['value'],float(a)/float(b))
   order=sorted(r['morning_lines'],key=lambda h:(h['value'],int(re.match(r'\d+',h['n'])[0]),h['n']));self.assertEqual(r['orders']['MORNING_LINE'],[h['n'] for h in order])
 def test_short_histories_excluded(self):
  excluded=[h for r in self.rs for h in r['histories'] if h.get('reason')=='FEWER_THAN_THREE_PRIOR_RACES'];self.assertEqual(len(excluded),147);self.assertTrue(all(h['life_starts']<3 and not h['eligible'] for h in excluded))
 def test_exact_three_certified_figures(self):
  for r in self.rs:
   for h in r['histories']:
    if not h['eligible']:continue
    self.assertEqual(len(h['beyers']),3);self.assertEqual(len(h['proof']),3);self.assertTrue(all(d<r['date'] for d in h['dates']));self.assertEqual(h['dates'],sorted(h['dates'],reverse=True));self.assertAlmostEqual(h['average'],sum(h['beyers'])/3);self.assertTrue(all(h['beyers'][i]==h['proof'][i]['figure'] for i in range(3)))
 def test_missing_recent_figure_never_backfilled(self):
  self.assertEqual(sum(h.get('reason')=='MISSING_CERTIFIED_BEYER_IN_EXACT_RECENT_THREE' for r in self.rs for h in r['histories']),39)
  for r in self.rs:
   by={h['n']:h for h in r['histories']};self.assertTrue(all(by[n]['eligible'] for n in r['orders']['LAST3_BEYER_DIAGNOSTIC']))
 def test_combined_not_fabricated_from_summary(self):
  self.assertEqual(self.s['recent3_pace_beyer_eligible_horses'],0)
  for r in self.rs:self.assertEqual(r['orders']['LAST3_PACE_BEYER_EQUAL'],[]);self.assertIn('NO_INDIVIDUAL',r['combined_status'])
 def test_partial_fields_excluded_from_primary(self):
  self.assertEqual(sum(r['contender_full_field'] for r in self.rs),131);self.assertEqual(sum(not r['contender_full_field'] for r in self.rs),25)
  for r in self.rs:self.assertEqual(g.eligible(r,'CURRENT_CONTENDER'),r['contender_full_field'])
 def test_insufficient_eligible_horses_not_padded(self):
  self.assertEqual(sum(len(r['orders']['LAST3_BEYER_DIAGNOSTIC'])<4 for r in self.rs),21)
  for r in self.rs:
   eligible={h['n'] for h in r['histories'] if h['eligible']};self.assertEqual(set(r['orders']['LAST3_BEYER_DIAGNOSTIC']),eligible)
 def test_all_recorded_metrics(self):
  for r in self.result['rows']:
   for a in g.ARMS:self.assertEqual(r['grades'][a],g.metric(r['orders'][a],r['actual']))
 def test_unranked_finishers_have_no_invented_order(self):
  x=g.metric(['1','2','3','5'],['1','2','3','4']);self.assertEqual(x['coverage'],3);self.assertIsNone(x['rank_error']);self.assertIsNone(x['pairs'])
 def test_outsiders_penalized_in_rank_error(self):
  x=g.metric(['5','1','2','3','4'],['1','2','3','4']);self.assertEqual(x['pairs'],6);self.assertEqual(x['rank_error'],1)
 def test_summary_denominators_and_hit_distribution(self):
  for x in self.s['all_arms_available_descriptive']:
   self.assertEqual(sum(x['hits_distribution'].values()),x['races']);self.assertEqual(sum(int(k)*v for k,v in x['hits_distribution'].items()),x['covered_finishers']);self.assertEqual(x['possible_finishers'],4*x['races']);self.assertEqual(x['pairs_possible'],6*x['fully_ranked_actual4_races'])
 def test_morning_line_matrix_and_freeze_hash(self):
  m=self.s['morning_line_rank_by_actual_finish_1_2_3_4_outside'];self.assertTrue(all(sum(x)==156 for x in m));self.assertEqual(sum(sum(x[:4]) for x in m),465);self.assertEqual(hashlib.sha256((ROOT/'final-prediction-freeze.json.gz').read_bytes()).hexdigest(),self.s['prediction_freeze_sha256'])
 def test_no_promotion_or_prospective_claim(self):
  self.assertFalse(self.s['production_changed']);self.assertFalse(self.s['prospective_confirmation_claimed']);self.assertEqual(self.s['newly_used_cards'],20);self.assertEqual(self.s['still_sealed_cards'],10)
if __name__=='__main__':unittest.main()
