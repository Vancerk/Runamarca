/* Viewport coordinates shared by DOM interaction and the projected table.
 * rect() is the live interaction box; pose()/surfaceRect() describe the painted
 * face. Keeping those concepts explicit avoids projecting an already projected
 * copy twice. No cached DOM rectangle can survive a scroll, resize or new node. */
(function(root){
 let provider=null,revision=0;
 const cloneQuad=q=>q?.map(p=>({x:p.x,y:p.y}));
 const rect=node=>node?.getBoundingClientRect?.()||null;
 const quad=r=>[{x:r.left,y:r.top},{x:r.right,y:r.top},{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}];
 function pose(node){
  const value=provider?.pose?.(node);
  if(value)return {...value,quad:cloneQuad(value.quad)};
  const r=rect(node);return r?{quad:quad(r),w:r.width,h:r.height}:null;
 }
 // Mean edge lengths preserve the dimensions of a flat copy of a keystoned face.
 function surfaceRect(points){
  const [a,b,c,d]=points,x=(a.x+b.x+c.x+d.x)/4,y=(a.y+b.y+c.y+d.y)/4;
  const width=(Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(c.x-d.x,c.y-d.y))/2;
  const height=(Math.hypot(d.x-a.x,d.y-a.y)+Math.hypot(c.x-b.x,c.y-b.y))/2;
  return {x:x-width/2,y:y-height/2,left:x-width/2,top:y-height/2,right:x+width/2,bottom:y+height/2,width,height};
 }
 root.RunaGeometry={rect,pose,surfaceRect,
  install(next){if(provider)throw Error('Table geometry is already installed');provider=next;revision++;return ()=>{if(provider===next){provider=null;revision++;}};},
  changed(){revision++;},
  zone:node=>cloneQuad(provider?.zone?.(node)),
  fogZone:node=>cloneQuad(provider?.fogZone?.(node)),
  occluders:()=>provider?.occluders?.().map(cloneQuad)||[],
  field(){const value=provider?.field?.();return value?{...value,quad:cloneQuad(value.quad)}:null;},
  point(node,x=.5,y=.5){const r=rect(node);return r?{x:r.left+r.width*x,y:r.top+r.height*y}:null;},
  // A boundary used before effects start; never called recursively inside build().
  ensure(){provider?.ensure?.();},
  get revision(){return revision;}
 };
})(globalThis);
