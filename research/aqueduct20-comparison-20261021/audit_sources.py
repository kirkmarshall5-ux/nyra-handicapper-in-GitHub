"""Independent MuPDF columns compared with production PDF.js extraction."""
import collections,fitz,gzip,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parent
audit_dir=ROOT.parent/'drf_source_audit'
if not audit_dir.exists():audit_dir=ROOT.parent/'drf-source-audit-20261021'
sys.path.insert(0,str(audit_dir))
from audit_drf_sources import pdf_headers,norm,source_horse
def run():
 predictions=json.loads(gzip.decompress((ROOT/'source-prediction-freeze.json.gz').read_bytes()));history={r['key']+':'+h['n']:h for r in predictions['races'] for h in r['histories']};rows=[]
 for p in sorted((ROOT/'parsed').glob('*.json')):
  c=json.loads(p.read_text());pdf=fitz.open(ROOT/'sources'/c['sourceName']);heads=pdf_headers(pdf,{norm(h['name']) for r in c['races'].values() for h in r['horses']});page_words={};page_spans={}
  for rn,r in c['races'].items():
   for h in r['horses']:
    key='AQU_'+c['date']+'_R'+rn;hs=[x for x in heads if norm(x['text'])==norm(h['name'])];issues=[];ml=None;starts=None;review=[]
    s=source_horse(pdf,heads,h['name'],c['date'])
    if len(hs)==1:
     hd=hs[0];pi=hd['page']-1
     if pi not in page_words:
      page_words[pi]=pdf[pi].get_text('words');page_spans[pi]=[s for b in pdf[pi].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
     words=page_words[pi];mw=[w[4] for w in words if hd['y']-8<w[1]<hd['y']+30 and w[2]<hd['x'] and re.fullmatch(r'\d+(?:\.\d+)?-\d+(?:\.\d+)?',w[4])]
     if len(mw)==1:ml=mw[0].replace('-','/')
     life=[w for w in words if abs(w[1]-hd['y'])<5 and 370<w[0]<390 and w[4]=='Life']
     if len(life)==1:
      vals=[w for w in words if abs(w[1]-life[0][1])<1.2 and 390<w[0] and w[2]<402]
      if len(vals)==1 and vals[0][4].isdigit():starts=int(vals[0][4])
     hist=history[key+':'+h['n']]
     if hist['eligible']:
      for dt,fig in zip(hist['dates'],hist['beyers']):
       ls=[l for l in s['historical_lines'] if l['date']==dt]
       spans=[x for x in page_spans[pi] if len(ls)==1 and abs(x['bbox'][1]-ls[0]['y'])<1.2 and 205<=x['bbox'][0]<=220 and 'Bold' in x['font'] and re.fullmatch(r'-?\d+',x['text'].strip())]
       verified=len(spans)==1 and int(spans[0]['text'])==fig
       review.append({'date':dt,'figure':fig,'source_token':spans[0]['text'] if len(spans)==1 else None,'page':pi+1,'y':ls[0]['y'] if len(ls)==1 else None,'verified':verified})
       if not verified:issues.append('RECENT_THREE_BEYER_COLUMN_DISAGREEMENT')
    if s['status']!='HEADER_MATCHED':issues.append('HEADER_UNRESOLVED')
    if s.get('program_tokens')!=[h['n']]:issues.append('PROGRAM_MISMATCH')
    if ml!=h['ml']:issues.append('MORNING_LINE_MISMATCH')
    if starts!=h['life_starts']:issues.append('STARTS_MISMATCH')
    if s.get('summary_early')!=h.get('timeform_early') or s.get('summary_late')!=h.get('timeform_late'):issues.append('PACE_SUMMARY_MISMATCH')
    rows.append({'key':key,'n':h['n'],'name':h['name'],'page':s.get('page'),'source_header_y':s.get('header_y'),'source_programs':s.get('program_tokens'),'ml':ml,'starts':starts,'recent_three_beyer_column_checks':review,'issues':issues})
  pdf.close()
 (ROOT/'source-audit.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'horses':len(rows),'independent_beyer_cells':sum(len(r['recent_three_beyer_column_checks']) for r in rows),'issues':dict(collections.Counter(i for r in rows for i in r['issues']))}))
if __name__=='__main__':run()
