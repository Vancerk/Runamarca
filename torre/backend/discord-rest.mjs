// Follow Discord response headers; retry only explicit rejections (HTTP 429).
export function createDiscordRest(token,{fetchImpl=(...args)=>fetch(...args),now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const routes=new Map(),buckets=new Map(),tails=new Map();let globalUntil=0,authError=null;
 const stats={httpRequests:0,rateLimitResponses:0,retries:0,waitMs:0};
 const numeric=value=>value===null||value===undefined?NaN:Number(value);
 const route=path=>path.replace(/\/messages\/\d+/g,'/messages/:id').replace(/\/interactions\/[^/]+\/[^/]+/g,'/interactions/:id/:token').replace(/\/webhooks\/[^/]+\/[^/]+/g,'/webhooks/:id/:token');
 async function wait(ms){if(ms>0){stats.waitMs+=ms;await sleep(ms);}}
 async function execute(path,body,method,key){
  if(authError)throw authError;
  for(let attempt=0;attempt<4;attempt++){
   const bucketKey=routes.get(key)||key;await wait(Math.max(globalUntil,buckets.get(bucketKey)||0)-now());
   const multipart=body instanceof FormData;stats.httpRequests++;
   const response=await fetchImpl('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+token,...(multipart?{}:{'Content-Type':'application/json'})},body:body?(multipart?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(20000)});
   let data;try{data=response.status===204?{}:await response.json();}catch{const e=Error('Discord devolveu uma resposta não confirmada.');e.definite=response.status>=400&&response.status<500;e.publicMessage='Não foi possível confirmar a resposta do Discord. Confira o privado antes de reenviar.';throw e;}
   const bucket=response.headers.get('x-ratelimit-bucket'),major=path.match(/^\/(channels|guilds)\/([^/]+)/)?.[0]||'';
   const learned=bucket?bucket+'|'+major:bucketKey;if(bucket){if(routes.size>2048)routes.clear();routes.set(key,learned);}
   const reset=numeric(response.headers.get('x-ratelimit-reset-after'));if(response.headers.get('x-ratelimit-remaining')==='0'&&Number.isFinite(reset)&&reset>=0)buckets.set(learned,now()+reset*1000+50);
   if(response.status===429){stats.rateLimitResponses++;const delay=numeric(data.retry_after??response.headers.get('retry-after'));if(!Number.isFinite(delay)||delay<0||delay>120||attempt===3){const e=Error('Discord rate limit');e.definite=true;e.publicMessage='O Discord limitou o envio. Aguarde antes de enviar outro relatório.';throw e;}const until=now()+delay*1000+50;if(data.global)globalUntil=until;else buckets.set(learned,until);stats.retries++;continue;}
   if(!response.ok){const e=Error('Discord HTTP '+response.status);e.definite=response.status>=400&&response.status<500;e.publicMessage=({50278:'O mestre precisa compartilhar um servidor com o bot.',50007:'O Discord bloqueou a mensagem privada para este mestre.'})[data.code]||(response.status===401?'O token do bot não foi aceito.':'O Discord recusou o envio. Confira o bot e as permissões de mensagens privadas.');if(response.status===401){authError=e;e.fatal=true;}throw e;}
   return data;
  }
 }
 return {metrics:()=>({...stats}),api(path,body,method='POST'){const key=method+' '+route(path);const previous=tails.get(key)||Promise.resolve();const result=previous.then(()=>execute(path,body,method,key));const tail=result.catch(()=>{});tails.set(key,tail);void tail.then(()=>{if(tails.get(key)===tail)tails.delete(key);});return result;}};
}
