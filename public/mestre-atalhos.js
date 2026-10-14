// Área do Mestre no portal: os atalhos só aparecem para quem o Escudo reconhece como mestre.
// Para jogadores e visitantes, /escudo/api/me responde 401/403 e nada é mostrado.
(() => {
  fetch('/escudo/api/me', {credentials: 'same-origin', cache: 'no-store'})
    .then(r => (r.ok ? r.json() : null))
    .then(me => {
      if (!me) return;
      const lista = document.querySelector('.game-list');
      if (!lista || document.querySelector('.mestre-atalhos')) return;
      const area = document.createElement('section');
      area.className = 'mestre-atalhos';
      area.setAttribute('aria-label', 'Área do Mestre');
      const titulo = document.createElement('span');
      titulo.className = 'mestre-titulo';
      titulo.textContent = 'Área do Mestre';
      const links = [['/escudo/', 'Escudo do Mestre', 'Regras, mapas e a Mesa com as fichas dos jogadores'], ['/escudo/npcs/', 'Fichas de NPC', 'Criar NPCs com selos, habilidades e combos']];
      area.append(titulo, ...links.map(([href, nome, desc]) => {
        const a = document.createElement('a');
        a.href = href;
        const b = document.createElement('b'); b.textContent = nome;
        const s = document.createElement('small'); s.textContent = desc;
        a.append(b, s);
        return a;
      }));
      lista.after(area);
    })
    .catch(() => {});
})();
