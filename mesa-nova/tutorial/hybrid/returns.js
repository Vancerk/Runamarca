import {flattenFace} from './visuals.js';
// UI-owner revision, item 4: post-combat return (hammer, ether, chain, gentle) on the
// hybrid table. Confirmed cause of the deformation: the native return sized its copy
// from getBoundingClientRect() of the card BUTTON and carried clones whose
// .hybrid-card-face still had the table projection (matrix3d × zoom), so the face was
// transformed twice inside the copy; origin/destination were the button boxes, not the
// visible faces; and the copy was stretched non-uniformly from the combat aspect
// (900×820) to the reserve aspect (900×1260). combat-return.js now keeps each face's
// own aspect and scales uniformly (shared fix); here the hybrid route supplies flat
// faces and the visible face bounds as origin and live destination.
// The flat copy is a rectangle; the visible face is a slightly keystoned quad (5° camera).
// Its best rectangle has the quad's centre and its mean edge width and height.
const bounds=quad=>RunaGeometry.surfaceRect(quad);
export function visibleBounds(node){const pose=window.RunaHybrid?.ready?RunaGeometry.pose(node):null;return pose?.quad&&node.classList?.contains('hybrid-surface-card')?bounds(pose.quad):node.getBoundingClientRect();}
RunaPresentation.register('hybrid-reserve-return',{active:()=>document.body.classList.contains('hybrid-active')&&window.RunaHybrid?.ready,animations:{reserveReturn({items,options={}},play){
 const clone=options.clone||cloneVisual;
 const flat=items.map(item=>{const quad=item.face?.hybridFlightSource?.quad;return {...item,rect:quad?bounds(quad):item.rect,face:item.face?flattenFace(item.face):item.face};});
 return play({items:flat,options:{...options,measure:visibleBounds,clone:node=>flattenFace(clone(node))}});
}}});
