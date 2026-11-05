(() => {
  const anchor = document.querySelector('#welcome .hero') || document.querySelector('#welcome') || document.querySelector('main');
  if (!anchor || document.getElementById('runamarca-version')) return;
  const badge = document.createElement('small'); badge.id = 'runamarca-version';
  badge.style.cssText = 'display:block;position:relative;font:12px/1.5 system-ui,sans-serif;opacity:.8;padding:6px 0;overflow-wrap:anywhere';
  badge.textContent = 'Versão não identificada'; anchor.appendChild(badge);
  const read = url => fetch(url, { cache:'no-store' }).then(r => { if (!r.ok) throw Error('version'); return r.json(); });
  // Compatibilidade com o servidor já aberto antes da adição do endpoint.
  read('/api/runamarca/version').catch(() => read('/runamarca/version.json')).then(v => {
    const local = ['localhost','127.0.0.1'].includes(location.hostname);
    badge.textContent = `${v.label} · ${v.environment === 'local-test' ? 'teste local' : local ? 'instalação local' : 'servidor'}${v.commit ? ' · ' + v.commit.slice(0, 8) : ''}${v.dirty ? ' + alterações locais' : ''}`;
    badge.title = `${v.version} — ${v.interface}. ${v.note}`;
  }).catch(() => { badge.title = 'O servidor não forneceu uma identificação de versão.'; });
})();
