"""Final-field retrospective grading. Every metric retains its own denominator."""
import collections,csv,gzip,hashlib,itertools,json,pathlib,random
ROOT=pathlib.Path(__file__).resolve().parent
ARMS=['CURRENT_CONTENDER','NO_CONTEXT','MORNING_LINE','LAST3_BEYER_DIAGNOSTIC']
def read_json(path):
 path=pathlib.Path(path)
 return json.loads(path.read_text()) if path.exists() else json.loads(gzip.decompress(pathlib.Path(str(path)+'.gz').read_bytes()))
def metric(order,actual):
 assert len(actual)==len(set(actual))==4 and len(order)==len(set(order))
 rank={n:i+1 for i,n in enumerate(order)};complete=all(n in rank for n in actual)
 return {'coverage':len(set(order[:4])&set(actual)),'winner_selected':int(actual[0] in order[:4]),'winner':int(bool(order) and order[0]==actual[0]),'exacta':int(order[:2]==actual[:2]),'trifecta':int(order[:3]==actual[:3]),'superfecta':int(order[:4]==actual),'rank_error':sum(abs(rank[n]-i-1) for i,n in enumerate(actual))/4 if complete else None,'pairs':sum(rank[actual[i]]<rank[actual[j]] for i in range(4) for j in range(i+1,4)) if complete else None,'slots':[int(len(order)>i and order[i]==actual[i]) for i in range(4)],'top4_complete_in_ranking':complete}
def eligible(r,arm):
 if arm in ['CURRENT_CONTENDER','NO_CONTEXT']:return r['contender_full_field']
 return len(r['orders'][arm])>=4
def aggregate(rows,arm):
 rr=[r for r in rows if eligible(r,arm)];gs=[r['grades'][arm] for r in rr];complete=[g for g in gs if g['rank_error'] is not None];dist=collections.Counter(g['coverage'] for g in gs)
 return {'arm':arm,'races':len(rr),'cards':len({r['date'] for r in rr}),'covered_finishers':sum(g['coverage'] for g in gs),'possible_finishers':4*len(gs),'mean_top4_hits':sum(g['coverage'] for g in gs)/len(gs) if gs else None,'hits_distribution':{str(i):dist[i] for i in range(5)},**{k:sum(g[k] for g in gs) for k in ['winner_selected','winner','exacta','trifecta','superfecta']},'slots':[sum(g['slots'][i] for g in gs) for i in range(4)],'fully_ranked_actual4_races':len(complete),'rank_error':sum(g['rank_error'] for g in complete)/len(complete) if complete else None,'pairs_correct':sum(g['pairs'] for g in complete),'pairs_possible':6*len(complete)}
def paired(rows,arm='NO_CONTEXT',control='CURRENT_CONTENDER'):
 rr=[r for r in rows if eligible(r,arm) and eligible(r,control) and r['grades'][arm]['rank_error'] is not None and r['grades'][control]['rank_error'] is not None];cards=collections.defaultdict(list)
 for r in rr:cards[r['date']].append(r)
 keys=sorted(cards);rng=random.Random(20261021);draws=[]
 for _ in range(10000):
  ss=[r for k in rng.choices(keys,k=len(keys)) for r in cards[k]];draws.append(sum(r['grades'][arm]['rank_error']-r['grades'][control]['rank_error'] for r in ss)/len(ss))
 draws.sort();a=aggregate(rr,arm);c=aggregate(rr,control)
 return {'races':len(rr),'cards':len(cards),'arm':arm,'control':control,'changed_orders':sum(r['orders'][arm]!=r['orders'][control] for r in rr),'mean_rank_error_difference':a['rank_error']-c['rank_error'],'paired_card_bootstrap_95':[draws[250],draws[9749]],'replicates':10000,'seed':20261021,'pair_delta':a['pairs_correct']-c['pairs_correct'],'coverage_delta':a['covered_finishers']-c['covered_finishers'],'winner_selected_delta':a['winner_selected']-c['winner_selected'],'exact_top4_delta':a['superfecta']-c['superfecta'],'better_rank_error_races':sum(r['grades'][arm]['rank_error']<r['grades'][control]['rank_error'] for r in rr),'worse_rank_error_races':sum(r['grades'][arm]['rank_error']>r['grades'][control]['rank_error'] for r in rr)}
def run():
 fp=ROOT/'final-prediction-freeze.json.gz';freeze=json.loads(gzip.decompress(fp.read_bytes()));official=read_json(ROOT/'official-results.json');rows=[];cancelled=[]
 for r in freeze['races']:
  o=official[r['key']]
  if o['status']=='CANCELLED_OFFICIALLY':cancelled.append({'key':r['key'],'reason':o['reason'],'source_url':o['url']});continue
  assert o['status']=='VERIFIED_COMPLETE_FIELD_AND_TOP4';assert set(r['source_programs'])=={h['n'] for h in o['final_field']};assert r['surface']==o['surface']
  actual=[h['n'] for h in o['top4']]
  rows.append({**r,'actual':actual,'official_url':o['url'],'scratched':o['scratches'],'grades':{arm:metric(r['orders'][arm],actual) for arm in ARMS}})
 common=[r for r in rows if r['contender_full_field']];beyer_common=[r for r in rows if all(eligible(r,a) and r['grades'][a]['rank_error'] is not None for a in ARMS)]
 summary={'classification':freeze['classification'],'cards_uploaded':20,'scheduled_races':len(freeze['races']),'completed_races':len(rows),'cards_with_results':len({r['date'] for r in rows}),'cancelled_races':len(cancelled),'final_starters':sum(r['field_size'] for r in rows),'scratched_entries':sum(len(r['scratched']) for r in rows),'fewer_than_three_starts':sum(h.get('reason')=='FEWER_THAN_THREE_PRIOR_RACES' for r in rows for h in r['histories']),'missing_certified_recent_three_beyer':sum(h.get('reason')=='MISSING_CERTIFIED_BEYER_IN_EXACT_RECENT_THREE' for r in rows for h in r['histories']),'recent3_beyer_eligible_horses':sum(h['eligible'] for r in rows for h in r['histories']),'recent3_pace_beyer_eligible_horses':0,'recent3_combined_status':'NOT_TESTABLE_NO_INDIVIDUAL_LAST_THREE_PACE_FIGURES','full_contender_races':len(common),'partial_contender_races':sum(not r['contender_full_field'] for r in rows),'insufficient_beyer_top4_races':sum(len(r['orders']['LAST3_BEYER_DIAGNOSTIC'])<4 for r in rows),'all_arms_available_descriptive':[aggregate(rows,a) for a in ARMS],'common_contender_ml':[aggregate(common,a) for a in ARMS[:3]],'common_all4_actual4_ranked':[aggregate(beyer_common,a) for a in ARMS],'paired_contender':paired(rows),'paired_contender_min5':paired([r for r in rows if r['field_size']>=5]),'field_size_breakdowns':{stratum:[aggregate([r for r in rows if (r['field_size']<=4 if stratum=='4' else 5<=r['field_size']<=7 if stratum=='5-7' else r['field_size']>=8)],a) for a in ARMS] for stratum in ['4','5-7','8+']},'ml_boundary_ties':sum(r['ml_boundary_tie'] for r in rows),'beyer_boundary_ties':sum(r['beyer3_boundary_tie'] for r in rows),'prediction_freeze_sha256':hashlib.sha256(fp.read_bytes()).hexdigest(),'production_changed':False,'newly_used_cards':20,'still_sealed_cards':10,'prospective_confirmation_claimed':False}
 matrix=[[0]*5 for _ in range(4)]
 for r in rows:
  for i,n in enumerate(r['orders']['MORNING_LINE'][:4]):matrix[i][r['actual'].index(n) if n in r['actual'] else 4]+=1
 summary['morning_line_rank_by_actual_finish_1_2_3_4_outside']=matrix
 out={'summary':summary,'rows':rows,'cancelled':cancelled}
 # The complete source inputs live once in the final prediction freeze.
 saved={'summary':summary,'rows':[{k:v for k,v in r.items() if k not in ['feature_entries','histories','source_header','morning_lines']} for r in rows],'cancelled':cancelled}
 (ROOT/'results.json.gz').write_bytes(gzip.compress(json.dumps(saved,separators=(',',':')).encode(),mtime=0));(ROOT/'SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
 with (ROOT/'race-comparison.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['race','starters','actual_top4','current_top4','no_context_top4','ml_top4','beyer3_top4','current_hits','no_context_hits','ml_hits','beyer3_hits','contender_status','beyer3_status','official_url'])
  for r in sorted(rows,key=lambda r:(r['date'],int(r['race']))):w.writerow([r['key'],r['field_size'],'-'.join(r['actual']),*['-'.join(r['orders'][a][:4]) for a in ARMS],*[r['grades'][a]['coverage'] if eligible(r,a) else '' for a in ARMS],'FULL_FIELD' if r['contender_full_field'] else 'PARTIAL_EXCLUDED_FROM_PRIMARY','FOUR_OR_MORE_ELIGIBLE' if eligible(r,ARMS[3]) else 'INSUFFICIENT_ELIGIBLE',r['official_url']])
 with (ROOT/'excluded-horses.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['race','program','horse','life_starts','reason'])
  for r in rows:
   for h in r['histories']:
    if not h['eligible']:w.writerow([r['key'],h['n'],h['name'],h.get('life_starts'),h['reason']])
 with (ROOT/'morning-line-horses.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['race','morning_line_rank','program','horse','morning_line','finish_top4_or_outside','top4_hit'])
  for r in rows:
   by={h['n']:h for h in r['morning_lines']}
   for i,n in enumerate(r['orders']['MORNING_LINE'][:4]):w.writerow([r['key'],i+1,n,by[n]['name'],by[n]['ml'],r['actual'].index(n)+1 if n in r['actual'] else 'OUTSIDE_TOP4',int(n in r['actual'])])
 print(json.dumps({k:v for k,v in summary.items() if k not in ['field_size_breakdowns','common_all4_actual4_ranked','all_arms_available_descriptive','common_contender_ml']},indent=2));print('ALL',json.dumps(summary['all_arms_available_descriptive'],indent=2));print('COMMON',json.dumps(summary['common_all4_actual4_ranked'],indent=2))
 return out
if __name__=='__main__':run()
