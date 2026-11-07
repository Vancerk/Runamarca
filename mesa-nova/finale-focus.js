// Presentation only: keep both known Patron portraits in the table's screen space.
(function(root){
 function begin(scene,players,you,clone){
  scene.classList.add('finale-intro');
  const items=players.filter(p=>p.patron).map(p=>{
   const source=()=>document.querySelector('#'+(p.id===you?'self':'opponent')+'-head .patron-avatar');
   const original=source();if(!original)return null;
   const holder=document.createElement('div');holder.className='finale-focus-patron';holder.dataset.owner=p.id;
   const face=clone(original);face.classList.add('finale-focus-face');face.inert=true;holder.append(face);scene.append(holder);
   return {holder,source,face};
  }).filter(Boolean);
  let frame=0,stopped=false;
  const sync=()=>{if(stopped||!scene.isConnected)return;for(const {holder,source,face} of items){const original=source(),r=original?.getBoundingClientRect();if(!r?.width)continue;Object.assign(holder.style,{left:Math.max(18,Math.min(innerWidth-r.width-18,r.left))+'px',top:Math.max(36,Math.min(innerHeight-r.height-36,r.top))+'px',width:r.width+'px',height:r.height+'px'});
   // Retain the source's local coordinates and its effective CSS zoom, including
   // the heart and frame; sizing only the image would shrink those ornaments.
   const w=original.offsetWidth||r.width,h=original.offsetHeight||r.height;face.style.setProperty('width',w+'px','important');face.style.setProperty('height',h+'px','important');face.style.setProperty('transform',`scale(${r.width/w},${r.height/h})`,'important');face.style.transformOrigin='0 0';
  }frame=requestAnimationFrame(sync);};sync();
  return {portrait:id=>items.find(i=>i.holder.dataset.owner===id)?.holder,
   end(){stopped=true;cancelAnimationFrame(frame);for(const {holder}of items)holder.remove();scene.classList.remove('finale-intro');scene.classList.add('finale-result');}};
 }
 root.RunaFinaleFocus={begin};
})(globalThis);
