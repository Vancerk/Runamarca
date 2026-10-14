(function(){
  // Títulos (por trecho reconhecível do texto do h3) que ficam expansíveis/recolhíveis.
  // Combinação por "contém", pra não se importar com emojis/spans dentro do título.
  const COLAPSAVEIS = [
    // Combate
    'Crítico: Sucesso e Falha', 'Ações', 'Dano de Queda', 'Dano de Esmagamento',
    'Cobertura', 'Ordem de Dano', 'Concentração', 'Tabela de DeathSave',
    'PV Negativa e DS', 'Exaustão', 'Flanqueamento', 'Dano Máximo de Armas',
    'Tabela de Dificuldade de Testes',
    // Condições
    'Efeitos Negativos — Físicos', 'Efeitos Positivos', 'Efeitos Negativos — Mentais',
    'Níveis de Obstrução', 'Efeitos Negativos — Sensoriais', 'Efeitos Negativos — Espirituais',
    // Perícias & Viagens
    'Descanso', 'Deslocamento', 'Perícias Sociais', 'Perícias Práticas',
    'Perícias Intelectuais', 'Perícias Físicas', 'Resistências',
    // Biomas
    'Ermos', 'Aquático', 'Subterrâneo', 'Urbano',
    // Serviços & Preços
    'Preço de Serviços', 'Comércio por Local', 'Pechincha e Abordagem', 'Raridade',
    'Recompensas por Missão',
    // Mapas
    'Mapa-Múndi', 'Confederação de Sideria'
  ];

  document.querySelectorAll('.panel, .bioma-group').forEach(function(panel){
    const h3 = panel.querySelector('h3');
    if(!h3) return;
    const texto = h3.textContent;
    const bate = COLAPSAVEIS.some(function(alvo){ return texto.indexOf(alvo) !== -1; });
    if(!bate) return;
    panel.classList.add('collapsible');
    h3.addEventListener('click', function(){
      panel.classList.toggle('collapsed');
    });
  });
})();
