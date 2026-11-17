// Research-only pace compatibility experiment. Does not change live rankings.
// Inputs must be derived from frozen, pre-result Brisnet PPs. No result leakage.
const finite = x => typeof x === 'number' && Number.isFinite(x);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const PACE_COMPANION_VERSION = 'research-v0.1';
export const VALID_STYLES = ['E', 'EP', 'P', 'S'];
function styleOf(h) {
  const s = String(h.runStyle ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return s === 'EP' || s === 'E' || s === 'P' || s === 'S' ? s : null;
}
// This deliberately tests only ONE bounded adjustment, not a new base model.
// The early-pressure count is an observable PP-derived proxy, not a prediction.
export function paceScenario(horses) {
  const active = horses.filter(h => !h.scratched && h.active !== false);
  const styles = active.map(styleOf);
  const early = styles.filter(s => s === 'E').length;
  const pressers = styles.filter(s => s === 'EP').length;
  const known = styles.filter(Boolean).length;
  const unknown = active.length - known;
  const pressure = early + 0.5 * pressers;
  const scenario = pressure >= 2.5 ? 'FAST' : pressure <= 1 ? 'SLOW' : 'MODERATE';
  return { scenario, early, pressers, pressure, known, unknown,
    confidence: active.length ? known / active.length : 0 };
}
const fit = {
  FAST: { E:-1, EP:0, P:1, S:1 },
  MODERATE: { E:0, EP:1, P:1, S:0 },
  SLOW: { E:1, EP:1, P:0, S:-1 }
};
/**
 * @param {Array<{program:string, runStyle:string, finisherScore:number, scratched?:boolean, active?:boolean}>} horses
 * @param {string} rrFirstProgram - Brisnet RR #1 from the same frozen race
 * @param {number} adjustment - maximum point change in Finisher's 0-100 score, default 5
 * Research-only: unknown styles get zero adjustment, never inferred.
 */
export function rankPaceCompanions(horses, rrFirstProgram, adjustment = 5) {
  if (!Array.isArray(horses) || !horses.length || !rrFirstProgram)
    throw new Error('Frozen active field and RR #1 required');
  if (!finite(adjustment) || adjustment < 0 || adjustment > 5)
    throw new Error('Research adjustment must be between 0 and 5');
  const active = horses.filter(h => !h.scratched && h.active !== false);
  if (new Set(active.map(h => String(h.program))).size !== active.length)
    throw new Error('Duplicate active program number');
  if (!active.some(h => String(h.program) === String(rrFirstProgram)))
    throw new Error('RR #1 must be an active runner');
  const scenario = paceScenario(active);
  const ranked = active.filter(h => finite(h.finisherScore)).map(h => {
    const style = styleOf(h);
    const adjustmentPoints = style ? adjustment * scenario.confidence * fit[scenario.scenario][style] : 0;
    return { program:String(h.program), runStyle:style, baseScore:h.finisherScore,
      adjustmentPoints, score:h.finisherScore + adjustmentPoints };
  }).sort((a,b) => b.score-a.score || b.baseScore-a.baseScore || a.program.localeCompare(b.program,undefined,{numeric:true}));
  return { version:PACE_COMPANION_VERSION, scenario, rrFirstProgram:String(rrFirstProgram),
    ranked, companion:ranked.find(h => h.program !== String(rrFirstProgram)) ?? null,
    originalFinisher:ranked.slice().sort((a,b)=>b.baseScore-a.baseScore || a.program.localeCompare(b.program,undefined,{numeric:true})),
    researchOnly:true };
}
