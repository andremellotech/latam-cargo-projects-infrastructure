/* Uma leitura de consultoria, com dados demonstrativos e opção de uso offline. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const files = ['meta', 'projects', 'terminals', 'cases', 'consultant'];

  function setTheme(dark, persist) {
    document.body.classList.toggle('dark', dark);
    $('themeToggle').setAttribute('aria-pressed', String(dark));
    $('themeToggle').textContent = dark ? 'Tema claro' : 'Tema escuro';
    if (persist) {
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* Preferência opcional. */ }
    }
  }

  async function load() {
    const embedded = $('portfolioBundle');
    const bundle = embedded ? JSON.parse(embedded.textContent) : null;
    const entries = await Promise.all(files.map(async (name) => {
      const path = 'data/demo/' + name + '.json';
      if (embedded) {
        if (!bundle || !Object.prototype.hasOwnProperty.call(bundle, path)) {
          throw new Error('Arquivo ausente no relatório offline: ' + path);
        }
        return [name, bundle[path]];
      }
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Falha ao carregar ' + path + ' (HTTP ' + response.status + ').');
      return [name, await response.json()];
    }));
    return Object.fromEntries(entries);
  }

  async function init() {
    let saved;
    try { saved = localStorage.getItem('theme'); } catch { /* Navegação privada pode bloquear acesso. */ }
    setTheme(saved === 'dark' || (saved !== 'light' && Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)), false);
    $('themeToggle').addEventListener('click', () => setTheme(!document.body.classList.contains('dark'), true));
    $('printReport').addEventListener('click', () => window.print());
    try {
      if (location.hash && location.hash !== '#main') {
        history.replaceState(history.state, '', location.pathname + location.search);
      }
    } catch { /* Fragmentos antigos não impedem a leitura. */ }
    $('mainContent').innerHTML = '<p class="loading" role="status">Carregando a visão de consultoria…</p>';
    try {
      const data = await load();
      const html = window.Consulting.render(data);
      $('reportDate').textContent = window.Core.fmtDate(data.meta.asOf);
      $('mainContent').innerHTML = html;
    } catch (error) {
      $('mainContent').innerHTML = '<section class="load-error" role="alert"><h2>Não foi possível carregar a visão de consultoria</h2>' +
        '<p>Use o relatório offline completo ou inicie o servidor local com <code>npm start</code> e abra o endereço informado.</p>' +
        '<p>' + window.Core.esc(error && error.message ? error.message : 'Erro de leitura dos dados.') + '</p></section>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
