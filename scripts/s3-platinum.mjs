// Real play/ready actions, with a newer public view delivered during each stage.
import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
import {launch,open,paint,poll,setup,card,view,harness,finish,writeJSON,URL_NATIVE,URL_HYBRID} from './hybrid12-lib.mjs';
const out=process.env.HYBRID_QA_OUT,H=harness(out),runs=[],browser=await launch();
const profiles={FL11:'protocol',FL12:'artillery',FV15:'seals',RG10:'hunt'};
async function stage(page,phase,actor,next){
 const scene=await page.waitForFunction(({phase,id})=>[...document.querySelectorAll('.platinum-entry-scene')].find(n=>n.dataset.card===id&&n.dataset.stage===phase&&+n.dataset.progress>.32),{phase,id:actor.modelId},{timeout:6500}).catch(()=>null);
 if(!scene)return {missing:true};
 const snapshot=(layer,uid)=>{const node=tableCard(uid);return {revision:state.revision,profile:layer.dataset.profile,phase:layer.dataset.stage,progress:+layer.dataset.progress,connected:layer.isConnected,masked:node?.classList.contains('platinum-actor-masked'),slab:window.RunaHybrid?.slabs?.includes(uid)||false,hasArt:!!node?.querySelector('.card-art-canvas')};};
 const before=await scene.evaluate(snapshot,actor.uid);
 // Observe the frame after the new state has rebuilt the DOM, including all microtasks.
 const after=await page.evaluate(async({s,uid})=>{
  const old=tableCard(uid),layer=document.querySelector('.platinum-entry-scene');
  await new Promise(resolve=>requestAnimationFrame(()=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();resolve();}));
  const node=tableCard(uid);return {replaced:old!==node,connected:layer.isConnected,masked:node.classList.contains('platinum-actor-masked'),slab:window.RunaHybrid?.slabs?.includes(uid)||false,progress:+layer.dataset.progress,revision:state.revision};
 },{s:next(),uid:actor.uid});
 await page.waitForFunction(()=>!document.querySelector('.platinum-entry-scene'),null,{timeout:5000});
 const end=await page.evaluate(uid=>({masked:document.querySelectorAll('.platinum-actor-masked').length,scenes:document.querySelectorAll('.platinum-entry-scene').length,restored:!!tableCard(uid)?.checkVisibility({opacityProperty:true,visibilityProperty:true}),lifecycle:window.__platinumLog.map(x=>({...x}))}),actor.uid);
 return {before,after,end};
}
try{
 for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const seat of ['a','b'])for(const [id,profile] of Object.entries(profiles)){
  const label=route+'-'+seat+'-'+id;if(process.env.S3_ONLY&&!label.includes(process.env.S3_ONLY))continue;
  const {context,page}=await open(browser,{width:1440,height:900},{url,errors:H.errors,gpu:H.gpu});
  const {room,a,b}=setup(),me=seat==='a'?a:b,actor=card(id,a),move={type:'play',cardId:actor.uid,protocolMode:'escort'};
  a.hand=[actor];b.hand=[card('FV03',b)];const next=()=>view(room,me);
  const run={label,uid:actor.uid};runs.push(run);
  let feed;
  try{
   await paint(page,next());await page.evaluate(()=>{window.__platinumLog=[];const play=RunaPlatinumEntry.play;RunaPlatinumEntry.play=async function(o){const entry={phase:o.phase,key:o.key};__platinumLog.push(entry);entry.completed=await play.call(this,o);return entry.completed;};});
   if(seat==='a'){
    await page.route('**/api/rooms/*/act',async r=>{act(room,a,r.request().postDataJSON(),catalog);await r.fulfill({json:next()});});
    await page.evaluate(move=>command(move,null,true),move);
   }else{act(room,a,move,catalog);await paint(page,next(),0);}
   run.reserve=await stage(page,'reserve',actor,()=>{act(room,a,{type:'endPrep'},catalog);return next();});
   room.phase='formation';a.formation=[null,actor.uid,null];for(const p of [a,b]){p.ready=false;p.mana=0;}
   if(id==='FV15')act(room,a,{type:'sealLanes',cardId:actor.uid,allyLane:0,enemyLane:2},catalog);
   await paint(page,next(),0);act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);
   feed=poll(page,next);run.combat=await stage(page,'combat',actor,()=>{room.revision++;return next();});
   for(const phase of ['reserve','combat']){
    const {before,after,end}=run[phase],calls=end?.lifecycle.filter(e=>e.phase===phase&&e.completed);
    H.check(label+' '+phase+' correct profile shown with art',before?.profile===profile&&before.hasArt&&before.connected,before);
    H.check(label+' '+phase+' same scene masks replacement before paint, no faceless body',before?.masked&&!before.slab&&after?.revision>before.revision&&after.connected&&after.replaced&&after.masked&&!after.slab,after);
    H.check(label+' '+phase+' completed once and released scene and masks',calls?.length===1&&!end.masked&&!end.scenes&&end.restored,end);
   }
  }catch(error){H.check(label+' scenario completed',false,String(error));}
  finally{await feed?.stop();await context.close();writeJSON(out+'/platinum-detail.json',runs);}
 }
 H.check('no runtime/WebGL errors',!H.errors.length&&!H.gpu.length);
}finally{finish(out,'platinum',H);await browser.close();}
