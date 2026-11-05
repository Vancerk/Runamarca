// Summarizes an s3-mulligan-blur result.json: served hashes, per-batch timing and network failures by URL/reason.
import fs from 'node:fs';
const dir=process.argv[2];const r=JSON.parse(fs.readFileSync(dir+'/result.json','utf8'));
const out={served:r.served,checks:{total:r.checks.length,failed:r.checks.filter(c=>!c.ok&&c.pass!==true&&c.passed!==true).map(c=>c.name||c.label)},network:{},runs:[]};
for(const n of r.network){const key=(n.url||'?').replace(/epidemic\/[^?]*/,'epidemic/*')+' -> '+(n.status||n.reason||'console');out.network[key]=(out.network[key]||0)+1;}
for(const x of r.runs)out.runs.push({id:x.id,mulligan:x.mulliganCount,opening:x.opening.batch,replacement:x.replacement.batch,normal:x.normal.batch,midFlight:x.midFlight,cancelMid:x.cancelMid,afterCancel:x.afterCancel,newMatch:x.newMatch.length+' '+[...new Set(x.newMatch.map(d=>d.presentation))]});
fs.writeFileSync(dir+'/summary.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1).slice(0,6000));
