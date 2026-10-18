(function(){
  // ---------- Configuração dos endereços na ficha (aba "Perfil") ----------
  // MAIN_RANGE_A1 cobre tudo que fica perto do topo (Identidade/Recursos). O P.V. Total fica
  // muito mais abaixo (seção Especificações) e, numa faixa única muito grande e esparsa, o
  // Google às vezes corta as últimas linhas — por isso ele é buscado numa faixa separada e bem
  // pequena (VIDA_MAX_RANGE_A1), só com a vizinhança daquela célula.
  const SHEET_TAB_NAME = 'Perfil';
  const MAIN_RANGE_A1 = 'X5:AL11';
  const MAIN_RANGE_START_ROW = 5;
  const VIDA_MAX_RANGE_A1 = 'Y43:AA48';
  const VIDA_MAX_RANGE_START_ROW = 43;
  // Tabela "Qualidade e Defeitos" mora nas colunas V..AA, linhas 16-21 (6 linhas de escolhas).
  const QD_RANGE_A1 = 'V16:AA21';
  const QD_RANGE_START_ROW = 16;
  const QD_ROWS = [16,17,18,19,20,21];
  const QD_QUALIDADE_COL = 'V';
  const QD_DEFEITO_COL = 'Z';
  // Cabeçalho da ficha: nome do jogador (V4/W4) e imagem do personagem (bloco mesclado S4:U24).
  const HEAD_RANGE_A1 = 'S4:W24';
  const HEAD_RANGE_START_ROW = 4;
  const JOGADOR_CELL = { rows:[4], cols:['V','W'], numeric:false };
  const IMAGEM_COLS = ['S','T','U'];
  const IMAGEM_ROW_FROM = 4;
  const IMAGEM_ROW_TO = 24;
  // Arsenal (arma primária/secundária) e Arte de Batalha: o leitor procura os RÓTULOS dentro
  // desta faixa da aba Perfil (não depende de um endereço exato). Se a primeira faixa for
  // maior do que a planilha, tenta a segunda, menor.
  const SCAN_RANGES = [ { a1:'V9:AV40', row:9 }, { a1:'V9:AP40', row:9 } ];
  const SCAN_LABEL_FAIXA = 'V9:AV40';
  // Endereço aproximado informado para a Arte de Batalha, usado só se o rótulo não for achado.
  const ARTE_FALLBACK = { col:'AP', rows:[23,24] };
  // Imagem/armas/arte mudam pouco: são relidas só de tempos em tempos (ou no botão ⟳).
  const STATIC_REFRESH_MS = 60000;

  const FIELD_MAP = {
    personagem: { rows:[5],    cols:['X','Y'],  numeric:false },
    linhagem:   { rows:[7],    cols:['X','Y'],  numeric:false },
    arquetipo:  { rows:[7],    cols:['Z','AA'], numeric:false },
    vida:       { rows:[5,6],  cols:['AD'],     numeric:true  },
    vida_extra: { rows:[8,7],  cols:['AD'],     numeric:true  },
    eter:       { rows:[5,6],  cols:['AH'],     numeric:true  },
    estamina:   { rows:[5,6],  cols:['AL'],     numeric:true  },
    pa:         { rows:[11,10],cols:['AD'],     numeric:true  },
    // Éter/Estamina máximos ficam perto o bastante do topo pra entrar na faixa principal.
    eter_max:     { rows:[7,6], cols:['AH'], numeric:true },
    estamina_max: { rows:[7,6], cols:['AL'], numeric:true }
  };
  // P.V. Total mora sozinho, numa faixa própria (ver VIDA_MAX_RANGE_A1 acima).
  const VIDA_MAX_CELL = { rows:[46,47,45,48,44], cols:['Y','Z','AA'], numeric:true };

  // Filosofia e dilema de cada arquétipo (F&M 2.5) — usado no painel 🎭 de cada carta.
  const ARQUETIPOS_INFO = {
    'O Soberbo': {
      vertente: 'Vertente I: O Domínio do Ego',
      descricao: 'Você se acha o melhor no que faz e não faz questão de esconder. Sua confiança é o seu escudo, mas também sua cegueira.',
      filosofia: 'Eu sou o protagonista, o resto é cenário.',
      dilema: 'Você tem muita dificuldade em pedir ajuda ou admitir que errou, mesmo quando a situação está feia.'
    },
    'O Tirano': {
      vertente: 'Vertente I: O Domínio do Ego',
      descricao: 'Para você, o mundo só funciona se alguém estiver no comando, e esse alguém é você. Você troca liberdade por ordem.',
      filosofia: 'O caos é uma doença; eu sou a cura pelo controle.',
      dilema: 'Você não consegue confiar em ninguém e acaba afastando as pessoas que poderiam ser seus aliados reais.'
    },
    'O Gladiador': {
      vertente: 'Vertente I: O Domínio do Ego',
      descricao: 'Sua vida só faz sentido se houver um desafio à altura. Você não quer a vitória fácil; você quer a glória de uma luta difícil.',
      filosofia: 'A paz é só o intervalo entre duas batalhas.',
      dilema: 'Você ignora diplomacia e planos cautelosos só para cair na porrada com o inimigo mais forte da sala.'
    },
    'O Dogmático': {
      vertente: 'Vertente II: O Peso do Ideal',
      descricao: 'Você vive por um código, seja ele religioso, militar ou pessoal. Se quebrar a regra, você sente que perdeu sua alma.',
      filosofia: 'Sem honra e sem regras, não somos nada.',
      dilema: 'Você é muito rígido. Às vezes a solução lógica exige uma mentirinha ou uma trapaça, e você simplesmente não consegue fazer.'
    },
    'O Revolucionário': {
      vertente: 'Vertente II: O Peso do Ideal',
      descricao: 'O sistema está podre e precisa cair. Você quer mudar o mundo, mesmo que tenha que quebrar tudo no processo.',
      filosofia: 'É preciso destruir o velho para construir o novo.',
      dilema: 'Você foca tanto em derrubar quem está no topo que esquece de pensar em quem vai sofrer com o caos que você gera.'
    },
    'O Justiceiro': {
      vertente: 'Vertente II: O Peso do Ideal',
      descricao: 'As leis falharam, então você decidiu aplicar a sentença. Você caça quem o sistema deixa escapar.',
      filosofia: 'Para limpar o lixo, é preciso sujar as mãos.',
      dilema: 'É muito fácil você cruzar a linha e virar apenas um assassino vingativo, perdendo o senso de justiça no caminho.'
    },
    'O Patife': {
      vertente: 'Vertente III: O Vício da Realidade',
      descricao: 'Você faz o que precisa ser feito para sair vivo e com o bolso cheio. Ideais não pagam as contas.',
      filosofia: 'O melhor lado da luta é o lado que está ganhando.',
      dilema: 'É difícil alguém confiar em você, e em momentos de aperto real, seu primeiro instinto é pular do barco.'
    },
    'O Errante': {
      vertente: 'Vertente III: O Vício da Realidade',
      descricao: 'Você não quer ser mestre de ninguém e nem escravo de causa nenhuma. Sua liberdade de ir e vir é sagrada.',
      filosofia: 'Minha única raiz é a sola da minha bota.',
      dilema: 'Você tende a ser meio "nem aí" para os problemas dos outros, o que pode fazer você parecer egoísta ou frio.'
    },
    'O Estóico': {
      vertente: 'Vertente III: O Vício da Realidade',
      descricao: 'O mundo é um lugar difícil e você aceita isso. Você aguenta a dor e o cansaço sem dar um pio, focado apenas no seu dever.',
      filosofia: 'A tempestade passa, a montanha fica.',
      dilema: 'Sua falta de emoção faz com que seus aliados achem que você não se importa com eles, dificultando a amizade no grupo.'
    },
    'O Visionário': {
      vertente: 'Vertente IV: O Limiar do Impacto',
      descricao: 'Você busca o progresso. Quer descobrir o próximo grande segredo do Éter ou da tecnologia, custe o que custar.',
      filosofia: 'A ciência e a magia são as chaves para a evolução.',
      dilema: 'Você pode acabar ignorando a ética e a segurança dos seus amigos só para conseguir aquela "resposta" que tanto busca.'
    },
    'O Iconoclasta': {
      vertente: 'Vertente IV: O Limiar do Impacto',
      descricao: 'Você acha que deuses, reis e tradições são correntes. Você quer provar que nada é sagrado e que todos somos donos de nós mesmos.',
      filosofia: 'Não existem mestres, apenas mentiras bem contadas.',
      dilema: 'Você cria confusão com figuras de autoridade sem necessidade, o que pode prejudicar o grupo em situações sociais.'
    },
    'O Benevolente': {
      vertente: 'Vertente IV: O Limiar do Impacto',
      descricao: 'Você é o coração do grupo. Quer proteger os fracos e acredita que a bondade ainda pode salvar o mundo.',
      filosofia: 'Se eu puder evitar a dor de uma pessoa, minha vida valeu a pena.',
      dilema: 'As pessoas podem se aproveitar da sua boa vontade, e você tem dificuldade em tomar decisões cruéis, mesmo quando são necessárias.'
    }
  };

  // Resumo breve de cada Qualidade/Defeito (F&M 2.5) — usado no painel 📜 de cada carta.
  const QD_INFO = {
    // Defeitos
    'Lapso de Memória':    { tipo:'Defeito', custo:'+2 Pontos', resumo:'−2 em História e Dedução. Incompatível com Memória Fotográfica.' },
    'Analfabeto':          { tipo:'Defeito', custo:'+1 Ponto',  resumo:'Não lê nem escreve; idioma principal cai pra Intermediário, secundário pra Básico. Incompatível com Poliglota.' },
    'Covarde':             { tipo:'Defeito', custo:'+2 Pontos', resumo:'−2 contra Amedrontado, Assombrado e Intimidado. Incompatível com Coragem e Coração Indomável.' },
    'Vulnerabilidade Natural': { tipo:'Defeito', custo:'+2 Pontos', resumo:'Escolha Dano Mágico ou Físico — sofre +2d4 de dano verdadeiro adicional desse tipo.' },
    'Hemofilia':           { tipo:'Defeito', custo:'+3 Pontos', resumo:'Sangramento dura +4 turnos. Constructos não podem pegar.' },
    'Ingênuo':             { tipo:'Defeito', custo:'+2 Pontos', resumo:'−2 em resistência contra Blefe e Persuasão.' },
    'Desajeitado':         { tipo:'Defeito', custo:'+2 Pontos', resumo:'Ações com as duas mãos ou manipular itens em combate: 1d20, 1−12 falha e derruba o item (perde os PA).' },
    'Medo da Morte':       { tipo:'Defeito', custo:'+3 Pontos', resumo:'Abaixo de 25% de vida e encurralado, tenta fugir (Fuga vs Iniciativa inimiga). Incompatível com Coração Indomável.' },
    'Rosto Familiar':      { tipo:'Defeito', custo:'+1 Ponto',  resumo:'Ao entrar numa cidade, 1d2 — no 2, confundido com malfeitor: −2 em Blefe, Persuasão e Diplomacia.' },
    'Recuperação Lenta':   { tipo:'Defeito', custo:'+3 Pontos', resumo:'Toda cura recebida é reduzida pela metade.' },
    'Impertinente':        { tipo:'Defeito', custo:'+1 Ponto',  resumo:'−2 em Diplomacia; pode exigir teste de Intelecto pra não soltar um comentário inapropriado.' },
    'Desastrado':          { tipo:'Defeito', custo:'+2 Pontos', resumo:'Deslocamento base (e bônus de deslocamento) reduzidos pela metade.' },
    'Cego':                { tipo:'Defeito', custo:'+3 Pontos', resumo:'−2 pra notar/atacar a mais de 8m; defender ou atacar exige teste de Instinto CD 14 antes, senão −2.' },
    'Audição Ruim':        { tipo:'Defeito', custo:'+1 Ponto',  resumo:'−2 em testes que envolvam audição.' },
    'Lunático':            { tipo:'Defeito', custo:'+1 Ponto',  resumo:'2x/dia, teste de Sorte CD 18; na falha, 1d8 causa um evento caótico aleatório (de afirmações sem sentido a explosões de euforia).' },
    // Qualidades
    'Ágil':                { tipo:'Qualidade', custo:'−1 Ponto',  resumo:'+2 em Iniciativa.' },
    'Pés Leves':           { tipo:'Qualidade', custo:'−1 Ponto',  resumo:'Deslocamento base +2 metros.' },
    'Cauteloso':           { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em Identificação e Intuição.' },
    'Coragem':             { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em resistência contra Amedrontado, Assombrado e Intimidado. Incompatível com Covarde.' },
    'Memória Fotográfica': { tipo:'Qualidade', custo:'−3 Pontos', resumo:'+2 em Memória; lembranças ficam perfeitas. Incompatível com Lapso de Memória.' },
    'Persistente':         { tipo:'Qualidade', custo:'−3 Pontos', resumo:'Anula o 1º efeito negativo físico recebido, 1x por Descanso Longo. Incompatível com Vulnerabilidade Natural.' },
    'Poliglota':           { tipo:'Qualidade', custo:'−1 Ponto',  resumo:'+2 idiomas extras em nível Intermediário. Incompatível com Analfabeto.' },
    'Focado':              { tipo:'Qualidade', custo:'−2 Pontos', resumo:'Pode repetir um teste de Concentração falho, 1x por Descanso Longo.' },
    'Oratória Dominante':  { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em Diplomacia e Liderança.' },
    'Instigador':          { tipo:'Qualidade', custo:'−1 Ponto',  resumo:'+2 em Provocar.' },
    'Mentiroso':           { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em Blefe e Atuação.' },
    'Corpo Treinado':      { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em Atletismo.' },
    'Estudioso':           { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em História e Religião.' },
    'Mente Analítica':     { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em Dedução e Decifrar.' },
    'Coração Indomável':   { tipo:'Qualidade', custo:'−3 Pontos', resumo:'Ao chegar a 30% da vida máxima, ganha 10 de Vida Extra, 1x por Descanso Longo. Incompatível com Covarde.' },
    'Imponência Natural':  { tipo:'Qualidade', custo:'−2 Pontos', resumo:'+2 em Intimidação e Persuasão.' }
  };

  // ---------- utilitários ----------
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function norm(s){
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function toInt(v){
    const m = String(v == null ? '' : v).match(/-?\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  function extractSheetRef(rawUrl){
    if(!rawUrl) return null;
    const url = rawUrl.trim();
    const idMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = idMatch ? idMatch[1] : (/^[a-zA-Z0-9-_]{20,}$/.test(url) ? url : null);
    if(!id) return null;
    const gidMatch = url.match(/[?#&]gid=(\d+)/);
    return { id: id, gid: gidMatch ? gidMatch[1] : null };
  }

  // Busca a planilha pública via Google Visualization API (JSONP — não sofre bloqueio de CORS).
  // "range" pede exatamente o intervalo informado: assim a primeira linha do intervalo SEMPRE
  // vira a primeira linha da resposta, sem depender de o Google "adivinhar" onde os dados começam.
  function gvizJsonp(id, opts){
    return new Promise(function(resolve, reject){
      const cbName = 'gvizCb_' + Math.random().toString(36).slice(2);
      const timeoutId = setTimeout(function(){ cleanup(); reject(new Error('timeout')); }, 12000);
      function cleanup(){
        delete window[cbName];
        if(script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timeoutId);
      }
      window[cbName] = function(data){ cleanup(); resolve(data); };
      const script = document.createElement('script');
      let src = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json;responseHandler:' + cbName +
                '&headers=0&range=' + encodeURIComponent(opts.range);
      if(opts.sheet) src += '&sheet=' + encodeURIComponent(opts.sheet);
      else if(opts.gid) src += '&gid=' + opts.gid;
      script.src = src;
      script.onerror = function(){ cleanup(); reject(new Error('network')); };
      document.body.appendChild(script);
    });
  }

  // Converte a resposta em uma grade indexável por letra de coluna real (X, Y, ..., AL) e
  // número de linha real da planilha (baseRow = primeira linha pedida na faixa).
  function toGrid(dataTable, baseRow){
    if(!dataTable || dataTable.status === 'error' || !dataTable.table) return null;
    const cols = dataTable.table.cols || [];
    const colIndexByLetter = {};
    const colLetters = [];
    cols.forEach(function(col, i){
      colLetters.push(col && col.id ? col.id : '');
      if(col && col.id) colIndexByLetter[col.id] = i;
    });
    const rows = (dataTable.table.rows || []).map(function(r){
      return (r.c || []).map(function(c){
        if(!c) return '';
        return (c.f != null) ? c.f : (c.v != null ? c.v : '');
      });
    });
    return { rows: rows, colIndexByLetter: colIndexByLetter, colLetters: colLetters, baseRow: baseRow };
  }

  function cellAt(grid, rowNum, colLetter){
    if(!grid) return '';
    const ci = grid.colIndexByLetter[colLetter];
    if(ci == null) return '';
    const row = grid.rows[rowNum - grid.baseRow];
    if(!row) return '';
    const v = row[ci];
    return (v == null ? '' : String(v)).trim();
  }

  function getFieldValue(grid, def){
    for(let i=0; i<def.rows.length; i++){
      for(let j=0; j<def.cols.length; j++){
        const v = cellAt(grid, def.rows[i], def.cols[j]);
        if(!v) continue;
        if(def.numeric && !/\d/.test(v)) continue;
        return v;
      }
    }
    return '';
  }

  // Busca a planilha, com fallback: 1ª tentativa pela aba "Perfil" pelo nome; se não existir
  // (ou o layout mudou), cai para a aba indicada no link (gid) ou a primeira aba.
  function fetchGrid(ref, rangeA1, baseRow){
    return gvizJsonp(ref.id, { sheet: SHEET_TAB_NAME, range: rangeA1 }).then(function(data){
      if(data && data.status === 'error') throw new Error('sheet-not-found');
      return data;
    }).catch(function(){
      return gvizJsonp(ref.id, { gid: ref.gid, range: rangeA1 });
    }).then(function(data){
      return toGrid(data, baseRow);
    });
  }

  // ---------- imagem do personagem ----------
  function normalizeImageUrl(raw){
    const m = String(raw || '').match(/https?:\/\/[^\s"')]+/i);
    if(!m) return '';
    const url = m[0];
    const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([\w-]+)/);
    if(drive) return 'https://drive.google.com/thumbnail?id=' + drive[1] + '&sz=w1000';
    return url;
  }
  function findImagem(headGrid){
    if(!headGrid) return '';
    for(let r = IMAGEM_ROW_FROM; r <= IMAGEM_ROW_TO; r++){
      for(let j = 0; j < IMAGEM_COLS.length; j++){
        const url = normalizeImageUrl(cellAt(headGrid, r, IMAGEM_COLS[j]));
        if(url) return url;
      }
    }
    return '';
  }

  // ---------- leitor por rótulo: Arsenal e Arte de Batalha ----------
  const PRIM_LABELS = [/^arma primaria\b/, /^arma principal\b/, /^primaria$/];
  const SEC_LABELS  = [/^arma secundaria\b/, /^secundaria$/];
  const ARTE_LABELS = [/^artes? de batalha\b/];
  const STOP_LABEL  = /^(arma primaria|arma principal|arma secundaria|arsenal|artes? de batalha|equipamentos?|armadura|acessorios?|inventario|recursos)\b/;
  const STRIP_ARMA  = /^\s*(arma\s*)?(prim[aá]ria|principal|secund[aá]ria)\s*[:\-–—]?\s*/i;
  const STRIP_ARTE  = /^\s*artes?\s*de\s*batalha\s*[:\-–—]?\s*/i;

  function gridCells(grid){
    const out = [];
    grid.rows.forEach(function(row, ri){
      row.forEach(function(v, ci){
        const t = (v == null ? '' : String(v)).trim();
        if(t) out.push({ ri: ri, ci: ci, r: grid.baseRow + ri, col: grid.colLetters[ci], text: t });
      });
    });
    return out;
  }
  function findLabel(cells, regexes){
    for(let k = 0; k < regexes.length; k++){
      for(let i = 0; i < cells.length; i++){
        const n = norm(cells[i].text);
        if(n.length <= 45 && regexes[k].test(n)) return cells[i];
      }
    }
    return null;
  }
  function rowValues(grid, ri, fromCi, toCi){
    const row = grid.rows[ri] || [];
    const out = [];
    for(let ci = fromCi; ci < Math.min(toCi, row.length); ci++){
      const t = String(row[ci] == null ? '' : row[ci]).trim();
      if(t) out.push({ ci: ci, text: t });
    }
    return out;
  }

  function extractWeapon(grid, label, stopCells){
    const sameRowStops = stopCells.filter(function(s){ return s !== label && s.ri === label.ri && s.ci > label.ci; });
    const toCi = sameRowStops.length ? Math.min.apply(null, sameRowStops.map(function(s){ return s.ci; })) : grid.colLetters.length;
    const linhas = [];
    const primeira = [];
    const resto = label.text.replace(STRIP_ARMA, '').trim();
    if(resto) primeira.push(resto);
    rowValues(grid, label.ri, label.ci + 1, toCi).forEach(function(v){ primeira.push(v.text); });
    if(primeira.length) linhas.push(primeira);
    for(let ri = label.ri + 1; ri <= label.ri + 5 && ri < grid.rows.length; ri++){
      const bateParada = stopCells.some(function(s){ return s !== label && s.ri === ri && s.ci >= label.ci && s.ci < toCi; });
      if(bateParada) break;
      const vals = rowValues(grid, ri, label.ci, toCi).map(function(v){ return v.text; });
      if(!vals.length) break;
      linhas.push(vals);
    }
    if(!linhas.length) return null;
    const nome = linhas[0][0];
    const detalhes = [];
    if(linhas[0].length > 1) detalhes.push(linhas[0].slice(1).join(' · '));
    linhas.slice(1).forEach(function(l){ detalhes.push(l.join(' · ')); });
    return { nome: nome, linhas: detalhes };
  }

  function extractArte(grid, cells, stopCells){
    const label = findLabel(cells, ARTE_LABELS);
    const linhas = [];
    if(label){
      const toCi = Math.min(label.ci + 8, grid.colLetters.length);
      const resto = label.text.replace(STRIP_ARTE, '').trim();
      const naLinha = [];
      if(resto) naLinha.push(resto);
      rowValues(grid, label.ri, label.ci + 1, toCi).forEach(function(v){ naLinha.push(v.text); });
      if(naLinha.length) linhas.push(naLinha.join(' · '));
      for(let ri = label.ri + 1; ri <= label.ri + 8 && ri < grid.rows.length; ri++){
        const bateParada = stopCells.some(function(s){ return s !== label && s.ri === ri && s.ci >= label.ci - 1 && s.ci < toCi; });
        if(bateParada) break;
        const vals = rowValues(grid, ri, label.ci, toCi).map(function(v){ return v.text; });
        if(!vals.length){ if(linhas.length) break; else continue; }
        linhas.push(vals.join(' · '));
      }
    } else {
      ARTE_FALLBACK.rows.forEach(function(r){
        const t = cellAt(grid, r, ARTE_FALLBACK.col);
        if(t) linhas.push(t);
      });
    }
    return linhas;
  }

  function extractArsenal(scanGrid){
    const vazio = { armas: { primaria: null, secundaria: null }, arte: [], lido: false };
    if(!scanGrid) return vazio;
    const cells = gridCells(scanGrid);
    const stopCells = cells.filter(function(c){ return c.text.length <= 45 && STOP_LABEL.test(norm(c.text)); });
    const lp = findLabel(cells, PRIM_LABELS);
    const ls = findLabel(cells, SEC_LABELS);
    return {
      armas: {
        primaria:   lp ? extractWeapon(scanGrid, lp, stopCells) : null,
        secundaria: ls ? extractWeapon(scanGrid, ls, stopCells) : null
      },
      arte: extractArte(scanGrid, cells, stopCells),
      lido: true
    };
  }

  // ---------- leitura da ficha ----------
  function extractQD(qdGrid){
    const defeitos = [];
    const qualidades = [];
    if(!qdGrid) return { defeitos: defeitos, qualidades: qualidades };
    QD_ROWS.forEach(function(row){
      const qual = cellAt(qdGrid, row, QD_QUALIDADE_COL);
      const def = cellAt(qdGrid, row, QD_DEFEITO_COL);
      if(qual && !/^nenhuma?$/i.test(qual.trim())) qualidades.push(qual.trim());
      if(def && !/^nenhuma?$/i.test(def.trim())) defeitos.push(def.trim());
    });
    return { defeitos: defeitos, qualidades: qualidades };
  }

  // Recurso só existe se tiver atual E máximo (> 0). Sem máximo definido, o recurso some.
  function recurso(found, key){
    const cur = toInt(found[key]);
    const max = toInt(found[key + '_max']);
    if(cur == null || max == null || max <= 0) return null;
    return { cur: cur, max: max };
  }

  function extractDynamic(mainGrid, vidaMaxGrid, qdGrid){
    const raw = {};
    Object.keys(FIELD_MAP).forEach(function(key){
      const v = getFieldValue(mainGrid, FIELD_MAP[key]);
      if(v) raw[key] = v;
    });
    if(vidaMaxGrid){
      const vmax = getFieldValue(vidaMaxGrid, VIDA_MAX_CELL);
      if(vmax) raw.vida_max = vmax;
    }
    const qd = extractQD(qdGrid);
    return {
      personagem: raw.personagem || '',
      linhagem: raw.linhagem || '',
      arquetipo: raw.arquetipo || '',
      vida: recurso(raw, 'vida'),
      eter: recurso(raw, 'eter'),
      estamina: recurso(raw, 'estamina'),
      vida_extra: toInt(raw.vida_extra),
      pa: toInt(raw.pa),
      defeitos: qd.defeitos,
      qualidades: qd.qualidades
    };
  }

  function hasAnyStat(d){
    return !!(d.personagem || d.vida || d.eter || d.estamina || d.pa != null || d.linhagem || d.arquetipo);
  }

  function fetchDynamic(ref){
    return Promise.all([
      fetchGrid(ref, MAIN_RANGE_A1, MAIN_RANGE_START_ROW),
      fetchGrid(ref, VIDA_MAX_RANGE_A1, VIDA_MAX_RANGE_START_ROW).catch(function(){ return null; }),
      fetchGrid(ref, QD_RANGE_A1, QD_RANGE_START_ROW).catch(function(){ return null; })
    ]).then(function(g){
      if(!g[0]) throw new Error('sem-dados');
      return extractDynamic(g[0], g[1], g[2]);
    });
  }

  function fetchScan(ref){
    let p = Promise.resolve(null);
    SCAN_RANGES.forEach(function(rg){
      p = p.then(function(g){
        if(g) return g;
        return fetchGrid(ref, rg.a1, rg.row).catch(function(){ return null; });
      });
    });
    return p;
  }

  function fetchStatic(ref){
    const headP = fetchGrid(ref, HEAD_RANGE_A1, HEAD_RANGE_START_ROW).catch(function(){ return null; });
    const scanP = fetchScan(ref);
    return Promise.all([headP, scanP]).then(function(r){
      const headGrid = r[0];
      const arsenal = extractArsenal(r[1]);
      return {
        jogador: headGrid ? getFieldValue(headGrid, JOGADOR_CELL) : '',
        imagem: findImagem(headGrid),
        armas: arsenal.armas,
        arte: arsenal.arte,
        lido: arsenal.lido
      };
    });
  }

  // ---------- renderização dos painéis da carta ----------
  function destacaDados(htmlEscapado){
    return htmlEscapado.replace(/(\d+\s*d\s*\d+(?:\s*[+\-−]\s*\d+)?)/gi, '<span class="weapon-dano">$1</span>');
  }

  function renderArmas(st){
    if(!st) return '<h5>⚔️ Arsenal</h5><p class="pcard-empty">Carregando armas…</p>';
    let h = '<h5>⚔️ Arsenal</h5>';
    let algum = false;
    [['Arma Primária', st.armas.primaria], ['Arma Secundária', st.armas.secundaria]].forEach(function(par){
      const w = par[1];
      if(!w) return;
      algum = true;
      h += '<div class="weapon"><div class="weapon-slot">' + par[0] + '</div>' +
           '<div class="weapon-name">' + destacaDados(esc(w.nome)) + '</div>' +
           w.linhas.map(function(l){ return '<div class="weapon-line">' + destacaDados(esc(l)) + '</div>'; }).join('') +
           '</div>';
    });
    if(st.arte && st.arte.length){
      algum = true;
      h += '<div class="weapon arte"><div class="weapon-slot">Arte de Batalha</div>' +
           '<div class="weapon-name">' + destacaDados(esc(st.arte[0])) + '</div>' +
           st.arte.slice(1).map(function(l){ return '<div class="weapon-line">' + destacaDados(esc(l)) + '</div>'; }).join('') +
           '</div>';
    }
    if(!algum){
      h += '<p class="pcard-empty">' + (st.lido
        ? 'Não encontrei as armas nem a Arte de Batalha na aba “' + SHEET_TAB_NAME + '”. Procurei os rótulos “Arma Primária”, “Arma Secundária” e “Arte de Batalha” na faixa ' + SCAN_LABEL_FAIXA + '.'
        : 'Não consegui ler a faixa do Arsenal nessa planilha.') + '</p>';
    }
    return h;
  }

  function renderArquetipo(nome){
    if(!nome) return '<h5>🎭 Arquétipo</h5><p class="pcard-empty">Arquétipo não encontrado na ficha.</p>';
    const info = ARQUETIPOS_INFO[nome];
    let h = '<h5>🎭 ' + esc(nome) + '</h5>';
    if(info){
      h += '<div class="arq-vertente">' + esc(info.vertente) + '</div>' +
           '<p>' + esc(info.descricao) + '</p>' +
           '<p><b>Filosofia:</b> “' + esc(info.filosofia) + '”</p>' +
           '<p><b>Dilema:</b> ' + esc(info.dilema) + '</p>';
    } else {
      h += '<p class="pcard-empty">Sem descrição cadastrada para este arquétipo.</p>';
    }
    return h;
  }

  // Defeitos primeiro, depois Qualidades (mesma ordem do título do painel).
  function renderDQ(defeitos, qualidades){
    function bloco(titulo, lista, cls){
      if(!lista.length) return '';
      return '<div class="dq-title ' + cls + '">' + titulo + '</div>' + lista.map(function(nome){
        const qd = QD_INFO[nome];
        const custo = qd ? ' <span class="qd-custo">(' + esc(qd.custo) + ')</span>' : '';
        const resumo = qd ? esc(qd.resumo) : 'Sem resumo cadastrado para este nome.';
        return '<p class="' + cls + '"><b>' + esc(nome) + '</b>' + custo + ' — ' + resumo + '</p>';
      }).join('');
    }
    const corpo = bloco('Defeitos', defeitos, 'dq-defeito') + bloco('Qualidades', qualidades, 'dq-qualidade');
    return '<h5>📜 Defeitos e Qualidades</h5>' + (corpo || '<p class="pcard-empty">Nenhum defeito ou qualidade registrado.</p>');
  }

  // ---------- a carta ----------
  function orbHtml(key, label){
    return '<div class="orb orb-' + key + '" data-key="' + key + '" hidden>' +
             '<div class="orb-glass"><div class="orb-fill"></div>' +
               '<div class="orb-num"><b>0</b><small>/0</small></div></div>' +
             '<div class="orb-label">' + label + '</div></div>';
  }

  function createCard(opts){
    const el = document.createElement('article');
    el.className = 'pcard';
    el.innerHTML =
      '<header class="pcard-head">' +
        '<div class="pcard-titles"><h4 class="pcard-name">Carregando…</h4><div class="pcard-player"></div></div>' +
        '<div class="pcard-gems">' +
          '<div class="gem gem-extra" title="Vida Extra" hidden><span class="gem-num">0</span><span class="gem-cap">Extra</span></div>' +
          '<div class="gem gem-pa" title="Pontos de Ação (PA)" hidden><span class="gem-num">0</span><span class="gem-cap">PA</span></div>' +
        '</div>' +
      '</header>' +
      '<div class="pcard-art">' +
        '<div class="pcard-art-fallback"><span class="pcard-initial">?</span><span class="pcard-art-status"></span></div>' +
        '<img class="pcard-img" alt="" referrerpolicy="no-referrer">' +
        '<nav class="pcard-rail">' +
          '<button type="button" class="rail-btn" data-panel="armas" title="Armas">⚔️</button>' +
          '<button type="button" class="rail-btn" data-panel="arquetipo" title="Arquétipo">🎭</button>' +
          '<button type="button" class="rail-btn" data-panel="dq" title="Defeitos e Qualidades">📜</button>' +
        '</nav>' +
        '<div class="pcard-panel" data-panel="armas"></div>' +
        '<div class="pcard-panel" data-panel="arquetipo"></div>' +
        '<div class="pcard-panel" data-panel="dq"></div>' +
        '<div class="pcard-msg"></div>' +
      '</div>' +
      '<div class="pcard-orbs">' +
        orbHtml('vida', 'Vida') + orbHtml('eter', 'Éter') + orbHtml('estamina', 'Estamina') +
      '</div>' +
      '<footer class="pcard-foot">' +
        '<a class="ficha-link pcard-open" target="_blank" rel="noopener">Abrir Ficha ↗</a>' +
        '<div class="pcard-tools"></div>' +
        '<div class="ficha-updated-at"></div>' +
      '</footer>';

    const q = function(sel){ return el.querySelector(sel); };
    const nameEl = q('.pcard-name');
    const playerEl = q('.pcard-player');
    const imgEl = q('.pcard-img');
    const initialEl = q('.pcard-initial');
    const artStatusEl = q('.pcard-art-status');
    if(!opts.imagemManual && !opts.retrato) artStatusEl.textContent = opts.foraDaTorre ? 'ficha fora da biblioteca da Torre — use 🖼 para definir a imagem' : (opts.saved ? 'sem retrato cadastrado na Torre — use 🖼 se quiser' : '');
    const msgEl = q('.pcard-msg');
    const updatedEl = q('.ficha-updated-at');
    const gemPa = q('.gem-pa');
    const gemExtra = q('.gem-extra');
    const openLink = q('.pcard-open');
    const tools = q('.pcard-tools');
    const panels = {};
    el.querySelectorAll('.pcard-panel').forEach(function(p){ panels[p.dataset.panel] = p; });
    const orbs = {};
    el.querySelectorAll('.orb').forEach(function(o){
      orbs[o.dataset.key] = { el: o, fill: o.querySelector('.orb-fill'), num: o.querySelector('.orb-num b'), max: o.querySelector('.orb-num small') };
    });

    openLink.href = opts.link;

    let manualImg = opts.imagemManual || '';
    let sheetImg = '';
    const retratoTorre = opts.retrato || '';   // retrato extraído pela Torre ao cadastrar a ficha
    let currentImg = null;
    let staticData = null;
    let lastStaticAt = 0;
    let lastDyn = null;
    let loaded = false;
    let busy = false;
    const prev = {};
    const panelCache = {};

    function showMsg(html, cls){
      msgEl.className = 'pcard-msg show ' + (cls || '');
      msgEl.innerHTML = html;
    }
    function hideMsg(){ msgEl.className = 'pcard-msg'; msgEl.innerHTML = ''; }

    function setPanel(key, html){
      if(panelCache[key] === html) return;
      panelCache[key] = html;
      panels[key].innerHTML = html;
    }

    function applyImage(){
      const url = manualImg ? normalizeImageUrl(manualImg) : (retratoTorre || sheetImg);
      if(url === currentImg) return;
      currentImg = url;
      imgEl.classList.remove('ok');
      if(!url){ imgEl.removeAttribute('src'); return; }
      imgEl.onload = function(){ imgEl.classList.add('ok'); };
      imgEl.onerror = function(){ imgEl.classList.remove('ok'); };
      imgEl.src = url;
    }

    function floatDelta(orbEl, diff){
      const d = document.createElement('span');
      d.className = 'orb-delta ' + (diff < 0 ? 'neg' : 'pos');
      d.textContent = (diff > 0 ? '+' : '−') + Math.abs(diff);
      orbEl.appendChild(d);
      setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 1700);
    }

    function setOrb(key, data){
      const o = orbs[key];
      if(!data){ o.el.hidden = true; prev[key] = null; return; }
      const estavaOculto = o.el.hidden;
      o.el.hidden = false;
      const pct = Math.max(0, Math.min(100, data.cur / data.max * 100));
      if(estavaOculto){
        o.fill.style.setProperty('--fill', '0%');
        void o.fill.offsetWidth; // força o início da animação de "encher"
      }
      o.fill.style.setProperty('--fill', pct + '%');
      o.num.textContent = data.cur;
      o.max.textContent = '/' + data.max;
      o.el.classList.toggle('low', pct <= 25);
      o.el.classList.toggle('empty', pct <= 0);
      if(prev[key] != null && prev[key] !== data.cur){
        floatDelta(o.el, data.cur - prev[key]);
        o.el.classList.remove('changed');
        void o.el.offsetWidth;
        o.el.classList.add('changed');
      }
      prev[key] = data.cur;
    }

    function setGem(gem, key, value){
      if(value == null){ gem.hidden = true; prev[key] = null; return; }
      gem.hidden = false;
      gem.classList.toggle('zero', value === 0);
      gem.querySelector('.gem-num').textContent = value;
      if(prev[key] != null && prev[key] !== value){
        gem.classList.remove('changed');
        void gem.offsetWidth;
        gem.classList.add('changed');
      }
      prev[key] = value;
    }

    function agora(){
      const a = new Date();
      return String(a.getHours()).padStart(2,'0') + ':' + String(a.getMinutes()).padStart(2,'0') + ':' + String(a.getSeconds()).padStart(2,'0');
    }

    function applyData(d, st){
      lastDyn = d;
      nameEl.textContent = d.personagem || '—';
      initialEl.textContent = (d.personagem || '?').trim().charAt(0).toUpperCase() || '?';
      const jogador = (st && st.jogador) || opts.jogadorFallback || '';
      playerEl.textContent = jogador ? 'Jogador: ' + jogador : '';
      setOrb('vida', d.vida);
      setOrb('eter', d.eter);
      setOrb('estamina', d.estamina);
      setGem(gemPa, 'pa', d.pa);
      setGem(gemExtra, 'extra', d.vida_extra);
      setPanel('arquetipo', renderArquetipo(d.arquetipo));
      setPanel('dq', renderDQ(d.defeitos, d.qualidades));
      setPanel('armas', renderArmas(st));
      sheetImg = (st && st.imagem) || '';
      applyImage();
      updatedEl.textContent = 'atualizado às ' + agora();
      updatedEl.classList.remove('stale');
    }

    function refresh(forceFull){
      if(busy) return;
      const ref = extractSheetRef(opts.link);
      if(!ref){
        showMsg('Link inválido — cole o link de compartilhamento do Google Sheets.', 'erro');
        return;
      }
      busy = true;
      if(!loaded) showMsg('Buscando dados na planilha…', 'loading');
      const precisaStatic = forceFull || !staticData || (Date.now() - lastStaticAt > STATIC_REFRESH_MS);
      const dynP = fetchDynamic(ref);
      const staP = precisaStatic ? fetchStatic(ref).catch(function(){ return null; }) : Promise.resolve(null);
      Promise.all([dynP, staP]).then(function(r){
        if(precisaStatic){
          lastStaticAt = Date.now();
          staticData = r[1] || staticData || { jogador:'', imagem:'', armas:{ primaria:null, secundaria:null }, arte:[], lido:false };
        }
        if(!hasAnyStat(r[0])){
          if(!loaded) showMsg('Não encontrei os valores nas células configuradas — confira se a aba “' + SHEET_TAB_NAME + '” e o layout dessa ficha batem com o modelo padrão.', 'erro');
          return;
        }
        loaded = true;
        hideMsg();
        applyData(r[0], staticData);
      }).catch(function(){
        if(!loaded){
          showMsg('Não consegui carregar a planilha. Verifique se o compartilhamento está como “Qualquer pessoa com o link pode visualizar”.', 'erro');
        } else {
          updatedEl.textContent = '⚠ sem conexão — mostrando a última leitura';
          updatedEl.classList.add('stale');
        }
      }).then(function(){ busy = false; });
    }

    // painéis (⚔️ 🎭 📜): um aberto por vez; clicar de novo fecha
    q('.pcard-rail').addEventListener('click', function(ev){
      const btn = ev.target.closest('.rail-btn');
      if(!btn) return;
      const key = btn.dataset.panel;
      const abrir = !panels[key].classList.contains('open');
      Object.keys(panels).forEach(function(k){ panels[k].classList.remove('open'); });
      el.querySelectorAll('.rail-btn').forEach(function(b){ b.classList.remove('active'); });
      if(abrir){ panels[key].classList.add('open'); btn.classList.add('active'); }
    });

    // ferramentas do rodapé
    function addTool(txt, title, cls, fn){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.title = title;
      b.textContent = txt;
      b.addEventListener('click', fn);
      tools.appendChild(b);
    }
    addTool('⟳', 'Atualizar esta ficha agora', 'ficha-refresh-btn', function(){ refresh(true); });
    if(opts.saved){
      addTool('🖼', 'Definir imagem manualmente (link)', 'ficha-refresh-btn', function(){
        const url = window.prompt('Cole o link (URL) da imagem do personagem.\nDeixe vazio para voltar a usar o retrato da Torre.', manualImg);
        if(url === null) return;
        manualImg = url.trim();
        if(opts.onSetImage) opts.onSetImage(manualImg);
        applyImage();
      });
      addTool('🗑', 'Remover jogador da mesa', 'ficha-delete-btn', function(){
        if(opts.onRemove) opts.onRemove(nameEl.textContent);
      });
    }

    return {
      el: el,
      refresh: refresh,
      getName: function(){ return nameEl.textContent; }
    };
  }

  // ---------- Consulta rápida (input livre) ----------
  const quickBtn = document.getElementById('ficha-quick-btn');
  const quickInput = document.getElementById('ficha-quick-input');
  const quickResult = document.getElementById('ficha-quick-result');
  function runQuick(){
    if(!quickResult) return;
    quickResult.innerHTML = '';
    if(!extractSheetRef(quickInput.value)){
      quickResult.innerHTML = '<span class="erro">Link inválido — cole o link de compartilhamento do Google Sheets.</span>';
      return;
    }
    const personagem = personagemPorLink(quickInput.value.trim());
    const c = createCard({ link: quickInput.value.trim(), saved: false, retrato: retratoDe(personagem), foraDaTorre: !personagem });
    quickResult.appendChild(c.el);
    c.refresh(true);
  }
  if(quickBtn){
    quickBtn.addEventListener('click', runQuick);
    quickInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') runQuick(); });
  }

  // ---------- Mesa Atual: salva no servidor (uma por mestre) e ligada à biblioteca da Torre ----------
  // A lista de jogadores mora em /escudo/api/mesa; cada entrada aponta para um personagem da
  // Torre (characterId) ou, se a ficha ainda não foi cadastrada lá, guarda só o link.
  // Os valores (Vida, Éter…) continuam vindo ao vivo da planilha; o retrato vem da Torre.
  const MESA_API = 'api/mesa';
  const AUTO_REFRESH_SECONDS = 5;
  let autoRefreshTimer = null;
  let fichas = [];
  let versao = 0;
  let biblioteca = [];
  let bibliotecaOk = false;
  const cards = {}; // id da entrada -> carta
  const statusEl = document.getElementById('mesa-status');
  const selectPersonagem = document.getElementById('novo-personagem');

  function mostrarStatus(texto, erro){
    if(!statusEl) return;
    statusEl.textContent = texto || '';
    statusEl.classList.toggle('erro', !!erro);
  }
  function novoId(){
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function retratoDe(c){
    return c && c.portrait ? '/torre/' + String(c.portrait).replace(/^\/+/, '') : '';
  }
  function personagemPorLink(link){
    const ref = extractSheetRef(link);
    return ref ? (biblioteca.find(function(c){ return c.sheetId === ref.id; }) || null) : null;
  }
  function personagemDe(f){
    if(f.characterId) return biblioteca.find(function(c){ return c.id === f.characterId; }) || null;
    return f.link ? personagemPorLink(f.link) : null;
  }
  function sheetIdDe(f){
    const c = personagemDe(f);
    if(c && c.sheetId) return c.sheetId;
    const ref = extractSheetRef(f.link || '');
    return ref ? ref.id : null;
  }

  function lerJson(resp){
    return resp.json().catch(function(){ return {}; }).then(function(d){ return { ok: resp.ok, status: resp.status, d: d }; });
  }
  function erroDeAcesso(status){
    if(status === 401) return 'Sua sessão expirou. Entre novamente com o Discord.';
    if(status === 403) return 'Sua conta não tem acesso ao Escudo do Mestre.';
    return null;
  }

  function carregarBiblioteca(){
    return fetch('/torre/api/characters', { credentials: 'same-origin', cache: 'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('torre'); return r.json(); })
      .then(function(lista){
        biblioteca = (Array.isArray(lista) ? lista : []).filter(function(c){ return c && c.id && !c.testFixture; });
        bibliotecaOk = true;
      })
      .catch(function(){ biblioteca = []; bibliotecaOk = false; });
  }
  function carregarMesa(){
    return fetch(MESA_API, { credentials: 'same-origin', cache: 'no-store' }).then(lerJson).then(function(res){
      if(!res.ok) throw new Error(erroDeAcesso(res.status) || res.d.error || 'Não foi possível carregar a mesa.');
      fichas = Array.isArray(res.d.fichas) ? res.d.fichas : [];
      versao = res.d.version || 0;
    });
  }

  // Grava a lista inteira com a versão conhecida; o servidor recusa (409) se outra aba mudou antes.
  let filaSalvar = Promise.resolve();
  function salvarMesa(proxima){
    const tarefa = filaSalvar.then(function(){
      mostrarStatus('Salvando…');
      return fetch(MESA_API, {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: versao, fichas: proxima })
      }).then(lerJson).then(function(res){
        if(res.ok){
          fichas = res.d.fichas; versao = res.d.version;
          mostrarStatus('Mesa salva.');
          return true;
        }
        if(res.status === 409 && res.d.fichas){
          fichas = res.d.fichas; versao = res.d.version;
          mostrarStatus('A mesa tinha sido alterada em outra aba. Mostrando a versão salva — refaça a alteração.', true);
          renderFichasGrid();
          return false;
        }
        mostrarStatus(erroDeAcesso(res.status) || res.d.error || 'Não foi possível salvar a mesa.', true);
        return false;
      }).catch(function(){
        mostrarStatus('Sem conexão com o servidor — a alteração não foi salva.', true);
        return false;
      });
    });
    filaSalvar = tarefa;
    return tarefa;
  }

  function preencherSelect(){
    if(!selectPersonagem) return;
    const naMesa = new Set(fichas.map(sheetIdDe).filter(Boolean));
    selectPersonagem.innerHTML = '';
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = bibliotecaOk ? 'Escolha um personagem da Torre…' : 'Biblioteca da Torre indisponível — use o link';
    selectPersonagem.appendChild(vazio);
    biblioteca.slice().sort(function(a, b){ return String(a.name).localeCompare(String(b.name), 'pt-BR'); }).forEach(function(c){
      if(naMesa.has(c.sheetId)) return;
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name + (c.player ? ' — ' + c.player : '') + (c.class ? ' (' + c.class + ')' : '');
      selectPersonagem.appendChild(o);
    });
    selectPersonagem.disabled = !bibliotecaOk;
  }

  function renderFichasGrid(){
    const grid = document.getElementById('fichas-grid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(cards).forEach(function(k){ delete cards[k]; });
    preencherSelect();

    if(fichas.length === 0){
      const p = document.createElement('p');
      p.className = 'fichas-empty';
      p.textContent = 'Nenhum jogador na mesa ainda — escolha um personagem da Torre ou cole o link de uma ficha logo abaixo.';
      grid.appendChild(p);
      return;
    }

    fichas.forEach(function(f){
      const c = personagemDe(f);
      const link = (c && c.sourceUrl) || f.link || '';
      const carta = createCard({
        link: link,
        saved: true,
        retrato: retratoDe(c),
        foraDaTorre: !c,
        jogadorFallback: (c && c.player) || '',
        imagemManual: f.imagem || '',
        onSetImage: function(url){
          salvarMesa(fichas.map(function(x){ return x.id === f.id ? Object.assign({}, x, { imagem: url }) : x; }));
        },
        onRemove: function(nome){
          if(!confirm('Remover ' + (nome && nome !== 'Carregando…' ? nome : 'este jogador') + ' da mesa?')) return;
          salvarMesa(fichas.filter(function(x){ return x.id !== f.id; })).then(function(ok){ if(ok) renderFichasGrid(); });
        }
      });
      cards[f.id] = carta;
      grid.appendChild(carta.el);
      carta.refresh(true); // busca inicial automática ao carregar a página
    });
  }

  function refreshAllFichas(full){
    Object.keys(cards).forEach(function(id){ cards[id].refresh(!!full); });
  }
  function startAutoRefresh(){
    stopAutoRefresh();
    autoRefreshTimer = setInterval(function(){ refreshAllFichas(false); }, AUTO_REFRESH_SECONDS * 1000);
  }
  function stopAutoRefresh(){
    if(autoRefreshTimer){ clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  }

  const autoToggle = document.getElementById('ficha-auto-toggle');
  if(autoToggle){
    autoToggle.addEventListener('change', function(){
      if(autoToggle.checked) startAutoRefresh(); else stopAutoRefresh();
    });
    if(autoToggle.checked) startAutoRefresh();
  }
  const refreshAllBtn = document.getElementById('ficha-refresh-all-btn');
  if(refreshAllBtn) refreshAllBtn.addEventListener('click', function(){ refreshAllFichas(true); });

  function jaNaMesa(sheetId){
    return !!sheetId && fichas.some(function(f){ return sheetIdDe(f) === sheetId; });
  }
  function adicionarEntrada(entrada, sheetId){
    if(jaNaMesa(sheetId)){ mostrarStatus('Essa ficha já está na mesa.', true); return Promise.resolve(false); }
    return salvarMesa(fichas.concat([entrada])).then(function(ok){ if(ok) renderFichasGrid(); return ok; });
  }

  const addPersonagemBtn = document.getElementById('novo-personagem-btn');
  if(addPersonagemBtn && selectPersonagem){
    addPersonagemBtn.addEventListener('click', function(){
      const c = biblioteca.find(function(x){ return x.id === selectPersonagem.value; });
      if(!c){ mostrarStatus('Escolha um personagem da lista.', true); return; }
      adicionarEntrada({ id: novoId(), characterId: c.id }, c.sheetId);
    });
  }

  const addBtn = document.getElementById('novo-add-btn');
  const linkInput = document.getElementById('novo-link');
  function adicionarPorLink(){
    const link = linkInput.value.trim();
    const ref = extractSheetRef(link);
    if(!ref || !/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(link)){
      mostrarStatus('Cole o link de compartilhamento da ficha (https://docs.google.com/spreadsheets/d/…).', true);
      return;
    }
    const c = personagemPorLink(link);
    const entrada = c ? { id: novoId(), characterId: c.id } : { id: novoId(), link: 'https://docs.google.com/spreadsheets/d/' + ref.id + '/edit' + (ref.gid ? '#gid=' + ref.gid : '') };
    adicionarEntrada(entrada, ref.id).then(function(ok){ if(ok) linkInput.value = ''; });
  }
  if(addBtn){
    addBtn.addEventListener('click', adicionarPorLink);
    linkInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') adicionarPorLink(); });
  }

  mostrarStatus('Carregando a mesa…');
  Promise.all([carregarBiblioteca(), carregarMesa()])
    .then(function(){
      if(!bibliotecaOk) mostrarStatus('A biblioteca de personagens da Torre está indisponível agora; fichas por link continuam funcionando.', true);
      else if(statusEl && statusEl.textContent === 'Carregando a mesa…') mostrarStatus('');
      renderFichasGrid();
    })
    .catch(function(err){
      mostrarStatus(err && err.message ? err.message : 'Não foi possível carregar a mesa.', true);
      renderFichasGrid();
    });
})();
