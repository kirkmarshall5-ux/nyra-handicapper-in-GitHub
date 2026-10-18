"""Describe the frozen 30 one-model-only winners. Never rerank or tune weights."""
import json,pathlib,hashlib,collections,statistics,math,sys
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(__file__).resolve().parent
load=lambda p:json.load(open(p));ev=load(out/'EVALUATION.json')if(out/'EVALUATION.json').exists()else json.loads(__import__('gzip').decompress((out/'EVALUATION.json.gz').read_bytes()))
norm=lambda s:__import__('re').sub('[^a-z0-9]','',__import__('re').sub(r'\s*\([A-Z]{2,3}\)','',s).lower())
bpath=root/'review_extract/Beyer_Three_Tests_Finishing_Order_Evidence';attr={r['race_key']:r for r in load(bpath/'comparison/verified_comparison/FEATURE_ATTRIBUTION.json')};br={r['race_key']:r for r in load(bpath/'beyer_test_run/RESULTS.json')['race_details']}
sp=root/'review_extract/Saratoga_Ten_Card_Retest_Evidence/ten_card_test_run';sc=load(sp/'ALIGNED_FROZEN_CARDS.json')['cards'];se={r['race_key']:r for r in load(sp/'FROZEN_ALL_MODELS.json')['entries']}
kp=root/'review_extract/Keeneland_Five_Card_Test_20261017/keeneland_five_v1';kr={r['race_key']:r for r in load(kp/'MODEL_REPLAY.json')['rows']}
rows=[r for r in ev['rows']if r['cohort']in ['DRF58','SAR47','KEE25']and r.get('finisher_metrics')];cases=[]
def ident(h,r):return norm(h['name'])if r['identity']=='name'else str(h['n'])
def source(r):
 if r['cohort']=='DRF58':
  meta=br[r['key']];hs={norm(h['name']):{'name':h['name'],'program':h['program']or None,'latest_speed':next((v for v,w,k in h['v4_parts']if k=='latest'),None),'best3_speed':next((v for v,w,k in h['v4_parts']if k=='best3'),None),'control_score':h['v4_score'],'control_parts':h['v4_parts'],'control_adjustment':h['v4_adjustment'],'control_signals':h['v4_signals']}for h in attr[r['key']]['horses']if h['final_starter']}
  return {'surface':meta['surface'],'distance':meta['distance'],'type':'Not available in frozen feature archive'},hs
 if r['cohort']=='SAR47':
  _,date,rn=r['key'].split('_');race=next(c for c in sc if c['date']==date)['races'][rn[1:]];scores={norm(h['name']):h['score']for h in race['frozen_models']['V4.4c']['rankings']};meta=se[r['key']]
  def key(h):return norm(h['name'])
 else:
  k=kr[r['key']];race=load(kp/'cards'/f"{k['date']}.json")['races'][str(k['race'])];scores={str(h['n']):h['v44c_unrounded_score']for h in k['models']['v44c']['rankings']};meta={'surface':k['source_surface'],'distance':k['distance_furlongs']}
  def key(h):return str(h['n'])
 hs={key(h):{'name':h['name'],'program':h.get('n')or None,'latest_speed':h.get('beyer_figures',[None])[0]if h.get('beyer_figures')else None,'best3_speed':max(h.get('beyer_figures',[])[:3])if h.get('beyer_figures')else None,'control_score':scores.get(key(h)),'source_jockey_win':h.get('jockey_win'),'source_trainer_win':h.get('trainer_win')}for h in race['horses']}
 return {'surface':meta['surface'],'distance':meta['distance'],'type':race.get('cls','Unknown')},hs
for r in rows:
 if r['control_metrics']['win']==r['finisher_metrics']['win']:continue
 meta,hs=source(r);ranked={ident(h,r):h for h in r['prediction']['rankings']};v=r['control'][0];f=r['prediction_order'][0];winner=r['actual'][0];vf=ranked[v];ff=ranked[f]
 deltas={k:(ff['components'][k]['percentile']-vf['components'][k]['percentile'])*ff['components'][k]['weight']for k in ff['components']};assert math.isclose(sum(deltas.values()),ff['score']-vf['score'],abs_tol=1e-9)
 dominant=max(deltas,key=deltas.get);extra='Finisher'if r['finisher_metrics']['win']else'V4.4c'
 picks={name:{**hs[i],'id':i,'finisher_score':ranked[i]['score'],'finisher_components':ranked[i]['components'],'actual_finish':r['actual'].index(i)+1 if i in r['actual']else None,'actual_finish_scope':'FULL_ORDER'if r['full_order']else'FIRST_FOUR_ONLY','v44c_rank':r['control'].index(i)+1,'finisher_rank':r['prediction_order'].index(i)+1}for name,i in [('v44c_pick',v),('finisher_pick',f)]}
 cases.append({'key':r['key'],'cohort':r['cohort'],'winner_model':extra,'winner_id':winner,'surface':meta['surface'],'distance':meta['distance'],'type':meta['type'],'field_size':len(r['inputs']),**picks,'finisher_margin':ff['score']-vf['score'],'finisher_component_margin':deltas,'largest_finisher_advantage':dominant,'winner_v44c_rank':r['control'].index(winner)+1,'winner_finisher_rank':r['prediction_order'].index(winner)+1,'input_coverage':{k:{'available':sum(h['components'][k]['raw']is not None for h in ranked.values()),'field':len(ranked)}for k in ff['components']}})
assert len(cases)==30
summary={}
for group in ['Finisher','V4.4c']:
 cs=[c for c in cases if c['winner_model']==group];winner=lambda c:c['finisher_pick']if group=='Finisher'else c['v44c_pick'];other=lambda c:c['v44c_pick']if group=='Finisher'else c['finisher_pick']
 summary[group]={'races':len(cs),'cohorts':dict(collections.Counter(c['cohort']for c in cs)),'surfaces':dict(collections.Counter(c['surface']for c in cs)),'field_size_mean':statistics.mean(c['field_size']for c in cs),'finisher_advantage_driver':dict(collections.Counter(c['largest_finisher_advantage']for c in cs)),'winner_larger_recent':sum(winner(c)['finisher_components']['recent_speed']['raw']>other(c)['finisher_components']['recent_speed']['raw']for c in cs),'winner_lower_latest':sum(winner(c)['latest_speed']is not None and other(c)['latest_speed']is not None and winner(c)['latest_speed']<other(c)['latest_speed']for c in cs),'winner_lower_best3':sum(winner(c)['best3_speed']is not None and other(c)['best3_speed']is not None and winner(c)['best3_speed']<other(c)['best3_speed']for c in cs),'missing_matched_in_either_pick':sum(any(c[p]['finisher_components']['matched_speed']['raw']is None for p in ['v44c_pick','finisher_pick'])for c in cs),'missing_late_in_either_pick':sum(any(c[p]['finisher_components']['late_pace']['raw']is None for p in ['v44c_pick','finisher_pick'])for c in cs),'winner_other_model_rank':dict(sorted(collections.Counter(c['winner_v44c_rank']if group=='Finisher'else c['winner_finisher_rank']for c in cs).items()))}
disagreement_all=[r for r in rows if r['control'][0]!=r['prediction_order'][0]];agree=[r for r in rows if r['control'][0]==r['prediction_order'][0]]
output={'scope':'Descriptive attribution of frozen outcome-known historical predictions. No weight changes or new model selection. Within each case, component margins explain the Finisher score difference, not why the horse won. Control score units and Finisher units are different and not subtracted.','frozen_spec':ev['model'],'all_historical_races':len(rows),'top_pick_agreement':{'races':len(agree),'winners':sum(r['control_metrics']['win']for r in agree)},'top_pick_disagreement':{'races':len(disagreement_all),'finisher_only_winners':18,'v44c_only_winners':12,'neither_winner':len(disagreement_all)-30},'exclusive_win_cases':summary,'cases':cases,'repro_source_sha256':hashlib.sha256((out/'EVALUATION.json.gz').read_bytes()).hexdigest()}
(out/'DISAGREEMENTS.json').write_text(json.dumps(output,indent=2));print(json.dumps({k:v for k,v in output.items()if k!='cases'},indent=2))
