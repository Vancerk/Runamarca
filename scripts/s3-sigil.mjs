import {act,catalog,place} from '../mesa-nova/r1-fixtures.mjs';
import {launch,open,paint,poll,setup,card,view,harness,finish,writeJSON,URL_NATIVE,URL_HYBRID} from './hybrid12-lib.mjs';
const out=process.env.HYBRID_QA_OUT,H=harness(out),runs=[],browser=await launch();
// Two consecutive FV16 activations on the same creature. First the adjacent
// house is free. Then the next house is occupied and the collision is lethal.
function observe({uid,owner}){
 const log=window.__sigil={winds:[],pushes:[],flights:[],rings:[]};let activeWind=-1;
 const midpoint=n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
 const current=()=>document.querySelector('#visual-layer .visual-card[data-uid="'+uid+'"]')||tableCard(uid);
 const lane=i=>midpoint(document.querySelector('.lane-side[data-owner="'+owner+'"][data-lane="'+i+'"]'));
 const damage=RunaDamageFX.play,flight=safeFlight,push=animatePushCollision;
 RunaDamageFX.play=async function(o){if(o.kind!=='wind')return damage.call(this,o);
  const rec={};log.winds.push(rec);activeWind=log.winds.length-1;
  try{return await damage.call(this,{...o,onHit:()=>{rec.impact=midpoint(current());return o.onHit();}});}finally{activeWind=-1;}
 };
 const ellipse=CanvasRenderingContext2D.prototype.ellipse;
 CanvasRenderingContext2D.prototype.ellipse=function(x,y,...args){
  if(activeWind>=0&&this.canvas.classList.contains('damage-fx-canvas')&&this.strokeStyle==='#b2e1e8'&&current()){
   const v=midpoint(current());log.rings.push({wind:activeWind,x,y,v,error:Math.hypot(x-v.x,y-v.y)});
  }return ellipse.call(this,x,y,...args);
 };
 animatePushCollision=async function(spell){const r={origin:midpoint(current()),lane0:lane(0),lane1:lane(1),lane2:lane(2),push:spell.push};
  log.pushes.push(r);await push(spell);r.end=current()&&midpoint(current());r.defeated=visuallyDefeated.has(uid);
 };
 safeFlight=async function(copy,frames,options,id){if(id===uid){const a=midpoint(copy),last=new DOMMatrix(frames.at(-1).transform),peak=new DOMMatrix(frames[1].transform);
  log.flights.push({dead:copy.classList.contains('visual-dead'),start:a,peak:{x:a.x+peak.e,y:a.y+peak.f},end:{x:a.x+last.e,y:a.y+last.f},grave:midpoint($(owner===state.you?'self-grave':'opponent-grave'))});}
  return flight(copy,frames,options,id);
 };
}
try{
 for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const seat of ['a','b']){
  const label=route+'-'+seat;if(process.env.S3_ONLY&&!label.includes(process.env.S3_ONLY))continue;
  const {room,a,b}=setup(),me=seat==='a'?a:b;
  const victim=place(b,card('FV03',b,{health:2,damage:0}),0),neighbor=place(b,card('FV03',b),2);
  for(const lane of [0,1])a.prepared.push({card:card('FV16',a),lane,targetSide:b.id});
  room.phase='formation';const {context,page}=await open(browser,{width:1440,height:900},{url,errors:H.errors,gpu:H.gpu});
  let feed;
  try{
   await paint(page,view(room,me));await page.evaluate(observe,{uid:victim.uid,owner:b.id});
   act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);
   const timeline=room.combat.timeline.map(s=>({kind:s.kind,spell:s.spell,casualties:s.kind==='result'?room.combat.casualties:undefined}));
   feed=poll(page,()=>view(room,me));
   await page.waitForFunction(()=>state.phase!=='resolving'&&__sigil.pushes.length>0,null,{timeout:room.combat.duration+9000});
   await feed.stop();const r=await page.evaluate(()=>window.__sigil);runs.push({label,uid:victim.uid,timeline,...r});
   const [first,second]=r.pushes,[move,bump,grave]=r.flights,dist=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
   H.check(label+' two FV16 hits on same victim, second collides with neighbor',r.winds.length===2&&first?.push.targetId===victim.uid&&second?.push.collisionId===neighbor.uid);
   H.check(label+' first flight advances one house and next impact starts there',move&&first&&second&&dist(move.start,first.origin)<=1.5&&Math.abs(move.end.x-first.lane1.x)<=2&&dist(second.origin,move.end)<=2,{move,first,second});
   H.check(label+' collision lunges toward occupied house and returns to last position',bump&&second&&Math.sign(bump.peak.x-bump.start.x)===Math.sign(second.lane2.x-second.origin.x)&&dist(bump.peak,bump.start)>5&&dist(bump.end,second.origin)<=2&&second.defeated,bump);
   const worst=r.rings.reduce((a,b)=>b.error>(a?.error??-1)?b:a,null);
   H.check(label+' wind impact rings follow visible victim through motion',r.winds.every((_,i)=>r.rings.filter(x=>x.wind===i).length>=3)&&worst?.error<=2,worst);
   H.check(label+' casualty leaves last position for owner Nartvanyr and engine discards it',grave?.dead&&dist(grave.start,second?.end)<=2&&dist(grave.end,grave.grave)<=2&&b.discard.some(c=>c.uid===victim.uid),grave);
  }catch(e){H.check(label+' scenario finished',false,String(e));}
  finally{await feed?.stop();await context.close();writeJSON(out+'/sigil-detail.json',runs);}
 }
 H.check('no runtime/WebGL errors',!H.errors.length&&!H.gpu.length);
}finally{finish(out,'sigil',H);await browser.close();}
