// S5 probe: structured confrontation entries in the Registro, real engine, five cases:
// zero / one / two deaths, redirected target (Provocar), damage by another effect (FV16).
// Per case and route: a mid-reveal state (first resolution done, casualties not yet public),
// the full reveal (painted twice: no duplicates), then the next round (entries kept).
// Usage: node scripts/s5-record.mjs <out-dir>
import fs from 'node:fs';
import {launch,open,paint,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup,place,unit,card,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s5/record';fs.mkdirSync(out,{recursive:true});
const CASES={
 'zero-mortes':({a,b})=>{place(a,unit(a,{attack:1,health:9}),0);place(b,unit(b,{attack:2,health:9}),0);},
 'uma-morte':({a,b})=>{place(a,unit(a,{attack:5,health:9}),0);place(b,unit(b,{attack:2,health:3}),0);},
 'duas-mortes':({a,b})=>{place(a,unit(a,{attack:5,health:3}),0);place(b,unit(b,{attack:5,health:3}),0);},
 'redirecionado':({room,a,b})=>{const g=place(a,card('FL16',a),1);place(a,unit(a,{attack:2,health:9}),0);place(b,unit(b,{attack:3,health:9}),0);place(b,unit(b,{attack:4,health:9}),1);return ()=>act(room,a,{type:'taunt',cardId:g.uid,lane:0},catalog);},
 'outro-efeito':({a,b})=>{place(a,unit(a,{attack:1,health:9}),0);place(b,unit(b,{attack:1,health:9}),0);place(b,unit(b,{attack:1,health:9}),1);a.prepared.push({card:card('FV16',a),lane:0,targetSide:b.id});},
};
function build(name){const t=setup(),{room,a,b}=t;const pre=CASES[name](t);room.phase='formation';a.ready=b.ready=false;pre?.();act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);
 if(room.phase!=='resolving')throw Error(name+': combat did not start ('+room.phase+')');
 const tl=room.combat.timeline,first=tl.findIndex(s=>['clash','strike','magic'].includes(s.kind)),dur=tl.slice(0,first+1).reduce((n,s)=>n+s.duration,0);
 const at=ms=>{room.combat.startedAt=Date.now()-ms;return {...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()};};
 const mid=at(dur+150),full=at(room.combat.duration+300);const next=(()=>{resolveCombat(room);return {...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()};})();
 return {mid,full,next,kinds:tl.map(s=>s.kind),casualtiesInFull:full.combat?.casualties||null};}
const entries=page=>page.evaluate(()=>[...document.querySelectorAll('#log .combat-record .cr-entry,#log .combat-record .cr-pending')].map(p=>p.textContent));
const results=[],browser=await launch();
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const name of Object.keys(CASES))for(const [w,h,dev] of [[1440,900,'desktop'],[390,800,'phone']]){
 if(dev==='phone'&&!['duas-mortes','redirecionado'].includes(name))continue;
 const s=build(name);const {context,page}=await open(browser,{width:w,height:h},{url});const rec={route,dev,case:name,kinds:s.kinds.join(','),casualties:s.casualtiesInFull};
 await paint(page,s.mid,350);rec.mid=await entries(page);
 await paint(page,s.full,350);rec.full=await entries(page);await paint(page,{...s.full,serverNow:Date.now()},350);rec.fullRepeat=await entries(page);
 await paint(page,s.next,450);rec.next=await entries(page);rec.noDuplicate=rec.full.length===rec.fullRepeat.length&&JSON.stringify(rec.full)===JSON.stringify(rec.fullRepeat);
 await page.evaluate(()=>{const d=document.getElementById('camp-log');if(d){d.open=true;d.querySelector('.log')?.scrollTo(0,0);}});await page.waitForTimeout(250);
 const drawer=await page.$('#camp-log');if(drawer)await drawer.screenshot({path:`${out}/registro-${route}-${dev}-${name}.png`}).catch(()=>{});
 results.push(rec);await context.close();
 console.log(`== ${route} ${dev} ${name} [${rec.kinds}] baixas=${JSON.stringify((rec.casualties||[]).map(c=>c.uid))} semDuplicar=${rec.noDuplicate}`);
 console.log('  meio:  ',JSON.stringify(rec.mid));console.log('  cheio: ',JSON.stringify(rec.full));console.log('  próx.: ',rec.next.length,'entradas mantidas');}}finally{await browser.close();}
fs.writeFileSync(`${out}/s5-record.json`,JSON.stringify(results,null,1));
