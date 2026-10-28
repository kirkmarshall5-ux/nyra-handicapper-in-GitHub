// Read-only current-model evidence for the context crosscheck; parsed cards stay private.
import fs from 'node:fs';import path from 'node:path';import {rankBrisnetModels} from '../brisnet-models.js';
const [manifest,dir]=process.argv.slice(2);if(!dir)throw Error('Supply manifest.json and private card directory');
const out={};for(const s of JSON.parse(fs.readFileSync(manifest))){const c=JSON.parse(fs.readFileSync(path.join(dir,s.id+'-card.json')));out[s.id]=Object.values(c.races).map(r=>({race:r.race,model:rankBrisnetModels(r).contender}));}fs.writeFileSync(path.join(dir,'pace-model-evidence.json'),JSON.stringify(out));
