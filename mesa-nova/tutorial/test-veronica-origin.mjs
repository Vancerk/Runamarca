import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';
for(const reverse of [false,true])test(`Verônica liga fonte atual a beneficiários atuais após resize/scroll: ${reverse}`,async()=>{
 const nodes=[],frames=new Map();let serial=0;
 const document={body:{append:n=>nodes.push(n)},createElement:()=>({style:{},isConnected:true,setAttribute(){},append:n=>nodes.push(n),remove(){this.isConnected=false;},animate:()=>({finished:new Promise(()=>{}),cancel(){}})})};
 const scope=vm.createContext({document,matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>(frames.set(++serial,fn),serial),cancelAnimationFrame:id=>frames.delete(id),addEventListener(){}});
 vm.runInContext(fs.readFileSync(new URL('platinum-entry.js',import.meta.url),'utf8'),scope);
 const actor={isConnected:true,rect:{left:400,top:reverse?100:700,width:100,height:90},getBoundingClientRect(){return this.rect;}},beneficiary={isConnected:true,rect:{left:150,top:reverse?700:100,width:80,height:70},getBoundingClientRect(){return this.rect;}};
 const done=scope.RunaPlatinumEntry.empower({source:()=>actor,targets:[()=>beneficiary]});const rail=nodes.find(n=>n.className==='protocol-link');assert.equal(rail.style.left,'450px');
 actor.rect={left:200,top:350,width:60,height:60};beneficiary.rect={left:600,top:50,width:100,height:100};
 const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());assert.equal(rail.style.left,'230px');assert.equal(rail.style.top,'377.5px');assert.ok(Math.abs(parseFloat(rail.style.width)-Math.hypot(420,-280))<.01);assert.equal(rail.style.transform,`rotate(${Math.atan2(-280,420)}rad)`);
 beneficiary.isConnected=false;[...frames.values()].forEach(fn=>fn());assert.equal(rail.style.visibility,'hidden');actor.isConnected=false;[...frames.values()].forEach(fn=>fn());await done;
});
