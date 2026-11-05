// S4: entry screen height. Records the account bar, #welcome and .hero bottom edges against
// the window, saves a whole-window screenshot (footer included) and, on phones, checks that
// the form stays reachable by natural scrolling (name field and buttons hit-testable).
// Usage: node scripts/s4-welcome.mjs <out-dir>
import fs from 'node:fs';
import {launch,open,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
const out=process.argv[2]||'prototype-qa/s4/welcome';fs.mkdirSync(out,{recursive:true});
const result=[],browser=await launch();
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const [w,h] of [[1920,900],[1440,900],[390,800],[320,700]]){
 const {context,page}=await open(browser,{width:w,height:h},{url});await page.waitForTimeout(500);
 const m=await page.evaluate(()=>{const R=n=>{if(!n)return null;const b=n.getBoundingClientRect();return {t:+(b.top+scrollY).toFixed(2),b:+(b.bottom+scrollY).toFixed(2),h:+b.height.toFixed(2)};};
  const welcome=document.getElementById('welcome'),hero=welcome?.querySelector('.hero'),entry=welcome?.querySelector('.entry'),bar=document.querySelector('.account-bar');
  const chain=[];for(let n=welcome;n&&n!==document.documentElement;n=n.parentElement)chain.push(n.tagName.toLowerCase()+(n.id?'#'+n.id:'')+(n.className?'.'+String(n.className).split(' ')[0]:''));
  const es=entry&&getComputedStyle(entry);
  return {innerHeight,scrollHeight:document.documentElement.scrollHeight,bar:R(bar),welcome:R(welcome),hero:R(hero),entry:R(entry),entryBorder:es&&es.borderBottom,
   heroGapToWindowBottom:hero?+(innerHeight-hero.getBoundingClientRect().bottom).toFixed(2):null,welcomeGapToWindowBottom:welcome?+(innerHeight-welcome.getBoundingClientRect().bottom).toFixed(2):null,chain,bodyDisplay:getComputedStyle(document.body).display};});
 await page.screenshot({path:`${out}/${route}-${w}x${h}-window.png`});
 if(w<=390){// natural scroll to the form, then hit-test its controls
  const reach=[];for(const sel of ['#player-name','#create','#join']){await page.locator(sel).scrollIntoViewIfNeeded().catch(()=>{});
   reach.push(await page.evaluate(sel=>{const n=document.querySelector(sel),b=n?.getBoundingClientRect();if(!b||!b.width)return {sel,visible:false};const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return {sel,visible:true,inWindow:b.top>=0&&b.bottom<=innerHeight,hit:hit===n||n.contains(hit),scrollY};},sel));}
  await page.click('#player-name');await page.keyboard.type('Ana');m.typed=await page.inputValue('#player-name');m.focused=await page.evaluate(()=>document.activeElement?.id);
  m.reach=reach;await page.screenshot({path:`${out}/${route}-${w}x${h}-form-scrolled.png`});await page.screenshot({path:`${out}/${route}-${w}x${h}-full.png`,fullPage:true});}
 result.push({route,w,h,...m});await context.close();}}finally{await browser.close();}
fs.writeFileSync(`${out}/s4-welcome.json`,JSON.stringify(result,null,1));
for(const r of result)console.log(r.route,`${r.w}x${r.h}`,'bar',r.bar?.b,'hero.bottom',r.hero?.b,'welcome.bottom',r.welcome?.b,'gapHero',r.heroGapToWindowBottom,'scrollH',r.scrollHeight,'entryBorder',r.entryBorder,r.reach?'reach '+JSON.stringify(r.reach.map(x=>[x.sel,x.hit,x.inWindow]))+' typed='+r.typed:'',r.w===1920&&r.route==='native'?'chain '+r.chain.join(' < '):'');
