(function(){
  const DISTRITOS_INFO = {
    'Gravemir':     { pop:'14.250.000', pct:'9,5%',  desc:'Distrito montanhoso e minerador. Pouco povoado, mas vital para a indústria sideriana.' },
    'Caelithum':    { pop:'18.000.000', pct:'12,0%', desc:'Costa fria e portuária. Centros navais, comércio marítimo e estaleiros.' },
    'Viridhal':     { pop:'22.500.000', pct:'15,0%', desc:'Terras férteis e densamente povoadas. O celeiro da Confederação.' },
    'Aldrivane':    { pop:'39.000.000', pct:'26,0%', desc:'Coração industrial e tecnológico de Sideria. Maior concentração urbana e fabril.' },
    'Thamerys':     { pop:'16.500.000', pct:'11,0%', desc:'Planalto central e rotas comerciais. Mistura de cidades mercantis e povoados agrícolas.' },
    "Raven's Fall": { pop:'12.000.000', pct:'8,0%',  desc:"Distrito de fronteira, fortificações e academias militares. Guarda as passagens do sul." },
    'Pentacordia':  { pop:'27.750.000', pct:'18,5%', desc:'Terras ricas em recursos e magia etérea. Grandes cidades, universidades e centros de pesquisa.' },
    'Roan':         { pop:'2.000.000',  pct:'1,5%',  desc:'Capital da Confederação e sede do Conselho dos Sete Distritos.' }
  };

  const DISTRICT_MAPS = {
    "Gravemir": { desc: "Terras geladas com Kharan-Vau, V\u00e9lia-F\u00e9rria, Marco-Zero e A Garganta.", img: "assets/distrito-gravemir.webp" },
    "Caelithum": { desc: "Continente com Pan'potsum, Porto F\u00e9rreo, Malaz\u00e1ria e o Plat\u00f4 de \u00c9bano.", img: "assets/distrito-caelithum.webp", hotspots: [ { nome: "Pan'potsum", x: 26.76, y: 56.37, img: "assets/cidade-pan-potsum.webp", texto: "<p>Pan'potsum \u00e9 a capital de Caelithum, contando com ruas largas cortadas por bondes o dia inteiro, torres de cristal refor\u00e7ado brilhando com a luz da Torre de Alimenta\u00e7\u00e3o, pra\u00e7as cheias, escrit\u00f3rios e laborat\u00f3rios locais funcionando lado a lado com o com\u00e9rcio. O grosso da pesquisa de ponta do distrito acontece a alguns quil\u00f4metros dali, nos Setores Externos de Pesquisa e no Poliedro, mas isso n\u00e3o surpreende ningu\u00e9m que mora na capital: os Setores s\u00e3o Externos por defini\u00e7\u00e3o, e o que se passa dentro do Poliedro \u00e9 confidencial por natureza. Pan'potsum n\u00e3o precisa abrigar essas institui\u00e7\u00f5es dentro de si para ser o centro do distrito, ela j\u00e1 \u00e9 isso por conta pr\u00f3pria, pela quantidade de gente que vive, trabalha e circula ali todos os dias.</p>\n\n<h4>\ud83d\udcd6 Origem</h4>\n<p>Pan'potsum come\u00e7ou como Rancho do Dan, a vila que mais prosperava na antiga Via Pioneira sob o comando de Dan Toque d'Ouro, o mesmo que financiou a constru\u00e7\u00e3o fracassada de Travertina e abandonou o projeto em f\u00faria ap\u00f3s o desastre que deu origem a Malaz\u00e1ria. D\u00e9cadas depois, o cientista Elydris Maelthorn passou pela regi\u00e3o a caminho de Gravemir, conheceu Malaz\u00e1ria e os Jaghut, e decidiu montar seu laborat\u00f3rio de volta em Rancho do Dan.</p>\n<p>O investimento de Elydris fez a vila prosperar r\u00e1pido demais para a popularidade cada vez menor de Dan, que acabou perdendo o controle do lugar e partiu sem rumo. Em homenagem ao povo Jaghut que tanto o fascinou, Elydris renomeou a vila para Panpot'sum, e foi esse crescimento que, em concilia\u00e7\u00e3o com os distritos vizinhos, decretou o nascimento de Caelithum como 6\u00ba Distrito. O hist\u00f3rico completo dessa funda\u00e7\u00e3o e da ascens\u00e3o de C.A.E.L.U.S. j\u00e1 est\u00e1 registrado no CAELITHUM AGORA.</p>\n\n<h4>\ud83c\udfd9\ufe0f Estrutura Urbana</h4>\n<h5>Arquitetura</h5>\n<p>Dos princ\u00edpios que atravessam todo o distrito, torres de cristal refor\u00e7ado, pontes suspensas iluminadas a \u00e9ter, ruas largas o bastante para constructos, \u00e9 em Pan'potsum que eles aparecem na vers\u00e3o mais completa e mais bem cuidada. A proximidade com a Torre de Alimenta\u00e7\u00e3o garante \u00e0 capital uma prioridade de manuten\u00e7\u00e3o que nenhuma outra cidade do distrito recebe, o que faz dela a vitrine do que Caelithum promete ser, mesmo enquanto o resto do territ\u00f3rio j\u00e1 sente o peso da crise em sistemas mais velhos e remendados por art\u00edfices locais.</p>\n<p>Essa vitrine n\u00e3o \u00e9 uniforme. Perto do terminal, um bairro bem mais modesto se formou ao longo dos anos, pr\u00e9dios funcionais sem o polimento do centro, ocupados por quem trabalha com carga, manuten\u00e7\u00e3o e log\u00edstica. \u00c9 a parte da cidade que menos aparece quando se fala de Pan'potsum para o resto de Sid\u00e9ria, mas \u00e9 onde de fato circula boa parte do que sustenta o distrito por dentro.</p>\n<p>Do antigo Rancho do Dan n\u00e3o sobrou mem\u00f3ria viva, mais de tr\u00eas s\u00e9culos separam a cidade de hoje daquela vila. O nome sobrevive s\u00f3 em mapas antigos e registros do in\u00edcio do distrito, e em uma ou outra express\u00e3o de uso corrente cuja origem j\u00e1 ningu\u00e9m sabe explicar direito.</p>\n\n<h5>Infraestrutura</h5>\n<p>No cora\u00e7\u00e3o da cidade ergue-se a Torre de Alimenta\u00e7\u00e3o, a estrutura que emana o \u00e9ter respons\u00e1vel por abastecer boa parte de Caelithum. \u00c9 vis\u00edvel de quase qualquer ponto de Pan'potsum, e moradores antigos dizem conseguir ler, s\u00f3 pela varia\u00e7\u00e3o de tom da luz que ela emite, o quanto de \u00e9ter est\u00e1 circulando naquele dia, um h\u00e1bito que se espalhou para o resto do distrito mas nasceu observando a pr\u00f3pria Torre.</p>\n<p>O resto da cidade se organiza em torno de fun\u00e7\u00f5es mais discretas: f\u00e1bricas menores nas margens do territ\u00f3rio, produzindo em escala reduzida o que n\u00e3o justifica o porte de uma FEPSC completa; laborat\u00f3rios de pesquisa locais, onde pesquisadores de meio de carreira sustentam o trabalho de bancada sem depender diretamente do Poliedro; e escrit\u00f3rios administrativos, que cuidam das quest\u00f5es cotidianas da cidade, permiss\u00f5es, registros civis, disputas menores, sem tocar nas decis\u00f5es de estado reservadas ao Conselho Tecnomante. O terminal ferrovi\u00e1rio, afastado do centro simb\u00f3lico da cidade, segue a mesma l\u00f3gica que orienta a localiza\u00e7\u00e3o das FEPSCs: infraestrutura pesada longe do n\u00facleo que se quer mostrar ao p\u00fablico.</p>\n\n<h5>Locais de Interesse</h5>\n<p>A Pra\u00e7a da Inova\u00e7\u00e3o \u00e9 o principal espa\u00e7o p\u00fablico da cidade. \u00c9 onde acontecem as apresenta\u00e7\u00f5es de resonadores em noites de menor movimento e onde, informalmente, entusiastas montam suas pr\u00f3prias feiras de prot\u00f3tipos, sem qualquer v\u00ednculo com os SEPs ou promessa de registro no arquivo coletivo.</p>\n<p>Nem tudo em Pan'potsum \u00e9 vitrine. Existe um bairro planejado que nunca saiu do papel por completo, erguido pela metade num momento de confian\u00e7a que a cidade n\u00e3o sustentou depois. Ningu\u00e9m concorda inteiramente sobre o motivo: uns culpam diretamente os cortes da Grande Decep\u00e7\u00e3o, outros juram que o projeto j\u00e1 estava condenado antes mesmo da crise come\u00e7ar. De qualquer forma, \u00e9 hoje o maior canteiro de obras abandonado do distrito, e nenhuma outra cidade de Caelithum concentra esse tipo de ru\u00edna como Pan'potsum.</p>\n\n<h4>\ud83c\udfd7\ufe0f Daru, o bairro que nunca nasceu</h4>\n<p>Nas margens de Pan'potsum, distante do centro simb\u00f3lico da cidade, existe uma \u00e1rea que n\u00e3o chegou a ser habitada corretamente: um bairro planejado como expans\u00e3o do distrito, iniciado do zero pouco antes da crise se agravar, h\u00e1 cerca de 20 anos atr\u00e1s. Funda\u00e7\u00f5es erguidas, estruturas parcialmente conclu\u00eddas, e em alguns pontos, ainda de p\u00e9, placas de planejamento urbano anunciando o que aquele espa\u00e7o \"seria\", sendo um contraste direto com a Pra\u00e7a da Inova\u00e7\u00e3o, sem sequer a mem\u00f3ria de um sucesso passado para consolar quem passa por ali.</p>\n<p>O nome do projeto original colou no lugar, e \u00e9 assim que os moradores de Pan'potsum ainda se referem a ele, mesmo sem existir mais or\u00e7amento ou cronograma que o sustente. Para os mais devotos da f\u00e9 Harmel'ahn, \u00e9 um lembrete inc\u00f4modo de que nem tudo em Caelithum consegue sustentar o princ\u00edpio de que \"nada se perde\".</p>\n\n<h4>\ud83c\udfdb Governo Local</h4>\n<p>O que se resolve em Pan'potsum \u00e9 o que afeta o dia a dia da cidade: uma licen\u00e7a de constru\u00e7\u00e3o, um registro civil, uma reclama\u00e7\u00e3o sobre a malha de bondes. Qualquer coisa que exija peso de estado, financiamento de pesquisa, aprova\u00e7\u00e3o de patente, decis\u00e3o sobre os rumos do distrito, precisa seguir at\u00e9 o Poliedro, onde o Conselho Tecnomante e C.A.E.L.U.S. de fato governam. Para o cidad\u00e3o comum de Pan'potsum, o Poliedro \u00e9 menos um lugar de trabalho e mais um destino ocasional, reservado a quem tem algum assunto grande demais para os escrit\u00f3rios locais resolverem.</p>\n\n<h4>\ud83e\uddfe Sociedade e Cotidiano</h4>\n<p>Apesar do nome de capital, a vida em Pan'potsum se parece mais com a de qualquer outra cidade de Caelithum do que se poderia imaginar. Pesquisadores e Aprendizes moram ali e se deslocam at\u00e9 o Poliedro ou os SEPs pr\u00f3ximos, mas dividem rua com Art\u00edfices de Fluxo cuidando da malha de bondes, T\u00e9cnicos da Engrenagem, comerciantes e fam\u00edlias que nunca tiveram v\u00ednculo nenhum com pesquisa. \u00c9 essa mistura, mais do que qualquer pr\u00e9dio, que faz de Pan'potsum a capital do distrito: um lugar definido pelas pessoas que sustentam o poder de Caelithum, ainda que esse poder resida oficialmente a alguns quil\u00f4metros dali.</p>\n<p>Muitas dessas fam\u00edlias est\u00e3o ali h\u00e1 gera\u00e7\u00f5es, comerciantes e prestadores de servi\u00e7o que atendem pesquisadores, art\u00edfices e vizinhos desde muito antes da crise atual. Os cortes recentes apertaram algumas margens, mas n\u00e3o tiraram o movimento da cidade: as feiras seguem cheias, os bondes lotam nos hor\u00e1rios de pico, e Pan'potsum continua sendo, de longe, a cidade mais bem cuidada de Caelithum. O orgulho de viver na capital segue forte, refor\u00e7ado justamente por essa diferen\u00e7a vis\u00edvel em rela\u00e7\u00e3o ao resto do distrito.</p>\n<p>O ritmo do dia segue os bondes. Cedo, quem trabalha no Poliedro ou nos SEPs mais pr\u00f3ximos parte pela malha movida a \u00e9ter, e a cidade esvazia at\u00e9 o fim da tarde, quando o movimento volta para a Pra\u00e7a da Inova\u00e7\u00e3o e os caf\u00e9s ao redor. Por volta dos oito anos, toda crian\u00e7a de Pan'potsum recebe sua Primeira Centelha, o pequeno instrumento a \u00e9ter que j\u00e1 come\u00e7a, cedo demais para o gosto de muitos pais, a separar quem parece ter talento para pesquisa de quem provavelmente vai seguir outro caminho. \u00c9 um momento observado de perto: crescer na sombra do Poliedro significa crescer sabendo, mais cedo do que em qualquer outra cidade do distrito, se aquele caminho \u00e9 ou n\u00e3o uma op\u00e7\u00e3o real.</p>\n<p>Mesmo quem nunca pisou num SEP costuma usar um broche de cristal na cor de algum setor, mais por afinidade e gosto pessoal do que por qualquer v\u00ednculo real com pesquisa, um h\u00e1bito que nasceu entre pesquisadores e a cidade toda acabou adotando como moda.</p>\n\n<h4>\ud83c\udfad Cultura</h4>\n<p>O Dia de Elydris, a maior data do calend\u00e1rio de Caelithum, tem sua cerim\u00f4nia principal no Poliedro, mas \u00e9 em Pan'potsum, na Pra\u00e7a da Inova\u00e7\u00e3o, que a cidade celebra por conta pr\u00f3pria: jovens exp\u00f5em seus projetos, moradores leem trechos de manuscritos do fundador, e pequenas encena\u00e7\u00f5es da vida de Elydris se repetem ano ap\u00f3s ano para quem nunca vai pisar num SEP.</p>\n<p>A Converg\u00eancia dos Fluxos, o ritual de sincroniza\u00e7\u00e3o coletiva do \u00e9ter, tamb\u00e9m ganha em Pan'potsum sua vers\u00e3o mais vis\u00edvel, dado o volume de cristais concentrados perto da Torre de Alimenta\u00e7\u00e3o. Antes da Grande Decep\u00e7\u00e3o, era o momento em que a capital mais se exibia, luzes acesas em cada janela, pr\u00e9dios competindo por brilho. Hoje, com menos cristais para acender, o evento perdeu parte desse f\u00f4lego competitivo e virou algo mais contido, mais pr\u00f3ximo da reflex\u00e3o que o rito sempre pretendeu carregar.</p>\n<p>No cotidiano, a Pra\u00e7a da Inova\u00e7\u00e3o concentra boa parte da vida cultural informal da cidade: feiras de prot\u00f3tipos amadores, m\u00fasica de resonadores em noites tranquilas, e um com\u00e9rcio de rua que vende desde broches de cristal at\u00e9 p\u00edlulas de refei\u00e7\u00e3o para quem est\u00e1 sempre com pressa. \u00c9 ali, mais do que em qualquer institui\u00e7\u00e3o oficial, que Pan'potsum mostra por que \u00e9 a capital de um distrito voltado ao progresso.</p>" } ] },
    "Pentacordia": { desc: "Regi\u00e3o arcana com a Torre Espiral, P\u00e1tio do Equil\u00edbrio e o Grande Acervo de Alpheris Magnum.", img: "assets/distrito-pentacordia.webp" },
    "Thamerys": { desc: "Arquip\u00e9lago costeiro com Portobelo, Vale dos Mercadores, Veramar e Myranova.", img: "assets/distrito-thamerys.webp" }
  };

  const panel = document.getElementById('sideria-info-panel');
  const wrap = document.getElementById('sideria-map-wrap');
  const img = wrap ? wrap.querySelector('img') : null;
  if(!panel || !wrap || !img) return;

  const sideriaLayout = document.getElementById('sideria-layout');
  const detailView = document.getElementById('district-detail-view');
  const backBtn = document.getElementById('district-back-btn');
  const detailTitle = document.getElementById('district-detail-title');
  const detailPop = document.getElementById('district-detail-pop');
  const detailDesc = document.getElementById('district-detail-desc');
  const detailImg = document.getElementById('district-detail-img');
  const detailFrame = document.getElementById('district-frame');
  const districtImgWrap = document.getElementById('district-img-wrap');
  const cityModalOverlay = document.getElementById('city-modal-overlay');
  const cityModalClose = document.getElementById('city-modal-close');
  const cityModalImg = document.getElementById('city-modal-img');
  const cityModalTitle = document.getElementById('city-modal-title');
  const cityModalText = document.getElementById('city-modal-text');

  const DIVE_MS = 420;

  // Anima a troca entre duas visões do mapa como um "mergulho": a visão atual cresce e
  // desaparece (como se a câmera atravessasse a tela), depois a próxima visão surge de
  // dentro (pequena e opaca) crescendo até o tamanho normal — ambas a partir do mesmo
  // ponto de origem (o local clicado, ou o centro quando não houver um ponto específico).
  function mergulharEntre(outEl, inEl, originXFrac, originYFrac, prepararIn, outScale, inStartScale){
    const ox = (originXFrac * 100).toFixed(1) + '%';
    const oy = (originYFrac * 100).toFixed(1) + '%';

    outEl.style.setProperty('--dive-out-scale', outScale);
    outEl.style.transformOrigin = ox + ' ' + oy;
    outEl.classList.add('map-dive-out');

    setTimeout(function(){
      outEl.style.display = 'none';
      outEl.classList.remove('map-dive-out');
      outEl.style.transformOrigin = '';
      outEl.style.removeProperty('--dive-out-scale');

      prepararIn();
      inEl.style.setProperty('--dive-in-scale', inStartScale);
      inEl.style.display = '';
      inEl.style.transformOrigin = ox + ' ' + oy;
      inEl.classList.add('map-dive-in-start');
      void inEl.offsetWidth; // força reflow pra garantir que o estado inicial seja pintado
      requestAnimationFrame(function(){
        inEl.classList.remove('map-dive-in-start');
        inEl.classList.add('map-dive-in-end');
        setTimeout(function(){
          inEl.classList.remove('map-dive-in-end');
          inEl.style.transformOrigin = '';
          inEl.style.removeProperty('--dive-in-scale');
        }, DIVE_MS);
      });
    }, DIVE_MS);
  }

  // Marcadores de cidade dentro do mapa de um distrito: cada um abre um modal com
  // imagem e texto sobre aquele local específico.
  function renderizarHotspots(nome){
    if(!districtImgWrap) return;
    districtImgWrap.querySelectorAll('.city-hotspot').forEach(function(el){ el.remove(); });
    const mapa = DISTRICT_MAPS[nome];
    const hotspots = mapa && mapa.hotspots ? mapa.hotspots : [];
    hotspots.forEach(function(h){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'city-hotspot';
      btn.style.left = h.x + '%';
      btn.style.top = h.y + '%';
      btn.title = h.nome;
      btn.setAttribute('aria-label', 'Ver detalhes de ' + h.nome);
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        abrirCidade(h);
      });
      districtImgWrap.appendChild(btn);
    });
  }

  function abrirCidade(h){
    cityModalTitle.textContent = h.nome;
    cityModalText.innerHTML = h.texto;
    if(h.img){ cityModalImg.src = h.img; cityModalImg.alt = h.nome; cityModalImg.style.display = ''; }
    else { cityModalImg.src = ''; cityModalImg.style.display = 'none'; }
    cityModalOverlay.classList.add('open');
  }

  function fecharCidade(){
    cityModalOverlay.classList.remove('open');
  }

  if(cityModalClose) cityModalClose.addEventListener('click', fecharCidade);
  if(cityModalOverlay) cityModalOverlay.addEventListener('click', function(ev){
    if(ev.target === cityModalOverlay) fecharCidade();
  });
  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape') fecharCidade();
  });

  function mostrarMapaDistrito(nome, originXFrac, originYFrac){
    const mapa = DISTRICT_MAPS[nome];
    if(!mapa) { mostrarInfo(nome); return; }
    const ox = (typeof originXFrac === 'number') ? originXFrac : 0.5;
    const oy = (typeof originYFrac === 'number') ? originYFrac : 0.5;
    // Mergulho pra entrar: o mapa de Sideria cresce até sumir (2.6x), o mapa do
    // distrito nasce pequeno (0.3x) e cresce até o tamanho normal.
    mergulharEntre(sideriaLayout, detailView, ox, oy, function(){
      const info = DISTRITOS_INFO[nome];
      detailTitle.textContent = nome;
      detailPop.textContent = info ? (info.pop + ' habitantes · ' + info.pct + ' da população total') : '';
      detailDesc.textContent = mapa.desc;
      detailImg.src = mapa.img;
      detailImg.alt = 'Mapa de ' + nome;
      if(detailFrame) detailFrame.classList.remove('zoomed');
      detailView.classList.add('active');
      renderizarHotspots(nome);
    }, 2.6, 0.3);
  }

  function voltarParaSideria(){
    // Zoom-out pra voltar: o mapa do distrito encolhe até sumir (0.3x), o mapa de
    // Sideria nasce grande (2.6x) e encolhe até o tamanho normal — o inverso do mergulho.
    mergulharEntre(detailView, sideriaLayout, 0.5, 0.5, function(){
      detailView.classList.remove('active');
      fecharCidade();
    }, 0.3, 2.6);
  }

  if(backBtn) backBtn.addEventListener('click', voltarParaSideria);
  if(detailFrame) detailFrame.addEventListener('click', function(){ detailFrame.classList.toggle('zoomed'); });


  // Cores de referência (RGB) de cada distrito, amostradas diretamente do mapa —
  // clicar em qualquer ponto acompanha o contorno real da região, não uma caixa aproximada.
  const DISTRICT_COLORS = {
    'Gravemir':     [64,64,64],
    'Caelithum':    [78,160,163],
    'Viridhal':     [101,175,98],
    'Aldrivane':    [81,111,173],
    'Thamerys':     [210,135,44],
    "Raven's Fall": [116,79,125],
    'Pentacordia':  [204,170,59]
  };
  const MATCH_THRESHOLD = 55;
  // Roan não tem cor própria (fica dentro do território azul de Aldrivane) — é tratado
  // como um pequeno raio ao redor do ícone da bússola, testado antes da cor do pixel.
  const ROAN_POINT = { xFrac: 0.4775, yFrac: 0.5809, radiusFrac: 0.04 };

  let canvas = null, ctx = null;
  function prepararCanvas(){
    if(ctx) return;
    canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  if(img.complete) prepararCanvas();
  else img.addEventListener('load', prepararCanvas);

  function distritoMaisProximo(r, g, b){
    let melhor = null, menorDist = Infinity;
    for(const nome in DISTRICT_COLORS){
      const cor = DISTRICT_COLORS[nome];
      const dist = Math.sqrt((r-cor[0])*(r-cor[0]) + (g-cor[1])*(g-cor[1]) + (b-cor[2])*(b-cor[2]));
      if(dist < menorDist){ menorDist = dist; melhor = nome; }
    }
    return menorDist <= MATCH_THRESHOLD ? melhor : null;
  }

  function mostrarInfo(nome){
    const info = DISTRITOS_INFO[nome];
    if(!info){
      panel.innerHTML = '<p class="map-info-placeholder">Sem informações sobre essa área.</p>';
      return;
    }
    const titulo = (nome === 'Roan') ? 'Roan (Capital)' : nome;
    panel.innerHTML =
      '<h4>' + titulo + '</h4>' +
      '<p class="map-info-pop">' + info.pop + ' habitantes &middot; ' + info.pct + ' da população total</p>' +
      '<p>' + info.desc + '</p>';
  }

  img.style.cursor = 'pointer';
  img.addEventListener('click', function(e){
    prepararCanvas();
    if(!ctx) return;
    const rect = img.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    if(xFrac < 0 || xFrac > 1 || yFrac < 0 || yFrac > 1) return;

    const dxRoan = xFrac - ROAN_POINT.xFrac;
    const dyRoan = yFrac - ROAN_POINT.yFrac;
    if(Math.sqrt(dxRoan*dxRoan + dyRoan*dyRoan) <= ROAN_POINT.radiusFrac){
      mostrarInfo('Roan');
      return;
    }

    const px = Math.min(canvas.width - 1, Math.max(0, Math.round(xFrac * canvas.width)));
    const py = Math.min(canvas.height - 1, Math.max(0, Math.round(yFrac * canvas.height)));
    let pixel;
    try{
      pixel = ctx.getImageData(px, py, 1, 1).data;
    } catch(err){
      panel.innerHTML = '<p class="map-info-placeholder">Não consegui ler essa área do mapa.</p>';
      return;
    }
    const nome = distritoMaisProximo(pixel[0], pixel[1], pixel[2]);
    if(!nome){
      panel.innerHTML = '<p class="map-info-placeholder">Clique dentro do território colorido de um distrito.</p>';
      return;
    }
    if(DISTRICT_MAPS[nome]) mostrarMapaDistrito(nome, xFrac, yFrac); else mostrarInfo(nome);
  });
})();
