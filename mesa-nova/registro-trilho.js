// Rodada 4 (11/11/2026, dono): Registro vertical, sem rolagem, no espaço à esquerda do Nartvanyr (referência: o
// histórico de jogadas do Hearthstone). Uma calha de madeira com uma pedra quadrada por lance:
// · o MAIS NOVO EM CIMA; ao chegar um lance ele entra no topo e os outros descem; o que não cabe sai por baixo
//   (sem barra de rolagem: a calha mostra quantos lances cabem na altura dela);
// · cada pedra mostra a arte da carta citada no lance (quando a carta é pública) ou um símbolo do tipo de lance;
//   borda azul = seu lance, vermelha = do rival, dourada = da mesa (votação, combate, rodada);
// · passar o mouse (ou focar com o teclado) mostra ao lado a carta grande e o texto do lance.
// Só apresentação: lê state.log (os mesmos lances do Registro) e as cartas públicas da mesa.
// Posição: a ponte (hybrid/bridge.js) chama place() a cada montagem da cena. No computador (mouse) a gaveta antiga do
// Registro fica oculta e o Nartvanyr ocupa o lugar dela (body.registro-vertical); no zoom do combate a calha some e
// volta ao fim. Em telas de toque nada muda (gaveta original).
(function(root){
 // 12/11/2026 (dono): o Registro começa nas jogadas da partida. Fora: sala, moeda, mão inicial (trocas e confirmação),
 // a compra automática do começo de cada preparação e avisos da arquibancada.
 const SKIP_PHASES=new Set(['lobby','coin','mulligan']),SKIP_TEXT=/mão inicial|venceu a moeda|e uma compra.|arquibancada/i;
 const S=()=>typeof state!=='undefined'?state:null;// state é global do app.js (let), não propriedade de window
 const TILE=46,GAP=8,PAD=10,MIN_TILES=4,RIGHT_GAP=18,EDGE=14;
 let rail=null,list=null,tip=null,visible=false,lastKeys=[],lastBox='',maxTiles=8,hoverKey=null;
 const desktop=()=>innerWidth>900&&matchMedia('(hover:hover) and (pointer:fine)').matches;
 function mode(){document.body.classList.toggle('registro-vertical',desktop());}
 function ensure(){
  if(rail?.isConnected)return rail;
  rail=document.createElement('nav');rail.id='registro-trilho';rail.className='registro-trilho';rail.hidden=true;rail.setAttribute('aria-label','Registro: últimos lances, o mais novo em cima');
  list=document.createElement('ol');list.className='registro-trilho-lista';rail.append(list);
  tip=document.createElement('aside');tip.className='registro-trilho-detalhe';tip.hidden=true;tip.setAttribute('role','tooltip');tip.id='registro-trilho-detalhe';
  document.body.append(rail,tip);
  const game=document.getElementById('game');if(game)new MutationObserver(()=>{if(game.hidden)setVisible(false);}).observe(game,{attributes:true,attributeFilter:['hidden']});
  const log=document.getElementById('log');if(log)new MutationObserver(()=>paint()).observe(log,{childList:true});
  addEventListener('resize',mode,{passive:true});return rail;}
 // Cartas públicas (e as da própria mão) que um lance pode citar pelo nome.
 function publicCards(){const s=S();if(!s?.players)return [];const out=[];for(const p of s.players)for(const c of [...(p.reserve||[]),...(p.discard||[]),...(p.prepared||[]).map(x=>x?.card).filter(Boolean),...(p.hand||[]),...(p.emanationCards||[])])if(c?.name)out.push(c);
  for(const lane of s.combat?.lanes||[])for(const c of lane?.cards||[])if(c?.name)out.push(c);return out;}
 function kindOf(e){const m=e.message||'';if(e.phase==='resolving'||/confronto|combate|golpe|atac/i.test(m))return {icon:'⚔',label:'Combate'};if(e.phase==='vote'||/vot/i.test(m))return {icon:'⚖',label:'Decisão'};if(/Nartvanyr|morre|derrotad/i.test(m))return {icon:'✝',label:'Nartvanyr'};if(/encerr|passou a vez/i.test(m))return {icon:'⌛',label:'Fim da vez'};if(/compr/i.test(m))return {icon:'❖',label:'Compra'};return {icon:'◆',label:'Lance'};}
 function entries(){const s=S();if(!s?.log)return [];const seen=new Map();
  return s.log.map(raw=>typeof raw==='string'?{message:raw,round:s.round,phase:'lobby'}:raw).filter(e=>e&&!SKIP_PHASES.has(e.phase)&&!SKIP_TEXT.test(e.message||'')).map(e=>{const base=[e.round,e.phase,e.actor||'',e.message].join('|'),n=(seen.get(base)||0)+1;seen.set(base,n);return {...e,key:base+'#'+n};});}
 function side(e){const s=S();if(!e.actor||!s?.players?.some(p=>p.id===e.actor))return 'mesa';return e.actor===s.you?'aliado':'rival';}
 function paint(){
  if(!list)return;const all=entries(),cards=publicCards(),shown=all.slice(-maxTiles).reverse();// mais novo primeiro (em cima)
  const keys=shown.map(e=>e.key);if(keys.join('\n')===lastKeys.join('\n'))return;const before=new Set(lastKeys);lastKeys=keys;
  const nodes=shown.map((e,i)=>{const li=document.createElement('li');li.className='registro-pedra lado-'+side(e);li.dataset.key=e.key;if(!before.has(e.key)&&before.size)li.classList.add('entrando');
   const card=cards.filter(c=>e.message.includes(c.name)).sort((a,b)=>b.name.length-a.name.length)[0];const btn=document.createElement('button');btn.type='button';btn.className='registro-pedra-botao';
   const label=(side(e)==='aliado'?'Você: ':side(e)==='rival'?'Rival: ':'')+e.message+` (rodada ${e.round})`;btn.setAttribute('aria-label',label);btn.setAttribute('aria-describedby','registro-trilho-detalhe');
   if(card?.image){const img=document.createElement('img');img.src=card.image;img.alt='';img.decoding='async';btn.append(img);}else{const k=kindOf(e),span=document.createElement('span');span.className='registro-pedra-icone';span.textContent=k.icon;btn.append(span);}
   const show=()=>detail(e,card,li);btn.addEventListener('pointerenter',show);btn.addEventListener('focus',show);btn.addEventListener('pointerleave',hideDetail);btn.addEventListener('blur',hideDetail);
   li.append(btn);return li;});
  /* encaixes vazios completam a calha: ela se lê como um suporte de pedras desde o início da partida */for(let i=nodes.length;i<maxTiles;i++){const li=document.createElement('li');li.className='registro-pedra vazia';li.setAttribute('aria-hidden','true');nodes.push(li);}
  list.replaceChildren(...nodes);if(hoverKey&&!keys.includes(hoverKey))hideDetail();}
 function detail(e,card,li){if(!tip||!visible)return;hoverKey=e.key;tip.replaceChildren();tip.className='registro-trilho-detalhe lado-'+side(e);
  if(card?.image){const img=document.createElement('img');img.src=card.image;img.alt=card.name;tip.append(img);const name=document.createElement('strong');name.textContent=card.name;tip.append(name);}
  else{const k=kindOf(e),icon=document.createElement('span');icon.className='registro-detalhe-icone';icon.textContent=k.icon;const name=document.createElement('strong');name.textContent=k.label;tip.append(icon,name);}
  const who=document.createElement('small');who.textContent=(side(e)==='aliado'?'Você':side(e)==='rival'?'Rival':'Mesa')+' · rodada '+e.round;const text=document.createElement('p');text.textContent=e.message;tip.append(who,text);
  tip.hidden=false;const r=li.getBoundingClientRect(),rr=rail.getBoundingClientRect(),th=tip.offsetHeight;tip.style.left=Math.round(rr.right+12)+'px';tip.style.top=Math.round(Math.max(8,Math.min(innerHeight-th-8,r.top+r.height/2-th/2)))+'px';}
 function hideDetail(){hoverKey=null;if(tip)tip.hidden=true;}
 function setVisible(on){if(on===visible&&rail)return;visible=on;ensure();rail.hidden=!on;if(!on)hideDetail();else paint();}
 // column: caixa da coluna Nartvanyr na tela; top/bottom: faixa vertical da calha (topo da reserva rival → base da sua).
 function place({column,top,bottom,focus=0}){
  ensure();mode();const game=document.getElementById('game');
  if(!desktop()||!column||game?.hidden||focus>.01){setVisible(false);return false;}
  const width=TILE+2*PAD,right=column.left-RIGHT_GAP,left=right-width;if(left<EDGE){setVisible(false);return false;}
  const height=Math.max(0,bottom-top),fit=Math.floor((height-2*PAD+GAP)/(TILE+GAP));if(fit<MIN_TILES){setVisible(false);return false;}
  const used=fit*(TILE+GAP)-GAP+2*PAD,y=top+(height-used)/2,box=[Math.round(left),Math.round(y),Math.round(width),Math.round(used)].join(',');
  if(box!==lastBox){lastBox=box;const [x,yy,w,h]=box.split(',');Object.assign(rail.style,{left:x+'px',top:yy+'px',width:w+'px',height:h+'px'});}
  if(fit!==maxTiles){maxTiles=fit;lastKeys=[];}setVisible(true);paint();return true;}
 mode();
 root.RunaRegistroTrilho={place,mode,hide:()=>setVisible(false),get visible(){return visible;},get element(){return rail;},get tiles(){return maxTiles;}};
})(window);
