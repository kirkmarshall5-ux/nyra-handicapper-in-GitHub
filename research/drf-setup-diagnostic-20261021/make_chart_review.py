import json,subprocess,pathlib,math
from PIL import Image,ImageDraw
import fitz
from build_and_validate import CHART
root=pathlib.Path('review');root.mkdir(exist_ok=True);x=json.load(open('evaluation.json'));doc=fitz.open(CHART);items=[]
for rn,label in x['chart_labels'].items():
 p=doc[label['page']-1];spans=[s for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']];a=next(s for s in spans if 'Past Performance Running Line Preview' in s['text']);y=a['bbox'][1]+8;start=min(label['header_columns'].values())-8;h=(len(label['entries'])+2)*9.5+10;prefix=root/('race'+rn)
 subprocess.run(['pdftoppm','-f',str(label['page']),'-l',str(label['page']),'-r','200','-x',str(int(start*200/72)),'-y',str(int(y*200/72)),'-W','880','-H',str(int(h*200/72)),'-png','-singlefile',str(CHART),str(prefix)],check=True,stderr=subprocess.DEVNULL)
 items.append((rn,label,prefix.with_suffix('.png')))
for k in range(math.ceil(len(items)/3)):
 subset=items[k*3:k*3+3];images=[Image.open(it[2]).convert('RGB') for it in subset];height=sum(im.height+45 for im in images);sheet=Image.new('RGB',(1000,height),'white');draw=ImageDraw.Draw(sheet);y=0
 for (rn,label,_),im in zip(subset,images):
  draw.text((8,y+5),f"Race {rn}: extracted first call {label['first_call']} | "+str([(e['program'],e['first_call_position'],e['margin_text']) for e in label['entries']]),fill='black');sheet.paste(im,(8,y+28));y+=im.height+45
 sheet.save(root/('chart-sheet'+str(k+1)+'.png'))
print(len(items),'chart tables rendered')
