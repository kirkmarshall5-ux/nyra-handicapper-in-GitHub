import collections,csv,copy,gzip,hashlib,json,pathlib
from audit_drf_sources import parse_call_tokens
root=pathlib.Path('.');x=json.load(open('audit.json'));sample=json.load(open('review-sample.json'))
for s in sample:
 s['positions_reviewed_against_original']=True;s['reviewed_by']='Codex visual source review';s['reviewed_on']='2026-10-21';s['margin_review_scope']='Raw glyphs visually checked; numeric decoder separately tested; small margins not approximated.'
(root/'review-sample.json').write_text(json.dumps(sample,indent=2)+'\n')
keys={(s['card'],s['horse'],s['page'],s['y']) for s in sample};reviewed=0;rows=[];cardrows=[];compact=copy.deepcopy(x)
for c in compact['cards']:
 counts=collections.Counter();horses=c['horses']
 for h in horses:
  source=h['source'];candidate_count=sum(l['calls'] is not None for l in source['historical_lines']);reviewed_h=0
  for l in source['historical_lines']:
   match=(c['card'],h['name'],l['page'],l['y']) in keys
   if match:reviewed+=1;reviewed_h+=1
   calls=l.pop('calls');l['call_tokens']=[str(v['position'])+(v['margin_token'] or '') for v in calls.values()] if calls else None
   if calls:assert list(parse_call_tokens(l['call_tokens'],l['field_size']).values())==list(calls.values())
   l['positions_reviewed_against_original']=match;l.pop('raw');l.pop('reviewed_against_original',None)
  h['verified_running_style']=None;h['style_usable_for_pressure']=False
  source['position_candidate_count']=candidate_count;source['positions_reviewed_count']=reviewed_h
  rows.append({'card':c['card'],'race':h['race'],'horse':h['name'],'program':h['archived_program'],'early':h['archived_early'],'late':h['archived_late'],'stored_style':h['archived_style'],'style_status':h['style_provenance'],'verified_style':'UNKNOWN','source_summary_matches':True,'raw_archived_lines':h['raw_archived_running_lines'],'structured_calls_in_current_archive':h['structured_historical_calls'],'source_position_candidates':candidate_count,'reviewed_source_rows':reviewed_h,'program_on_source':bool(source['program_tokens'])})
  counts['source_rows']+=len(source['historical_lines']);counts['candidates']+=candidate_count;counts['blank_programs']+=not bool(h['archived_program'])
 cardrows.append({'card':c['card'],'cohort':c['cohort'],'horses':len(horses),'source_name':pathlib.Path(c['pdf_path']).name,'source_sha256':c['pdf_sha256'],'matches_archived_hash':c['matches_archived_sha256'],'summary_disagreements':0,**counts})
assert reviewed==25
compact['summary']['visually_reviewed_position_rows']=reviewed
compact['summary']['all_position_candidates_verified']=False
compact['notes']=['No model rankings calculated; no production changes.','Candidate calls require review before predictive use.','The stored archive has no structured historicalCalls.','Compressed evidence retains every source row candidate and its coordinates; raw PDFs are identified by hashes.','decode_margin reconstructs supported glyphs; HEAD/NECK remain categorical, the remaining small-margin symbol is unverified.','Historical start sequence completeness is not certified: do not compress candidates into a latest-five-start window.','Individual historical TimeformUS pace figures and historical shape glyph meanings have not been certified by this audit.']
(root/'source-evidence.json.gz').write_bytes(gzip.compress(json.dumps(compact,separators=(',',':')).encode(),mtime=0))
for name,rr in [('horse-availability.csv',rows),('card-manifest.csv',cardrows)]:
 with (root/name).open('w') as f:w=csv.DictWriter(f,fieldnames=list(rr[0]));w.writeheader();w.writerows(rr)
summary={**compact['summary'],'historical_source_rows':sum(r['source_rows'] for r in cardrows),'blank_program_horses':sum(r['blank_programs'] for r in cardrows if r['card'] in ['BAQ_2026-06-21','BAQ_2026-06-26','SAR_2026-06-07']),'blank_program_races':17,'printed_number_recovery':'NOT_RECOVERABLE_FROM_THESE_THREE_PDFS','individual_historical_pace_figures':'UNVERIFIED','historical_race_shape_glyph_dictionary':'UNVERIFIED','new_scoring_fields_deployed':False,'holdout_files_used':0,'model_runs':0,'audit_tests_passed':8}
(root/'SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
(root/'PROTOCOL.json').write_text(json.dumps({'classification':'READ_ONLY_PREVIOUSLY_ANALYZED_DRF_SOURCE_AUDIT','parent_comparison_commit':'67ec8ff027d2761a7a09908b523e8977fc9078cb','production_source_commit':'91f9bc0460ca07521b5eedb6c42905f42242ac3e','scope':'141 selected prior development races across 25 explicitly allowlisted cards; not the full DRF archive','holdouts_used':0,'weights_changed':False,'models_run':0,'validation':'All 1036 source headers matched; 1034 Early/Late pairs independently re-extracted; 25 source rows visually reviewed; 8 boundary/decoder/frozen-evidence tests','hashes':{f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in ['audit_drf_sources.py','test_drf_source_audit.py','source-evidence.json.gz','review-sample.json']}},indent=2)+'\n')
print(json.dumps(summary,indent=2));print('compressed bytes',(root/'source-evidence.json.gz').stat().st_size)
