// GitHub issue receipt verification: server-issued created_at is independent of the browser clock.
// A receipt is valid only when its original creation AND latest update precede scheduled post.
// The issue body must contain the exact SHA-256 export digest. Editing after post invalidates it.
export function verifyGitHubTimestampReceipt(exported,issue,{now=Date.now()}={}){
 const errors=[];
 const digest=exported?.digestSha256;
 if(!/^[0-9a-f]{64}$/.test(digest||''))errors.push('Valid export SHA-256 required.');
 if(!issue||typeof issue!=='object'||issue.pull_request)errors.push('GitHub issue receipt required.');
 const url=issue?.html_url||'';
 if(!/^https:\/\/github\.com\/kirkmarshall5-ux\/nyra-handicapper-in-GitHub\/issues\/[1-9]\d*$/.test(url))errors.push('Receipt must be a GitHub issue in the designated repository.');
 const created=Date.parse(issue?.created_at||''),updated=Date.parse(issue?.updated_at||'');
 if(!Number.isFinite(created)||!Number.isFinite(updated)||created>now||updated>now||updated<created)errors.push('Invalid GitHub server timestamps.');
 if(!new RegExp('(?:^|[^0-9a-f])'+digest+'(?:$|[^0-9a-f])','i').test(issue?.body||''))errors.push('GitHub issue body does not contain exact export digest.');
 if(!Array.isArray(exported?.records)||!exported.records.length)errors.push('At least one frozen prediction required.');
 if(exported?.anchorStatus!=='UNVERIFIED_LOCAL_EXPORT'||exported?.mode!=='RESEARCH_ONLY'||exported?.schemaVersion!==3)errors.push('Research export metadata invalid; verify sealed export first.');
 for(const r of exported?.records||[]){
  const post=Date.parse(r?.scheduledPost||'');
  if(!Number.isFinite(post)||!(created<post&&updated<post))errors.push('GitHub receipt was created or modified at or after scheduled post.');
  if(!Number.isFinite(Date.parse(r?.recordedAt||''))||Date.parse(r.recordedAt)>created)errors.push('Local freeze time follows independent receipt creation.');
 }
 return {verified:errors.length===0,errors:[...new Set(errors)],receiptUrl:errors.length?null:url,independentlyTimestamped:errors.length===0};
}
