// 11/11/2026 (dono, rodada 4): largura real da janela para as camadas de tela cheia.
// Com a barra de rolagem fixa (scrollbar-gutter: stable), 100vw vale a largura SEM a barra (1892 px numa janela de
// 1907), mas a projeção 3D, a névoa, os efeitos de dano e o foco de luz desenham em coordenadas de innerWidth (COM a
// barra). A imagem ficava comprimida ~0,8% e o desvio crescia para a direita: placa da Rodada ~10 px à esquerda do
// conteúdo, casa da Emanação ~7 px, Nartvanyr ~4 px. --full-vw dá a essas camadas a largura de innerWidth (a faixa
// extra fica sob a barra). Carregado sem defer, antes do primeiro quadro.
(()=>{const root=document.documentElement;let last='';
 const sync=()=>{const v=innerWidth+'px';if(v!==last){last=v;root.style.setProperty('--full-vw',v);}};
 sync();addEventListener('resize',sync,{passive:true});})();
