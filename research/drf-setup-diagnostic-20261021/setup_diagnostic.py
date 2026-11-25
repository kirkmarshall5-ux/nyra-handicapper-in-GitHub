"""Provider-specific, outcome-free early-rating geometry. No ranking adjustments."""
import math,datetime
def finite(x):return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)

def diagnose(field,clear_gap=10,cluster_band=5,*,race_date):
 datetime.date.fromisoformat(race_date)
 if not finite(clear_gap) or not finite(cluster_band) or clear_gap<=0 or cluster_band<0:raise ValueError('Invalid policy')
 if not field or len({h['source_id'] for h in field})!=len(field):raise ValueError('Unique sourced horse identities required')
 known=[h for h in field if finite(h.get('life_starts')) and h['life_starts']>0 and finite(h.get('early')) and h['early']>=0]
 unknown=[h['source_id'] for h in field if h not in known]
 ordered=sorted(known,key=lambda h:(-h['early'],h['source_id']))
 top=ordered[0]['early'] if ordered else None
 ties=[h['source_id'] for h in ordered if h['early']==top]
 gap=top-ordered[1]['early'] if len(ordered)>=2 else None
 cluster=[h['source_id'] for h in ordered if top-h['early']<=cluster_band]
 geometry='INCOMPLETE_EARLY_EVIDENCE' if unknown or len(ordered)<2 else 'CLEAR_EARLY_RATING_GAP' if gap>=clear_gap else 'CLOSE_TOP_EARLY_RATINGS' if len(cluster)>=2 else 'INTERMEDIATE_GEOMETRY'
 # Proxies cannot satisfy source-style verification. This gate is independent of Early rank.
 def dated_style(h):
  dates=h.get('reviewed_prior_dates',[])
  try:return len(set(dates))>=2 and all(datetime.date.fromisoformat(d).isoformat()<race_date for d in dates)
  except (ValueError,TypeError):return False
 style_known=[h for h in field if h.get('verified_style') in ['E','EP','P','S'] and h.get('style_evidence_status')=='REVIEWED_PRIOR_CALLS' and h.get('reviewed_line_count',0)>=2 and h.get('reviewed_source_ids') and dated_style(h)]
 complete_styles=len(style_known)==len(field)
 leaders=[h['source_id'] for h in style_known if h.get('verified_style')=='E' and h['source_id'] in cluster]
 interpreted='UNCERTAIN_MISSING_EARLY' if geometry=='INCOMPLETE_EARLY_EVIDENCE' else 'UNCERTAIN_UNVERIFIED_STYLES' if not complete_styles else 'POSSIBLE_COMPETITIVE_LEAD_SEEKERS' if len(leaders)>=2 else 'POSSIBLE_CLEAR_LEAD' if geometry=='CLEAR_EARLY_RATING_GAP' and ordered[0] in style_known and ordered[0].get('verified_style') in ['E','EP'] else 'NO_STRONG_SETUP_SIGNAL'
 return {'field_size':len(field),'known_early':len(known),'unknown_ids':unknown,'highest_early_ids':ties,'highest_early':top,'top_two_gap':gap,'cluster_band':cluster_band,'clear_gap':clear_gap,'front_cluster_ids':cluster,'front_cluster_count':len(cluster),'geometry':geometry,'verified_style_count':len(style_known),'interpretation':interpreted,'early_order':[{'source_id':h['source_id'],'early':h['early']} for h in ordered],'confidence':'UNVALIDATED_DIAGNOSTIC','rankings_changed':False,'betting_enabled':False,'probabilities_calibrated':False}
