// Bloco B · recodifica um vídeo a partir dos quadros salvos por b-live-sequence (frames.json + JPEGs).
// Usage: node scripts/b-encode-frames.mjs <raw-dir> <out.mp4> <width> <height> [fromEpochMs] [count] [mime] [cpu 0|1]
import fs from 'node:fs';import path from 'node:path';import {chromium,CHROME} from './hybrid12-lib.mjs';import {encode} from './b-screencast.mjs';
const [dir,out,w,h,from='0',count='0',type='video/mp4;codecs=avc1.640028',cpu='1']=process.argv.slice(2);let frames=JSON.parse(fs.readFileSync(path.join(dir,'frames.json'),'utf8')).filter(f=>f.ts*1000>=Number(from));if(Number(count))frames=frames.slice(0,Number(count));
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
console.log(JSON.stringify(await encode(browser,frames,out,{width:Number(w),height:Number(h),types:[type],cpu:cpu==='1'})));await browser.close();
