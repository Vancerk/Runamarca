// A mesma fonte alimenta as explicações da mesa e o glossário do criador.
window.RunaRulesGlossary = [
 [/adorme[çc]|adormec/i,'Adormecer','A criatura fica presa na posição e não ataca durante o combate de ativação e o seguinte. Continua recebendo dano.'],
 [/âncor|ancor/i,'Ancoragem','A criatura permanece na mesma posição até participar de mais um combate. Ancoragem não impede ataques.'],
 [/barreira/i,'Barreira','Por 2 combates, reduz à metade o dano dos ataques inimigos ao ocupante da posição, arredondando para cima. Não reduz dano de magias.'],
 [/transpassar/i,'Transpassar','O dano de combate que excede a vida do defensor atinge o Patrono. Dano causado por uma magia não é um ataque e não usa Transpassar.'],
 [/provocar/i,'Provocar','Pode redirecionar ataques de posições adjacentes para esta criatura. Se ela morrer antes do ataque, o atacante usa o alvo originalmente definido. O limite padrão é uma posição adjacente; uma carta pode indicar outro limite.'],
 [/iniciativa/i,'Iniciativa','Ataca antes de criaturas sem Iniciativa. Um rival morto não revida.'],
 [/revela[çc][ãa]o/i,'Revelação','Resolve após as magias de posição e antes dos ataques. Escolhas de formação são executadas na Revelação.'],
 [/emana[çc][ãa]o/i,'Emanação','Efeito da criatura em uma vaga de Emanação. Ataques normais e magias em área não a atingem; um efeito de alvo individual pode escolhê-la se não houver restrição.'],
 [/\bentrada\b|ao entrar/i,'Entrada','Efeito que acontece quando a criatura entra em campo.'],
 [/convoc|invoc|ficha/i,'Convocar','Cria uma criatura adicional na reserva.'],
 [/neste combate/i,'Neste combate','O efeito temporário termina quando este combate acaba.'],
 [/dano em [áa]rea/i,'Dano em área','Atinge várias criaturas, exceto as que estão em Emanação.'],
 [/armadilha|magia preparada|prepare em/i,'Magia preparada','É jogada na preparação e ativa quando uma criatura é revelada na posição escolhida. Jogar e ativar são momentos diferentes.'],
 [/sil[êe]ncio|silencie|silenciad/i,'Silêncio','Remove o texto de jogo, habilidades, modificadores e encantamentos atuais da criatura. Restaura os atributos impressos sem curar o dano recebido. A arma equipada volta à reserva.'],
 [/corrup[çc][ãa]o/i,'Corrupção','A criatura perde 1 de ataque permanentemente após o ataque que a corrompe e após cada ataque futuro, mesmo contra outros alvos e após a origem da Corrupção sair de campo. Dano de magia não dispara essa perda.'],
 [/último suspiro/i,'Último Suspiro','Efeito que acontece quando a criatura morre.'],
 [/jogar.*magia/i,'Jogar uma magia','Inclui colocar uma magia preparada numa posição. Efeitos de “ao jogar” disparam nesse momento, sem esperar sua ativação no combate.'],
 [/à direita|à frente|adjacent/i,'Posições','À direita é a posição seguinte na numeração, para ambos os jogadores. À frente é a posição de mesmo número do lado adversário. Adjacentes são as posições imediatamente vizinhas.'],
 [/reduza.*vida|vida atuais|vida máxima/i,'Vida e dano','Reduzir a vida reduz a vida máxima e a atual, sem causar dano e sem consumir efeitos de “primeiro dano”. Uma criatura com 0 de vida morre.'],
 [/em campo/i,'Em campo','Inclui criaturas na reserva e em Emanação. As restrições de alvo de cada efeito continuam valendo.'],
 [/\+1\/\+1/i,'+1/+1','Ataque e vida, nessa ordem. Um bônus permanente permanece enquanto a criatura estiver em campo, salvo exceção descrita pela carta.'],
 [/nartvanyr/i,'Nartvanyr','Guarda cartas usadas, destruídas ou descartadas. Uma magia ainda em resolução não conta no Nartvanyr para seu próprio efeito. “Para cada 2 magias” conta pares completos.'],
 [/devolv|à mão|à sua mão/i,'Retorno à mão','Restaura os atributos impressos e remove dano, habilidades concedidas e modificadores, salvo exceção descrita pela carta. A arma equipada volta à reserva. Se a mão estiver cheia, a criatura vai ao Nartvanyr.'],
 [/revestimento|impeça o próximo efeito/i,'Revestimento Rúnico','Impede apenas o próximo efeito de magia inimiga que adormeceria, ancoraria ou devolveria a criatura à mão. Outros efeitos dessa magia ainda resolvem. Consumir a proteção não remove o +1 de vida concedido.'],
 [/selos|ithalion/i,'Selos de Ithalion','Ligam uma posição de cada lado enquanto Ithalion estiver vivo. Se o outro selo estiver vazio, a criatura atravessa sozinha; se ocupado, as criaturas trocam de lado. Agem pelo lado de chegada nesse combate e depois retornam aos donos.'],
 [/anulada/i,'Não pode ser anulada','Propriedade reservada para interações com futuras magias de anulação. Atualmente não há uma magia de anulação disponível.']
];
window.addEventListener('DOMContentLoaded',()=>{
 const rules=document.getElementById('rules-summary'),editor=document.getElementById('rules-field');
 if(!rules&&!editor)return;
 const glossary=document.createElement('details');glossary.className='rules-glossary';
 const summary=document.createElement('summary');summary.textContent='Glossário de regras';glossary.append(summary);
 for(const [,name,definition] of window.RunaRulesGlossary){
  const section=document.createElement('div'),heading=document.createElement('strong'),paragraph=document.createElement('p');
  heading.textContent=name;paragraph.textContent=definition;section.append(heading,paragraph);glossary.append(section);
 }
 if(rules)rules.append(glossary);else editor.after(glossary);
});
