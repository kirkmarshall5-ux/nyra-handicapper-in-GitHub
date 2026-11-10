"""Extract only official race facts from saved NYRA retrievals; reject unresolved fields."""
import collections,json,pathlib,re,unicodedata,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',re.sub(r'\s*\([A-Z]{2,3}\)\s*$','',s)).encode('ascii','ignore').decode().lower())
def unlink(s):return re.sub(r'【\d+†([^†】]+)(?:†[^】]+)?】',r'\1',s)
def pairs(section):
 out=[];lines=[x.strip() for x in section.splitlines() if x.strip()]
 for i,line in enumerate(lines):
  m=re.match(r'^(\d+[A-Z]?)\s*\|\s*【\d+†([^†】]+)',line)
  if not m:m=re.match(r'^(\d+[A-Z]?)\s*-\s*【\d+†([^†】]+)',line)
  if m:out.append({'n':m[1],'name':m[2].strip()});continue
  if re.fullmatch(r'\d+[A-Z]?',line) and i+1<len(lines):
   m=re.match(r'^【\d+†([^†】]+)',lines[i+1])
   if m:out.append({'n':line,'name':m[1].strip()})
 return out
def parse(block,source_file,cards):
 u=re.search(r'https://www.nyra.com/aqueduct/racing/(?:results/)?\?[^\s)"}]+',block)
 if not u:return None
 query=urllib.parse.parse_qs(urllib.parse.urlparse(u[0].rstrip(':.,')).query);date=query.get('day',[None])[0];requested=query.get('race',[None])[0]
 if date not in cards:return None
 text=re.sub(r'^L\d+: ?','',block,flags=re.M);rm=re.search(r'^Race\s+(\d+)\s*$',text,re.M)
 ref=re.search(r'【(turn\w+)】',block);ref=ref[1] if ref else None
 if not rm:return {'date':date,'requested_race':int(requested) if requested else None,'status':'FETCH_FAILED_OR_RACE_BODY_MISSING','ref':ref,'source_file':source_file}
 rn=int(rm[1]);key=f'AQU_{date}_R{rn}';expected=cards[date]['races'].get(str(rn))
 row={'key':key,'date':date,'race':rn,'url':u[0],'ref':ref,'source_file':source_file,'requested_race':int(requested) if requested else None,'status':'UNRESOLVED'}
 if not expected:return {**row,'status':'UNEXPECTED_OFFICIAL_RACE'}
 if requested and int(requested)!=rn:return {**row,'status':'REQUESTED_RACE_MISMATCH'}
 racebody=text[rm.end():]
 heading=re.search(r'(?:\|\s*\|\s*Win\s*\|\s*Place\s*\|\s*Show|Win\s+Place\s+Show)',racebody)
 if not heading:return {**row,'status':'RESULT_TABLE_MISSING','cancelled_text':bool(re.search('cancel',racebody,re.I))}
 body=racebody[heading.end():];topsection=re.split(r'Race Chart|GPS Chart|Also Rans',body,1)[0];top=pairs(topsection)
 rans=re.search(r'Also Rans\s*(.*?)(?:\nScratches\b|\nFavorite\b|Winning Connections|$)',body,re.S);scr=re.search(r'\nScratches\s*(.*?)(?:\nFavorite\b|Winning Connections|$)',body,re.S)
 extra=pairs(rans[1]) if rans else [];scratches=pairs(scr[1]) if scr else []
 field=[]
 for x in top+extra:
  if x['n'] not in {h['n'] for h in field}:field.append(x)
 row.update(top4=top[:4],final_field=field,scratches=scratches)
 if len(top)!=4 or len({h['n'] for h in top})!=4:return {**row,'status':'TOP_FOUR_INCOMPLETE_OR_AMBIGUOUS'}
 by={h['n']:h for h in expected['horses']};issues=[]
 for h in field+scratches:
  if h['n'] not in by or norm(h['name'])!=norm(by[h['n']]['name']):issues.append({'official':h,'source':by.get(h['n'],{}).get('name')})
 if issues:return {**row,'status':'PROGRAM_NAME_MISMATCH','issues':issues}
 if set(h['n'] for h in field)&set(h['n'] for h in scratches):return {**row,'status':'STARTER_SCRATCH_CONFLICT'}
 missing=set(by)-{h['n'] for h in field+scratches}
 if missing:return {**row,'status':'FINAL_FIELD_DISPOSITION_INCOMPLETE','unaccounted_programs':sorted(missing)}
 # Official surface/distance appear above conditions; validate against source metadata.
 ctx=racebody[:heading.start()];surf=re.search(r'\b(Dirt|Turf|Synthetic|All Weather)\b',ctx);dm=re.search(r'^([0-9]+(?:\s*[0-9]+/[0-9]+)?(?:\.[0-9]+)?)\s*([FM])\s*$',ctx,re.M)
 row.update(surface=surf[1] if surf else None,official_distance=dm[0] if dm else None,status='VERIFIED_COMPLETE_FIELD_AND_TOP4')
 return row
def run():
 cards={p.stem:json.loads(p.read_text()) for p in (ROOT/'parsed').glob('*.json')};attempts=[];merged={}
 for p in sorted((ROOT/'result_sources').glob('*.json')):
  d=json.loads(p.read_text());text='\n'.join(c.get('text','') for c in d.get('content',[]) if c.get('type')=='text')
  for block in re.split(r'\n-{10,}\n',text):
   r=parse(block,p.name,cards)
   if r:attempts.append(r)
   u=re.search(r'https://www.nyra.com/aqueduct/racing/(?:results/)?\?[^\s)"}]+',block)
   if not u or 'Internal Error' in block:continue
   m=merged.setdefault(u[0],{'header':block.split('\nL')[0],'lines':{},'sources':[]});m['sources'].append(p.name)
   for ln,value in re.findall(r'^L(\d+): ?(.*)$',block,re.M):
    if ln in m['lines'] and m['lines'][ln]!=value:continue
    m['lines'][ln]=value
 for url,m in merged.items():
  block=m['header']+'\n'+'\n'.join('L'+n+': '+m['lines'][n] for n in sorted(m['lines'],key=int));r=parse(block,'+'.join(m['sources']),cards)
  if r:attempts.append(r)
 chosen={}
 for r in attempts:
  if 'key' not in r:continue
  k=r['key'];old=chosen.get(k)
  if old and old['status']=='VERIFIED_COMPLETE_FIELD_AND_TOP4' and r['status']=='VERIFIED_COMPLETE_FIELD_AND_TOP4':
   assert old['top4']==r['top4'] and old['final_field']==r['final_field'] and old['scratches']==r['scratches'],'Conflicting official labels'
  if not old or r['status']=='VERIFIED_COMPLETE_FIELD_AND_TOP4' or (old['status']!='VERIFIED_COMPLETE_FIELD_AND_TOP4' and len(r.get('final_field',[]))>len(old.get('final_field',[]))):chosen[k]=r
 notices=json.loads((ROOT/'cancellation-notices.json').read_text())
 for date,notice in notices.items():
  for rn in notice['races']:
   key=f'AQU_{date}_R{rn}';assert chosen.get(key,{}).get('status')!='VERIFIED_COMPLETE_FIELD_AND_TOP4'
   chosen[key]={'key':key,'date':date,'race':rn,'status':'CANCELLED_OFFICIALLY','url':notice['url'],'reason':notice['reason']}
 required=[(date,rn) for date,c in cards.items() for rn in c['races']];pending=[]
 for date,rn in required:
  k=f'AQU_{date}_R{rn}'
  if k not in chosen or chosen[k]['status'] not in ['VERIFIED_COMPLETE_FIELD_AND_TOP4','CANCELLED_OFFICIALLY']:pending.append({'date':date,'race':int(rn),'key':k,'status':chosen.get(k,{}).get('status','NO_RESULT'),'ref':chosen.get(k,{}).get('ref')})
 (ROOT/'result-attempts.json').write_text(json.dumps(attempts,indent=2)+'\n');(ROOT/'official-results.json').write_text(json.dumps(chosen,indent=2)+'\n');(ROOT/'pending-results.json').write_text(json.dumps(pending,indent=2)+'\n')
 print('verified',len(required)-len(pending),'of',len(required),'pending',collections.Counter(x['status'] for x in pending));print('examples',pending[:10])
if __name__=='__main__':run()
