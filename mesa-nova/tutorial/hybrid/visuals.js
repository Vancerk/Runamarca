import {matrix,elementQuad} from './card-plane.js';
let portal;
export function flightPortal(){if(!portal?.isConnected){portal=document.createElement('div');portal.className='hybrid-flight-portal';portal.setAttribute('aria-hidden','true');document.body.append(portal);}return portal;}
export const rectQuad=r=>[{x:r.left,y:r.top},{x:r.right,y:r.top},{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}];
export function flattenFace(copy){
 for(const sample of copy.querySelectorAll('.hybrid-board-sample,.hybrid-hand-sample'))sample.remove();
 for(const face of copy.querySelectorAll('.hybrid-card-face')){while(face.firstChild)face.parentNode.insertBefore(face.firstChild,face);face.remove();}
 copy.classList.remove('hand-card','opening-card','dragging-source','drag-preview','pending-arrival','selected','arrived','snapping','visual-hit','payable');
 copy.removeAttribute('style');copy.removeAttribute('data-uid');copy.tabIndex=-1;copy.setAttribute('aria-hidden','true');
 for(const name of ['onclick','ondblclick','onpointerdown','onmouseenter','onmousemove','onmouseleave','onfocus','onblur'])copy[name]=null;
 return copy;
}
export function geometry(node){return window.RunaGeometry?.pose(node)||elementQuad(node);}
export function handPose(node){const r=node.getBoundingClientRect(),s=getComputedStyle(node),w=parseFloat(s.width),h=parseFloat(s.height),angle=parseFloat(s.getPropertyValue('--hybrid-fan-angle'))||0;return {x:r.x+r.width/2,y:r.y+r.height/2,w,h,angle};}
export function cardCopyAt(source,pose){const copy=flattenFace(cloneVisual(source));copy.classList.add('hybrid-motion-face');Object.assign(copy.style,{width:pose.w+'px',height:pose.h+'px',transformOrigin:'0 0',transform:'matrix3d('+matrix(pose.quad,pose.w,pose.h).join(',')+')'});flightPortal().append(copy);return copy;}
export function currentQuad(node,w,h){const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return [[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>{const p=m.transformPoint(new DOMPoint(x,y));return {x:p.x/p.w,y:p.y/p.w};});}
