/* Presentation only: never sends game commands or changes tutorial progress. */
(()=>{
 const math=globalThis.RunaTutorialFocusLayout;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let cameraActive=false;
 const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 const viewport=()=>{const v=visualViewport;return {x:v?.offsetLeft||0,y:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};};
 function create(panel,shield){
  let current=null,root=null,nodes=[],last='',frame=0,until=0,priorFocus=null,settling=0,fixed=[],spacing=[],obscured=new Set(),renderHandover=null,measuredViewport='',resizeFrame=0,placementAnchor=null;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),dim=document.createElementNS(ns,'path'),line=document.createElementNS(ns,'path'),dot=document.createElementNS(ns,'circle');
  svg.id='tutorial-focus-map';svg.setAttribute('aria-hidden','true');dim.setAttribute('fill-rule','evenodd');dim.classList.add('tutorial-spotlight');line.classList.add('tutorial-connector');dot.classList.add('tutorial-anchor');dot.setAttribute('r','4');const defs=document.createElementNS(ns,'defs'),marker=document.createElementNS(ns,'marker'),arrow=document.createElementNS(ns,'path');marker.id='tutorial-arrowhead';marker.setAttribute('markerWidth','12');marker.setAttribute('markerHeight','12');marker.setAttribute('refX','9');marker.setAttribute('refY','6');marker.setAttribute('orient','auto');marker.setAttribute('markerUnits','userSpaceOnUse');arrow.setAttribute('d','M1,1 L10,6 L1,11');arrow.setAttribute('fill','none');arrow.setAttribute('stroke','#fff0bb');arrow.setAttribute('stroke-width','3');marker.append(arrow);defs.append(marker);line.setAttribute('marker-end','url(#tutorial-arrowhead)');svg.append(defs,dim,line,dot);document.body.append(svg);
  const announcement=document.createElement('div');announcement.className='tutorial-sr-only';announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');document.body.append(announcement);
  panel.setAttribute('tabindex','-1');panel.setAttribute('aria-labelledby','tutorial-title');panel.setAttribute('aria-describedby','tutorial-text');
  function reset({notify=true}={}){document.body.classList.remove('tutorial-camera-mode');cancelAnimationFrame(settling);settling=0;placementAnchor=null;for(const n of obscured)n.classList.remove('tutorial-camera-obscured');obscured.clear();for(const n of document.querySelectorAll('.tutorial-field-focus')){n.classList.remove('tutorial-field-focus');delete n.dataset.tutorialHouse;}document.getElementById('lanes')?.classList.remove('tutorial-field-raised');if(root){root.classList.remove('tutorial-camera-focused','tutorial-camera-animate');for(const name of ['--tutorial-camera-x','--tutorial-camera-y','--tutorial-camera-scale'])root.style.removeProperty(name);root=null;for(const [node,original] of fixed){if(original)node.style.translate=original;else node.style.removeProperty('translate');}fixed=[];for(const [node,value] of spacing){if(value)node.style.translate=value;else node.style.removeProperty('translate');}spacing=[];cameraActive=false;if(notify)globalThis.RunaHybrid?.sync();}panel.dataset.zoom='off';}
  const viewportKey=()=>JSON.stringify([viewport(),devicePixelRatio]);
  function protectedRects(){return [...document.querySelectorAll('#hand .card,#self-reserve .card,#phase-actions,#mulligan-cards .card,#mulligan-controls')].filter(n=>n.getClientRects().length).map(rect);}
  function draw(){
   frame=0;if(!current||panel.hidden){svg.setAttribute('hidden','');return;}
   const v=viewport(),target=math.union(nodes.filter(n=>n.isConnected).map(rect)),p=rect(panel),quiet=current.quiet;
   const anchor=target?math.intersection(target,v):null,visible=anchor&&anchor.width>2&&anchor.height>2?anchor:null;
   // Anchor the bubble to the destination, not each intermediate camera frame:
   // choosing a new nearest side while panning makes the text jump around.
   const placed=math.place(quiet?null:placementAnchor||visible,{width:p.width,height:p.height},v,quiet||!current.paused?protectedRects():[]);
   if(root&&current.paused&&!current.actionable){
    for(const node of root.querySelectorAll('#hand,#opponent-hand,.nartvanyr,#center-actions,#camp-log')){
     if(nodes.some(n=>node===n||node.contains(n)))continue;
     const box=rect(node);if(nodes.some(n=>{const a=math.intersection(box,rect(n));return a.width*a.height>1;})){node.classList.add('tutorial-camera-obscured');obscured.add(node);}
    }
   }
   panel.style.left=placed.x+'px';panel.style.top=placed.y+'px';
   svg.toggleAttribute('hidden',quiet||!visible);svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
   if(!svg.hasAttribute('hidden')){
    const t=visible,gap=8,holes=nodes.filter(n=>n.isConnected).map(rect).map(r=>math.intersection(r,v)).filter(r=>r.width>1&&r.height>1);dim.setAttribute('d',current.paused||current.actionable?`M0,0H${innerWidth}V${innerHeight}H0Z `+holes.map(r=>`M${r.x-gap},${r.y-gap}H${r.x+r.width+gap}V${r.y+r.height+gap}H${r.x-gap}Z`).join(' '):'');
    const bx=placed.x+placed.width/2,by=placed.y+placed.height/2;
    const tx=Math.max(t.x,Math.min(t.x+t.width,bx)),ty=Math.max(t.y,Math.min(t.y+t.height,by));
    const px=Math.max(placed.x,Math.min(placed.x+placed.width,tx)),py=Math.max(placed.y,Math.min(placed.y+placed.height,ty));
    const destination=(current.destinations||[]).find(n=>n?.isConnected&&n.getClientRects().length);
    const source=current.source?.isConnected?rect(current.source):null;
    if(current.actionable&&destination){
     const to=math.intersection(rect(destination),v),from=source?math.intersection(source,v):current.curved?{x:Math.max(16,to.x-72),y:Math.min(v.height-18,to.y+to.height+48),width:2,height:2}:{x:placed.x,y:placed.y,width:placed.width,height:placed.height};
     const a={x:from.x+from.width/2,y:from.y+from.height/2},b={x:to.x+to.width/2,y:to.y+to.height/2};
     const edge=(r,t)=>{const c={x:r.x+r.width/2,y:r.y+r.height/2},dx=t.x-c.x,dy=t.y-c.y,k=Math.min(r.width/2/Math.max(.001,Math.abs(dx)),r.height/2/Math.max(.001,Math.abs(dy)));return {x:c.x+dx*k,y:c.y+dy*k};};
     const start=edge(from,b),end=edge(to,a),bend=current.curved?Math.min(65,Math.hypot(end.x-start.x,end.y-start.y)*.3):25;
     line.setAttribute('d',`M${start.x},${start.y} Q${(start.x+end.x)/2+bend},${(start.y+end.y)/2-bend} ${end.x},${end.y}`);
     dot.setAttribute('cx',start.x);dot.setAttribute('cy',start.y);line.dataset.kind=current.curved?'curved':'drag';
    }else{line.setAttribute('d',`M${px},${py} Q${(px+tx)/2},${(py+ty)/2} ${tx},${ty}`);dot.setAttribute('cx',tx);dot.setAttribute('cy',ty);line.dataset.kind='explain';}
    line.style.visibility=typeof activeDrag!=='undefined'&&activeDrag?'hidden':'';

   }
   if(performance.now()<until)frame=requestAnimationFrame(draw);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  function measure({handover=null}={}){
   reset();if(!current||panel.hidden)return;
   measuredViewport=viewportKey();
   const v=viewport();panel.style.setProperty('--tutorial-panel-width',Math.min(v.width-24,v.width<700?360:320)+'px');panel.style.setProperty('--tutorial-panel-max-height',Math.max(96,v.height-24)+'px');
   let stable=0,previous='',attempts=0;
   function apply(){
   settling=0;if(!current||panel.hidden)return;
   const framing=current.actionable&&current.frameTargets?.length?current.frameTargets:nodes;let target=math.union(framing.filter(n=>n?.isConnected&&n.getClientRects().length).map(rect));const signature=JSON.stringify(target);
   if((current.paused||current.actionable)&&current.contextual&&target){
    stable=signature===previous?stable+1:0;previous=signature;
    if(((!handover&&stable<3)||globalThis.RunaCardArrivals?.blocked||document.getElementById('game')?.classList.contains('hybrid-fitting'))&&attempts++<150){settling=requestAnimationFrame(apply);schedule();return;}
   }
   if((current.paused||current.actionable)&&current.contextual&&target){
    // Compact layouts can place the fan over the mana display. Separate only
    // those two surfaces for the current teaching shot, before fitting both.
    // This is presentation spacing, never a card/state mutation.
    const hand=document.getElementById('hand'),mana=nodes.find(n=>n.matches('.patron-ether'));
    const fan=hand&&math.union([...hand.querySelectorAll('.card')].map(rect));
    if(current.actionable&&mana&&fan){
     const m=rect(mana),overlap=math.intersection(m,fan);
     if(overlap.width>0&&overlap.height>0){
      const old=hand.style.translate,parts=getComputedStyle(hand).translate.split(' ').map(parseFloat),h=rect(hand),unit=h.width/(hand.offsetWidth||h.width||1)||1;
      spacing.push([hand,old]);hand.style.translate=`${parts[0]||0}px ${(parts[1]||0)+(m.y+m.height+16-fan.y)/unit}px`;
      target=math.union(framing.filter(n=>n?.isConnected&&n.getClientRects().length).map(rect));
     }
    }
    const candidate=nodes[0]?.closest('#game,#mulligan-overlay');
    if(candidate&&nodes.every(n=>candidate.contains(n))){
     const origin=rect(candidate),cam=math.camera(target,v,rect(panel),{maxScale:current.maxScale});root=candidate;placementAnchor=cam.destination;
     cameraActive=true;
     // A transformed ancestor becomes the containing block of fixed hands and
     // the WebGL canvas. Keep those surfaces in their original viewport poses.
     const surfaces=[...candidate.querySelectorAll('#hand,#opponent-hand,.hybrid-canvas,.hybrid-focus-veil')].filter(n=>getComputedStyle(n).position==='fixed').map(n=>({n,before:rect(n),translate:n.style.translate,base:getComputedStyle(n).translate.split(' ').map(parseFloat)}));
     root.style.setProperty('--tutorial-camera-x','0px');root.style.setProperty('--tutorial-camera-y','0px');root.style.setProperty('--tutorial-camera-scale','1');root.classList.add('tutorial-camera-focused');
     for(const {n,before,translate,base} of surfaces){const after=rect(n),unit=after.width/(n.offsetWidth||after.width||1)||1;fixed.push([n,translate]);n.style.translate=`${(base[0]||0)+(before.x-after.x)/unit}px ${(base[1]||0)+(before.y-after.y)/unit}px`;}
     const tx=cam.destination.x-origin.x-cam.scale*(target.x-origin.x),ty=cam.destination.y-origin.y-cam.scale*(target.y-origin.y);
     // The old view is kept while awaiting a response. After the synchronous
     // content/layout pass, transition directly from it to the next paused cue,
     // without painting an unzoomed frame between two instructions.
     if(handover?.element===root&&!reduced.matches){root.style.setProperty('--tutorial-camera-x',handover.x+'px');root.style.setProperty('--tutorial-camera-y',handover.y+'px');root.style.setProperty('--tutorial-camera-scale',String(handover.scale));void getComputedStyle(root).transform;}
     root.classList.toggle('tutorial-camera-animate',!reduced.matches);
     root.style.setProperty('--tutorial-camera-x',tx+'px');root.style.setProperty('--tutorial-camera-y',ty+'px');root.style.setProperty('--tutorial-camera-scale',String(cam.scale));
     root.classList.add('tutorial-camera-focused');document.body.classList.add('tutorial-camera-mode');globalThis.RunaRegistroTrilho?.hide();panel.dataset.zoom='on';
     for(const node of nodes)if(node.matches('.lane-side')){node.classList.add('tutorial-field-focus');node.dataset.tutorialHouse='Casa '+(Number(node.dataset.lane)+1);document.getElementById('lanes')?.classList.add('tutorial-field-raised');}
    }
   }
   until=performance.now()+(reduced.matches?0:340);schedule();
   }
   apply();
  }
  function resize(){if(viewportKey()===measuredViewport)return;if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(viewportKey()!==measuredViewport)measure();});}
  addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);visualViewport?.addEventListener('scroll',schedule);addEventListener('scroll',schedule,{passive:true});reduced.addEventListener('change',measure);
  return {
   update(input){
    // The tutorial is a viewport-sized stage, in play and while explaining.
    // Keep its geometry constant; camera enlargement must not create scrollbars.
    document.documentElement.classList.add('tutorial-focus-viewport');
    const changed=last!==input.key||input.targets.length!==nodes.length||input.targets.some((n,i)=>n!==nodes[i]);
    if(!current?.paused&&input.paused)priorFocus=document.activeElement;
    if(current?.paused&&!input.paused&&!input.actionable){reset();if(priorFocus?.isConnected&&!panel.contains(priorFocus))priorFocus.focus?.({preventScroll:true});priorFocus=null;}
    current=input;nodes=input.targets;svg.classList.toggle('tutorial-heart-map',!input.actionable&&nodes.some(n=>n.matches('.patron-heart')));panel.classList.toggle('tutorial-quiet',input.quiet);panel.classList.toggle('tutorial-contextual',input.contextual);panel.classList.toggle('tutorial-show-progress',input.showProgress);panel.setAttribute('role',input.paused?'dialog':'region');
    if(input.paused)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
    if(last!==input.key){if(input.contextual)announcement.textContent=panel.querySelector('h2').textContent+'. '+panel.querySelector('#tutorial-text').textContent;}
    const handover=renderHandover;renderHandover=null;last=input.key;if(changed||handover)measure({handover});else schedule();
   },
   // Called before the normal render pipeline captures geometry. Its matching
   // afterRender restores the guide in the same task, before a browser paint.
   beforeRender(){if(!root)return;const m=new DOMMatrixReadOnly(getComputedStyle(root).transform);renderHandover={element:root,x:m.e,y:m.f,scale:m.a};reset({notify:false});},
   // Return to stable geometry before a real command can resume interaction.
   suspend(){reset();svg.setAttribute('hidden','');},
   clear(){const wasActive=Boolean(current);reset();document.documentElement.classList.remove('tutorial-focus-viewport');renderHandover=null;current=null;nodes=[];last='';priorFocus=null;svg.setAttribute('hidden','');panel.style.removeProperty('left');panel.style.removeProperty('top');if(wasActive){const title=document.getElementById('entry-title');title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});}},
   refresh:measure,
  };
 }
 globalThis.RunaTutorialFocus={create,get cameraActive(){return cameraActive;}};
})();
