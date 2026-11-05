// S4 probe: using a spell by clicking it (chooseSpellTarget, the hand-card click path) on
// native and hybrid routes. Records the dialog text, the aim tools and Escape cancellation.
// Usage: node scripts/s4-actions.mjs <out-dir>
import fs from 'node:fs';
import {launch,open,paint,view,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup,card,place,unit} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s4/actions';fs.mkdirSync(out,{recursive:true});
const IDS=['FEX05','FV05','FL13','FV11','FA06','RG06'],result=[],browser=await launch();
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]]){
 const {room,a,b}=setup();room.phase='prep';room.turn=a.id;a.mana=a.manaMax=10;a.hand=IDS.map(id=>card(id,a));place(a,unit(a),0);place(b,unit(b),0);
 const {context,page}=await open(browser,{width:1440,height:900},{url});await paint(page,{...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()},600);
 for(const id of IDS){const r=await page.evaluate(id=>{const c=seat().hand.find(x=>(x.modelId||x.id)===id);const errs=[];const e0=window.err;window.err=m=>errs.push(String(m));try{chooseSpellTarget(c);}finally{window.err=e0;}
   const d=document.getElementById('target-picker'),tools=document.querySelector('.target-aim-tools');
   return {id,name:c?.name,positionOnly:!!c?.positionOnly,directOnly:!!c?.directOnly,dialog:d?.open?d.innerText:null,trapOption:d?.open?/armadilha|Aliada |Inimiga /i.test(d.innerText):false,aim:tools?[...tools.children].map(n=>n.textContent):null,message:errs};},id);
  await page.screenshot({path:`${out}/${route}-${id}.png`}).catch(()=>{});
  if(r.aim){await page.keyboard.press('Escape');r.aimAfterEscape=await page.evaluate(()=>!!document.querySelector('.target-aim-tools'));}
  await page.evaluate(()=>{const d=document.getElementById('target-picker');if(d?.open)d.close();});
  result.push({route,...r});}
 await context.close();}}finally{await browser.close();}
fs.writeFileSync(`${out}/s4-actions.json`,JSON.stringify(result,null,1));
for(const r of result)console.log(r.route,r.id,r.name,'posOnly',r.positionOnly,'directOnly',r.directOnly,'| dialog',JSON.stringify(r.dialog),'trap',r.trapOption,'| aim',JSON.stringify(r.aim),'esc→',r.aimAfterEscape,'| msg',JSON.stringify(r.message));
