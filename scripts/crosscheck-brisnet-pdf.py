"""Independent PyMuPDF word extraction against production PDF.js card output.

Usage: python scripts/crosscheck-brisnet-pdf.py manifest.json card-directory
This checks printed identities and six numeric columns, not official starters.
Unresolved comparisons are reported, never silently accepted.
"""
import json, sys, pathlib, re, hashlib
import fitz
manifest, directory = sys.argv[1:]
root = pathlib.Path(directory)
report = {'schema':'brisnet-independent-text-crosscheck-v1','extractor':'PyMuPDF '+fitz.VersionBind,'certified':False,'cards':[]}
def norm(s):
    return re.sub(r'\s+', ' ', s).strip().replace('’', "'")
for spec in json.load(open(manifest)):
    card=json.load(open(root/(spec['id']+'-card.json')))
    pdf=fitz.open(spec['path']); words=[p.get_text('words') for p in pdf]
    summary={'id':spec['id'],'source_sha256':hashlib.sha256(pathlib.Path(spec['path']).read_bytes()).hexdigest(),'career_counts_checked':0,'connection_records_checked':0,'context_mismatches':[],'identities_checked':0,'identity_mismatches':[],'cells_checked':0,'cell_mismatches':[],'unresolved_cells':[]}
    # Right edges independently measured from the printed Premium Plus column headings.
    ends={'e1':224,'e2':236.54,'late':250.11,'shape1':262,'shape2':274,'speed':290}
    for race in card['races'].values():
        for h in race['horses']:
            ev=h['source_evidence'];pn=ev['page']-1;y=pdf[pn].rect.height-ev['name_y']
            row=[w for w in words[pn] if abs(w[3]-(y+2.5))<2 and 35<=w[0]<350]
            header=' '.join(w[4] for w in sorted(row,key=lambda w:w[0]))
            summary['identities_checked']+=1
            if norm(h['name']) not in norm(header):summary['identity_mismatches'].append({'race':race['race'],'program':h['n'],'kind':'name','text':header})
            program=[w[4] for w in words[pn] if abs(w[0]-ev['program_x'])<1 and y+2<w[3]<y+11 and re.fullmatch(r'\d+[A-Z]?',w[4])]
            if program!=[str(h['n'])]:summary['identity_mismatches'].append({'race':race['race'],'program':h['n'],'kind':'program','candidates':program})
            samepage=[other['source_evidence'] for rr in card['races'].values() for other in rr['horses'] if other['source_evidence']['page']==ev['page'] and other['source_evidence']['name_y']<ev['name_y']]
            bottom=min([pdf[pn].rect.height-e['name_y']-8 for e in samepage],default=pdf[pn].rect.height)
            block=norm(pdf[pn].get_text(clip=fitz.Rect(0,y-8,pdf[pn].rect.width,bottom)))
            life=re.search(r'Life:\s*(\d+)\s+(\d+)\s*-\s*(\d+)\s*-\s*(\d+)',block)
            summary['career_counts_checked']+=1
            if not life or int(life[1])!=h['life_starts']:summary['context_mismatches'].append({'race':race['race'],'program':h['n'],'kind':'career starts'})
            for kind in ['jockey','trainer']:
                c=h['source_context'].get(kind)
                if not c:continue
                pattern=re.escape(norm(c['name']))+r'\s*\((\d+)\s+(\d+)-(\d+)-(\d+)\s+\d+%\)'
                found=re.search(pattern,block)
                summary['connection_records_checked']+=1
                if not found or list(map(int,found.groups()))!=[c[k] for k in ['starts','wins','seconds','thirds']]:summary['context_mismatches'].append({'race':race['race'],'program':h['n'],'kind':kind+' local counts'})
                if c.get('annual'):
                    annual=re.match(r'\s*(20\d{2})\s*:\s*\((\d+)\/\s*(\d+)\s+\d+%\)',block[found.end():] if found else '')
                    summary['connection_records_checked']+=1
                    if not annual or list(map(int,annual.groups()))!=[c['annual'][k] for k in ['year','wins','starts']]:summary['context_mismatches'].append({'race':race['race'],'program':h['n'],'kind':kind+' annual counts'})
            for line in h['ratings']['lines']:
                src=line['source'];pn=src['page']-1;y=pdf[pn].rect.height-src['y']
                row=[w for w in words[pn] if abs(w[3]-(y+1.8))<1.2 and 210<w[0]<292]
                for key,end in ends.items():
                    tokens=[w[4] for w in row if abs(w[2]-end)<2]
                    if len(tokens)>1:
                        summary['unresolved_cells'].append({'race':race['race'],'program':h['n'],'date':line['date'],'field':key,'tokens':tokens});continue
                    token=tokens[0].rstrip('/') if tokens else ''
                    value=int(token) if re.fullmatch(r'[+-]?\d+',token) else None
                    if key in ['e1','e2','late','speed'] and value is not None and value<0:value=None
                    summary['cells_checked']+=1
                    if line.get(key)!=value:summary['cell_mismatches'].append({'race':race['race'],'program':h['n'],'date':line['date'],'field':key,'production':line.get(key),'independent':value,'tokens':tokens})
    summary['passed']=not any(summary[k] for k in ['identity_mismatches','context_mismatches','cell_mismatches','unresolved_cells']);report['cards'].append(summary)
report['passed']=all(c['passed'] for c in report['cards'])
(root/'independent-crosscheck.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({c['id']:{k:len(v) if isinstance(v,list) else v for k,v in c.items() if k!='source_sha256'} for c in report['cards']},indent=2))
if not report['passed']:sys.exit(1)
