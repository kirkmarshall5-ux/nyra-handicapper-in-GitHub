import collections,csv,gzip,json,pathlib,re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape,letter
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether
ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
data=json.loads(gzip.decompress((ROOT/'results.json.gz').read_bytes()));s=data['summary'];rows=data['rows'];freeze=json.loads(gzip.decompress((ROOT/'final-prediction-freeze.json.gz').read_bytes()));by={r['key']:r for r in freeze['races']};source=json.loads((ROOT/'parse-summary.json').read_text());excluded=list(csv.DictReader((ROOT/'excluded-horses.csv').open()))
styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='Title2',fontName='DejaVuBold',fontSize=22,leading=27,textColor=colors.HexColor('#15334c'),spaceAfter=10));styles.add(ParagraphStyle(name='H2x',fontName='DejaVuBold',fontSize=12,leading=15,spaceBefore=10,spaceAfter=6,textColor=colors.HexColor('#15334c')));styles.add(ParagraphStyle(name='Bodyx',fontName='DejaVu',fontSize=9,leading=13,spaceAfter=7));styles.add(ParagraphStyle(name='Smallx',fontName='DejaVu',fontSize=7.5,leading=10,spaceAfter=5));styles.add(ParagraphStyle(name='Cellx',fontName='DejaVu',fontSize=8,leading=10))
styles.add(ParagraphStyle(name='TinyCell',fontName='DejaVu',fontSize=7.5,leading=9.5,spaceAfter=0))
story=[]
def p(text,style='Bodyx'):return Paragraph(text,styles[style])
def add(text,style='Bodyx'):story.append(p(text,style))
def table(values,widths,small=False):
 vals=[[p(escape(str(x)),'TinyCell' if small else 'Cellx') for x in row] for row in values];t=Table(vals,colWidths=widths,repeatRows=1,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e5eef5')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#15334c')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),3 if small else 4),('BOTTOMPADDING',(0,0),(-1,-1),2 if small else 3),('LINEBELOW',(0,0),(-1,0),.6,colors.HexColor('#92aabd')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f8fa')]) ]));return t
def footer(canvas,doc):
 canvas.setFont('DejaVu',7);canvas.setFillColor(colors.HexColor('#587081'));canvas.drawString(36,21,'AQU20 research | October 21, 2026 | Retrospective final-field evaluation | Live models unchanged');canvas.drawRightString(756,21,str(doc.page))
def seq(a):return '-'.join(a[:4]) if a else '-'
add('Contender and simple baselines','Title2');add('20 newly released Aqueduct cards | January 17-April 9, 2026','H2x')
add('<b>Decision: keep current Contender unchanged.</b> Removing its current context term produced only a tiny finishing-order difference and did not establish improvement. The morning line is a useful benchmark. The strict recent-three pace/Beyer model could not be run because individual historical pace figures are absent.')
add('20 source cards contain 169 scheduled races. Official cancellations remove 13 races, leaving <b>156 completed races across 19 dates and 1,032 starters</b>. All 20 cards are now used research data; the other ten reserved cards remain unopened. This is a historical test, not a pre-race prospective confirmation.')
add('Matched comparison: same 131 complete-field races','H2x')
vals=[['Measure','Current Contender','Context removed','Morning line']]
cc=s['common_contender_ml']
for label,key in [('Top-four slots covered','covered_finishers'),('Winner selected in top four','winner_selected'),('First-choice winners','winner'),('Exacta in order','exacta'),('Trifecta in order','trifecta'),('Exact top four in order','superfecta')]:
 vals.append([label,*[str(x[key])+('/524' if key=='covered_finishers' else '/131' if key=='winner_selected' else '') for x in cc]])
vals.append(['Correctly ordered actual-top-four pairs',*[f"{x['pairs_correct']}/{x['pairs_possible']}" for x in cc]]);vals.append(['Mean rank error (lower is better)',*[f"{x['rank_error']:.4f}" for x in cc]])
story.append(table(vals,[270,145,145,145]));story.append(Spacer(1,8))
add('The candidate changes nine full rankings. It gains three pair comparisons and one covered finisher; winners and exact ordered 2/3/4 finishes are unchanged. Candidate-minus-current rank-error difference: <b>-0.00191</b>; paired whole-card 95% interval: <b>-0.00845 to +0.00403</b>. The interval includes no improvement.')
add('Twenty-five completed races have partial Contender rankings and are excluded from primary whole-field totals. Eight completed races have only four starters. Restricting the Contender comparison to at least five starters leaves 123 races and the same inconclusive conclusion. No weights, matching rules or live models were changed.','Smallx')
story.append(PageBreak())
add('What the two reference approaches showed','Title2')
add('Four shortest morning-line prices','H2x')
add('<b>465 of 624 top-four slots (74.5%)</b> across 156 completed races; average <b>2.98 of four</b> selections placed in the actual top four. Three or four selections hit in 126/156 races. The winner was selected in 134/156. Exact ordered 2/3/4 finishes: 16/5/1. These totals use a larger cohort than Contender; use page 1 for the matched comparison.')
add('Races with 0 / 1 / 2 / 3 / 4 top-four hits: <b>1 / 2 / 27 / 95 / 31</b>. Equal prices are ordered by ascending program number; 25 selection-boundary ties are flagged. Source morning lines are used throughout, never final betting odds.')
matrix=[['M/L rank','Finished 1st','2nd','3rd','4th','Outside top four']]+[[i+1,*v] for i,v in enumerate(s['morning_line_rank_by_actual_finish_1_2_3_4_outside'])];story.append(table(matrix,[85,110,95,95,95,225]))
add('Strict last-three pace/Beyer combination: unavailable','H2x')
add('You chose equal weighting and retained the exact last-three requirement. These DRF cards print one historical Beyer per race, but only summary TimeformUS Early/Late ratings. Those summaries cannot stand in for three individual pace figures. <b>No combined-model hit rate is reported.</b>')
add('Authorized diagnostic: last-three average Beyer only','H2x')
add('Of 1,032 starters, <b>147 had fewer than three prior races</b> (41 with zero, 55 with one, 51 with two). Another <b>39 lacked a certified Beyer in the exact latest three rows</b>. Both groups were excluded. The remaining 846 horses supply three figures; older usable figures never replace a missing recent one.')
add('At least four horses qualified in 135 races; 21 races had too few and were not padded. The diagnostic covered <b>391/540 top-four slots (72.4%)</b>, averaging 2.90 hits. The winner was selected in 107/135; first-choice winners 33; exact ordered 2/3/4 finishes 9/4/0. Hit-count distribution 0/1/2/3/4: 0/7/26/76/26.')
add('Ordering is conditional: only 104 diagnostic races have all four actual finishers in its eligible ranking. On 102 common races where all four methods rank every actual top-four finisher, current/no-context/M/L/Beyer coverage is 300/301/303/308 of 408, while pair order is 366/367/373/342 of 612. This restricted, outcome-conditioned cohort does not establish a general benefit.','Smallx')
story.append(PageBreak())
add('Card coverage and source checks','Title2')
add('All source programs, names, morning lines, lifetime starts and printed Early/Late summaries were reconciled independently for 1,240 listed horses. All 3,051 source-field Beyer cells used in recent-three averages were independently checked. Official NYRA final fields account for 1,032 starters, 112 scratches and 96 entries in canceled races.')
inv=[['Aqueduct date','Scheduled races','Completed','Canceled','Final starters','Complete Contender races']]
for c in sorted(source,key=lambda c:c['date']):
 rr=[r for r in rows if r['date']==c['date']];inv.append([c['date'],c['races'],len(rr),c['races']-len(rr),sum(r['field_size'] for r in rr),sum(r['contender_full_field'] for r in rr)])
story.append(table(inv,[110,115,100,100,125,155],True))
add('Cancellations: NYRA stopped the January 17 card after Race 4 (R5-R9 canceled), and canceled the full February 22 card due to a winter storm.','Smallx')
add('Official notices: nyra.com/aqueduct/news/remainder-of-saturday-card-canceled-at-aqueduct-racetrack/ and nyra.com/aqueduct/news/live-racing-at-aqueduct-canceled-on-sunday-feb-22-due-to-winter-storm/. Every completed race URL, full field and top four are retained in the research evidence.','Smallx')
add('Method: score the same verified final starters in both Contender arms. Only contribution 8 is removed. Average Beyer uses exactly the latest three certified prior rows; no surface/distance filter was added to this simple reference model. Existing Contender matching rules remain unchanged. Initial public result checks and daily pages were accessed before source-field freezing; models were fixed and no tuning followed. Do not call this outcomes-blind or prospective. Twenty verification checks pass.','Smallx')
story.append(PageBreak())
add('Race-by-race selections and actual top four','Title2')
add('Program sequences are ranked first to fourth. C = current Contender; NC = context removed; ML = morning line; B3 = last-three average Beyer. P = partial Contender ranking, excluded from primary totals; NA = fewer than four eligible Beyer horses. The hits column uses C / NC / ML / B3.','Smallx')
for c in sorted(source,key=lambda c:c['date']):
 rr=sorted([r for r in rows if r['date']==c['date']],key=lambda r:int(r['race']));part=[];part.append(p(c['date']+' | Aqueduct','H2x'))
 if not rr:part.append(p('All eight races officially canceled. No results graded.'));story.append(KeepTogether(part));continue
 vals=[['R','N','Actual','C','NC','ML','B3','Hits C / NC / ML / B3']]
 for r in rr:
  full=r['contender_full_field'];b3=len(r['orders']['LAST3_BEYER_DIAGNOSTIC'])>=4;ords=[seq(r['orders'][a])+(' P' if a in ['CURRENT_CONTENDER','NO_CONTEXT'] and not full else ' NA' if a=='LAST3_BEYER_DIAGNOSTIC' and not b3 else '') for a in ['CURRENT_CONTENDER','NO_CONTEXT','MORNING_LINE','LAST3_BEYER_DIAGNOSTIC']];hits=[str(r['grades'][a]['coverage']) if (full if a in ['CURRENT_CONTENDER','NO_CONTEXT'] else b3 if a=='LAST3_BEYER_DIAGNOSTIC' else True) else 'P' if a in ['CURRENT_CONTENDER','NO_CONTEXT'] else 'NA' for a in ['CURRENT_CONTENDER','NO_CONTEXT','MORNING_LINE','LAST3_BEYER_DIAGNOSTIC']];vals.append([r['race'],r['field_size'],seq(r['actual']),*ords,' / '.join(hits)])
 part.append(table(vals,[30,25,85,90,90,85,90,110],True))
 if c['date']=='2026-01-17':part.append(p('Races 5-9 canceled after Race 4.','Smallx'))
 story.append(KeepTogether(part))
story.append(PageBreak())
add('Horses excluded from recent-three averages','Title2')
add('Actual starters only. These runners are left out of the recent-three Beyer diagnostic; the combined pace/Beyer model is unavailable for everyone because three individual pace figures are absent. Exclusions do not remove horses from the official actual top four or from the morning-line test.','Smallx')
for reason,title in [('FEWER_THAN_THREE_PRIOR_RACES','147 starters with fewer than three prior races'),('MISSING_CERTIFIED_BEYER_IN_EXACT_RECENT_THREE','39 starters with incomplete Beyer evidence in the exact recent three')]:
 add(title,'H2x');vals=[['Date / race','Program','Horse','Lifetime starts','Reason']]
 for x in sorted([x for x in excluded if x['reason']==reason],key=lambda x:(x['race'].split('_')[1],int(x['race'].split('_R')[1]),int(re.match(r'\d+',x['program'])[0]))):vals.append([x['race'].replace('AQU_',''),x['program'],x['horse'],x['life_starts'],'Fewer than 3 starts' if reason=='FEWER_THAN_THREE_PRIOR_RACES' else 'Missing/alignment-unverified recent Beyer'])
 story.append(table(vals,[130,55,220,95,165],True));story.append(Spacer(1,8))
add('Research decision: keep live models unchanged. The 20 released cards are now used; ten other reserved cards remain unopened. Full race, selection, figure and exclusion records are retained with the experiment.','Smallx')
doc=SimpleDocTemplate(str(OUT/'Aqueduct_20_Card_Comparison_20261021.pdf'),pagesize=landscape(letter),leftMargin=36,rightMargin=36,topMargin=30,bottomMargin=36,title='Aqueduct 20 Card Contender and Baseline Comparison',author='NYRA Handicapper Research')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT/'Aqueduct_20_Card_Comparison_20261021.pdf')
