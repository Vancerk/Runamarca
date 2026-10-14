(function(){
  const NPC_DATA = {
    // Cada raça tem seu próprio pool de nomes/sobrenomes, com estética cruzada a partir do que
    // já sabemos de cada povo (Central de Dados, A Segunda Centelha, Bestiário, Livro de
    // Especializações): elfos com sonoridade élfica clássica, vaelitas com tema arcano/estelar,
    // sylvanis com tema de natureza, jaghut com sonoridade antiga e gutural, faelen pequenos e
    // brincalhões (como Toby Fuligem), vampiros góticos/aristocráticos, lupinos com tema lunar/matilha,
    // e humanos com a variedade "comum" de Sideria. Isso evita repetição e deixa cada raça reconhecível
    // só pelo nome sorteado.
    nomesPorRaca: {
      'Humano': {
        masc: ['Cedric','Marcus','Lorn','Sevrin','Otelo','Rurik','Valdren','Erik','Garron','Cyrion','Arthas','Thorion','Vorrik','Elarion','Rhegar','Dorian','Baltus','Ionas','Reyner','Cassian','Emeric','Falkor','Halden','Ivor','Joran','Nikolas','Osric','Pavel','Corvin','Aldric','Bastian','Edric','Renwick','Tobiah','Ansel'],
        fem: ['Cassandra','Helene','Branwen','Dhalia','Maela','Vespera','Seraphine','Aveline','Brielle','Cordelia','Delphine','Fenna','Griselda','Isolde','Junia','Liora','Marisol','Nadya','Orla','Petra','Quintessa','Rosalind','Sabine','Adelaide','Constance','Elowyn','Idris','Perpetua','Solveig'],
        sobrenomes: ['Dorn','Stormcaller','Pendragon','Draholt','Feldran','Harkov','Voss','Vandick','Marravel','Valemont','Valenor','Ashworth','Blackwood','Corvane','Dravenmoor','Eldridge','Fenwick','Grayhollow','Halvorsen','Kesterling','Lockhart','Nightshade','Osgrey','Pemberton','Ravenscar','Thistledown','Wyndham','Harrowgate','Millbrook','Dustane']
      },
      'Elfo Original': {
        masc: ['Aelindor','Elarion','Thalorien','Vaelor','Thorneus','Vaelgor','Sylvaen','Aerendil','Ithariel','Calenmir','Faelithor','Nymrion','Aelthas','Ithrandir','Caladwen'],
        fem: ['Aelindra','Iskandra','Mirael','Sylvara','Sylvia','Aelareth','Ithlin','Vaelira','Elowen','Calantha','Sarien','Nymora','Faelara','Thaliriel','Ithrenna'],
        sobrenomes: ['Moonwhisper','Nightweave','Oakenheart','Aethenmoor','Duskmantle','Thornveil','Silverleaf','Starweave','Duskwhisper','Lightbrook','Silvermere','Dawnsinger']
      },
      'Vaelita': {
        masc: ['Kael','Astradon','Vyranthas','Zephyrion','Solareth','Aetherius','Lyrond','Cassivar','Ethrion','Solvane'],
        fem: ['Kalyth','Astraea','Vyranthia','Zephyra','Solenne','Aetherielle','Lyranna','Cassivera','Ethraine','Solmira'],
        sobrenomes: ['Astradon','Vyranthas','Starforged','Etherbloom','Fluxweaver','Aetherfall','Novaspire','Brightcurrent']
      },
      'Sylvanis': {
        masc: ['Bracken','Rowan','Fernal','Hazel','Wren','Aspen','Thistle','Moss','Cedar','Fenwren'],
        fem: ['Briar','Ivywen','Mossheart','Willowen','Fernwyn','Hollis','Sagewen','Thornia','Larkspur','Marren'],
        sobrenomes: ['Oakenheart','Mossbind','Willowmere','Fernwhisper','Bramblewood','Thornbrook','Greenhollow','Rootwhisper']
      },
      'Meio-Elfo': {
        masc: ['Cedric','Aelindor','Corvin','Thorion','Elden','Joran','Vaelric','Renfael'],
        fem: ['Aelindra','Seraphine','Mirael','Branwen','Elowyn','Liora','Vaelith','Rosalind'],
        sobrenomes: ['Ashworth','Moonwhisper','Dravenmoor','Thistledown','Silverleaf','Oakenheart','Grayhollow']
      },
      'Jaghut': {
        masc: ['Thorga','Karnok','Vorthak','Gralkin','Ozrund','Kethmar','Drommek','Bharok','Ur-Gathal','Molgrund'],
        fem: ['Urlaith','Kethara','Drozna','Malgrid','Vhalka','Noruth','Zagrith','Kharune'],
        sobrenomes: ['Punho-de-Pedra','Olho-Fundo','Barbarrocha','Veia-Negra','Marte-lo-Cego','Sombra-Funda','Osso-Antigo']
      },
      'Faelen': {
        masc: ['Toby','Pip','Milo','Bramwell','Corky','Wick','Bindle','Fennick','Dobbs'],
        fem: ['Nettle','Tilly','Bramble','Poppy','Fen','Wisp','Marigold','Button','Wrenna'],
        sobrenomes: ['Fuligem','Cogwhistle','Copperwhistle','Bramblefoot','Quickspanner','Tinkerroot','Lampwick']
      },
      'Vampiro': {
        masc: ['Morthavian','Vaelgor','Draven','Alaric','Cassius','Ravensworth','Malachor','Sorrelian'],
        fem: ['Vespera','Lilianne','Seraphina','Nocturna','Isolde','Morwenna','Ravenna','Thessaly'],
        sobrenomes: ['Duskmantle','Nightshade','Ravenscar','Bloodmere','Crimsonveil','Grimhallow','Sanguinelle']
      },
      'Lupino': {
        masc: ['Wolfram','Ragnar','Ulfric','Bjarn','Haldor','Kolvar','Stromgar','Vaskan'],
        fem: ['Luna','Selene','Ylva','Astrid','Freyda','Runa','Skadi','Ingrith'],
        sobrenomes: ['Moonhowl','Silverfang','Nightpack','Ironjaw','Duskrunner','Wintercoat','Redclaw']
      }
    },
    // Designações de Rúnicos (Axiom) — constructos não recebem "nome de família", e sim um código/designação
    designacoesAxiom: ['Unidade O.B.4.R','Aegis-Prime-07','Sentinela-Axiom-12','Vigilante-Kaion-9','Protocolo Tábula Rasa-3','Guardião-Rúnico Zeta-5','Constructo Ferrovant-2','Diretriz-Prime Solen-8','Autômato Cindra-6','Unidade Vansor-1','Protocolo Ancorae-4','Sentinela-Vigil-15','Autômato Lumen-3','Diretriz-Prime Kether-9'],
    // Povos de Elysium (Santuário Aureliano, Sideria, A Segunda Centelha)
    racas: ['Humano','Elfo Original','Vaelita','Sylvanis','Meio-Elfo','Jaghut','Rúnico (Axiom)','Faelen','Vampiro','Lupino'],
    sexos: ['Masculino','Feminino'],
    personalidades: [
      'Fala alto e gesticula muito ao contar histórias.',
      'É extremamente supersticioso(a) e evita números pares.',
      'Cumprimenta estranhos como se já os conhecesse.',
      'Nunca olha diretamente nos olhos de quem conversa.',
      'Coleciona objetos pequenos e inúteis "pra sorte".',
      'Fala baixo, quase um sussurro, mesmo em conversas normais.',
      'Ri em momentos inapropriados quando está nervoso(a).',
      'Trata qualquer desconhecido com desconfiança imediata.',
      'É obcecado(a) por pontualidade e etiqueta.',
      'Conta piadas ruins sem perceber que são ruins.',
      'Fala de si na terceira pessoa quando está orgulhoso(a).',
      'Nunca termina uma frase sem um provérbio.',
      'Observa tudo em silêncio antes de dizer qualquer coisa.',
      'É brutalmente honesto(a), mesmo quando não deveria.',
      'Trata animais melhor do que trata pessoas.'
    ]
  };

  function sorteia(lista){ return lista[Math.floor(Math.random() * lista.length)]; }

  function gerarNome(sexo, raca){
    if(/rúnico|axiom/i.test(raca || '')) return sorteia(NPC_DATA.designacoesAxiom);
    const pools = NPC_DATA.nomesPorRaca[raca] || NPC_DATA.nomesPorRaca['Humano'];
    const primeiro = /^fem/i.test(sexo) ? pools.fem : pools.masc;
    return sorteia(primeiro) + ' ' + sorteia(pools.sobrenomes);
  }

  const gerarBtn = document.getElementById('npc-gerar-btn');
  const limparBtn = document.getElementById('npc-limpar-btn');
  if(!gerarBtn) return;

  const campos = {
    nome: document.getElementById('npc-nome'),
    raca: document.getElementById('npc-raca'),
    sexo: document.getElementById('npc-sexo'),
    personalidade: document.getElementById('npc-personalidade')
  };

  gerarBtn.addEventListener('click', function(){
    // sexo e raça primeiro, porque o nome sorteado depende dos dois (cada raça tem sua
    // própria estética de nomes; Rúnicos recebem designação de constructo)
    if(!campos.sexo.value.trim()) campos.sexo.value = sorteia(NPC_DATA.sexos);
    if(!campos.raca.value.trim()) campos.raca.value = sorteia(NPC_DATA.racas);
    const sexo = campos.sexo.value.trim();
    const raca = campos.raca.value.trim();

    if(!campos.nome.value.trim()) campos.nome.value = gerarNome(sexo, raca);
    if(!campos.personalidade.value.trim()) campos.personalidade.value = sorteia(NPC_DATA.personalidades);

    const painel = document.getElementById('npc-resultado-panel');
    const resultado = document.getElementById('npc-resultado');
    resultado.innerHTML =
      '<p><b>Nome:</b> ' + campos.nome.value + '</p>' +
      '<p><b>Raça:</b> ' + campos.raca.value + '</p>' +
      '<p><b>Sexo:</b> ' + campos.sexo.value + '</p>' +
      '<p><b>Personalidade:</b> ' + campos.personalidade.value + '</p>';
    painel.style.display = 'block';
  });

  if(limparBtn){
    limparBtn.addEventListener('click', function(){
      Object.keys(campos).forEach(function(k){ campos[k].value = ''; });
      document.getElementById('npc-resultado-panel').style.display = 'none';
    });
  }
})();
