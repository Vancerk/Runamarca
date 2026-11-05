// S2 validação — executa scripts/s2-render-probe2.mjs sem alterá-lo, registrando o SHA-256 de cada
// arquivo efetivamente servido pelo QA local e, opcionalmente, substituindo arquivos por cópias
// isoladas via interceptação de rede (sem tocar no checkout).
// Uso: node scripts/s2-served-wrap.mjs [/caminho/servido=arquivo-local ...] -- <args do probe2>
// Gera <pasta-do-probe>/served.json.
import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),pw=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const args=process.argv.slice(2),sep=args.indexOf('--');if(sep<0)throw Error('faltou --');const overrides=Object.fromEntries(args.slice(0,sep).map(o=>o.split('='))),probeArgs=args.slice(sep+1),out=probeArgs[0];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),served={},pending=[];let hits=0;
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(...x)=>{const browser=await launch(...x),newContext=browser.newContext.bind(browser);
 browser.newContext=async(...y)=>{const ctx=await newContext(...y),route=ctx.route.bind(ctx);let mine=false;
  // registrada depois da rota do probe: o Playwright consulta rotas da mais nova para a mais antiga.
  ctx.route=async(...z)=>{await route(...z);if(!mine){mine=true;await route('**/*',r=>{const u=new URL(r.request().url()),f=u.hostname==='127.0.0.1'&&overrides[u.pathname];if(!f)return r.fallback();hits++;return r.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(f)});});}};
  ctx.on('response',res=>{const u=new URL(res.url());if(u.hostname!=='127.0.0.1'||!/\.(js|mjs|css|html|json)$/.test(u.pathname))return;pending.push(res.body().then(b=>{(served[u.pathname+u.search]??=new Set()).add(sha(b));}).catch(()=>{}));});
  const close=browser.close.bind(browser);browser.close=async()=>{await Promise.all(pending);return close();};return ctx;};return browser;};
process.on('exit',()=>{fs.writeFileSync(out+'/served.json',JSON.stringify({probe:{file:'scripts/s2-render-probe2.mjs',sha256:sha(fs.readFileSync('scripts/s2-render-probe2.mjs'))},overrides:Object.fromEntries(Object.entries(overrides).map(([k,f])=>[k,{file:f,sha256:sha(fs.readFileSync(f))}])),overrideHits:hits,served:Object.fromEntries(Object.entries(served).sort().map(([k,s])=>[k,[...s]]))},null,1));});
const probe=path.resolve('scripts/s2-render-probe2.mjs');process.argv=[process.argv[0],probe,...probeArgs];await import(pathToFileURL(probe).href);
