import {parentPort} from 'node:worker_threads';
parentPort.postMessage({kind:'ready'});
parentPort.on('message',m=>{
 if(m.kind==='clear')return;
 if(JSON.stringify(m.observation).includes('SECRET_'))throw Error('Fixture detected hidden data leak');
 if(m.observation.you.startsWith('HANG')){for(;;){} }
 parentPort.postMessage({kind:'result',id:m.id,action:{type:'fixture',id:m.id}});
 parentPort.postMessage({kind:'result',id:m.id,action:{type:'duplicate',id:m.id}});
});
