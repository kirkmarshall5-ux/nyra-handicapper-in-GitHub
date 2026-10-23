import json,pathlib,subprocess,math
from PIL import Image,ImageDraw
x=json.load(open('audit.json'));samples=[];root=pathlib.Path('review');root.mkdir(exist_ok=True)
for c in x['cards']:
 for h in sorted(c['horses'],key=lambda h:h['name']):
  ls=[l for l in h['source']['historical_lines'] if l['calls']]
  if ls:
   l=ls[0];samples.append({'card':c['card'],'horse':h['name'],'source_sha256':c['pdf_sha256'],'pdf_path':c['pdf_path'],**l});break
for i,s in enumerate(samples):
 prefix=root/('row%02d'%(i+1));subprocess.run(['pdftoppm','-f',str(s['page']),'-l',str(s['page']),'-r','200','-x','0','-y',str(max(0,int((s['y']-2)*200/72))),'-W','960','-H','40','-png','-singlefile',s['pdf_path'],str(prefix)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
for k in range(math.ceil(len(samples)/5)):
 sheet=Image.new('RGB',(1080,5*116),'white');draw=ImageDraw.Draw(sheet)
 for j in range(5):
  i=k*5+j
  if i>=len(samples):break
  s=samples[i];calls=[v['position'] for v in s['calls'].values()];draw.text((8,j*116+4),f"{i+1}. {s['card']} | {s['horse']} | page {s['page']} | extracted START / 1C / 2C / STRETCH / FINISH = {calls}",fill='black');im=Image.open(root/('row%02d.png'%(i+1)));sheet.paste(im,(8,j*116+24));draw.text((8,j*116+72),f"Historical date: {s['date']}; field: {s['field_size']}; source margins remain undecoded; no target outcomes used.",fill='black')
 sheet.save(root/('sheet%d.png'%(k+1)))
pathlib.Path('review-sample.json').write_text(json.dumps(samples,indent=2)+'\n');print('review samples',len(samples))
