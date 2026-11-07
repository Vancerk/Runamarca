// Read-only source override for the exact pre-flight baseline. The engine and
// assertions are the regular combat-duplicates test, including its native control.
import fs from 'node:fs';import path from 'node:path';
import {sourceOverride} from './hybrid12-lib.mjs';
if(process.env.QA_FLIGHT_BASELINE==='1'){
 const root=path.resolve('prototype-qa/codex-voos-fluidez-20261107');
 for(const {file} of JSON.parse(fs.readFileSync(path.join(root,'baseline-hashes.json')))){
  sourceOverride.files['/runamarca/'+file.slice('mesa-nova/'.length)]={path:file,body:fs.readFileSync(path.join(root,'source-before',file))};
 }
 sourceOverride.label='flight-baseline';
}
try{await import('./hybrid12-combat-duplicates.mjs');}
finally{fs.writeFileSync(path.join(process.env.HYBRID_QA_OUT,'source-override.json'),JSON.stringify({label:sourceOverride.label,served:sourceOverride.served},null,2));}
