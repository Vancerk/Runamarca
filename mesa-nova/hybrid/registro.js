// UI-owner revision, item 10 — Registro hover without flicker (hybrid route only).
// camp-layout.js opens the <details> on pointerenter and closes it on pointerleave when
// it is not pinned by a click. On the hybrid table the closed trigger is a projected
// quad and the open panel is a different box (anchored on the trigger by bridge.js), so
// a leave fired by the box swap itself — while the cursor is still over what the user
// sees — closed it, and the reprojected trigger reopened it. Here a pointerleave is
// honoured only when the cursor is really outside both the trigger box and the open
// panel; otherwise it is stopped before camp-layout sees it. A real exit detected by
// pointer movement closes the panel the same way camp-layout would. Click pinning,
// keyboard, Escape, the close button and outside clicks remain camp-layout's.
// No timer is involved.
export function installRegistro({trigger}){
 const log=document.getElementById('camp-log'),summary=log?.querySelector(':scope>summary');if(!log||!summary)return;
 let pinned=false,last=null;
 // Mirror of camp-layout's private `pinned`: summary click toggles it, any close clears it.
 summary.addEventListener('click',()=>{pinned=!pinned;},true);
 log.addEventListener('toggle',()=>{if(!log.open)pinned=false;});
 // The browser's own hit test (:hover) counts as inside: a projected quad can be hit up
 // to ~1 px beyond its bounding box (antialiased edge), and closing there would leave a
 // hovered trigger closed.
 const inside=(x,y)=>{if(log.matches(':hover'))return true;const pad=2,boxes=[log.getBoundingClientRect(),trigger()].filter(Boolean);return boxes.some(r=>x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad);};
 const hoverable=()=>matchMedia('(hover:hover)').matches&&document.body.classList.contains('hybrid-active');
 document.addEventListener('pointerleave',e=>{if(e.target!==log||!hoverable()||!log.open)return;if(inside(e.clientX,e.clientY)){e.stopImmediatePropagation();}},true);
 document.addEventListener('pointermove',e=>{last={x:e.clientX,y:e.clientY};if(!hoverable()||!log.open||pinned||log.contains(document.activeElement))return;if(!inside(e.clientX,e.clientY))log.open=false;},{passive:true});
 window.RunaHybridRegistro={get pinned(){return pinned;},get last(){return last;}};
}
