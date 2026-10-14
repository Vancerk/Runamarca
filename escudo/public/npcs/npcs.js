(() => {
  // Fonte da própria página, guardada antes de qualquer render, para a exportação em HTML independente.
  const SRC = {
    css: (document.getElementById('appStyle') || {}).textContent || '',
    root: (document.getElementById('appRoot') || {}).outerHTML || '',
    js: (document.getElementById('appScript') || {}).textContent || ''
  };
  let SEED = null;
  try { SEED = JSON.parse((document.getElementById('seedData') || {}).textContent || 'null'); } catch (e) { SEED = null; }
  const STORE = 'elysium_fichas_npc_v1' + (SEED && SEED.id ? '_' + SEED.id : '');
  // No site (Escudo do Mestre, /escudo/npcs/) as fichas ficam na conta do mestre, no servidor.
  // Num HTML exportado (com SEED) ou aberto fora do site, continuam no navegador, como antes.
  const SERVIDOR = !SEED && /^\/escudo\/npcs\/?$/.test(location.pathname);
  const API = '/escudo/api/npcs';
  let versao = 0;
  let bloqueado = false;   // carregamento falhou: não grava nada para não apagar o que está no servidor
  const ATTRS = [
    ['fis','Físico','FÍS'], ['vig','Vigor','VIG'], ['con','Controle','CON'], ['des','Destreza','DES'],
    ['ins','Instinto','INS'], ['int','Intelecto','INT'], ['car','Carisma','CAR']
  ];
  const ATTR_LABEL = Object.fromEntries(ATTRS.map(a => [a[0], a[2]]));
  const RES = [
    ['acuidade','Acuidade','con','espírito e fluxo etéreo'],
    ['audacia','Audácia','int','ilusões, efeitos cognitivos, domínio mental'],
    ['sustentar','Sustentar','vig','doenças, venenos, toxinas'],
    ['coordenacao','Coordenação','des','controle motor'],
    ['lucidez','Lucidez','ins','sentidos'],
    ['fibra','Fibra','car','encantamentos e compulsões'],
    ['tenacidade','Tenacidade','fis','derrubar, empurrar, atordoar']
  ];
  const PERICIAS = {
    'Atletismo':'fis','Natação':'vig','Acrobacia':'des','Fuga':'des','Furtividade':'des','Furto':'des','Armadilha':'des','Artimanha':'des','Campismo':'des',
    'Identificação':'ins','Iniciativa':'ins','Intuição':'int','Acalmar Animais':'int','Decifrar':'int','Dedução':'int','Idiomas':'int','Pesquisa':'int','Natureza':'int',
    'Religião':'int','Medicina':'int','História':'int','Étermancia':'con','Atuação':'car','Blefe':'car','Diplomacia':'car','Intimidação':'car','Liderança':'car','Persuasão':'car','Provocar':'car','Sorte':'none'
  };
  const SELOS = {
    none:     { nome:'Sem selo', pv:1, bonus:0, energia:1,   pr:0.5,  prNome:'Padrão' },
    elite:    { nome:'Elite',    pv:2, bonus:1, energia:1,   pr:0.75, prNome:'Elite' },
    chefe:    { nome:'Chefe',    pv:3, bonus:2, energia:1.5, pr:1,    prNome:'Chefe' },
    soberano: { nome:'Soberano', pv:4, bonus:3, energia:2,   pr:1.4,  prNome:'Colosso' }
  };
  const TIPOS = ['Inato','Passiva','Ativa','Reflexo','Magia'];
  const ORIGENS = ['Raça','Linhagem','Classe','Bênção','Virtude','Árvore','Especialização','Domínio','Arte de Batalha','Equipamento','Outro'];
  const APLICA = [['nunca','Não aparece em combos'],['buff','Passos de buff (aliado)'],['debuff','Passos de debuff (alvo)'],['ataque','Passos com teste de ataque'],['resistencia','Passos com resistência do alvo'],['dano','Passos que causam dano'],['magia','Magias de Domínio'],['sempre','Todo combo']];
  const APLICA_CURTO = { buff:'buff', debuff:'debuff', ataque:'ataques', resistencia:'resistências', dano:'dano', magia:'magias', sempre:'todo combo' };
  const ESPECIAL = [['','Nenhum'],['canalizacao','Paga o custo da magia mais cara com +3 🔶'],['desconto25','−25% no custo da magia mais cara']];
  const RECARGAS = [['','—'],['rodada','por rodada'],['combate','por combate'],['curto','por Descanso Curto'],['medio','por Descanso Médio'],['longo','por Descanso Longo'],['dia','por dia']];
  const REC_LABEL = Object.fromEntries(RECARGAS);
  const REC_RANK = { rodada:1, combate:2, curto:3, medio:4, longo:5, dia:5 };
  const blankUso = () => ({ max:0, atual:0, recarga:'', pool:'' });
  const blankCmb = () => ({ aplica:'nunca', uso:'', efeito:'', danoExtra:'', atk:0, cd:0, pa:0, energia:0, recupera:'', especial:'' });
  const ORIGEM_LABEL = { 'Domínio':'Domínio · Essência e magias', 'Árvore':'Árvore de Evolução' };

  // Tabela de Progressão (Manual 8.1)
  const ENERGIA = [0,20,20,30,30,35,35,45,45,55,55,65,65,70,70,80,80,90,90,100,120];
  const energiaBase = n => ENERGIA[Math.min(Math.max(n,1),20)];
  const teto = n => { const t = {1:2,2:3,3:3,4:4,5:4,6:5,7:5,8:6,9:6,10:7,11:7,12:8,13:8,14:9,15:9,16:10}; return t[n] ?? (n > 16 ? 10 + Math.ceil((n-16)/2) : 2); };
  const bonusPericia = n => n >= 20 ? 5 : n >= 15 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : 1;
  const nj4 = n => Math.max(1, Math.floor(n/4));
  const sg = n => (n >= 0 ? '+' : '−') + Math.abs(n);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => { const x = parseInt(v, 10); return Number.isFinite(x) ? x : 0; };

  // usos limitados: próprios da habilidade ou de um contador compartilhado (ex.: Bênçãos)
  function usesOf(n, h) {
    if (!h || !h.uso) return null;
    if (h.uso.pool) { const k = n.contadores.find(x => x.nome === h.uso.pool); return k ? { atual: num(k.atual), max: num(k.max), label: k.nome, rec: k.recarga, key: 'pool:' + k.nome } : null; }
    if (num(h.uso.max) > 0) return { atual: num(h.uso.atual), max: num(h.uso.max), label: 'usos', rec: h.uso.recarga, key: 'hab:' + h.id };
    return null;
  }
  function spendUse(n, key, qty) {
    if (key.startsWith('pool:')) { const k = n.contadores.find(x => x.nome === key.slice(5)); if (k) k.atual = Math.max(0, num(k.atual) - qty); }
    else { const h = n.habs.find(x => x.id === key.slice(4)); if (h) h.uso.atual = Math.max(0, num(h.uso.atual) - qty); }
  }
  function usesChip(n, h) {
    const u = usesOf(n, h); if (!u) return '';
    return `<span class="chip uses${u.atual ? '' : ' out'}">${u.label === 'usos' ? '' : esc(u.label) + ' '}${u.atual}/${u.max}${u.rec ? ' · ' + esc(REC_LABEL[u.rec]) : ''}</span>`;
  }
  function resetUses(n, rank) {
    n.habs.forEach(h => { if (h.uso && num(h.uso.max) > 0 && REC_RANK[h.uso.recarga] && REC_RANK[h.uso.recarga] <= rank) h.uso.atual = num(h.uso.max); });
    n.contadores.forEach(k => { if (REC_RANK[k.recarga] && REC_RANK[k.recarga] <= rank) k.atual = num(k.max); });
  }

  function blankNpc() {
    return {
      id: uid(), nome: 'Novo NPC', raca: '', classe: '', virtude: '', especializacao: '', papel: '',
      nivel: 1, selo: 'none', racaPV: 10, dado: 6, dadoModo: 'cheio', desloc: 10, rd: 0,
      recurso: 'Éter', pvMaxManual: '', energiaMaxManual: '',
      pvAtual: null, vidaExtra: 0, energiaAtual: null, pa: 10, contadores: [],
      attrs: { fis:0, vig:0, con:0, des:0, ins:0, int:0, car:0 },
      cdAttr: 'int', atkAttr: 'con', atkBonus: 0, defAttr: 'con', defBonus: 0, esqBonus: 0,
      arma: { nome: '', dados: '1d6', attr: 'con', tipo: '' },
      res: Object.fromEntries(RES.map(r => [r[0], { prof:false, extra:0 }])),
      pericias: [], tracos: [], habs: [], combos: [], equip: '', tatica: '', historia: ''
    };
  }

  // ── exemplo aleatório ──
  // Gera um NPC de exemplo diferente a cada vez: povo, nome, nível, selo e um de quatro
  // arquétipos (habilidades, perícias e combos coerentes entre si). Serve só de ponto de partida.
  const EX_NOMES = {
    'Humano': { m: ['Cedric','Marcus','Sevrin','Garron','Dorian','Halden','Osric','Reyner'], f: ['Helene','Branwen','Maela','Aveline','Isolde','Liora','Petra','Sabine'], s: ['Dorn','Draholt','Feldran','Voss','Ashworth','Blackwood','Lockhart','Fenwick'] },
    'Elfo Original': { m: ['Aelindor','Thalorien','Vaelor','Calenmir','Ithrandir'], f: ['Mirael','Sylvara','Elowen','Calantha','Ithrenna'], s: ['Moonwhisper','Nightweave','Thornveil','Silverleaf','Dawnsinger'] },
    'Vaelita': { m: ['Kael','Zephyrion','Solareth','Lyrond','Ethrion'], f: ['Astraea','Zephyra','Solenne','Lyranna','Solmira'], s: ['Starforged','Etherbloom','Fluxweaver','Aetherfall','Novaspire'] },
    'Sylvanis': { m: ['Bracken','Rowan','Fernal','Aspen','Cedar'], f: ['Briar','Ivywen','Willowen','Sagewen','Larkspur'], s: ['Mossbind','Willowmere','Bramblewood','Greenhollow','Rootwhisper'] },
    'Jaghut': { m: ['Karnok','Vorthak','Ozrund','Drommek','Molgrund'], f: ['Urlaith','Kethara','Malgrid','Vhalka','Kharune'], s: ['Punho-de-Pedra','Olho-Fundo','Barbarrocha','Veia-Negra','Osso-Antigo'] },
    'Faelen': { m: ['Pip','Milo','Bramwell','Wick','Fennick'], f: ['Nettle','Tilly','Poppy','Wisp','Marigold'], s: ['Cogwhistle','Bramblefoot','Quickspanner','Tinkerroot','Lampwick'] },
    'Lupino': { m: ['Wolfram','Ulfric','Haldor','Kolvar','Vaskan'], f: ['Ylva','Astrid','Freyda','Runa','Ingrith'], s: ['Moonhowl','Silverfang','Ironjaw','Duskrunner','Redclaw'] },
    'Vampiro': { m: ['Draven','Alaric','Cassius','Malachor'], f: ['Vespera','Seraphina','Morwenna','Ravenna'], s: ['Duskmantle','Ravenscar','Bloodmere','Grimhallow'] }
  };
  const EX_PERSONALIDADE = ['Fala alto e gesticula muito ao contar histórias.','Cumprimenta estranhos como se já os conhecesse.','Nunca olha diretamente nos olhos de quem conversa.','Observa tudo em silêncio antes de dizer qualquer coisa.','É brutalmente honesto(a), mesmo quando não deveria.','Trata qualquer desconhecido com desconfiança imediata.','Ri em momentos inapropriados quando está nervoso(a).','Nunca termina uma frase sem um provérbio.'];
  const H = (tipo, origem, fase, nome, pa, energia, alcance, duracao, desc, cmb, uso) => ({ tipo, origem, fase, nome, pa: String(pa), energia: String(energia), ps: '', alvo: '', alcance, duracao, desc, cmb: Object.assign(blankCmb(), cmb || {}), uso: Object.assign(blankUso(), uso || {}) });
  const EX_ARQUETIPOS = [
    { papel: 'Mercenário de aluguel', classe: 'Guerreiro', recurso: 'Estamina', dado: 8, rd: 2, desloc: 10, ordem: ['fis','vig','des'], cd: 'fis', atk: 'fis', def: 'fis',
      arma: { nome: 'Espada Longa', dados: '1d10', attr: 'fis', tipo: 'físico' },
      pericias: [['Atletismo','fis'],['Intimidação','car'],['Iniciativa','ins']],
      equip: 'Espada Longa (1d10 + Físico) · Cota de malha (RD 2) · bolsa com moedas de três contratos diferentes',
      tatica: 'Abre com Investida para chegar ao alvo mais frágil. Guarda 2 🔶 para Aparar Firme quando estiver cercado.',
      habs: () => [
        H('Ativa','Classe','Fase I','Golpe Pesado',3,3,'corpo a corpo','', 'Ataque corpo a corpo com +1d6 de dano adicional. Se acertar, o alvo faz Tenacidade contra a CD ou fica Derrubado.'),
        H('Ativa','Classe','Fase I','Investida',2,2,'6m','', 'Avança até 6 m em linha reta e ataca; ignora terreno difícil nesse movimento.'),
        H('Reflexo','Classe','Fase I','Aparar Firme',2,2,'','', 'Ao ser atacado corpo a corpo, soma +2 na Defesa contra esse ataque.'),
        H('Passiva','Classe','Passiva','Fôlego de Batalha','','','','', 'Uma vez por combate, ao cair abaixo da metade dos PV, recupera 1d8 de Estamina.', { aplica:'nunca' }, { max:1, atual:1, recarga:'combate' })
      ],
      combos: [['Abrir caminho','Use quando o alvo estiver a até 6 m.',['Investida','Golpe Pesado']], ['Pressão','Dois golpes da arma e um Golpe Pesado no mesmo turno.',['__arma','Golpe Pesado']]] },
    { papel: 'Etermante de rua', classe: 'Arcanista', recurso: 'Éter', dado: 6, rd: 0, desloc: 10, ordem: ['con','int','ins'], cd: 'int', atk: 'con', def: 'des',
      arma: { nome: 'Cajado curto', dados: '1d6', attr: 'con', tipo: 'mágico' },
      pericias: [['Étermancia','con'],['Pesquisa','int'],['Blefe','car']],
      equip: 'Cajado curto (1d6 + Controle, mágico) · casaco com bolsos cheios de anotações · frasco de tinta luminosa',
      tatica: 'Fica atrás da linha de frente. Prende o alvo com Correntes de Fluxo e termina com Dardos Etéreos. Guarda Éter para o Escudo Arcano.',
      habs: () => [
        H('Magia','Classe','Fase I','Dardo Etéreo',2,3,'12m','', 'Projétil mágico com teste de ataque: 2d6 de dano mágico.'),
        H('Magia','Classe','Fase I','Correntes de Fluxo',3,4,'9m','1r', 'O alvo faz Acuidade contra a CD; se falhar, fica com Lentidão até o fim do próximo turno e sofre 1d8 de dano mágico.'),
        H('Reflexo','Classe','Fase I','Escudo Arcano',2,3,'','', 'Ao ser atacado, ganha 8 de Vida Extra contra esse ataque.'),
        H('Passiva','Classe','Passiva','Fonte Instável','','','','', 'Ao gastar 6 de Éter ou mais num turno, o próximo Dardo Etéreo custa 1 de Éter a menos.')
      ],
      combos: [['Prender e queimar','Correntes primeiro: se o alvo falhar na Acuidade, os dardos acertam um alvo lento.',['Correntes de Fluxo','Dardo Etéreo','Dardo Etéreo']]] },
    { papel: 'Batedor da fronteira', classe: 'Caçador', recurso: 'Estamina', dado: 8, rd: 1, desloc: 12, ordem: ['des','ins','vig'], cd: 'ins', atk: 'des', def: 'des',
      arma: { nome: 'Arco curto', dados: '1d8', attr: 'des', tipo: 'físico' },
      pericias: [['Identificação','ins'],['Furtividade','des'],['Natureza','int'],['Campismo','des']],
      equip: 'Arco curto (1d8 + Destreza) · aljava com 20 flechas · capa de couro manchada de lama',
      tatica: 'Marca o alvo mais perigoso logo no início e atira de longe. Se alguém chegar perto, usa Recuo Tático.',
      habs: () => [
        H('Ativa','Classe','Fase I','Marcar Presa',1,1,'18m','3r', 'Marca um alvo visível: os ataques do batedor contra ele causam +1d4 de dano.'),
        H('Ativa','Classe','Fase I','Tiro Certeiro',3,3,'24m','', 'Ataque à distância com +1d8 de dano adicional; ignora cobertura leve.'),
        H('Reflexo','Classe','Fase I','Recuo Tático',2,2,'','', 'Ao ser alvo de ataque corpo a corpo, recua 3 m sem provocar ataque de oportunidade.'),
        H('Passiva','Classe','Passiva','Olhos de Falcão','','','','', '+2 em Identificação para notar emboscadas, rastros e armadilhas.')
      ],
      combos: [['Caçada','Marque primeiro: o +1d4 vale para o Tiro Certeiro e para o disparo seguinte.',['Marcar Presa','Tiro Certeiro','__arma']]] },
    { papel: 'Capitão da guarda', classe: 'Cavaleiro', recurso: 'Estamina', dado: 8, rd: 3, desloc: 10, ordem: ['fis','car','vig'], cd: 'car', atk: 'fis', def: 'fis',
      arma: { nome: 'Lança e escudo', dados: '1d8', attr: 'fis', tipo: 'físico' },
      pericias: [['Liderança','car'],['Intimidação','car'],['Atletismo','fis']],
      equip: 'Lança (1d8 + Físico) · escudo com o brasão da cidade · armadura média (RD 3) · apito de comando',
      tatica: 'Nunca luta sozinho: posiciona os guardas em formação e usa Ordem de Ataque no aliado com melhor posição.',
      habs: () => [
        H('Ativa','Classe','Fase I','Golpe de Escudo',2,2,'corpo a corpo','', 'Empurra o alvo 2 m; ele faz Tenacidade contra a CD ou fica Atordoado até o fim do próximo turno.'),
        H('Ativa','Classe','Fase I','Ordem de Ataque',2,2,'9m','', 'Um aliado a até 9 m faz um ataque básico imediatamente.'),
        H('Ativa','Classe','Fase II','Formação de Escudos',3,4,'3m','2r', 'Aliados adjacentes ganham +1 na Defesa por 2 rodadas.'),
        H('Passiva','Classe','Passiva','Voz de Comando','','','','', 'Aliados que o veem têm +1 em resistências contra Amedrontado.')
      ],
      combos: [['Quebrar a linha','Atordoa quem segura a frente e manda um aliado aproveitar a abertura.',['Golpe de Escudo','Ordem de Ataque']]] }
  ];
  const ex = lista => lista[Math.floor(Math.random() * lista.length)];
  function exemploAleatorio() {
    const arq = ex(EX_ARQUETIPOS);
    const raca = ex(Object.keys(EX_NOMES));
    const fem = Math.random() < 0.5;
    const nomes = EX_NOMES[raca];
    const nivel = 3 + Math.floor(Math.random() * 10);
    const sorteioSelo = Math.random();
    const selo = sorteioSelo < 0.45 ? 'none' : sorteioSelo < 0.75 ? 'elite' : sorteioSelo < 0.95 ? 'chefe' : 'soberano';
    const t = teto(nivel);
    const attrs = { fis:0, vig:0, con:0, des:0, ins:0, int:0, car:0 };
    Object.keys(attrs).forEach(k => { attrs[k] = Math.floor(Math.random() * 2); });
    attrs[arq.ordem[0]] = t; attrs[arq.ordem[1]] = Math.max(1, t - 2); attrs[arq.ordem[2]] = Math.max(1, Math.floor(t / 2));
    const n = blankNpc();
    Object.assign(n, {
      nome: (fem ? ex(nomes.f) : ex(nomes.m)) + ' ' + ex(nomes.s), raca, classe: arq.classe, papel: 'Exemplo · ' + arq.papel,
      nivel, selo, racaPV: 10, dado: arq.dado, dadoModo: 'cheio', desloc: arq.desloc, rd: arq.rd, recurso: arq.recurso,
      attrs, cdAttr: arq.cd, atkAttr: arq.atk, defAttr: arq.def, arma: { ...arq.arma },
      pericias: arq.pericias.map(([nome, attr]) => ({ nome, attr, treinada: true, extra: 0 })),
      habs: arq.habs().map(h => ({ ...h, id: uid() })),
      equip: arq.equip, tatica: arq.tatica,
      historia: `Personalidade: ${ex(EX_PERSONALIDADE)}\nFicha de exemplo gerada aleatoriamente: edite à vontade, exclua ou gere outra em Importar → “Adicionar exemplo aleatório”.`
    });
    const id = nome => (n.habs.find(h => h.nome === nome) || {}).id || '';
    n.combos = arq.combos.map(([nome, nota, passos]) => ({ id: uid(), nome, nota, passos: passos.map(p => stepFromHab(n, p === '__arma' ? ARMA : id(p))) }));
    return n;
  }
  // Fichas antigas trazem o exemplo fixo do Kiran Veyr; se for a única ficha, troca por um exemplo aleatório.
  const ehKiranExemplo = n => n && n.nome === 'Kiran Veyr' && String(n.papel || '').startsWith('Exemplo');

  // ── estado e armazenamento ──
  let db = { npcs: [], current: null };
  let canStore = true;
  let trocouExemplo = false;
  const filters = {};
  const editing = new Set();

  async function load() {
    let fromStore = false;
    if (SERVIDOR) {
      const r = await fetch(API, { credentials: 'same-origin', cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 401 ? 'Sua sessão expirou. Entre novamente com o Discord.' : r.status === 403 ? 'Sua conta não tem acesso às fichas de NPC.' : (d.error || 'Não foi possível carregar as fichas.'));
      versao = d.version || 0;
      if (d.data && Array.isArray(d.data.npcs) && d.data.npcs.length) { db = d.data; fromStore = true; }
    } else {
      try { const raw = localStorage.getItem(STORE); if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.npcs)) { db = d; fromStore = true; } } }
      catch (e) { canStore = false; }
    }
    if (!fromStore && SEED && Array.isArray(SEED.npcs) && SEED.npcs.length) db = { npcs: JSON.parse(JSON.stringify(SEED.npcs)), current: SEED.current || null };
    db.npcs = db.npcs.map(normalize);
    if (db.npcs.length === 1 && ehKiranExemplo(db.npcs[0])) { db.npcs = []; trocouExemplo = true; }
    if (!db.npcs.length) { const k = exemploAleatorio(); db.npcs.push(k); db.current = k.id; }
    if (!db.npcs.find(n => n.id === db.current)) db.current = db.npcs[0].id;
  }
  let saveTimer = null;
  let pendente = false;      // há alteração ainda não enviada
  let enviando = null;       // gravação em andamento
  function save() {
    if (bloqueado) return;
    clearTimeout(saveTimer);
    if (!SERVIDOR) {
      saveTimer = setTimeout(() => {
        try { localStorage.setItem(STORE, JSON.stringify(db)); setStatus('Salvo automaticamente neste navegador.'); }
        catch (e) { setStatus('Este navegador não deixou salvar. Use Exportar para guardar a ficha em arquivo.', true); }
      }, 250);
      return;
    }
    pendente = true;
    setStatus('Alterações não salvas…');
    saveTimer = setTimeout(enviar, 1500);
  }
  async function enviar() {
    if (!pendente || bloqueado) return;
    if (enviando) { await enviando.catch(() => {}); return enviar(); }
    pendente = false;
    setStatus('Salvando…');
    enviando = (async () => {
      let r, d = {};
      try {
        r = await fetch(API, { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: versao, data: db }) });
        d = await r.json().catch(() => ({}));
      } catch (e) { pendente = true; setStatus('Sem conexão com o servidor: a alteração não foi salva. Tentando de novo em instantes…', true); clearTimeout(saveTimer); saveTimer = setTimeout(enviar, 5000); return; }
      if (r.ok) { versao = d.version; setStatus(pendente ? 'Alterações não salvas…' : 'Salvo na sua conta.'); return; }
      if (r.status === 409 && d.data) {
        // Outra aba ou outro computador gravou antes: mostra a versão salva em vez de sobrescrever.
        versao = d.version; db = d.data; db.npcs = db.npcs.map(normalize);
        if (!db.npcs.find(n => n.id === db.current)) db.current = db.npcs[0]?.id;
        render(); if (tab === 'combos') renderCombos();
        setStatus('As fichas tinham sido alteradas em outra aba ou computador. Mostrando a versão salva — refaça a última alteração.', true);
        return;
      }
      pendente = true;
      if (r.status === 429) { setStatus('Muitas gravações seguidas: aguarde um pouco, a alteração será enviada.', true); clearTimeout(saveTimer); saveTimer = setTimeout(enviar, 20000); return; }
      setStatus((r.status === 401 ? 'Sua sessão expirou: entre novamente com o Discord e recarregue a página.' : d.error || 'Não foi possível salvar.') + ' Use Exportar para não perder o que mudou.', true);
    })();
    try { await enviando; } finally { enviando = null; }
  }
  // Ao fechar a aba com alteração pendente, envia o que der (keepalive tem limite de 64 KB).
  window.addEventListener('pagehide', () => {
    if (!SERVIDOR || !pendente || bloqueado) return;
    const body = JSON.stringify({ version: versao, data: db });
    if (body.length < 60000) { try { fetch(API, { method: 'PUT', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json' }, body }); } catch (e) {} }
  });
  window.addEventListener('beforeunload', e => { if (SERVIDOR && (pendente || enviando)) { e.preventDefault(); e.returnValue = ''; } });
  function setStatus(t, err) { const s = $('#status'); s.textContent = t; s.classList.toggle('err', !!err); }
  function normalize(n) {
    const b = blankNpc();
    const out = Object.assign(b, n || {});
    out.attrs = Object.assign(b.attrs, (n && n.attrs) || {});
    out.arma = Object.assign({ nome:'', dados:'1d6', attr:'con', tipo:'' }, (n && n.arma) || {});
    const r = {}; RES.forEach(([k]) => r[k] = Object.assign({ prof:false, extra:0 }, ((n && n.res) || {})[k] || {})); out.res = r;
    ['pericias','tracos','habs','contadores','combos'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
    out.habs.forEach(h => { if (!h.id) h.id = uid(); h.cmb = Object.assign(blankCmb(), h.cmb || {}); h.uso = Object.assign(blankUso(), h.uso || {}); });
    out.contadores.forEach(k => { if (k.recarga == null) k.recarga = ''; });
    out.combos.forEach(cb => { if (!cb.id) cb.id = uid(); if (!Array.isArray(cb.passos)) cb.passos = []; });
    if (!out.id) out.id = uid();
    return out;
  }
  function reid(n) {
    const map = {};
    n.habs.forEach(h => { const nid = uid(); map[h.id] = nid; h.id = nid; });
    n.combos.forEach(cb => { cb.id = uid(); cb.passos.forEach(p => { if (p.habId && map[p.habId]) p.habId = map[p.habId]; }); });
  }
  const cur = () => db.npcs.find(n => n.id === db.current);

  // ── cálculos ──
  function calc(n) {
    const s = SELOS[n.selo] || SELOS.none;
    const lv = Math.max(1, num(n.nivel));
    const a = k => k === 'none' ? 0 : num(n.attrs[k]);
    const dieVal = n.dadoModo === 'metade' ? Math.floor(num(n.dado)/2) : num(n.dado);
    const dieTot = dieVal * lv;
    const vigTot = Math.floor(a('vig') * lv / 2);
    const pvBase = num(n.racaPV) + dieTot + vigTot;
    const pvAuto = Math.max(1, pvBase * s.pv);
    const pvMax = n.pvMaxManual !== '' && n.pvMaxManual != null ? Math.max(1, num(n.pvMaxManual)) : pvAuto;
    const eBase = energiaBase(lv);
    const eAuto = Math.round(eBase * s.energia);
    const eMax = n.energiaMaxManual !== '' && n.energiaMaxManual != null ? Math.max(0, num(n.energiaMaxManual)) : eAuto;
    const bp = bonusPericia(lv);
    const cd = 10 + a(n.cdAttr) + nj4(lv) + s.bonus;
    const atk = a(n.atkAttr) + num(n.atkBonus) + s.bonus;
    const aparar = a(n.defAttr) + num(n.defBonus) + s.bonus;
    const esq = a('des') + num(n.esqBonus) + s.bonus;
    const prCost = (lv > 20 ? lv * 2.5 : lv * 2) * s.pr;
    return { s, lv, dieVal, dieTot, vigTot, pvBase, pvAuto, pvMax, eBase, eAuto, eMax, bp, cd, atk, aparar, esq, prCost, teto: teto(lv), a };
  }

  // ── render ──
  const $ = q => document.querySelector(q);
  const attrOpts = (sel, withNone) => (withNone ? `<option value="none"${sel==='none'?' selected':''}>—</option>` : '') + ATTRS.map(([k,,ab]) => `<option value="${k}"${sel===k?' selected':''}>${ab}</option>`).join('');
  const opts = (list, sel) => list.map(v => `<option${v===sel?' selected':''}>${esc(v)}</option>`).join('');

  function renderRoster() {
    const sel = $('#npcSelect');
    sel.innerHTML = db.npcs.map(n => `<option value="${n.id}"${n.id===db.current?' selected':''}>${esc(n.nome || 'Sem nome')} · Nv ${num(n.nivel)} · ${SELOS[n.selo]?.nome || 'Sem selo'}</option>`).join('');
  }

  // seções recolhidas: preferência do navegador, vale para todas as fichas
  let collapsed = new Set();
  try { collapsed = new Set(JSON.parse(localStorage.getItem(STORE + '_fechadas') || '[]')); } catch (e) {}
  const secCls = k => collapsed.has(k) ? ' collapsed' : '';
  const secTog = k => `<button class="ctog" data-action="toggleSec" data-sec="${k}" aria-expanded="${!collapsed.has(k)}" title="${collapsed.has(k) ? 'Abrir seção' : 'Fechar seção'}">${collapsed.has(k) ? '▸ Abrir' : '▾ Fechar'}</button>`;
  function saveCollapsed() { try { localStorage.setItem(STORE + '_fechadas', JSON.stringify([...collapsed])); } catch (e) {} }

  function render() {
    const n = cur(); if (!n) return;
    const c = calc(n);
    if (n.pvAtual == null) n.pvAtual = c.pvMax;
    if (n.energiaAtual == null) n.energiaAtual = c.eMax;
    const isEter = n.recurso !== 'Estamina';
    const fl = filters[n.id] || (filters[n.id] = { tipo:'Todas', origem:'Todas' });
    const habs = n.habs.filter(h => (fl.tipo === 'Todas' || h.tipo === fl.tipo) && (fl.origem === 'Todas' || h.origem === fl.origem));
    const origensUsadas = ORIGENS.filter(o => n.habs.some(h => h.origem === o)).concat([...new Set(n.habs.map(h => h.origem))].filter(o => o && !ORIGENS.includes(o)));

    $('#sheet').innerHTML = `
    <div class="head">
      <div class="head-main">
        <input class="name-in" id="f-nome" data-path="nome" value="${esc(n.nome)}" aria-label="Nome do NPC">
        <div class="idline">
          <label>Raça · linhagem<input id="f-raca" data-path="raca" value="${esc(n.raca)}"></label>
          <label>Classe<input id="f-classe" data-path="classe" value="${esc(n.classe)}"></label>
          <label>Virtude<input id="f-virtude" data-path="virtude" value="${esc(n.virtude)}"></label>
          <label>Especialização<input id="f-esp" data-path="especializacao" value="${esc(n.especializacao)}"></label>
          <label>Papel · facção<input id="f-papel" data-path="papel" value="${esc(n.papel)}"></label>
        </div>
      </div>
      <div class="badges">
        <div class="badge">
          <span class="lbl">NÍVEL</span>
          <input type="number" id="f-nivel" data-path="nivel" data-num min="1" max="30" value="${c.lv}">
          <span class="sub">Teto <b id="d-teto">${sg(c.teto)}</b> · Perícia <b id="d-bp">${sg(c.bp)}</b></span>
        </div>
        <div class="badge pr" title="Custo em Pontos de Risco = Nível × 2 × Presença">
          <span class="lbl">CUSTO</span>
          <span class="big" id="d-pr">${fmtPR(c.prCost)}</span>
          <span class="sub" id="d-prsub">PR · ${c.s.prNome}</span>
        </div>
        <div style="flex-basis:100%;display:grid;gap:3px">
          <span class="badge-lbl" style="font-family:var(--f-display);font-size:9px;letter-spacing:1.5px;color:var(--muted)">SELO DE AMEAÇA</span>
          <div class="selo" role="group" aria-label="Selo de Ameaça">
            ${Object.entries(SELOS).map(([k,s]) => `<button type="button" data-action="selo" data-v="${k}" class="${n.selo===k?'on':''}" aria-pressed="${n.selo===k}"><b>${s.nome}</b><span>PV ×${s.pv}${s.bonus?` · +${s.bonus}`:''}</span></button>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="divider"><i></i><b></b><i></i><b></b><i></i></div>
    <div class="secbar"><button class="ctog" data-action="allSec" data-v="close">▾ Fechar todas</button><button class="ctog" data-action="allSec" data-v="open">▸ Abrir todas</button></div>

    <div class="grid">
      <section class="panel full${secCls('vit')}" data-sec="vit">
        <h2 class="ptitle">Vitalidade e Energia${secTog('vit')}</h2>
        <div class="vitals">
          <div class="vbox">
            <div class="vlabel"><span>Pontos de Vida</span><span class="c-pv" id="d-pvpct"></span></div>
            <div class="vrow">
              <input class="cur c-pv" type="number" id="f-pvAtual" data-path="pvAtual" data-num value="${num(n.pvAtual)}" aria-label="PV atuais">
              <span class="slash">/</span><span class="max" id="d-pvmax">${c.pvMax}</span>
            </div>
            <div class="ve">Vida Extra <input type="number" id="f-ve" data-path="vidaExtra" data-num min="0" value="${num(n.vidaExtra)}" aria-label="Vida Extra"></div>
            <div class="act">
              <input type="number" id="pvDelta" min="0" placeholder="0" aria-label="Valor de dano ou cura">
              <button class="neg" data-action="dano">− Dano</button>
              <button class="pos" data-action="cura">+ Cura</button>
            </div>
            <div class="act quick">
              <button class="neg" data-action="pvm10" title="Tira 10 PV (a Vida Extra absorve primeiro)">−10 PV</button>
              <button class="pos" data-action="pvmax" title="Volta os PV ao máximo">PV ao máximo</button>
            </div>
            <div class="formula" id="d-pvformula"></div>
          </div>
          <div class="vbox">
            <div class="vlabel"><span>${isEter ? '🔵' : '🔴'} ${esc(n.recurso)}</span>
              <select id="f-recurso" data-path="recurso" aria-label="Recurso" style="background:var(--panel);border:1px solid var(--line);border-radius:3px;font-size:10px">${opts(['Éter','Estamina'], n.recurso)}</select></div>
            <div class="vrow">
              <input class="cur ${isEter?'c-eter':'c-sta'}" type="number" id="f-eAtual" data-path="energiaAtual" data-num value="${num(n.energiaAtual)}" aria-label="Energia atual">
              <span class="slash">/</span><span class="max" id="d-emax">${c.eMax}</span>
            </div>
            <div class="act">
              <input type="number" id="eDelta" min="0" placeholder="0" aria-label="Valor de energia">
              <button class="neg" data-action="gastar">− Gastar</button>
              <button class="pos" data-action="recuperar">+ Recuperar</button>
            </div>
            <div class="act quick">
              <button class="neg" data-action="em10">−10 ${esc(n.recurso)}</button>
              <button class="pos" data-action="emax">${esc(n.recurso)} ao máximo</button>
            </div>
            <div class="formula" id="d-eformula"></div>
          </div>
          <div class="vbox">
            <div class="vlabel"><span>🔶 Pontos de Ação</span><button class="btn small" data-action="rodada">Nova rodada</button></div>
            <div class="stepper">
              <button data-action="pa" data-d="-1" aria-label="Menos 1 PA">−</button>
              <span class="num" id="d-pa">${num(n.pa)}</span>
              <span class="slash" style="color:var(--faint)">/ 10</span>
              <button data-action="pa" data-d="1" aria-label="Mais 1 PA">+</button>
            </div>
            <div class="pips" id="d-pips">${pips(n.pa)}</div>
            <div class="formula">Chassi de Personagem: 10 🔶, renovados por completo a cada rodada, com ou sem Selo.</div>
          </div>
          <div class="vbox">
            <div class="vlabel"><span>Contadores</span><button class="btn small" data-action="addCounter">+ Contador</button></div>
            <div class="counters">
              ${n.contadores.length ? n.contadores.map((k,i) => `
                <div class="counter">
                  <input class="cname" id="cn-${i}" data-list="contadores" data-idx="${i}" data-key="nome" value="${esc(k.nome)}" aria-label="Nome do contador">
                  <div class="stepper">
                    <button data-action="cstep" data-idx="${i}" data-d="-1" aria-label="Menos 1">−</button>
                    <span class="num" style="font-size:16px" id="d-cv-${i}">${num(k.atual)}</span>
                    <button data-action="cstep" data-idx="${i}" data-d="1" aria-label="Mais 1">+</button>
                  </div>
                  <span class="slash" style="color:var(--faint)">/</span>
                  <input class="cmax" type="number" id="cm-${i}" data-list="contadores" data-idx="${i}" data-key="max" data-num value="${num(k.max)}" aria-label="Máximo">
                  <select class="crec" id="cr-${i}" data-list="contadores" data-idx="${i}" data-key="recarga" aria-label="Recarga">${RECARGAS.map(([v,l]) => `<option value="${v}"${(k.recarga||'')===v?' selected':''}>${v ? 'recarga ' + l : 'sem recarga'}</option>`).join('')}</select>
                  <button class="x" data-action="del" data-list="contadores" data-idx="${i}" aria-label="Remover contador">×</button>
                </div>`).join('') : `<div class="formula">Cargas, Veredictos, Páginas de Comando, Fragmentos… adicione o que a classe usar.</div>`}
            </div>
          </div>
          <div class="vbox">
            <div class="vlabel"><span>Descansos e recargas</span></div>
            <div class="rests">
              <button class="btn small" data-action="rest" data-r="1" title="PA volta a 10; usos por rodada voltam">Nova rodada</button>
              <button class="btn small" data-action="rest" data-r="2" title="Usos por combate e por rodada voltam">Fim do combate</button>
              <button class="btn small" data-action="rest" data-r="3" title="+25% de PV e Éter; usos por Descanso Curto voltam">Descanso Curto</button>
              <button class="btn small" data-action="rest" data-r="4" title="+50% de PV e Éter; usos até Descanso Médio voltam">Descanso Médio</button>
              <button class="btn small primary" data-action="rest" data-r="5" title="PV e Éter cheios; todos os usos voltam">Descanso Longo</button>
            </div>
            <div class="formula">Curto (2 h) devolve 25% de PV e ${esc(n.recurso)}, Médio (4 h) 50%, Longo (8 h) tudo. Cada descanso também recarrega os usos do seu nível e dos menores.</div>
          </div>
        </div>
      </section>

      <section class="panel full${secCls('build')}" data-sec="build">
        <h2 class="ptitle">Construção · Chassi de Personagem${secTog('build')}</h2>
        <div class="build">
          <label class="field"><span>PV base da raça</span><input type="number" id="f-racaPV" data-path="racaPV" data-num value="${num(n.racaPV)}"></label>
          <label class="field"><span>Dado de Classe</span><select id="f-dado" data-path="dado" data-num>${[4,6,8,10,12].map(d => `<option value="${d}"${num(n.dado)===d?' selected':''}>d${d}</option>`).join('')}</select></label>
          <label class="field"><span>Leitura do dado</span><select id="f-dadoModo" data-path="dadoModo"><option value="cheio"${n.dadoModo==='cheio'?' selected':''}>Valor cheio</option><option value="metade"${n.dadoModo==='metade'?' selected':''}>Metade garantida</option></select></label>
          <label class="field"><span>Deslocamento (m)</span><input type="number" id="f-desloc" data-path="desloc" data-num value="${num(n.desloc)}"></label>
          <label class="field"><span>RD</span><input type="number" id="f-rd" data-path="rd" data-num value="${num(n.rd)}"></label>
          <label class="field"><span>PV máx. manual</span><input type="number" id="f-pvman" data-path="pvMaxManual" value="${esc(n.pvMaxManual)}" placeholder="auto"><small>Vazio usa a fórmula</small></label>
          <label class="field"><span>Energia máx. manual</span><input type="number" id="f-eman" data-path="energiaMaxManual" value="${esc(n.energiaMaxManual)}" placeholder="auto"><small>Vazio usa a Tabela de Progressão</small></label>
        </div>
      </section>

      <section class="panel full${secCls('attrs')}" data-sec="attrs">
        <h2 class="ptitle">Atributos (modificadores)${secTog('attrs')}</h2>
        <div class="attrs">
          ${ATTRS.map(([k,full,ab]) => `
            <div class="attr" id="a-${k}">
              <div class="an" title="${full}">${ab}</div>
              <input type="number" id="f-a-${k}" data-path="attrs.${k}" data-num value="${num(n.attrs[k])}" aria-label="${full}">
              <div class="tag" id="t-${k}"></div>
            </div>`).join('')}
        </div>
      </section>

      <section class="panel full${secCls('combat')}" data-sec="combat">
        <h2 class="ptitle">Combate${secTog('combat')}</h2>
        <div class="combat">
          <div class="citem">
            <div class="clabel">CD da Classe</div>
            <div class="cval" id="d-cd" style="color:var(--fire)"></div>
            <div class="cctl"><select id="f-cdAttr" data-path="cdAttr" aria-label="Atributo da CD">${attrOpts(n.cdAttr)}</select></div>
            <div class="csub" id="d-cdsub"></div>
          </div>
          <div class="citem">
            <div class="clabel">Ataque</div>
            <div class="cval" id="d-atk"></div>
            <div class="cctl"><select id="f-atkAttr" data-path="atkAttr" aria-label="Atributo de ataque">${attrOpts(n.atkAttr)}</select><input type="number" id="f-atkBonus" data-path="atkBonus" data-num value="${num(n.atkBonus)}" aria-label="Bônus extra de ataque" title="Bônus extra"></div>
            <div class="csub" id="d-atksub"></div>
          </div>
          <div class="citem">
            <div class="clabel">Arma · dano</div>
            <div class="cval" id="d-dano" style="font-size:16px"></div>
            <div class="cctl"><input class="wide" id="f-armaNome" data-path="arma.nome" value="${esc(n.arma.nome)}" placeholder="Arma" aria-label="Nome da arma"></div>
            <div class="cctl"><input id="f-armaDados" data-path="arma.dados" value="${esc(n.arma.dados)}" aria-label="Dados de dano" style="width:58px"><select id="f-armaAttr" data-path="arma.attr" aria-label="Atributo do dano">${attrOpts(n.arma.attr, true)}</select><input id="f-armaTipo" data-path="arma.tipo" value="${esc(n.arma.tipo)}" placeholder="tipo" aria-label="Tipo de dano" style="width:64px"></div>
          </div>
          <div class="citem">
            <div class="clabel">Aparar</div>
            <div class="cval" id="d-aparar"></div>
            <div class="cctl"><select id="f-defAttr" data-path="defAttr" aria-label="Atributo de Aparar">${attrOpts(n.defAttr)}</select><input type="number" id="f-defBonus" data-path="defBonus" data-num value="${num(n.defBonus)}" aria-label="Bônus de Aparar" title="Bônus extra"></div>
            <div class="csub">Modificador da arma</div>
          </div>
          <div class="citem">
            <div class="clabel">Esquiva</div>
            <div class="cval" id="d-esq"></div>
            <div class="cctl"><input type="number" id="f-esqBonus" data-path="esqBonus" data-num value="${num(n.esqBonus)}" aria-label="Bônus de Esquiva" title="Bônus extra"></div>
            <div class="csub">Destreza</div>
          </div>
          <div class="citem">
            <div class="clabel">Iniciativa · Desloc. · RD</div>
            <div class="cval" id="d-misc" style="font-size:15px"></div>
            <div class="csub">Iniciativa usa Instinto</div>
          </div>
        </div>
      </section>

      <section class="panel${secCls('res')}" data-sec="res">
        <h2 class="ptitle">Resistências${secTog('res')}</h2>
        <div class="lhead res"><span>Resistência</span><span>Atrib.</span><span title="Proficiente">Prof</span><span>Extra</span><span>Total</span></div>
        <div class="list">
          ${RES.map(([k,nome,at,prot]) => `
            <div class="lrow res">
              <span class="resname">${nome}<small>${prot}</small></span>
              <span style="font-size:10.5px;color:var(--muted);text-align:center">${ATTR_LABEL[at]}</span>
              <input type="checkbox" id="r-p-${k}" data-path="res.${k}.prof" ${n.res[k].prof?'checked':''} aria-label="${nome} proficiente">
              <input type="number" id="r-e-${k}" data-path="res.${k}.extra" data-num value="${num(n.res[k].extra)}" aria-label="${nome} bônus extra">
              <span class="tot" id="d-res-${k}"></span>
            </div>`).join('')}
        </div>
      </section>

      <section class="panel${secCls('per')}" data-sec="per">
        <h2 class="ptitle">Perícias <button class="btn small tool" data-action="addPericia">+ Perícia</button>${secTog('per')}</h2>
        <datalist id="pericias-dl">${Object.keys(PERICIAS).map(p => `<option value="${p}">`).join('')}</datalist>
        ${n.pericias.length ? `<div class="lhead"><span>Perícia</span><span>Atrib.</span><span title="Treinada">Trein.</span><span>Extra</span><span>Total</span><span></span></div>` : ''}
        <div class="list">
          ${n.pericias.length ? n.pericias.map((p,i) => `
            <div class="lrow">
              <input type="text" id="p-n-${i}" list="pericias-dl" data-list="pericias" data-idx="${i}" data-key="nome" value="${esc(p.nome)}" placeholder="Nome" aria-label="Nome da perícia">
              <select id="p-a-${i}" data-list="pericias" data-idx="${i}" data-key="attr" aria-label="Atributo">${attrOpts(p.attr, true)}</select>
              <input type="checkbox" id="p-t-${i}" data-list="pericias" data-idx="${i}" data-key="treinada" ${p.treinada?'checked':''} aria-label="Treinada">
              <input type="number" id="p-e-${i}" data-list="pericias" data-idx="${i}" data-key="extra" data-num value="${num(p.extra)}" aria-label="Bônus extra">
              <span class="tot" id="d-per-${i}"></span>
              <button class="x" data-action="del" data-list="pericias" data-idx="${i}" aria-label="Remover perícia">×</button>
            </div>`).join('') : `<div class="empty">Nenhuma perícia ainda. Use “+ Perícia”; ao escolher o nome, o atributo é preenchido sozinho.</div>`}
        </div>
      </section>

      <section class="panel full${secCls('tracos')}" data-sec="tracos">
        <h2 class="ptitle">Traços, Qualidades e Defeitos <button class="btn small tool" data-action="addTraco">+ Adicionar</button>${secTog('tracos')}</h2>
        <div class="traits">
          ${n.tracos.length ? n.tracos.map((t,i) => `
            <div class="trait">
              <div class="trait-top">
                <select id="tr-t-${i}" class="${traitClass(t.tipo)}" data-list="tracos" data-idx="${i}" data-key="tipo" aria-label="Tipo">${opts(['Traço','Qualidade','Defeito'], t.tipo)}</select>
                <input class="tn" id="tr-n-${i}" data-list="tracos" data-idx="${i}" data-key="nome" value="${esc(t.nome)}" placeholder="Nome" aria-label="Nome">
                <input class="tp" id="tr-p-${i}" data-list="tracos" data-idx="${i}" data-key="pontos" value="${esc(t.pontos)}" placeholder="pts" aria-label="Pontos">
                <button class="x" data-action="del" data-list="tracos" data-idx="${i}" aria-label="Remover">×</button>
              </div>
              <textarea class="auto" id="tr-x-${i}" rows="1" data-list="tracos" data-idx="${i}" data-key="texto" placeholder="Descrição e efeito" aria-label="Descrição">${esc(t.texto)}</textarea>
            </div>`).join('') : `<div class="empty">Traços de raça e linhagem, Qualidades e Defeitos aparecem aqui.</div>`}
        </div>
      </section>

      <section class="panel full${secCls('habs')}" data-sec="habs">
        <h2 class="ptitle">Habilidades <button class="btn small tool" data-action="addHab">+ Habilidade</button>${secTog('habs')}</h2>
        <div class="filter" role="group" aria-label="Filtrar por tipo">
          <span class="flabel">Tipo</span>
          ${['Todas', ...TIPOS].map(t => `<button data-action="filter" data-f="tipo" data-v="${t}" class="${fl.tipo===t?'on':''}" aria-pressed="${fl.tipo===t}">${t}${t==='Todas'?'':` · ${n.habs.filter(h=>h.tipo===t).length}`}</button>`).join('')}
        </div>
        <div class="filter" role="group" aria-label="Filtrar por fonte">
          <span class="flabel">Fonte</span>
          ${['Todas', ...origensUsadas].map(o => `<button data-action="filter" data-f="origem" data-v="${esc(o)}" class="${fl.origem===o?'on':''}" aria-pressed="${fl.origem===o}">${esc(ORIGEM_LABEL[o] || o)}${o==='Todas'?'':` · ${n.habs.filter(h=>h.origem===o).length}`}</button>`).join('')}
        </div>
        <div class="habs">
          ${habs.length ? habs.map(h => habCard(n, h)).join('') : `<div class="empty">${n.habs.length ? 'Nenhuma habilidade com esses filtros.' : 'Adicione as habilidades do NPC: magias, passivas, reflexos, Módulos da especialização.'}</div>`}
        </div>
      </section>

      <section class="panel full${secCls('notas')}" data-sec="notas">
        <h2 class="ptitle">Equipamento, tática e história${secTog('notas')}</h2>
        <div class="notes">
          <label class="field"><span>Equipamento</span><textarea id="f-equip" data-path="equip">${esc(n.equip)}</textarea></label>
          <label class="field"><span>Tática e comportamento</span><textarea id="f-tatica" data-path="tatica">${esc(n.tatica)}</textarea></label>
          <label class="field"><span>História e ganchos</span><textarea id="f-hist" data-path="historia">${esc(n.historia)}</textarea></label>
        </div>
      </section>

      <section class="panel full">
        <details class="rules">
          <summary>Regras usadas nos cálculos</summary>
          <ul>
            <li><b>PV</b> = PV da raça + (Dado de Classe × Nível) + (Mod. de Vigor ÷ 2 × Nível, arredondado para baixo), multiplicado pelo Selo. Guia de Criação de Criaturas, cap. 17.</li>
            <li><b>Dado de Classe</b>: o guia não diz se é o valor cheio ou a metade garantida. Escolha “valor cheio” ou “metade” no campo do dado.</li>
            <li><b>Selo de Ameaça</b>: Sem selo ×1 · Elite ×2 e +1 · Chefe ×3 e +2 · Soberano ×4 e +3 em ataque, defesa e CD. Nunca muda dano, atributos ou equipamento. 10 🔶 renovados a cada rodada.</li>
            <li><b>Energia</b>: coluna da Tabela de Progressão (Manual 8.1), ×1 sem selo e Elite, ×1,5 Chefe, ×2 Soberano. Acima do nível 20 a tabela para em 120; use o campo manual.</li>
            <li><b>CD</b> = 10 + atributo escolhido + Nível ÷ 4 (mín. 1) + Selo. <b>Ataque</b> = atributo da arma + Selo. <b>Aparar</b> = modificador da arma; <b>Esquiva</b> = Destreza.</li>
            <li><b>Bônus de Perícia</b>: +1 (1–4), +2 (5–9), +3 (10–14), +4 (15–19), +5 (20+). <b>Teto de modificador</b> segue o Manual (+10 no nível 16).</li>
            <li><b>Custo em PR</b> = Nível × 2 × Presença (Nível × 2,5 acima do 20). Sem selo conta como Padrão (×0,5), Elite ×0,75, Chefe ×1. Soberano não está na tabela de PR; usei Colosso (×1,4).</li>
            <li><b>Dano</b> com Vida Extra: o botão Dano tira primeiro da Vida Extra e depois dos PV.</li>
          </ul>
        </details>
      </section>
    </div>
    <div class="foot" id="d-foot"></div>`;

    document.querySelectorAll('textarea.auto').forEach(autosize);
    renderRoster();
    update();
    renderTabs();
    if (tab === 'combos') renderCombos();
  }

  function traitClass(t) { return t === 'Defeito' ? 't-defeito' : t === 'Qualidade' ? 't-qualidade' : 't-traco'; }
  function pips(pa) { return Array.from({length:10}, (_,i) => `<i class="${i < pa ? 'on' : ''}"></i>`).join(''); }
  function fmtPR(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','); }

  function habCard(n, h) {
    const isEter = n.recurso !== 'Estamina';
    if (editing.has(h.id)) {
      return `<div class="hab" data-tipo="${esc(h.tipo)}">
        <div class="hab-edit">
          <div class="build">
            <label class="field" style="grid-column:span 2"><span>Nome</span><input id="h-nome-${h.id}" data-hab="${h.id}" data-key="nome" value="${esc(h.nome)}"></label>
            <label class="field"><span>Tipo</span><select id="h-tipo-${h.id}" data-hab="${h.id}" data-key="tipo">${opts(TIPOS, h.tipo)}</select></label>
            <label class="field"><span>Origem</span><select id="h-orig-${h.id}" data-hab="${h.id}" data-key="origem">${opts(ORIGENS, h.origem)}</select></label>
            <label class="field"><span>Fase · grau</span><input id="h-fase-${h.id}" data-hab="${h.id}" data-key="fase" value="${esc(h.fase)}" placeholder="Fase I, 2º Grau…"></label>
            <label class="field"><span>🔶 PA</span><input id="h-pa-${h.id}" data-hab="${h.id}" data-key="pa" value="${esc(h.pa)}"></label>
            <label class="field"><span>${isEter?'🔵':'🔴'} ${esc(n.recurso)}</span><input id="h-en-${h.id}" data-hab="${h.id}" data-key="energia" value="${esc(h.energia)}"></label>
            <label class="field"><span>PS</span><input id="h-ps-${h.id}" data-hab="${h.id}" data-key="ps" value="${esc(h.ps)}" placeholder="-1"></label>
            <label class="field"><span>🎯 Alvos</span><input id="h-alvo-${h.id}" data-hab="${h.id}" data-key="alvo" value="${esc(h.alvo)}"></label>
            <label class="field"><span>📍 Alcance</span><input id="h-alc-${h.id}" data-hab="${h.id}" data-key="alcance" value="${esc(h.alcance)}"></label>
            <label class="field"><span>⏰ Duração</span><input id="h-dur-${h.id}" data-hab="${h.id}" data-key="duracao" value="${esc(h.duracao)}"></label>
          </div>
          <label class="field"><span>Descrição e efeito</span><textarea id="h-desc-${h.id}" data-hab="${h.id}" data-key="desc">${esc(h.desc)}</textarea></label>
          <div class="build">
            <label class="field"><span>Usos máx.</span><input type="number" id="h-um-${h.id}" data-hab="${h.id}" data-key="uso.max" value="${num(h.uso.max)}" placeholder="0 = sem limite"></label>
            <label class="field"><span>Usos restantes</span><input type="number" id="h-ua-${h.id}" data-hab="${h.id}" data-key="uso.atual" value="${num(h.uso.atual)}"></label>
            <label class="field"><span>Recarga</span><select id="h-ur-${h.id}" data-hab="${h.id}" data-key="uso.recarga">${RECARGAS.map(([v,l]) => `<option value="${v}"${h.uso.recarga===v?' selected':''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Ou usa o contador</span><select id="h-up-${h.id}" data-hab="${h.id}" data-key="uso.pool"><option value="">—</option>${n.contadores.map(k => `<option${h.uso.pool===k.nome?' selected':''}>${esc(k.nome)}</option>`).join('')}</select></label>
          </div>
          <details class="cmbcfg"${h.tipo === 'Passiva' || h.tipo === 'Inato' || h.cmb.aplica !== 'nunca' ? ' open' : ''}>
            <summary>Efeito nos combos</summary>
            <div class="build">
              <label class="field" style="grid-column:span 2"><span>Aparece em</span><select id="h-ca-${h.id}" data-hab="${h.id}" data-key="cmb.aplica">${APLICA.map(([v,l]) => `<option value="${v}"${h.cmb.aplica===v?' selected':''}>${l}</option>`).join('')}</select></label>
              <label class="field" style="grid-column:span 2"><span>Limite de uso</span><input id="h-cu-${h.id}" data-hab="${h.id}" data-key="cmb.uso" value="${esc(h.cmb.uso)}" placeholder="vazio = sempre ligada; ex.: 1× por Descanso Curto"></label>
              <label class="field" style="grid-column:1 / -1"><span>Efeito mostrado no combo</span><input id="h-ce-${h.id}" data-hab="${h.id}" data-key="cmb.efeito" value="${esc(h.cmb.efeito)}"></label>
              <label class="field"><span>Dano extra</span><input id="h-cd-${h.id}" data-hab="${h.id}" data-key="cmb.danoExtra" value="${esc(h.cmb.danoExtra)}" placeholder="1d6"></label>
              <label class="field"><span>Ataque ±</span><input type="number" id="h-cat-${h.id}" data-hab="${h.id}" data-key="cmb.atk" value="${num(h.cmb.atk)}"></label>
              <label class="field"><span>CD ±</span><input type="number" id="h-ccd-${h.id}" data-hab="${h.id}" data-key="cmb.cd" value="${num(h.cmb.cd)}"></label>
              <label class="field"><span>🔶 ±</span><input type="number" id="h-cpa-${h.id}" data-hab="${h.id}" data-key="cmb.pa" value="${num(h.cmb.pa)}"></label>
              <label class="field"><span>${esc(n.recurso)} ±</span><input type="number" id="h-cen-${h.id}" data-hab="${h.id}" data-key="cmb.energia" value="${num(h.cmb.energia)}"></label>
              <label class="field"><span>Recupera</span><input id="h-cr-${h.id}" data-hab="${h.id}" data-key="cmb.recupera" value="${esc(h.cmb.recupera)}" placeholder="1d6"></label>
              <label class="field" style="grid-column:span 2"><span>Efeito especial</span><select id="h-cs-${h.id}" data-hab="${h.id}" data-key="cmb.especial">${ESPECIAL.map(([v,l]) => `<option value="${v}"${h.cmb.especial===v?' selected':''}>${l}</option>`).join('')}</select></label>
            </div>
            <div class="formula">Com “Aparece em” definido, a habilidade vira um botão liga/desliga nos combos que tiverem passos desse tipo. Com limite de uso ou efeito especial, ela começa desligada.</div>
          </details>
          <div class="row" style="justify-content:space-between">
            <div class="row">
              <button class="btn small" data-action="habUp" data-id="${h.id}" aria-label="Mover para cima">↑</button>
              <button class="btn small" data-action="habDown" data-id="${h.id}" aria-label="Mover para baixo">↓</button>
              <button class="btn small danger" data-action="habDel" data-id="${h.id}">Remover</button>
            </div>
            <button class="btn small primary" data-action="habDone" data-id="${h.id}">Concluir</button>
          </div>
        </div>
      </div>`;
    }
    const chips = [
      h.alvo && `<span class="chip">🎯 ${esc(h.alvo)}</span>`,
      h.alcance && `<span class="chip">📍 ${esc(h.alcance)}</span>`,
      h.duracao && `<span class="chip">⏰ ${esc(h.duracao)}</span>`,
      h.pa && `<span class="chip pa">${esc(h.pa)} 🔶</span>`,
      h.energia && `<span class="chip en${isEter?'':' sta'}">${esc(h.energia)} ${isEter?'🔵':'🔴'}</span>`,
      h.ps && `<span class="chip ps">${esc(h.ps)} PS</span>`
    ].filter(Boolean).join('');
    return `<div class="hab" data-tipo="${esc(h.tipo)}">
      <div class="hab-top">
        <div style="min-width:0">
          <div class="hab-name">${h.fase ? `<span class="fase">${esc(h.fase)}</span>` : ''}${h.tipo==='Reflexo'?'💠 ':''}${esc(h.nome || 'Sem nome')}</div>
          <div class="origem">${esc(h.tipo)} · ${esc(h.origem)}${h.cmb && h.cmb.aplica !== 'nunca' ? ` · <span class="incombo">nos combos: ${esc(APLICA_CURTO[h.cmb.aplica])}</span>` : ''}</div>
        </div>
        <div class="row" style="gap:6px">
          <div class="chips">${chips}</div>
          ${usesOf(n, h) ? `<span class="usestep"><button data-action="useStep" data-id="${h.id}" data-d="-1" aria-label="Gastar um uso">−</button>${usesChip(n, h)}<button data-action="useStep" data-id="${h.id}" data-d="1" aria-label="Devolver um uso">+</button></span>` : ''}
          ${h.tipo !== 'Passiva' && h.tipo !== 'Inato' && (num(h.pa) || num(h.energia) || usesOf(n, h)) ? `<button class="btn small" data-action="useHab" data-id="${h.id}" title="Desconta PA, ${esc(n.recurso)} e usos">Usar</button>` : ''}
          <button class="btn small" data-action="habEdit" data-id="${h.id}">Editar</button>
        </div>
      </div>
      ${h.desc ? `<div class="hab-desc">${esc(h.desc)}</div>` : ''}
    </div>`;
  }

  // atualiza só os valores derivados, sem redesenhar os campos
  function update() {
    const n = cur(); if (!n) return;
    const c = calc(n);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('d-teto', sg(c.teto)); set('d-bp', sg(c.bp));
    set('d-pr', fmtPR(c.prCost)); set('d-prsub', `PR · ${c.s.prNome}`);
    set('d-pvmax', c.pvMax); set('d-emax', c.eMax);
    const pct = c.pvMax ? Math.round(num(n.pvAtual) / c.pvMax * 100) : 0;
    set('d-pvpct', `${pct}%`);
    const manualPV = n.pvMaxManual !== '' && n.pvMaxManual != null;
    set('d-pvformula', manualPV
      ? `Máximo manual (fórmula daria ${c.pvAuto})`
      : `${num(n.racaPV)} raça + ${c.dieTot} (${c.dieVal}×${c.lv}) + ${c.vigTot} (Vig ${sg(c.a('vig'))}÷2×${c.lv}) = ${c.pvBase}${c.s.pv > 1 ? ` × ${c.s.pv} ${c.s.nome}` : ''}`);
    const manualE = n.energiaMaxManual !== '' && n.energiaMaxManual != null;
    set('d-eformula', manualE ? `Máximo manual (tabela daria ${c.eAuto})` : `Tabela de Progressão, nível ${c.lv}: ${c.eBase}${c.s.energia !== 1 ? ` × ${String(c.s.energia).replace('.', ',')} (${c.s.nome})` : ''}`);
    set('d-cd', c.cd); set('d-cdsub', `10 ${sg(c.a(n.cdAttr))} ${ATTR_LABEL[n.cdAttr]} +${nj4(c.lv)} NJ/4${c.s.bonus ? ` +${c.s.bonus} Selo` : ''}`);
    set('d-atk', `d20 ${sg(c.atk)}`); set('d-atksub', c.s.bonus ? `inclui +${c.s.bonus} do Selo` : 'Teste de Ataque');
    const dm = n.arma.attr === 'none' ? 0 : num(n.attrs[n.arma.attr]);
    set('d-dano', `${n.arma.dados || '—'}${n.arma.attr === 'none' ? '' : ' ' + sg(dm)}${n.arma.tipo ? ' ' + n.arma.tipo : ''}`);
    set('d-aparar', sg(c.aparar)); set('d-esq', sg(c.esq));
    set('d-misc', `${sg(num(n.attrs.ins))} · ${num(n.desloc)} m · ${num(n.rd)}`);
    RES.forEach(([k]) => set(`d-res-${k}`, sg(num(n.attrs[RES.find(r=>r[0]===k)[2]]) + (n.res[k].prof ? c.bp : 0) + num(n.res[k].extra))));
    n.pericias.forEach((p,i) => set(`d-per-${i}`, sg((p.attr === 'none' ? 0 : num(n.attrs[p.attr])) + (p.treinada ? c.bp : 0) + num(p.extra))));
    ATTRS.forEach(([k]) => {
      const box = document.getElementById('a-' + k); if (!box) return;
      const over = num(n.attrs[k]) > c.teto;
      box.classList.toggle('over', over);
      box.classList.toggle('cd', n.cdAttr === k);
      box.classList.toggle('atk', n.atkAttr === k && n.cdAttr !== k);
      const tags = [];
      if (over) tags.push('acima do teto');
      else { if (n.cdAttr === k) tags.push('CD'); if (n.atkAttr === k) tags.push('ataque'); }
      set('t-' + k, tags.join(' · '));
    });
    set('d-pa', num(n.pa));
    const pp = document.getElementById('d-pips'); if (pp) pp.innerHTML = pips(num(n.pa));
    set('d-foot', '');
    const foot = document.getElementById('d-foot');
    if (foot) foot.innerHTML = `${esc(n.nome || 'NPC')} · Nível <span>${c.lv}</span> · ${esc([n.classe, n.especializacao].filter(Boolean).join(' · ') || 'sem classe')} · Selo <span>${c.s.nome}</span> · <span>${fmtPR(c.prCost)}</span> PR`;
  }

  function autosize(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }

  function setPath(obj, path, val) {
    const ks = path.split('.'); let o = obj;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function readVal(el) {
    if (el.type === 'checkbox') return el.checked;
    if ('num' in el.dataset) return num(el.value);
    return el.value;
  }
  function clampVitals(n) {
    const c = calc(n);
    if (num(n.pvAtual) > c.pvMax) n.pvAtual = c.pvMax;
    if (num(n.energiaAtual) > c.eMax) n.energiaAtual = c.eMax;
    if (num(n.pvAtual) < 0) n.pvAtual = 0;
    if (num(n.energiaAtual) < 0) n.energiaAtual = 0;
    if (num(n.vidaExtra) < 0) n.vidaExtra = 0;
    const a = document.getElementById('f-pvAtual'); if (a && document.activeElement !== a) a.value = n.pvAtual;
    const e = document.getElementById('f-eAtual'); if (e && document.activeElement !== e) e.value = n.energiaAtual;
  }

  // ── eventos de campo ──
  const sheet = $('#sheet');
  sheet.addEventListener('input', ev => {
    const el = ev.target; const n = cur(); if (!n) return;
    if (el.classList.contains('auto')) autosize(el);
    if (el.dataset.path) {
      const p = el.dataset.path;
      let v = readVal(el);
      if (p === 'nivel') v = Math.min(30, Math.max(1, v || 1));
      setPath(n, p, v);
    } else if (el.dataset.list) {
      const item = n[el.dataset.list][num(el.dataset.idx)];
      if (!item) return;
      item[el.dataset.key] = readVal(el);
      if (el.dataset.list === 'pericias' && el.dataset.key === 'nome' && PERICIAS[el.value]) {
        item.attr = PERICIAS[el.value];
        const s = document.getElementById('p-a-' + el.dataset.idx); if (s) s.value = item.attr;
      }
      if (el.dataset.list === 'tracos' && el.dataset.key === 'tipo') el.className = traitClass(el.value);
    } else if (el.dataset.hab) {
      const h = n.habs.find(x => x.id === el.dataset.hab); if (h) { const k = el.dataset.key; if (k.startsWith('cmb.')) { const kk = k.slice(4); h.cmb[kk] = ['atk','cd','pa','energia'].includes(kk) ? num(el.value) : el.value; } else if (k.startsWith('uso.')) { const kk = k.slice(4); h.uso[kk] = ['max','atual'].includes(kk) ? num(el.value) : el.value; if (kk === 'max' && num(h.uso.atual) > num(h.uso.max)) h.uso.atual = num(h.uso.max); } else h[k] = el.value; }
      if (el.dataset.key === 'tipo') { const card = el.closest('.hab'); if (card) card.dataset.tipo = el.value; }
    } else return;
    update(); save();
  });
  sheet.addEventListener('change', ev => {
    const el = ev.target; const n = cur(); if (!n) return;
    if (el.dataset.path === 'recurso') { render(); save(); return; }
    if (el.dataset.path === 'nivel') { el.value = n.nivel; }
    if (el.dataset.path === 'pvMaxManual' || el.dataset.path === 'energiaMaxManual') { setPath(n, el.dataset.path, el.value === '' ? '' : num(el.value)); }
    if (el.dataset.path === 'nome') renderRoster();
    clampVitals(n); update(); save();
    if (['nivel','selo','nome','classe','especializacao'].includes(el.dataset.path)) renderRoster();
  });

  sheet.addEventListener('click', ev => {
    const b = ev.target.closest('[data-action]'); if (!b) return;
    const n = cur(); if (!n) return;
    const a = b.dataset.action;
    const c = calc(n);
    if (a === 'toggleSec' || a === 'allSec') {
      if (a === 'allSec') { const close = b.dataset.v === 'close'; document.querySelectorAll('#sheet section[data-sec]').forEach(sec => close ? collapsed.add(sec.dataset.sec) : collapsed.delete(sec.dataset.sec)); }
      else { const k = b.dataset.sec; collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); }
      saveCollapsed();
      document.querySelectorAll('#sheet section[data-sec]').forEach(sec => {
        const k = sec.dataset.sec, closed = collapsed.has(k);
        sec.classList.toggle('collapsed', closed);
        const t = sec.querySelector('.ctog'); if (t) { t.textContent = closed ? '▸ Abrir' : '▾ Fechar'; t.setAttribute('aria-expanded', String(!closed)); t.title = closed ? 'Abrir seção' : 'Fechar seção'; }
      });
      return;
    }
    if (a === 'selo') { n.selo = b.dataset.v; clampVitals(n); render(); }
    else if (a === 'dano' || a === 'cura') {
      const inp = $('#pvDelta'); let d = Math.max(0, num(inp.value)); inp.value = '';
      if (a === 'dano') { const ve = Math.min(num(n.vidaExtra), d); n.vidaExtra = num(n.vidaExtra) - ve; d -= ve; n.pvAtual = Math.max(0, num(n.pvAtual) - d); }
      else n.pvAtual = Math.min(c.pvMax, num(n.pvAtual) + d);
      $('#f-pvAtual').value = n.pvAtual; $('#f-ve').value = n.vidaExtra; update();
    }
    else if (a === 'pvm10') { let d = 10; const ve = Math.min(num(n.vidaExtra), d); n.vidaExtra = num(n.vidaExtra) - ve; d -= ve; n.pvAtual = Math.max(0, num(n.pvAtual) - d); $('#f-pvAtual').value = n.pvAtual; $('#f-ve').value = n.vidaExtra; update(); }
    else if (a === 'pvmax') { n.pvAtual = c.pvMax; $('#f-pvAtual').value = n.pvAtual; update(); }
    else if (a === 'em10') { n.energiaAtual = Math.max(0, num(n.energiaAtual) - 10); $('#f-eAtual').value = n.energiaAtual; update(); }
    else if (a === 'emax') { n.energiaAtual = c.eMax; $('#f-eAtual').value = n.energiaAtual; update(); }
    else if (a === 'gastar' || a === 'recuperar') {
      const inp = $('#eDelta'); const d = Math.max(0, num(inp.value)); inp.value = '';
      n.energiaAtual = a === 'gastar' ? Math.max(0, num(n.energiaAtual) - d) : Math.min(c.eMax, num(n.energiaAtual) + d);
      $('#f-eAtual').value = n.energiaAtual; update();
    }
    else if (a === 'pa') { n.pa = Math.max(0, Math.min(10, num(n.pa) + num(b.dataset.d))); update(); }
    else if (a === 'rodada') { n.pa = 10; resetUses(n, 1); render(); setStatus('Nova rodada: 10 🔶 e usos por rodada recarregados.'); }
    else if (a === 'rest') {
      const r = num(b.dataset.r); n.pa = 10; resetUses(n, r);
      const pct = r === 3 ? .25 : r === 4 ? .5 : r === 5 ? 1 : 0;
      if (pct) { n.pvAtual = Math.min(c.pvMax, num(n.pvAtual) + Math.ceil(c.pvMax * pct)); n.energiaAtual = Math.min(c.eMax, num(n.energiaAtual) + Math.ceil(c.eMax * pct)); }
      if (r === 5) { n.pvAtual = c.pvMax; n.energiaAtual = c.eMax; }
      render(); setStatus(['', 'Nova rodada.', 'Fim do combate: usos por combate recarregados.', 'Descanso Curto: +25% de PV e Éter, usos recarregados.', 'Descanso Médio: +50% de PV e Éter, usos recarregados.', 'Descanso Longo: tudo recarregado.'][r]);
    }
    else if (a === 'useStep') {
      const h = n.habs.find(x => x.id === b.dataset.id); if (!h) return;
      const u = usesOf(n, h); if (!u) return;
      if (u.key.startsWith('pool:')) { const k = n.contadores.find(x => x.nome === u.label); if (k) k.atual = Math.max(0, Math.min(num(k.max), num(k.atual) + num(b.dataset.d))); }
      else h.uso.atual = Math.max(0, Math.min(num(h.uso.max), num(h.uso.atual) + num(b.dataset.d)));
      render();
    }
    else if (a === 'useHab') {
      const h = n.habs.find(x => x.id === b.dataset.id); if (!h) return;
      const u = usesOf(n, h); const pa = num(h.pa), en = num(h.energia);
      const falta = [];
      if (u && u.atual < 1) falta.push(`sem usos (${u.label === 'usos' ? h.nome : u.label})`);
      if (pa > num(n.pa)) falta.push(`precisa de ${pa} 🔶`);
      if (en > num(n.energiaAtual)) falta.push(`precisa de ${en} ${n.recurso}`);
      if (falta.length) { setStatus(`Não dá para usar ${h.nome}: ${falta.join(', ')}.`, true); return; }
      n.pa = num(n.pa) - pa; n.energiaAtual = num(n.energiaAtual) - en; if (u) spendUse(n, u.key, 1);
      render(); setStatus(`${h.nome}: −${pa} 🔶${en ? `, −${en} ${n.recurso}` : ''}${u ? ', −1 uso' : ''}.`);
    }
    else if (a === 'addCounter') { n.contadores.push({ nome:'Contador', atual:0, max:3, recarga:'' }); render(); }
    else if (a === 'cstep') { const k = n.contadores[num(b.dataset.idx)]; if (k) { k.atual = Math.max(0, Math.min(num(k.max) || 99, num(k.atual) + num(b.dataset.d))); const s = document.getElementById('d-cv-' + b.dataset.idx); if (s) s.textContent = k.atual; } }
    else if (a === 'del') { n[b.dataset.list].splice(num(b.dataset.idx), 1); render(); }
    else if (a === 'addPericia') { n.pericias.push({ nome:'', attr:'none', treinada:true, extra:0 }); render(); const el = document.getElementById('p-n-' + (n.pericias.length - 1)); if (el) el.focus(); }
    else if (a === 'addTraco') { n.tracos.push({ tipo:'Traço', nome:'', pontos:'', texto:'' }); render(); const el = document.getElementById('tr-n-' + (n.tracos.length - 1)); if (el) el.focus(); }
    else if (a === 'addHab') { const h = { id:uid(), tipo:'Ativa', origem:'Classe', fase:'', nome:'', pa:'3', energia:'', ps:'', alvo:'1', alcance:'', duracao:'In', desc:'', cmb: blankCmb(), uso: blankUso() }; n.habs.push(h); editing.add(h.id); filters[n.id] = { tipo:'Todas', origem:'Todas' }; render(); const el = document.getElementById('h-nome-' + h.id); if (el) { el.focus(); el.scrollIntoView({ block:'center' }); } }
    else if (a === 'habEdit') { editing.add(b.dataset.id); render(); }
    else if (a === 'habDone') { editing.delete(b.dataset.id); render(); }
    else if (a === 'habDel') {
      if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Confirmar remoção'; setTimeout(() => { b.classList.remove('armed'); b.textContent = 'Remover'; }, 3500); return; }
      n.habs = n.habs.filter(h => h.id !== b.dataset.id); editing.delete(b.dataset.id); render();
    }
    else if (a === 'habUp' || a === 'habDown') {
      const i = n.habs.findIndex(h => h.id === b.dataset.id); const j = a === 'habUp' ? i - 1 : i + 1;
      if (i >= 0 && j >= 0 && j < n.habs.length) { [n.habs[i], n.habs[j]] = [n.habs[j], n.habs[i]]; render(); }
      return;
    }
    else if (a === 'filter') { const fl = filters[n.id] || (filters[n.id] = { tipo:'Todas', origem:'Todas' }); fl[b.dataset.f] = b.dataset.v; render(); return; }
    else return;
    save();
  });

  // ── barra de NPCs ──
  $('#npcSelect').addEventListener('change', e => { db.current = e.target.value; render(); save(); });
  $('#btnNew').addEventListener('click', () => { const n = blankNpc(); db.npcs.push(n); db.current = n.id; render(); save(); const el = $('#f-nome'); el.focus(); el.select(); });
  $('#btnDup').addEventListener('click', () => {
    const src = cur(); if (!src) return;
    const n = normalize(JSON.parse(JSON.stringify(src))); n.id = uid(); n.nome = (src.nome || 'NPC') + ' (cópia)'; reid(n);
    db.npcs.push(n); db.current = n.id; render(); save();
  });
  const del = $('#btnDel'); let delTimer;
  del.addEventListener('click', () => {
    if (!del.classList.contains('armed')) {
      del.classList.add('armed'); del.textContent = `Excluir “${cur()?.nome || 'NPC'}”?`;
      delTimer = setTimeout(() => { del.classList.remove('armed'); del.textContent = 'Excluir'; }, 4000); return;
    }
    clearTimeout(delTimer); del.classList.remove('armed'); del.textContent = 'Excluir';
    db.npcs = db.npcs.filter(n => n.id !== db.current);
    if (!db.npcs.length) db.npcs.push(blankNpc());
    db.current = db.npcs[0].id; render(); save(); setStatus('Ficha excluída.');
  });

  // ── exportar / importar ──
  const slug = s => (s || 'npc').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'npc';
  const oneJson = () => JSON.stringify({ formato:'elysium-npc', versao:1, npcs:[cur()] }, null, 2);
  const allJson = () => JSON.stringify({ formato:'elysium-npc', versao:1, npcs:db.npcs }, null, 2);
  let downloads = null;
  (async () => { try { downloads = window.claude?.use ? await window.claude.use('downloads') : null; } catch (e) { downloads = null; } refreshDl(); })();
  function refreshDl() {}
  function anchorSave(name, data, type) {
    try {
      const url = URL.createObjectURL(new Blob([data], { type }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Arquivo ${name} baixado.`); return true;
    } catch (e) { return false; }
  }
  function textFallback(name, data) {
    $('#exportDrawer').hidden = false; $('#exportText').value = data;
    setStatus(`Download indisponível aqui. O conteúdo está na caixa de exportação: use “Copiar texto” e salve como ${name}.`, true);
  }
  refreshDl();
  $('#btnExport').addEventListener('click', () => { $('#importDrawer').hidden = true; const d = $('#exportDrawer'); d.hidden = !d.hidden; $('#exportText').value = oneJson(); });
  $('#btnCloseExport').addEventListener('click', () => $('#exportDrawer').hidden = true);
  async function saveFile(name, data, type = 'application/json') {
    if (!downloads) { if (!anchorSave(name, data, type)) textFallback(name, data); return; }
    try { await downloads.save({ filename: name, data }); setStatus(`Arquivo ${name} entregue para download.`); }
    catch (e) {
      const code = e && e.code;
      if (code === 'declined') setStatus('Download cancelado.');
      else if (code === 'rate_limited') setStatus('Já há um download aguardando confirmação.', true);
      else textFallback(name, data);
    }
  }
  const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap">';
  function buildHtml(npcs, current) {
    const seed = { id: uid() + uid(), criado: new Date().toISOString(), npcs: JSON.parse(JSON.stringify(npcs)), current };
    const json = JSON.stringify(seed).replace(/</g, '\\u003c');
    return '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Fichas de NPC · Elysium</title>\n'
      + FONTS + '\n<style id="appStyle">' + SRC.css + '</style>\n</head>\n<body>\n' + SRC.root
      + '\n<script type="application/json" id="seedData">' + json + '<\/script>\n<script id="appScript">' + SRC.js + '<\/script>\n</body>\n</html>\n';
  }
  async function carregarFonte() {
    if (SRC.css && SRC.js) return true;
    try {
      const [css, js] = await Promise.all(['npcs.css', 'npcs.js'].map(f => fetch(f, { credentials: 'same-origin', cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.text(); })));
      SRC.css = SRC.css || css; SRC.js = SRC.js || js; return true;
    } catch (e) { return false; }
  }
  async function exportHtml(npcs, current, name) {
    if (!SRC.root || !(await carregarFonte())) { setStatus('Não consegui ler o código da página para gerar o HTML.', true); return; }
    saveFile(name, buildHtml(npcs, current), 'text/html');
  }
  $('#btnHtmlAll').addEventListener('click', () => exportHtml(db.npcs, db.current, 'fichas_npc_elysium.html'));
  $('#btnHtmlOne').addEventListener('click', () => { const n = cur(); exportHtml([n], n.id, `${slug(n.nome)}.html`); });
  $('#btnHtmlBlank').addEventListener('click', () => { const b = blankNpc(); exportHtml([b], b.id, 'gerador_npc_elysium.html'); });
  $('#btnSaveOne').addEventListener('click', () => { $('#exportText').value = oneJson(); saveFile(`${slug(cur()?.nome)}.json`, oneJson()); });
  $('#btnSaveAll').addEventListener('click', () => { $('#exportText').value = allJson(); saveFile('fichas_npc_elysium.json', allJson()); });
  $('#btnCopyJson').addEventListener('click', () => {
    const t = $('#exportText');
    navigator.clipboard.writeText(t.value).then(() => setStatus('Texto copiado.'), () => { t.focus(); t.select(); setStatus('Selecionei o texto: copie com Ctrl+C.'); });
  });

  $('#btnImport').addEventListener('click', () => { $('#exportDrawer').hidden = true; const d = $('#importDrawer'); d.hidden = !d.hidden; });
  $('#btnCloseImport').addEventListener('click', () => $('#importDrawer').hidden = true);
  function doImport(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { setStatus('Esse texto não é um JSON válido. Confira se copiou o arquivo inteiro.', true); return; }
    const list = Array.isArray(data) ? data : Array.isArray(data?.npcs) ? data.npcs : (data && typeof data === 'object' ? [data] : []);
    if (!list.length) { setStatus('Nenhuma ficha encontrada no arquivo.', true); return; }
    const ids = new Set(db.npcs.map(n => n.id));
    const added = list.map(x => { const n = normalize(x); if (ids.has(n.id)) n.id = uid(); reid(n); return n; });
    db.npcs.push(...added); db.current = added[0].id;
    $('#importDrawer').hidden = true; $('#importText').value = '';
    render(); save(); setStatus(`${added.length} ficha${added.length > 1 ? 's' : ''} importada${added.length > 1 ? 's' : ''}.`);
  }
  $('#btnAddExemplo').addEventListener('click', () => { const k = exemploAleatorio(); db.npcs.push(k); db.current = k.id; $('#importDrawer').hidden = true; render(); save(); setStatus(`Exemplo aleatório adicionado: ${k.nome}.`); });
  $('#btnDoImport').addEventListener('click', () => doImport($('#importText').value));
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => doImport(String(r.result)); r.onerror = () => setStatus('Não consegui ler o arquivo.', true); r.readAsText(f);
    e.target.value = '';
  });

  // ── COMBOS ──
  let tab = 'ficha';
  try { tab = localStorage.getItem(STORE + '_tab') || 'ficha'; } catch (e) {}
  const editCombo = new Set();
  const RES_NAMES = RES.map(r => r[1]);
  const ARMA = '__arma';

  function avgExpr(s) {
    let total = 0, ok = false, rough = false;
    String(s || '').replace(/−/g, '-').split(/\s*\+\s*/).forEach(part => {
      const p = part.trim(); if (!p) return;
      let m;
      if ((m = p.match(/^(\d+)\s*[×x]\s*(\d*)d(\d+)$/i))) { total += num(m[1]) * (num(m[2]) || 1) * (num(m[3]) + 1) / 2; ok = true; }
      else if ((m = p.match(/^(\d*)d(\d+)$/i))) { total += (num(m[1]) || 1) * (num(m[2]) + 1) / 2; ok = true; }
      else if ((m = p.match(/^-?\d+$/))) { total += num(p); ok = true; }
      else rough = true;
    });
    return { total, ok, rough };
  }
  const fmtAvg = v => (Math.round(v * 10) / 10).toString().replace('.', ',');

  function armaDano(n) {
    const m = n.arma.attr === 'none' ? 0 : num(n.attrs[n.arma.attr]);
    return `${n.arma.dados || '1d6'}${n.arma.attr === 'none' || !m ? '' : (m > 0 ? '+' : '') + m}`;
  }

  function stepFromHab(n, habId) {
    if (habId === ARMA) return { habId, nome: n.arma.nome ? `Ataque: ${n.arma.nome}` : 'Ataque com arma', pa: 3, energia: 0, rolagem: 'ataque', res: 'Acuidade', dano: armaDano(n), depois: '', efeito: '', efeitoTipo: '' };
    const h = n.habs.find(x => x.id === habId);
    if (!h) return { habId: '', nome: 'Passo livre', pa: 0, energia: 0, rolagem: 'nenhum', res: 'Acuidade', dano: '', depois: '', efeito: '', efeitoTipo: '' };
    const d = h.desc || '';
    const res = RES_NAMES.find(r => d.includes(r));
    const adicional = /adicional|\+\d+d\d+/i.test(d);
    const aliado = /aliad/i.test(d) && !res;
    const rolagem = aliado ? 'nenhum' : res && adicional ? 'ambos' : res ? 'resistencia' : adicional ? 'ataque' : 'nenhum';
    const dice = (d.match(/\d+d\d+/) || [''])[0];
    const dano = aliado ? '' : adicional ? `${armaDano(n)}${dice ? ' + ' + dice : ''}` : dice;
    return { habId, nome: h.nome, pa: num(h.pa), energia: num(h.energia), rolagem, res: res || 'Acuidade', dano, depois: '', efeito: '', efeitoTipo: aliado ? 'Buff' : '' };
  }

  function rollHTML(n, c, s, ps) {
    ps = ps || [];
    const atkB = ps.filter(h => (h.cmb.aplica === 'ataque' || h.cmb.aplica === 'dano' || h.cmb.aplica === 'magia') && num(h.cmb.atk));
    const cdB = ps.filter(h => num(h.cmb.cd));
    const atk = c.atk + atkB.reduce((a, h) => a + num(h.cmb.atk), 0);
    const cd = c.cd + cdB.reduce((a, h) => a + num(h.cmb.cd), 0);
    const atkNote = atkB.length ? ` <span class="pbonus">(${atkB.map(h => `${sg(num(h.cmb.atk))} ${esc(h.nome)}`).join(', ')})</span>` : '';
    const cdNote = cdB.length ? ` <span class="pbonus">(${cdB.map(h => `${sg(num(h.cmb.cd))} ${esc(h.nome)}`).join(', ')})</span>` : '';
    const who = esc(n.nome.split(' ')[0] || 'NPC');
    if (s.rolagem === 'ataque') return `<span class="rtag atk">Teste de ataque</span> ${who} rola d20 ${sg(atk)}${atkNote}; o alvo rola Aparar ou Esquiva`;
    if (s.rolagem === 'resistencia') return `<span class="rtag res">Resistência</span> O alvo rola ${esc(s.res)} contra CD ${cd}${cdNote}`;
    if (s.rolagem === 'ambos') return `<span class="rtag atk">Ataque</span> d20 ${sg(atk)}${atkNote} contra a defesa; se acertar, <span class="rtag res">${esc(s.res)}</span> contra CD ${cd}${cdNote}`;
    return `<span class="rtag none">Sem teste</span>`;
  }

  function stepMatches(n, s, ap) {
    if (ap === 'buff') return s.efeitoTipo === 'Buff';
    if (ap === 'debuff') return s.efeitoTipo === 'Debuff';
    if (ap === 'ataque') return s.rolagem === 'ataque' || s.rolagem === 'ambos';
    if (ap === 'resistencia') return s.rolagem === 'resistencia' || s.rolagem === 'ambos';
    if (ap === 'dano') return !!s.dano;
    if (ap === 'magia') { const h = n.habs.find(x => x.id === s.habId); return !!h && (h.origem === 'Domínio' || h.tipo === 'Magia'); }
    return false;
  }
  function comboPassives(n, cb) {
    const inSteps = new Set(cb.passos.map(s => s.habId));
    return n.habs.filter(h => h.cmb && h.cmb.aplica !== 'nunca' && !inSteps.has(h.id) && (h.cmb.aplica === 'sempre' || cb.passos.some(s => stepMatches(n, s, h.cmb.aplica))));
  }
  function passiveOn(cb, h) { const v = (cb.passivas || {})[h.id]; return v === undefined ? !(h.cmb.uso || h.cmb.especial) : !!v; }
  function stepPassives(n, cb, s) { return comboPassives(n, cb).filter(h => passiveOn(cb, h) && h.cmb.aplica !== 'sempre' && stepMatches(n, s, h.cmb.aplica)); }

  function comboTotals(n, cb) {
    let pa = 0, en = 0, dT = 0, dD = 0, rec = 0, rough = false; const dT_ = [], dD_ = [], notas = [], rec_ = [];
    cb.passos.forEach(s => {
      pa += num(s.pa); en += num(s.energia);
      if (s.dano) { const a = avgExpr(s.dano); dT += a.total; rough = rough || a.rough; dT_.push(s.dano); }
      if (s.depois) { const a = avgExpr(s.depois); dD += a.total; rough = rough || a.rough; dD_.push(s.depois); }
    });
    const act = comboPassives(n, cb).filter(h => passiveOn(cb, h));
    const magias = cb.passos.filter(s => stepMatches(n, s, 'magia')).map(s => num(s.energia)).sort((a, b) => b - a);
    let mi = 0;
    act.filter(h => h.cmb.especial === 'canalizacao').forEach(h => { if (magias[mi] > 0) { en -= magias[mi]; pa += 3; notas.push(`${h.nome}: −${magias[mi]} ${n.recurso}, +3 🔶`); mi++; } });
    act.filter(h => h.cmb.especial === 'desconto25').forEach(h => { if (magias[mi] > 0) { const d = Math.floor(magias[mi] * 0.25); en -= d; notas.push(`${h.nome}: −${d} ${n.recurso}`); mi++; } });
    act.forEach(h => {
      const m = h.cmb;
      if (num(m.pa)) { pa += num(m.pa); notas.push(`${h.nome}: ${sg(num(m.pa))} 🔶`); }
      if (num(m.energia)) { en += num(m.energia); notas.push(`${h.nome}: ${sg(num(m.energia))} ${n.recurso}`); }
      if (m.recupera) { rec += avgExpr(m.recupera).total; rec_.push(`${m.recupera} (${h.nome})`); }
      if (m.danoExtra) {
        const hits = m.aplica === 'sempre' ? cb.passos.filter(s => s.dano).length : cb.passos.filter(s => s.dano && stepMatches(n, s, m.aplica)).length;
        for (let i = 0; i < hits; i++) { dT += avgExpr(m.danoExtra).total; dT_.push(`${m.danoExtra} (${h.nome})`); }
      }
    });
    return { pa, en: Math.max(0, en), dT, dD, rec, rec_, rough, dT_, dD_, notas, act };
  }

  function habOptions(n, sel) {
    const groups = {};
    n.habs.filter(h => h.tipo !== 'Passiva' && h.tipo !== 'Inato').forEach(h => { (groups[h.origem] = groups[h.origem] || []).push(h); });
    return `<option value="">Passo livre</option><option value="${ARMA}"${sel===ARMA?' selected':''}>Ataque com arma${n.arma.nome ? ' (' + esc(n.arma.nome) + ')' : ''}</option>` +
      Object.entries(groups).map(([g, hs]) => `<optgroup label="${esc(g)}">${hs.map(h => `<option value="${h.id}"${h.id===sel?' selected':''}>${esc(h.nome)}${h.pa?` · ${esc(h.pa)}🔶`:''}${h.energia?` ${esc(h.energia)}`:''}</option>`).join('')}</optgroup>`).join('');
  }

  function renderTabs() {
    const n = cur();
    $('#tabs').innerHTML = `<button data-tab="ficha" class="${tab==='ficha'?'on':''}" aria-pressed="${tab==='ficha'}">Ficha</button><button data-tab="combos" class="${tab==='combos'?'on':''}" aria-pressed="${tab==='combos'}">Combos<span class="count">${n ? n.combos.length : 0}</span></button>`;
    $('#sheet').hidden = tab !== 'ficha';
    $('#combos').hidden = tab !== 'combos';
  }

  function renderCombos() {
    const n = cur(); if (!n) return;
    const c = calc(n);
    const isEter = n.recurso !== 'Estamina';
    const ico = isEter ? '🔵' : '🔴';
    $('#combos').innerHTML = `
      <div class="combos-head">
        <p>Sequências de habilidades num turno: custo total, dano médio, efeitos e o teste que cada passo pede. Os valores de ataque e CD vêm da ficha.</p>
        <button class="btn primary" data-caction="add">+ Novo combo</button>
      </div>
      <div class="combos-ref">
        <span class="ref">Ataque <b>d20 ${sg(c.atk)}</b></span>
        <span class="ref">CD <b>${c.cd}</b></span>
        <span class="ref">🔶 agora <b>${num(n.pa)}/10</b></span>
        <span class="ref">${ico} agora <b>${num(n.energiaAtual)}/${c.eMax}</b></span>
        <span class="ref">Arma <b>${esc(armaDano(n))}</b></span>
      </div>
      ${n.combos.length ? n.combos.map(cb => comboCard(n, c, cb, ico, isEter)).join('') : `<div class="empty">Nenhum combo ainda. Crie um com “+ Novo combo” e monte os passos a partir das habilidades da ficha.</div>`}`;
  }

  function comboCard(n, c, cb, ico, isEter) {
    const t = comboTotals(n, cb);
    const editing = editCombo.has(cb.id);
    const paWarn = t.pa > 10, enWarn = t.en > num(n.energiaAtual);
    const fx = cb.passos.filter(s => s.efeito);
    const stats = `
      <div class="cstats">
        <div class="cstat pa${paWarn?' warn':''}"><span class="k">🔶 Ação</span><span class="v">${t.pa}</span><span class="s">${paWarn ? 'passa de 10: precisa de 2 turnos' : `sobram ${10 - t.pa} de 10`}</span></div>
        <div class="cstat en${isEter?'':' sta'}${enWarn?' warn':''}"><span class="k">${ico} ${esc(n.recurso)}</span><span class="v">${t.en}</span><span class="s">${enWarn ? `faltam ${t.en - num(n.energiaAtual)} agora` : `restam ${num(n.energiaAtual) - t.en} de ${num(n.energiaAtual)}`}${t.rec ? ` · recupera ~${fmtAvg(t.rec)}` : ''}${t.notas.length ? '<br>' + esc(t.notas.join(' · ')) : ''}</span></div>
        <div class="cstat dmg"><span class="k">Dano no turno</span><span class="v">${t.dT ? fmtAvg(t.dT) : '—'}</span><span class="s">${t.dT_.length ? esc(t.dT_.join(' + ')) : 'sem dano direto'}</span></div>
        <div class="cstat dmg"><span class="k">Dano depois</span><span class="v">${t.dD ? fmtAvg(t.dD) : '—'}</span><span class="s">${t.dD_.length ? esc(t.dD_.join(' + ')) : 'nenhum'}</span></div>
      </div>
      ${passiveBar(n, cb)}
      ${usesBar(n, cb)}`;
    if (!editing) {
      return `<article class="combo">
        <div class="combo-top">
          <div style="min-width:0"><h3>${esc(cb.nome || 'Combo')}</h3>${cb.nota ? `<div class="nota">${esc(cb.nota)}</div>` : ''}</div>
          <div class="row" style="gap:5px">
            <button class="btn small primary" data-caction="run" data-c="${cb.id}" title="Desconta 🔶 e ${esc(n.recurso)} da ficha">Executar</button>
            <button class="btn small" data-caction="edit" data-c="${cb.id}">Editar</button>
            <button class="btn small" data-caction="dup" data-c="${cb.id}">Duplicar</button>
            <button class="btn small danger" data-caction="del" data-c="${cb.id}" aria-label="Excluir o combo ${esc(cb.nome || 'Combo')}">Excluir</button>
          </div>
        </div>
        ${stats}
        <ol class="steps">${cb.passos.map(s => `
          <li class="step"><div class="step-body">
            <div class="step-line"><span class="step-name">${esc(s.nome || 'Passo')}</span>
              ${num(s.pa) ? `<span class="chip pa">${num(s.pa)} 🔶</span>` : ''}${num(s.energia) ? `<span class="chip en${isEter?'':' sta'}">${num(s.energia)} ${ico}</span>` : ''}${usesChip(n, n.habs.find(h => h.id === s.habId))}</div>
            <div class="roll">${rollHTML(n, c, s, stepPassives(n, cb, s))}</div>
            ${s.dano || s.depois ? `<div class="dmgline">${s.dano ? `Dano <b>${esc(s.dano)}</b>${avgExpr(s.dano).ok ? ` (média ${fmtAvg(avgExpr(s.dano).total)})` : ''}` : ''}${s.dano && s.depois ? ' · ' : ''}${s.depois ? `depois <b>${esc(s.depois)}</b>` : ''}</div>` : ''}
            ${s.efeito ? `<div class="fx">${s.efeitoTipo ? `<span class="t ${s.efeitoTipo.toLowerCase()}">${esc(s.efeitoTipo)}</span>` : ''}${esc(s.efeito)}</div>` : ''}
            ${stepPassives(n, cb, s).filter(h => h.cmb.efeito || h.cmb.danoExtra).map(h => `<div class="fx pfx"><span class="t passiva">Passiva</span><b>${esc(h.nome)}</b> ${esc(h.cmb.efeito)}${h.cmb.danoExtra ? ` (+${esc(h.cmb.danoExtra)} de dano)` : ''}</div>`).join('')}
          </div></li>`).join('')}</ol>
        ${fx.length ? '' : ''}
      </article>`;
    }
    return `<article class="combo">
      <div class="build" style="grid-template-columns:minmax(0,1fr)">
        <label class="field"><span>Nome do combo</span><input id="cb-n-${cb.id}" data-c="${cb.id}" data-ck="nome" value="${esc(cb.nome)}"></label>
        <label class="field"><span>Nota</span><input id="cb-o-${cb.id}" data-c="${cb.id}" data-ck="nota" value="${esc(cb.nota)}" placeholder="Quando usar, condições, alternativas"></label>
      </div>
      ${stats}
      ${cb.passos.map((s, i) => `
        <div class="step-edit">
          <div class="row" style="justify-content:space-between">
            <strong style="font-family:var(--f-display);font-size:11px;color:var(--gold)">Passo ${i + 1}</strong>
            <div class="row" style="gap:3px">
              <button class="btn small" data-caction="sup" data-c="${cb.id}" data-s="${i}" aria-label="Subir passo">↑</button>
              <button class="btn small" data-caction="sdown" data-c="${cb.id}" data-s="${i}" aria-label="Descer passo">↓</button>
              <button class="x" data-caction="sdel" data-c="${cb.id}" data-s="${i}" aria-label="Remover passo">×</button>
            </div>
          </div>
          <div class="build">
            <label class="field wide2"><span>Habilidade</span><select id="cs-h-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="habId">${habOptions(n, s.habId)}</select></label>
            <label class="field wide2"><span>Nome no combo</span><input id="cs-n-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="nome" value="${esc(s.nome)}"></label>
            <label class="field"><span>🔶 PA</span><input type="number" id="cs-p-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="pa" data-num value="${num(s.pa)}"></label>
            <label class="field"><span>${ico} ${esc(n.recurso)}</span><input type="number" id="cs-e-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="energia" data-num value="${num(s.energia)}"></label>
            <label class="field"><span>Rolagem</span><select id="cs-r-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="rolagem">
              ${[['ataque','Teste de ataque'],['resistencia','Resistência do alvo'],['ambos','Ataque + resistência'],['nenhum','Sem teste']].map(([v,l]) => `<option value="${v}"${s.rolagem===v?' selected':''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Resistência</span><select id="cs-rs-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="res">${opts(RES_NAMES, s.res)}</select></label>
            <label class="field wide2"><span>Dano no turno</span><input id="cs-d-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="dano" value="${esc(s.dano)}" placeholder="1d8+10 + 2d6"></label>
            <label class="field wide2"><span>Dano depois (ao longo dos turnos)</span><input id="cs-dd-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="depois" value="${esc(s.depois)}" placeholder="2×2d6"></label>
            <label class="field"><span>Efeito</span><select id="cs-ft-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="efeitoTipo">${[['','—'],['Buff','Buff (aliado)'],['Debuff','Debuff (alvo)']].map(([v,l]) => `<option value="${v}"${s.efeitoTipo===v?' selected':''}>${l}</option>`).join('')}</select></label>
            <label class="field wide2" style="grid-column:span 3"><span>Descrição do efeito</span><input id="cs-f-${cb.id}-${i}" data-c="${cb.id}" data-s="${i}" data-sk="efeito" value="${esc(s.efeito)}" placeholder="Lentidão 2 turnos, +1d8 no próximo ataque…"></label>
          </div>
        </div>`).join('')}
      <div class="row" style="justify-content:space-between">
        <div class="row">
          <button class="btn small" data-caction="sadd" data-c="${cb.id}">+ Passo</button>
          <button class="btn small danger" data-caction="del" data-c="${cb.id}">Excluir combo</button>
        </div>
        <button class="btn small primary" data-caction="done" data-c="${cb.id}">Concluir</button>
      </div>
      <div class="formula">Dano aceita dados e números somados com “+”, e “2×2d6” para repetições. A média ignora texto que não for dado.</div>
    </article>`;
  }

  function comboUses(n, cb) {
    const need = {};
    const add = h => { const u = usesOf(n, h); if (!u) return; (need[u.key] = need[u.key] || { ...u, qty: 0, nomes: [] }).qty++; need[u.key].nomes.push(h.nome); };
    cb.passos.forEach(s => add(n.habs.find(h => h.id === s.habId)));
    comboPassives(n, cb).filter(h => passiveOn(cb, h)).forEach(add);
    return Object.values(need);
  }
  function usesBar(n, cb) {
    const us = comboUses(n, cb); if (!us.length) return '';
    return `<div class="pbar"><span class="flabel">Usos</span>${us.map(u => `<span class="chip uses${u.atual >= u.qty ? '' : ' out'}" title="${esc(u.nomes.join(', '))}">${esc(u.label === 'usos' ? u.nomes[0] : u.label)}: gasta ${u.qty}, tem ${u.atual}/${u.max}${u.rec ? ' · ' + esc(REC_LABEL[u.rec]) : ''}</span>`).join('')}</div>`;
  }

  function passiveBar(n, cb) {
    const ps = comboPassives(n, cb);
    if (!ps.length) return '';
    return `<div class="pbar"><span class="flabel">Passivas</span>${ps.map(h => { const on = passiveOn(cb, h); return `<button class="ptog${on ? ' on' : ''}" data-caction="ptoggle" data-c="${cb.id}" data-h="${h.id}" aria-pressed="${on}" title="${esc(h.cmb.efeito)}"><span class="pdot"></span>${esc(h.nome)}<small>${esc(APLICA_CURTO[h.cmb.aplica] || '')}${usesOf(n, h) ? ` · ${usesOf(n, h).atual}/${usesOf(n, h).max}` : h.cmb.uso ? ' · ' + esc(h.cmb.uso) : ''}</small></button>`; }).join('')}</div>${ps.filter(h => h.cmb.aplica === 'sempre' && passiveOn(cb, h) && h.cmb.efeito).map(h => `<div class="fx pfx"><span class="t passiva">Passiva</span><b>${esc(h.nome)}</b> ${esc(h.cmb.efeito)}</div>`).join('')}`;
  }

  // atualiza só os números de um combo em edição, sem perder o foco
  function refreshComboStats(cbId) {
    const n = cur(); const cb = n.combos.find(x => x.id === cbId); if (!cb) return;
    const art = document.getElementById('cb-n-' + cbId)?.closest('.combo'); if (!art) return;
    const c = calc(n); const isEter = n.recurso !== 'Estamina';
    const tmp = document.createElement('div');
    editCombo.delete(cbId); tmp.innerHTML = comboCard(n, c, cb, isEter ? '🔵' : '🔴', isEter); editCombo.add(cbId);
    const fresh = tmp.querySelector('.cstats'); const old = art.querySelector('.cstats');
    if (fresh && old) old.replaceWith(fresh);
  }

  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    tab = b.dataset.tab; try { localStorage.setItem(STORE + '_tab', tab); } catch (er) {}
    renderTabs(); if (tab === 'combos') renderCombos();
  });

  const cbox = $('#combos');
  cbox.addEventListener('input', e => {
    const el = e.target; const n = cur(); if (!n || !el.dataset.c) return;
    const cb = n.combos.find(x => x.id === el.dataset.c); if (!cb) return;
    if (el.dataset.ck) cb[el.dataset.ck] = el.value;
    else if (el.dataset.sk) {
      const s = cb.passos[num(el.dataset.s)]; if (!s) return;
      if (el.dataset.sk === 'habId') { Object.assign(s, stepFromHab(n, el.value)); save(); renderCombos(); return; }
      s[el.dataset.sk] = 'num' in el.dataset ? num(el.value) : el.value;
    }
    save(); refreshComboStats(cb.id);
  });
  cbox.addEventListener('change', e => { const el = e.target; if (el.tagName === 'SELECT' && el.dataset.sk && el.dataset.sk !== 'habId') { save(); } });
  cbox.addEventListener('click', e => {
    const b = e.target.closest('[data-caction]'); if (!b) return;
    const n = cur(); if (!n) return;
    const a = b.dataset.caction;
    const cb = n.combos.find(x => x.id === b.dataset.c);
    if (a === 'add') { const nc = { id: uid(), nome: 'Novo combo', nota: '', passos: [stepFromHab(n, '')] }; n.combos.push(nc); editCombo.add(nc.id); }
    else if (!cb) return;
    else if (a === 'ptoggle') { const h = n.habs.find(x => x.id === b.dataset.h); if (!h) return; cb.passivas = cb.passivas || {}; cb.passivas[h.id] = !passiveOn(cb, h); }
    else if (a === 'edit') editCombo.add(cb.id);
    else if (a === 'done') editCombo.delete(cb.id);
    else if (a === 'dup') { const d = JSON.parse(JSON.stringify(cb)); d.id = uid(); d.nome = cb.nome + ' (cópia)'; n.combos.splice(n.combos.indexOf(cb) + 1, 0, d); }
    else if (a === 'del') {
      if (!b.classList.contains('armed')) { const orig = b.textContent; b.classList.add('armed'); b.textContent = 'Confirmar exclusão'; setTimeout(() => { b.classList.remove('armed'); b.textContent = orig; }, 3500); return; }
      n.combos = n.combos.filter(x => x !== cb); editCombo.delete(cb.id); setStatus(`Combo “${cb.nome || 'Combo'}” excluído.`);
    }
    else if (a === 'sadd') cb.passos.push(stepFromHab(n, ''));
    else if (a === 'sdel') cb.passos.splice(num(b.dataset.s), 1);
    else if (a === 'sup' || a === 'sdown') { const i = num(b.dataset.s), j = a === 'sup' ? i - 1 : i + 1; if (j < 0 || j >= cb.passos.length) return; [cb.passos[i], cb.passos[j]] = [cb.passos[j], cb.passos[i]]; }
    else if (a === 'run') {
      const t = comboTotals(n, cb); const c = calc(n);
      const us = comboUses(n, cb);
      const semUso = us.filter(u => u.atual < u.qty);
      if (semUso.length) { setStatus(`Sem usos para “${cb.nome}”: ${semUso.map(u => `${u.label === 'usos' ? u.nomes[0] : u.label} (${u.atual}/${u.max}, precisa ${u.qty})`).join(', ')}. Desligue a passiva ou faça um descanso.`, true); return; }
      if (t.pa > num(n.pa) || t.en > num(n.energiaAtual)) { setStatus(`Recursos insuficientes para “${cb.nome}”: precisa de ${t.pa} 🔶 e ${t.en} ${n.recurso}; há ${num(n.pa)} 🔶 e ${num(n.energiaAtual)}.`, true); return; }
      n.pa = num(n.pa) - t.pa; n.energiaAtual = Math.min(c.eMax, num(n.energiaAtual) - t.en);
      us.forEach(u => spendUse(n, u.key, u.qty));
      setStatus(`“${cb.nome}” executado: −${t.pa} 🔶, −${t.en} ${n.recurso}${us.length ? ', ' + us.map(u => `−${u.qty} ${u.label === 'usos' ? u.nomes[0] : u.label}`).join(', ') : ''}.`);
      save(); render(); renderCombos(); return;
    }
    save(); renderTabs(); renderCombos();
  });

  (async () => {
    if (SERVIDOR) setStatus('Carregando as fichas da sua conta…');
    try { await load(); }
    catch (e) {
      bloqueado = true;
      $('#sheet').innerHTML = '<div class="empty">' + esc(e.message || 'Não foi possível carregar as fichas.') + ' Recarregue a página para tentar de novo.</div>';
      setStatus(e.message || 'Não foi possível carregar as fichas.', true);
      return;
    }
    render();
    if (SERVIDOR && versao === 0) save();   // primeira vez: grava o exemplo inicial na conta
    else if (SERVIDOR) setStatus('Salvo na sua conta.');
    if (trocouExemplo) { save(); setStatus('O exemplo antigo (Kiran Veyr) foi trocado por um exemplo aleatório.'); }
    if (!canStore && !SERVIDOR) setStatus('Este navegador não deixou salvar. Use Exportar para guardar as fichas.', true);
  })();
})();
