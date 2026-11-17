import test from 'node:test';import assert from 'node:assert/strict';
import './tutorial-focus-layout.js';
const {camera,place,union,intersection}=globalThis.RunaTutorialFocusLayout;
const area=r=>r.width*r.height;
test('contextual camera keeps the entire group and explanation visible without overlap',()=>{
 for(const [width,height] of [[1440,1000],[1024,768],[390,844],[844,390],[320,568]]){
  const view={x:0,y:0,width,height},panel={width:Math.min(320,width-24),height:Math.min(280,height*.43)};
  for(const target of [{x:20,y:10,width:140,height:80},{x:200,y:840,width:980,height:240},{x:30,y:550,width:600,height:280},{x:width-40,y:height+90,width:80,height:90}]){
   const result=camera(target,view,panel),t=result.destination,p=place(t,panel,view);
   assert.ok(result.scale>0&&result.scale<=1.38);assert.equal(area(intersection(t,p)),0);
   for(const r of [t,p]){assert.ok(r.x>=0&&r.y>=0);assert.ok(r.x+r.width<=width+.001&&r.y+r.height<=height+.001);}
  }
 }
});
test('all legal targets stay in a group; missing and zero-size anchors are safe',()=>{
 assert.deepEqual(union([{x:50,y:10,width:20,height:30},{x:150,y:10,width:20,height:30},{x:250,y:10,width:20,height:30}]),{x:50,y:10,width:220,height:30});
 assert.equal(union([null,{x:0,y:0,width:0,height:0}]),null);
 const p=place(null,{width:160,height:44},{x:10,y:30,width:360,height:640},[{x:10,y:540,width:360,height:130}]);assert.equal(area(intersection(p,{x:10,y:540,width:360,height:130})),0);
});
