// Run the complete October 22 DRF research replay locally. Never changes production.
// From repository root: npm ci && node research/run-oct22-replay.mjs /path/to/BEL--10-22-2026.pdf
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pdf=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(pdf))throw Error('Usage: node research/run-oct22-replay.mjs /path/to/BEL--10-22-2026.pdf');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'oct22-drf-replay-'));
const inputs=path.join(tmp,'controlled-inputs'),out=path.join(tmp,'research-controlled');
fs.mkdirSync(inputs);fs.mkdirSync(out);
fs.copyFileSync(pdf,path.join(inputs,'BEL--10-22-2026.pdf'));
const scripts=[
 ['prepare-controlled-drf.mjs',tmp,'22'],
 ['prepare-drf-ordering-input.mjs',path.join(out,'drf22.json'),path.join(root,'research/official-belmont-2026-10-22-finishes.json'),path.join(out,'reconstructed.json')],
 ['verify-oct22-replay-inputs.mjs',path.join(out,'reconstructed.json')],
 ['drf-ordering-stratified.mjs',path.join(out,'reconstructed.json'),path.join(out,'variants.json')],
 ['drf-ordering-roi.mjs',path.join(out,'variants.json'),path.join(root,'research/official-belmont-2026-10-22-payouts.json'),path.join(out,'roi.json')]
];
console.log('Research workspace:',tmp);
for(const [script,...args] of scripts){
 console.log('RUN',script);
 const p=spawnSync(process.execPath,[path.join(root,'research',script),...args],{cwd:root,stdio:'inherit'});
 if(p.error||p.status!==0){console.error('STOPPED: evidence gate failed at '+script+'. Workspace preserved: '+tmp);process.exitCode=1;break;}
}
if(!process.exitCode)console.log('Research-only replay complete. Inspect '+path.join(out,'roi.json')+'; results are retrospective and not certified for live wagering.');
