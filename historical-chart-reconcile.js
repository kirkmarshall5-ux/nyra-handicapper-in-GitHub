// Validate Equibase's full starter roster before changing a historical PP field.
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function reconcileChartStarters(ppHorses, chartField) {
 if (!Array.isArray(ppHorses) || !Array.isArray(chartField) || !chartField.length)
  return {ok:false, reason:'Official starter roster is missing or unreadable.'};
 const byProgram = new Map(ppHorses.map(h=>[String(h.n),h]));
 if (byProgram.size !== ppHorses.length) return {ok:false,reason:'Duplicate PP program numbers.'};
 const starters = new Set();
 for (const h of chartField) {
  const program=String(h.n),pp=byProgram.get(program);
  if (!pp || !normalize(pp.name) || normalize(pp.name)!==normalize(h.name))
   return {ok:false,reason:'Official horse names or programs could not be reconciled: #'+program+' '+h.name};
  if (starters.has(program)) return {ok:false,reason:'Duplicate official starter #'+program};
  starters.add(program);
 }
 return {ok:true,starters:[...starters]};
}
