import fs from 'node:fs';
import {launch,open,paint,captureTable,view,harness,finish} from './hybrid12-lib.mjs';
const out=process.argv[2],H=harness(out),browser=await launch(),details=[];
try{
 for(const width of [1920,1366])for(const observer of ['a','b']){
  const {room,a,b}=captureTable(),p=observer==='a'?a:b;
  const {page,context}=await open(browser,{width,height:width===1920?1080:768},{errors:H.errors});
  await paint(page,view(room,p));
  for(const phase of ['prep','formation']){
   room.phase=phase;a.ready=false;b.ready=false;
   await paint(page,{...view(room,p),turnClock:{phase,key:phase,endsAt:Date.now()+9000}},600);
   const result=await page.evaluate(()=>{
    RunaGeometry.ensure();const emanas=[...document.querySelectorAll('.combat-emanation .card')];
    const cards=[...document.querySelectorAll('.hybrid-surface-card')],samples=cards.map(n=>{
     const pose=RunaGeometry.pose(n),box=n.querySelector('.hybrid-card-face').getBoundingClientRect();
     const expected={left:Math.min(...pose.quad.map(p=>p.x)),right:Math.max(...pose.quad.map(p=>p.x)),top:Math.min(...pose.quad.map(p=>p.y)),bottom:Math.max(...pose.quad.map(p=>p.y))};
     return {uid:n.dataset.uid,error:Math.max(...['left','right','top','bottom'].map(k=>Math.abs(box[k]-expected[k])))};
    });
    const field=RunaGeometry.field(),center=field.quad.reduce((s,p)=>s+p.y,0)/4;
    const slots=[...document.querySelectorAll('.lane-side')].map(n=>({owner:n.dataset.owner,lane:n.dataset.lane,quad:RunaGeometry.zone(n),fog:RunaGeometry.fogZone(n)}));
    const graves=['self-grave','opponent-grave'].map(id=>{const n=document.getElementById(id),p=RunaGeometry.point(n),r=n.getBoundingClientRect();return Math.hypot(p.x-r.x-r.width/2,p.y-r.y-r.height/2);});
    return {emanas:emanas.length,cards:samples,slots,graves,fuse:RunaTurnClock.position,center,anchors:RunaHybrid.anchors,camera:RunaHybrid.stats.cameraTiltDegrees};
   });
   const label=width+' '+observer+' '+phase;
   H.check(label+': quatro Emanações presentes',result.emanas===4,result.emanas);
   H.check(label+': faces e geometria compartilham a posição visível',result.cards.length>0&&result.cards.every(c=>c.error<1),result.cards);
   H.check(label+': seis casas e destinos de névoa atuais',result.slots.length===6&&result.slots.every(s=>s.quad?.length===4&&s.fog?.length===4));
   H.check(label+': painéis e Nartvanyr alinhados',result.graves.every(e=>e<.01)&&result.anchors.every(a=>a.error<1.5),result.anchors);
   H.check(label+': pavio segue o centro e câmera mantém a vista vertical',!!result.fuse&&Math.abs(result.fuse.y-result.center)<1&&result.camera===0,{fuse:result.fuse,center:result.center,camera:result.camera});
   details.push({width,observer,phase,...result});
  }
  await page.screenshot({path:out+'/'+width+'-'+observer+'.png'});await context.close();
 }
 H.check('nenhum erro de página',!H.errors.length,H.errors);
}finally{await browser.close();fs.writeFileSync(out+'/geometry-details.json',JSON.stringify(details,null,2));finish(out,'geometry',H);}
