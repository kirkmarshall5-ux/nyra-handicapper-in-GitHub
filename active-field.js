// Shared field eligibility; identity requirements remain caller-specific.
export function activeRunner(h){return h.odds!=='SCR'&&((!h.entry_status||h.entry_status==='REGULAR')?h.included_in_frozen_field!==false:['AE','ALSO_ELIGIBLE'].includes(h.entry_status)&&h.included_in_frozen_field===true);}
