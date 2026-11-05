// Revisão 11: comparativo antes/depois a partir de prototype-qa/hybrid-11/{before,after}/measure.json
// e inventário de elementos fora da tela. Grava prototype-qa/hybrid-11/report.json.
import fs from 'node:fs';
const B=JSON.parse(fs.readFileSync('prototype-qa/hybrid-11/before/measure.json','utf8')),A=JSON.parse(fs.readFileSync('prototype-qa/hybrid-11/after/measure.json','utf8'));
const r=(x,d=1)=>x==null?null:+(+x).toFixed(d),rows=[],crops=[];
for(const a of A.viewports){const b=B.viewports.find(v=>v.id===a.id);if(!b)continue;const s=a.snap,o=b.snap,size=k=>o.sizes[k]&&s.sizes[k]?r(s.sizes[k].w/o.sizes[k].w,3):null;
 rows.push({id:a.id,zoom:[r(o.layout?.scale*1,3),r(s.layout?.zoom,4)],fit:[r(o.layout?.scale,3),r(s.layout?.fit,3)],tilt:[r(o.camera.cameraTiltDegrees,10),r(s.camera.cameraTiltDegrees,10)],
  hover:{widthToHand:[r(b.hover?.widthRatio,3),r(a.hover?.widthRatio,3)],heightOfViewport:[r(b.hover?.heightOfViewport,3),r(a.hover?.heightOfViewport,3)],gapToViewportBottom:[r(b.hover?.bottomFromViewportBottom),r(a.hover?.bottomFromViewportBottom)],bottomBelowHandTop:[r(b.hover?.previewBottomMinusSourceTop),r(a.hover?.previewBottomMinusSourceTop)]},
  handPatronGap:[o.handPatron.gapPatronToHand,s.handPatron.gapPatronToHand],panels:{leftInset:[o.panels.leftInset,s.panels.leftInset],rightInset:[o.panels.rightInset,s.panels.rightInset],edgeTrimPerSide:[r(o.partition?.edgeTrim/o.partition?.originalWidth*100,2)+'%',r(s.partition?.edgeTrim/s.partition?.originalWidth*100,2)+'%']},
  growth:Object.fromEntries(['handCard','rivalBack','reserveCard','emanaCard','selfPatron','selfPower','phaseButton','nartvanyr','centerActions','selfReserve','selfDeck','rivalDeck','lanes','menu'].map(k=>[k,size(k)])),
  decks:s.decks.map(d=>d&&{side:d.side,gapToReserveRight:d.gapToReserveRight,centerYOffset:d.centerYOffset}),rivalHandExtraCrop:r(s.fan.rival.overflowCrop),rivalHandShown:[r(o.fan.rival.visible),r(s.fan.rival.visible)],layoutOverflow:r(s.layout?.overflow)});
 for(const c of s.crops)if(!/#hand>|rival-hand-back/.test(c.selector))crops.push({id:a.id,...c});}
const handCrop=A.viewports.map(a=>({id:a.id,own:a.snap.crops.filter(c=>c.selector==='#hand>.hand-card').map(c=>c.cut.bottom),rival:a.snap.crops.filter(c=>c.selector.includes('rival-hand-back')).map(c=>c.cut.top)}));
const report={rows,newCrops:crops,handCrop,timing:{before:B.timing.map(t=>({id:t.id,opening:r(t.opening.total),draw:r(t.draw.total)})),after:A.timing.map(t=>({id:t.id,opening:r(t.opening.total),draw:r(t.draw.total),openingRatio:r(t.opening.total/B.timing.find(x=>x.id===t.id).opening.total,3)}))},reserves:A.reserves,emptyDeck:A.emptyDeck,stability:{before:B.stability,after:A.stability},errors:{before:B.errors,after:A.errors,gpu:A.gpu}};
fs.writeFileSync('prototype-qa/hybrid-11/report.json',JSON.stringify(report,null,1));
for(const x of rows)console.log(x.id,JSON.stringify({zoom:x.zoom,hover:x.hover,gap:x.handPatronGap,panels:x.panels,growth:x.growth,rival:[x.rivalHandShown,x.rivalHandExtraCrop],decks:x.decks}));
console.log('newCrops',JSON.stringify(crops.map(c=>[c.id,c.selector,c.index,c.cut])));console.log('handCrop',JSON.stringify(handCrop.map(h=>[h.id,Math.max(0,...h.own),Math.max(0,...h.rival)])));console.log('timing',JSON.stringify(report.timing));
