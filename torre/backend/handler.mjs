import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createStore,ReportError} from './relatorios-core.mjs';
import {createDiscord} from './gateway.mjs';
import {createCharacters} from './personagens.mjs';
import {createAttachments} from './anexos.mjs';
import {createBotTester} from './teste-bot.mjs';
export function createTorreRuntime({folder,root,dataFolder,origin,durable,serial,flowStatus}){
const masters=JSON.parse(readFileSync(resolve(folder,'mestres.json'),'utf8'));
const zones=new Set(JSON.parse(readFileSync(resolve(root,'zonas.json'),'utf8')).map(z=>z.id));

let store;const admin={user:req=>req.torreAdminId,require(req){if(!req.torreAdminId)throw new ReportError('Acesso reservado ao administrador.',403);return req.torreAdminId;}};
const archiveChannel=()=>process.env.LEGION_ARCHIVE_CHANNEL_ID||null;
const discordOptions={onApproved:id=>serial(async()=>{await durable();return store.publishApproved(id);}),onReady:()=>serial(()=>store?.publishQueued()).catch(()=>console.error('Não foi possível publicar a fila de aprovados.')),siteUrl:origin+'/torre/',checkDecision:p=>store.checkDecision(p),checkNotification:p=>store.checkNotification(p),async notify(id){try{await discord.notifyAuthor(store.notification(id));store.notificationResult(id,null);await durable();}catch(e){store.notificationResult(id,e.publicMessage||'Não foi possível confirmar a mensagem ao autor. O mestre pode reenviar o aviso pelo Discord.');throw e;}}};
discordOptions.pairAccount=(code,user)=>serial(async()=>{const result=characters.completePairing(code,user);await durable();return result;});
discordOptions.authorizeAdmin=(code,user)=>Promise.reject(new ReportError('Entre pela conta Discord no site Jogos Elysium.',403));
let discord=createDiscord(process.env.DISCORD_BOT_TOKEN,p=>serial(async()=>{const result=store.decide(p);await durable();return result;}),discordOptions);
const sendBotTest=createBotTester(discord);
const python=process.env.LEGION_PYTHON||'python3';
const characters=createCharacters({folder,root:resolve(dataFolder,'character-assets'),python,extractor:resolve(folder,'../fichas/extrair-ficha.py'),dataFolder});
const attachments=createAttachments(resolve(dataFolder,'anexos'));
discordOptions.readAttachment=file=>attachments.read(file);
let mapEpoch;try{mapEpoch=readFileSync(resolve(dataFolder,'map-epoch.txt'),'utf8').trim();}catch{mapEpoch='initial';}
const deliveredMessages=new Map();
store=createStore({file:resolve(dataFolder,'relatorios.json'),masters,zones,send:async r=>{const message=await discord.send(r);if(deliveredMessages.size>1024)deliveredMessages.clear();deliveredMessages.set(r.id,message.id);return message;},ready:()=>discord.ready(),characters,attachments,publish:(r,id)=>discord.publish(r,id),archiveChannel,durable});
const flowMessages=new Map();
const flowStore=createStore({file:resolve(dataFolder,'flow-relatorios.json'),masters,zones:new Set(['1720']),ready:()=>discord.ready(),durable,send:async report=>{const message=await discord.send(report,{test:true});flowMessages.set(report.id,message.id);return message;}});
const flowSubmit=(body,onStart)=>serial(async()=>{onStart();const report=await flowStore.submit(body);return {...report,messageId:flowMessages.get(report.id)||null};});
const limits=new Map();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const publicResponses=new Map();
const conditional=(req,res,data)=>{let bytes,tag;if(typeof data==='function'){let cached=publicResponses.get(req.url);if(!cached||cached.revision!==store.revision()){bytes=JSON.stringify(data());tag='"'+createHash('sha256').update(bytes).digest('hex')+'"';cached={bytes,tag,revision:store.revision()};if(publicResponses.size>10)publicResponses.clear();publicResponses.set(req.url,cached);}({bytes,tag}=cached);}else{bytes=JSON.stringify(data);tag='"'+createHash('sha256').update(bytes).digest('hex')+'"';}res.setHeader('ETag',tag);res.setHeader('Cache-Control','private, no-cache');if(req.headers['if-none-match']===tag){res.writeHead(304);return res.end();}res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});res.end(bytes);};
async function handler(req,res){
  try{
    const url=new URL(req.url,origin);
    if(req.headers.host!==new URL(origin).host)throw new ReportError('Host inválido.',403);
    if(url.pathname.startsWith('/api/')){
      if(req.method==='GET'){
        if(url.pathname==='/api/config')return json(res,200,{masters,mapEpoch,ready:discord.ready(),admin:Boolean(admin.user(req)),managedAccount:true,...(admin.user(req)?{botConfigured:discord.configured(),botState:discord.state(),botError:!discord.configured()?'Configure DISCORD_BOT_TOKEN nas variáveis privadas do Render.':discord.error()}:{} )});
        if(url.pathname==='/api/admin/bot/flow-result'){admin.require(req);return json(res,200,await flowStatus());}
        if(url.pathname==='/api/admin/reports'){admin.require(req);return json(res,200,store.adminList());}
        const download=url.pathname.match(/^\/api\/reports\/([a-f0-9-]+)\/attachments\/([a-f0-9]{64}\.(?:png|jpe?g|pdf|docx))$/);
        if(download){const meta=store.attachment(download[1],download[2],req.headers['x-report-receipt'],Boolean(admin.user(req))),bytes=attachments.read(meta);res.writeHead(200,{'Content-Type':meta.type,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(meta.name),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});res.end(bytes);return;}
        if(url.pathname==='/api/zones/counts')return conditional(req,res,()=>store.zoneCounts());
        if(url.pathname==='/api/reports/index')return conditional(req,res,()=>store.index());
        if(url.pathname==='/api/reports')return json(res,200,store.list());
        if(url.pathname==='/api/characters')return json(res,200,characters.list());
        const match=url.pathname.match(/^\/api\/reports\/([a-f0-9-]+)$/);if(match)return conditional(req,res,store.detail(match[1],req.headers['x-report-receipt']));
      }
      if(req.method==='POST'){
        if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))throw new ReportError('Origem inválida.',403);
        const ip=req.torreVisitorId||req.torreAdminId||req.socket?.remoteAddress||'local',now=Date.now(),recent=(limits.get(ip)||[]).filter(t=>now-t<60000);if(recent.length>=20)throw new ReportError('Aguarde um minuto antes de enviar novamente.',429);recent.push(now);limits.set(ip,recent);if(limits.size>1000)for(const [key,times]of limits)if(times.at(-1)<now-60000)limits.delete(key);
        let chunks=[],length=0;for await(const chunk of req){length+=chunk.length;if(length>7100000)throw new ReportError('Relatório muito grande.',413);chunks.push(chunk);}const text=Buffer.concat(chunks).toString('utf8');
        let body;try{body=JSON.parse(text);}catch{throw new ReportError('Dados inválidos.');}
        if(['/api/admin/start','/api/admin/finish','/api/admin/logout'].includes(url.pathname))throw new ReportError('Use sua conta Discord do Jogos Elysium.',405);
        if(url.pathname==='/api/admin/characters/discord'){admin.require(req);return json(res,200,characters.adminDiscord(body.id,body.discordId));}
        const adminAction=url.pathname.match(/^\/api\/admin\/reports\/([a-f0-9-]+)\/(edit|archive)$/);if(adminAction){const by=admin.require(req);return json(res,200,adminAction[2]==='edit'?await store.adminEdit(adminAction[1],by,body):store.archive(adminAction[1],by,body.archived!==false));}
        if(url.pathname==='/api/admin/bot/test-report'){admin.require(req);return json(res,200,await sendBotTest(body.submissionKey));}
        if(url.pathname==='/api/reports'||/^\/api\/reports\/[a-f0-9-]+\/revise$/.test(url.pathname)){try{await discord.waitReady();}catch(e){throw new ReportError(!discord.configured()?'Configure DISCORD_BOT_TOKEN nas variáveis privadas do Render. Seu formulário foi mantido.':e.publicMessage,503);}}
        if(url.pathname==='/api/connect')throw new ReportError('Configure o bot nas variáveis do servidor.',403);
        if(url.pathname==='/api/reports')return json(res,201,await store.submit(body));
        if(url.pathname==='/api/characters/preview')return json(res,200,await characters.preview(body.url));
        if(url.pathname==='/api/characters/confirm')return json(res,201,characters.confirm(body.previewId));
        if(url.pathname==='/api/characters/discord')return json(res,200,characters.bindDiscord(body.id,body.discordId));
        if(url.pathname==='/api/characters/pair'){if(!discord.ready())throw new ReportError('A vinculação está indisponível no momento. Use o ID ou tente mais tarde.',503);return json(res,200,characters.startPairing(body.id));}
        const match=url.pathname.match(/^\/api\/reports\/([a-f0-9-]+)\/revise$/);if(match)return json(res,200,await store.revise(match[1],req.headers['x-report-receipt'],body));
      }
      throw new ReportError('Endpoint não encontrado.',404);
    }
    if(!['GET','HEAD'].includes(req.method))throw new ReportError('Método inválido.',405);
    const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/preview.html':url.pathname));
    if(!path.startsWith(root+sep))throw new ReportError('Arquivo inválido.',403);
    let data;try{data=await readFile(path);}catch(e){if(e.code!=='ENOENT'||!url.pathname.startsWith('/assets/personagens/'))throw e;data=await readFile(resolve(dataFolder,'character-assets/assets/personagens',path.split(/[\\/]/).pop()));}const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':url.pathname.startsWith('/assets/')?'private, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){json(res,e.status|| (e.code==='ENOENT'?404:500),{error:e.status?e.message:'Não foi possível concluir a operação.'});}
}
const visualSubmit=(body,onStart)=>serial(async()=>{onStart();const report=await store.submit(body);return {...report,messageId:deliveredMessages.get(report.id)||null};});
const visualAuthor=()=>serial(async()=>{const card=characters.ensureVisualTestAuthor();await durable();return card;});
return {handler,close:()=>discord.close(),flowSubmit,visualSubmit,visualAuthor,visualZones:()=>[...zones],waitReady:timeout=>discord.waitReady(timeout),metrics:discord.metrics};
}
