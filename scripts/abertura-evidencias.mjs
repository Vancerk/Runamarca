// Abertura (09/11/2026) · monta as folhas de comparação do pacote prototype-qa/abertura-20261109 a partir das
// execuções já gravadas (abertura-ui, abertura-timeline, abertura-mao) e dos quadros dos vídeos de referência.
// Uso: node scripts/abertura-evidencias.mjs [pasta do pacote]
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'prototype-qa/abertura-20261109'),out=path.join(root,'comparacao');fs.mkdirSync(out,{recursive:true});
const s=t=>(t/1000).toFixed(2).replace('.',',')+' s',ms=t=>t+' ms';
const sheet=(name,spec)=>{const file=path.join(out,name+'.json');fs.writeFileSync(file,JSON.stringify(spec,null,1));const r=spawnSync(process.execPath,['scripts/abertura-compare.mjs',path.join(out,name+'.png'),file],{encoding:'utf8'});process.stdout.write(r.stdout||'');if(r.status){process.stderr.write(r.stderr||'');process.exitCode=1;}};
// quadros do screencast mais próximos dos instantes pedidos (ms desde o disparo), sem repetir quadro
function cast(dir,times,from=0){const all=fs.readdirSync(dir).filter(f=>/^c-\d+-\d+\.jpg$/.test(f)).map(f=>({f,t:+f.split('-')[2].replace('.jpg','')})).sort((a,b)=>a.t-b.t),used=new Set(),list=[];
 for(const t of times){const c=all.reduce((m,x)=>Math.abs(x.t-(from+t))<Math.abs(m.t-(from+t))?x:m);if(used.has(c.f))continue;used.add(c.f);list.push({file:path.join(dir,c.f),caption:s(c.t-from)});}return list;}
const ref=(dir,pick,t0)=>fs.readdirSync(path.join(root,'referencia',dir)).filter(f=>pick.test(f)).sort().map(f=>{const t=Math.round((+f.replace('.png','').split('-').at(-1)-t0)*1000);return {file:path.join(root,'referencia',dir,f),caption:(t<0?'':'+')+ms(t)};});
const ui=(dir,scene,times)=>times.map(t=>({file:path.join(root,dir,scene,scene+'-'+String(t).padStart(4,'0')+'.png'),caption:'+'+ms(t)}));
// 1 · botão: referência (ponteiro entra em ≈1,80 s do vídeo) × antes × depois
sheet('01-botao-hover',{title:'Hover do botão · a face acende e oscila, o aro fica parado',cell:230,
 note:'Referência: quadros do vídeo do dono (a face inclina por cerca de 50 ms e assenta em ≈130–170 ms). Antes: V26.0.1, nada acontecia além do realce do navegador. Depois: mesmos instantes, com as animações pausadas em cada tempo.',
 rows:[{label:'Referência (vídeo 1)',frames:ref('botao',/v1a-0(0[2-9]|1[0-3])-/,1.799).filter((_,i)=>i%1===0).slice(0,9)},
  {label:'Antes · V26.0.1',frames:ui('antes/ui','botao-hover',[0,17,33,50,67,100,133,167,200])},
  {label:'Depois',frames:ui('ui','botao-hover',[0,17,33,50,67,100,133,167,200])},
  {label:'Depois · movimento reduzido (só acende)',frames:ui('ui-reduzido','botao-hover',[0,17,50,100,200])}]});
// 2 · menu: referência (painel surge em ≈0,30 s do vídeo) × antes × depois
sheet('02-menu-entrada',{title:'Entrada do menu · nasce pequeno no topo central, passa um pouco do tamanho e assenta',cell:250,
 note:'Referência: recorte do vídeo do dono (o painel aparece pequeno, cresce, ultrapassa e assenta em ≈250–300 ms; sem desfoque novo). Antes: o menu aparecia pronto. Depois: animação única de 300 ms no próprio painel.',
 rows:[{label:'Referência (vídeo 2)',frames:ref('menu',/v3a-0(0[3-9]|1[0-3])-/,0.300).slice(0,9)},
  {label:'Antes · V26.0.1',frames:ui('antes/ui','menu-entrada',[0,33,67,100,133,167,200,267,300])},
  {label:'Depois',frames:ui('ui','menu-entrada',[0,33,67,100,133,167,200,267,300])},
  {label:'Depois · confirmação de saída (pop-up sobre pop-up)',frames:ui('ui','confirmacao-entrada',[0,67,133,200,267,333])}]});
// 3 · abertura: referência × antes × depois (tempo contado do lançamento da moeda / primeira carta)
const tl=name=>JSON.parse(fs.readFileSync(path.join(root,name,'linha-do-tempo.json'),'utf8'));
const first=tl('linha-do-tempo/primeiro'),launch=first.interactiveAt-first.toss.last.endedAt+120,before=tl('antes/linha-do-tempo');
sheet('03-abertura',{title:'Abertura · cartas chegando pela direita enquanto a moeda é lançada em destaque',cell:300,
 note:'Referência: cartas chegam em sequência pela direita, inclinadas e em curva; depois a moeda; por fim o painel “Mão inicial”. Antes (V26.0.1): moeda sozinha, aviso de ordem e só então as cartas, uma a uma. Depois: moeda e cartas ao mesmo tempo sob desfoque suave; o desfoque sai junto com a moeda. Tempos do “antes” contados do início da moeda; do “depois”, do lançamento.',
 rows:[{label:'Referência (vídeo 3)',frames:[...ref('abertura',/v2a-/,2.9).filter((_,i)=>i%2===0),...ref('abertura',/v2-0(17|19|25|35)-/,2.9)]},
  {label:'Antes · V26.0.1 (mão interativa em '+s(before.interactiveAt)+')',frames:cast(path.join(root,'antes/linha-do-tempo'),[600,1500,2600,3600,4500,5200,5900,6500,7300])},
  {label:'Depois · quem começa (mão interativa em '+s(first.interactiveAt)+', lançamento em '+s(Math.max(0,Math.round(launch)))+')',frames:cast(path.join(root,'linha-do-tempo/primeiro'),[0,250,450,650,900,1300,2000,2700,3150,3500],Math.max(0,Math.round(launch)))},
  {label:'Depois · quem joga em segundo',frames:cast(path.join(root,'linha-do-tempo/segundo'),[0,250,450,650,900,1300,2000,2700,3150,3500],Math.max(0,Math.round(tl('linha-do-tempo/segundo').interactiveAt-tl('linha-do-tempo/segundo').toss.last.endedAt+120)))}]});
// 4 · mão inicial: referência × antes × depois
const beforeLast=cast(path.join(root,'antes/linha-do-tempo'),[before.interactiveAt+900]);
sheet('04-mao-inicial',{title:'Mão inicial · pergaminho, instrução curta com o limite e um único botão',cell:620,
 note:'Antes: dois botões (“Trocar N cartas” e “Manter e confirmar mão”) e troca sem limite. Depois: “Selecione até 3/4 cartas para trocar.” e “Confirmar mão”.',
 rows:[{label:'Referência (vídeo 3) · Antes (V26.0.1)',frames:[{file:path.join(root,'referencia/abertura/v2b-000-9.500.png'),caption:'referência'},{...beforeLast[0],caption:'antes'}]},
  {label:'Depois · quem começa (limite 3) · três marcadas',frames:[{file:path.join(root,'mao-inicial/primeiro-01-inicio.png'),caption:'ao abrir'},{file:path.join(root,'mao-inicial/primeiro-02-tres-marcadas.png'),caption:'três marcadas; as outras ficam fora do limite'}]},
  {label:'Depois · 4ª carta recusada · nova mão após a troca',frames:[{file:path.join(root,'mao-inicial/primeiro-03-quarta-recusada.png'),caption:'4ª carta recusada (com a consulta de carta aberta sob o ponteiro)'},{file:path.join(root,'mao-inicial/primeiro-04-nova-mao.png'),caption:'depois de confirmar: nova mão, sem outra troca'}]},
  {label:'Depois · quem joga em segundo (limite 4) · 1366×768',frames:[{file:path.join(root,'mao-inicial/segundo-01-quinta-recusada.png'),caption:'5ª carta recusada'},{file:path.join(root,'mao-inicial/janela-1366-01-pronto.png'),caption:'1366×768'}]}]});
// 5 · fluidez: resumo numérico
const runs=fs.readdirSync(path.join(root,'fluidez')).filter(d=>fs.statSync(path.join(root,'fluidez',d)).isDirectory()).sort().map(d=>{const j=tl('fluidez/'+d);return {run:d,interactiveMs:j.interactiveAt,hitchesOver50:j.pace.hitches.map(h=>({atMs:h.atMs,gapMs:h.gapMs,sinceDealMs:h.sinceDealMs})),dealMaxGapMs:j.pace.dealMaxGapMs,toss:j.toss?.last||null,events:j.events.map(e=>e.type+':'+e.ms)};});
fs.writeFileSync(path.join(root,'fluidez','resumo.json'),JSON.stringify(runs,null,1));console.log('fluidez',runs.map(r=>r.run+' interativa '+r.interactiveMs+' ms'+(r.dealMaxGapMs!=null?', maior intervalo no voo '+r.dealMaxGapMs+' ms':'')).join(' | '));
