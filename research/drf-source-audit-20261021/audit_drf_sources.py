"""Read-only research audit of explicitly previously analyzed DRF cards.
No models or outcome grading; sealed holdouts are never opened.
"""
import collections,datetime,hashlib,json,pathlib,re
import fitz

BASE=pathlib.Path('/workspace/scratch/e211cc869cf2')
ROOT=pathlib.Path(__file__).resolve().parent
MONTHS=dict(zip('âáàßÜÞÛÝæåäã',range(1,13)))
def read(p):return json.loads(pathlib.Path(p).read_text())
def norm(s):return re.sub('[^a-z0-9]','',re.sub(r'\s*\([A-Z]{2,3}\)','',s,flags=re.I).lower())
def digest(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def history_date(token):
 m=re.match(r'^(\d{1,2})(.)(\d{2})=',token)
 if not m or m[2] not in MONTHS:return None
 try:return datetime.date(2000+int(m[3]),MONTHS[m[2]],int(m[1])).isoformat()
 except ValueError:return None

def decode_margin(token):
 if token is None:return {'numeric_margin':None,'margin_label':None,'margin_status':'NOT_PRINTED'}
 special={'Ç':'HEAD','É':'NECK','ó':'SMALL_MARGIN_UNVERIFIED'}
 if token in special:return {'numeric_margin':None,'margin_label':special[token],'margin_status':'LABEL_ONLY'}
 digits={'¥':'0','¦':'1','§':'2','¨':'3','©':'4','ª':'5','«':'6','¬':'7','¤':'8','®':'9'}
 fractions={'õ':.25,'ô':.5,'ö':.75};fraction=fractions.get(token[-1],0);whole=token[:-1] if fraction else token
 if not whole and fraction:return {'numeric_margin':fraction,'margin_label':None,'margin_status':'DECODED_SOURCE_GLYPHS'}
 if whole and all(c in digits for c in whole):return {'numeric_margin':int(''.join(digits[c] for c in whole))+fraction,'margin_label':None,'margin_status':'DECODED_SOURCE_GLYPHS'}
 return {'numeric_margin':None,'margin_label':None,'margin_status':'UNRESOLVED'}

def parse_call_tokens(words,field_size):
 """Only five standard slots, with conservative source-font margin decoding."""
 if len(words)!=5:return None
 result=[]
 for word in words:
  m=re.fullmatch(r'(\d{1,2})([¥¦§¨©ª«¬¤®õôöÇÉó]*)',word)
  if not m or not 1<=int(m[1])<=field_size:return None
  pos=int(m[1]);token=m[2] or None;result.append({'position':pos,'margin_token':token,'margin_kind':'LEAD_MARGIN' if pos==1 else 'BEATEN_MARGIN',**decode_margin(token)})
 return dict(zip(['raw_slot_1','raw_slot_2','raw_slot_3','stretch','finish'],result))

def pdf_headers(doc,names):
 out=[]
 for pi,page in enumerate(doc):
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    spans=line['spans'];text=''.join(s['text'] for s in spans).strip()
    if spans and norm(text) in names and 10<=max(s['size'] for s in spans)<=16 and min(s['bbox'][0] for s in spans)<200 and any('Bold' in s['font'] for s in spans):
     out.append({'page':pi+1,'y':min(s['bbox'][1] for s in spans),'x':min(s['bbox'][0] for s in spans),'text':text})
 return out

def source_horse(doc,headers,name,target_date):
 hs=[h for h in headers if norm(h['text'])==norm(name)]
 if len(hs)!=1:return {'status':'HORSE_HEADER_NOT_UNIQUE','matches':len(hs),'historical_lines':[]}
 head=hs[0];page=doc[head['page']-1];y=head['y']
 # Only horse-sized headers delimit blocks. Index names and opponent names cannot anchor.
 next_y=min([h['y'] for h in headers if h['page']==head['page'] and h['y']>y+2 and h['x']<200 and len(h['text'])>2]+[page.rect.height-30])
 words=[w for w in page.get_text('words') if y-1<=w[1]<next_y-1]
 text=' '.join(w[4] for w in sorted(words,key=lambda w:(round(w[1]),w[0])))
 tf_anchor=next((w for w in words if w[4]=='TimeformUS'),None)
 tf_text=' '.join(w[4] for w in sorted([w for w in words if tf_anchor and abs(w[1]-tf_anchor[1])<1.2 and w[0]<190],key=lambda w:w[0]))
 tf=re.search(r'TimeformUS\s+Pace:\s+Early\s+(\d+)\s+Late\s+(\d+)',tf_text)
 # Program token must be a separate large label left of the name, never its roster index.
 program_words=[w for w in page.get_text('words') if abs(w[1]-y)<6 and w[2]<head['x'] and re.fullmatch(r'\d{1,2}[A-Z]?',w[4])]
 lines=[]
 for anchor in words:
  date=history_date(anchor[4])
  if not date or anchor[0]>90:continue
  row=sorted([w for w in words if abs(w[1]-anchor[1])<1.2],key=lambda w:w[0]);tokens=[w[4] for w in row];raw=' '.join(tokens)
  field_index=next((i for i,t in enumerate(tokens) if re.fullmatch(r'/\d{1,2}',t)),None)
  calls=None;field_size=None;reason='POST_FIELD_TOKEN_UNRESOLVED'
  if field_index is not None:
   field_size=int(tokens[field_index][1:]);after=tokens[field_index+1:]
   callwords=[]
   for t in after:
    if not re.fullmatch(r'\d{1,2}[^\d\s]*',t):break
    callwords.append(t)
   calls=parse_call_tokens(callwords,field_size)
   reason=None if calls else 'NONSTANDARD_OR_AMBIGUOUS_CALL_SEQUENCE'
  if date>=target_date:calls=None;reason='NOT_BEFORE_TARGET_CARD'
  lines.append({'date':date,'page':head['page'],'y':round(anchor[1],3),'raw':raw,'field_size':field_size,'shape_candidate_tokens':[w[4] for w in row if 90<=w[0]<99],'calls':calls,'status':'POSITION_CANDIDATE_REQUIRES_REVIEW' if calls else reason,'reviewed_against_original':False})
 return {'status':'HEADER_MATCHED','page':head['page'],'header_y':round(y,3),'header_text':head['text'],'program_tokens':[w[4] for w in program_words],'summary_early':int(tf[1]) if tf else None,'summary_late':int(tf[2]) if tf else None,'historical_lines':lines,'individual_pace_figures_status':'NOT_CERTIFIED_BY_THIS_AUDIT','historical_shape_status':'NOT_CERTIFIED_BY_THIS_AUDIT'}

def collect():
 hist=BASE/'review_extract/Beyer_Three_Tests_Finishing_Order_Evidence/priority2/priority2/historical_run'
 cards=read(hist/'predictions.json')['cards']+read(hist/'supplemental_predictions.json')['cards']
 sar=read(BASE/'review_extract/Saratoga_Ten_Card_Retest_Evidence/ten_card_test_run/ALIGNED_FROZEN_CARDS.json')['cards']
 prior=read(BASE/'contender_ablation_20261018/RESULTS.json')
 selected=[r for r in prior['rows'] if r['provider']=='DRF'];assert len(selected)==141
 groups=collections.defaultdict(list)
 for meta in selected:groups[meta['key'].split('_R')[0]].append(meta)
 # Discovery only examines filenames. Bytes are opened solely for the 25 authorized source names.
 filenames=collections.defaultdict(list)
 for p in pathlib.Path('/workspace/scratch').rglob('*.pdf'):filenames[p.name].append(p)
 records=[];attempts=[]
 for key,metas in sorted(groups.items()):
  track,date=key.split('_',1);cohort=metas[0]['cohort']
  if cohort=='DRF58':src=next(c for c in cards if c['date']==date and c['track']=={'BAQ':'Belmont at the Big A','CD':'Churchill Downs','SAR':'Saratoga'}[track])
  elif cohort=='SAR47':src=next(c for c in sar if c['date']==date)
  elif cohort=='KEE25':src=read(BASE/('review_extract/Keeneland_Five_Card_Test_20261017/keeneland_five_v1/cards/'+date+'.json'))
  else:src=read(BASE/'oct17_work/BEL_DRF_card.json')
  names={src.get('sourceName','')};names|={re.sub(r'\(\d+\)(?=\.pdf$)','',n) for n in names};names|={n.replace('.pdf','(1).pdf') for n in list(names) if not re.search(r'\(\d+\)\.pdf$',n)}
  candidates=[p for n in names for p in filenames.get(n,[])];expected=src.get('source_sha256')
  hashed=[(p,digest(p)) for p in candidates];matching=[(p,h) for p,h in hashed if not expected or h==expected]
  attempts.append({'card':key,'source_name':src.get('sourceName'),'expected_sha256':expected,'candidate_paths':[str(p) for p in candidates],'found':bool(matching)})
  doc=fitz.open(matching[0][0]) if matching else None;headers=pdf_headers(doc,{norm(h['name']) for r in src['races'].values() for h in r['horses']}) if doc else []
  cardrec={'card':key,'date':date,'cohort':cohort,'role':'DEVELOPMENT_PREVIOUSLY_ANALYZED','pdf_path':str(matching[0][0]) if matching else None,'pdf_sha256':matching[0][1] if matching else None,'matches_archived_sha256':matching[0][1]==expected if matching and expected else None,'pages':len(doc) if doc else None,'horses':[]}
  for meta in metas:
   rn=int(meta['key'].split('_R')[1]);race=src['races'][str(rn)]
   for entry in meta['entries']:
    hs=[h for h in race['horses'] if norm(h['name'])==norm(entry['name'])];assert len(hs)==1
    h=hs[0];e=h.get('contender_evidence') or h;lines=e.get('switch_evidence',{}).get('running_lines',[])
    pair=h.get('timeform_early') is not None and h.get('timeform_late') is not None
    predicted_style='E' if pair and h['timeform_early']>=105 else 'EP' if pair and h['timeform_early']>=90 else 'S' if pair and h['timeform_late']>=85 else 'P'
    source=source_horse(doc,headers,h['name'],date) if doc else {'status':'SOURCE_PDF_UNAVAILABLE','historical_lines':[]}
    cardrec['horses'].append({'race':rn,'name':h['name'],'archived_program':h.get('n'),'life_starts':h.get('life_starts'),'archived_early':h.get('timeform_early'),'archived_late':h.get('timeform_late'),'archived_style':h.get('style'),'style_provenance':'THRESHOLD_PROXY' if pair and h.get('style')==predicted_style else 'UNVERIFIED_OR_UNKNOWN','structured_historical_calls':len(h.get('historicalCalls',[])),'raw_archived_running_lines':len(lines),'archived_sample':lines[:2],'source':source})
  records.append(cardrec)
  if doc:doc.close()
 horses=[h for r in records for h in r['horses']]
 summary={'cards':len(records),'races':len(selected),'horses':len(horses),'pdfs_found':sum(r['pdf_path'] is not None for r in records),'pdfs_matching_archived_hash':sum(r['matches_archived_sha256'] is True for r in records),'headers_matched':sum(h['source']['status']=='HEADER_MATCHED' for h in horses),'late_in_archive':sum(h['archived_late'] is not None for h in horses),'threshold_proxy_styles':sum(h['style_provenance']=='THRESHOLD_PROXY' for h in horses),'horses_with_structured_calls':sum(h['structured_historical_calls']>0 for h in horses),'horses_with_raw_running_lines':sum(h['raw_archived_running_lines']>0 for h in horses),'position_candidates':sum(l['calls'] is not None for h in horses for l in h['source']['historical_lines']),'source_summary_disagreements':sum(h['source']['status']=='HEADER_MATCHED' and (h['source']['summary_early']!=h['archived_early'] or h['source']['summary_late']!=h['archived_late']) for h in horses)}
 return {'classification':'READ_ONLY_SOURCE_AUDIT_NO_MODELS_RUN','holdout_files_used':0,'production_changed':False,'summary':summary,'source_attempts':attempts,'cards':records}

if __name__=='__main__':
 result=collect();(ROOT/'audit.json').write_text(json.dumps(result,ensure_ascii=True,separators=(',',':'))+'\n');print(json.dumps(result['summary'],indent=2))
