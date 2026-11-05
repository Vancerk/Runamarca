import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function geometry(){const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('presentation-geometry.js',import.meta.url),'utf8'),c);return c.RunaGeometry;}
test('interaction boxes remain live after resize and scroll',()=>{
 const g=geometry();let x=10;const n={getBoundingClientRect:()=>({left:x,top:20,right:x+80,bottom:120,width:80,height:100})};
 assert.equal(g.point(n).x,50);x=110;assert.equal(g.point(n).x,150);assert.equal(g.pose(n).quad[0].x,110);
});
test('projected faces are independent snapshots, with explicit flat-copy dimensions',()=>{
 const g=geometry(),points=[{x:20,y:10},{x:100,y:10},{x:110,y:90},{x:10,y:90}];
 const off=g.install({pose:()=>({quad:points,w:90,h:80}),field:()=>({quad:points}),zone:()=>points});
 const p=g.pose({});p.quad[0].x=500;assert.equal(g.pose({}).quad[0].x,20);assert.equal(g.surfaceRect(points).width,90);
 g.field().quad[0].x=600;assert.equal(g.zone({})[0].x,20);off();assert.equal(g.field(),null);
});
test('geometry flush is explicit and stale providers cannot remove a newer scene',()=>{
 const g=geometry();let count=0;const old=g.install({ensure:()=>count++});g.ensure();assert.equal(count,1);old();
 g.install({ensure:()=>count+=10});old();g.ensure();assert.equal(count,11);
});
