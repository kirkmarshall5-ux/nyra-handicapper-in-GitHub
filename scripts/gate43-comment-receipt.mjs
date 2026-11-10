import {verifyResearchExport} from '../pre-race-provider-freeze.js';
// Verify GitHub issue #43 *comment* timestamps, not the old issue creation time.
// This never certifies actual off times, chart truth, or betting ROI.
export async function verifyGate43CommentReceipt(exported,comment,{now=Date.now()}={}){
 const errors=[],seal=await verifyResearchExport(exported);
 if(!seal.valid)errors.push(...seal.errors);
 const id=comment?.id,base='https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/43';
 if(!Number.isSafeInteger(id)||id<1||comment?.html_url!==base+'#issuecomment-'+id||
 comment?.url!=='https://api.github.com/repos/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/comments/'+id||
 comment?.issue_url!=='https://api.github.com/repos/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/43')
 errors.push('Receipt must be an issue #43 comment resource.');
 const created=Date.parse(comment?.created_at||''),updated=Date.parse(comment?.updated_at||'');
 const validTime=s=>typeof s==='string'&&/(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
 if(!validTime(comment?.created_at)||!validTime(comment?.updated_at)||created>now||updated>now||updated<created)
 errors.push('Invalid GitHub server timestamps.');
 const digest=exported?.digestSha256;
 if(!/^[a-f0-9]{64}$/.test(digest||'')||!new RegExp('(?:^|[^a-f0-9])'+digest+'(?:$|[^a-f0-9])','i').test(comment?.body||''))
 errors.push('Exact export digest missing from comment.');
 if(!exported?.records?.length)errors.push('At least one frozen prediction required.');
 for(const r of exported?.records||[]){
 const post=Date.parse(r?.scheduledPost||''),frozen=Date.parse(r?.recordedAt||'');
 if(!validTime(r?.scheduledPost)||!(created<post&&updated<post))errors.push('Comment not created and last edited before scheduled post.');
 if(!validTime(r?.recordedAt)||!(frozen<=created))errors.push('Freeze recorded after comment.');
 }
 return {verified:errors.length===0,independentlyTimestamped:errors.length===0,prospectiveCertified:false,
 receiptUrl:errors.length?null:comment.html_url,errors:[...new Set(errors)]};
}
