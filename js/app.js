/* Integracao com o DOM. A logica de negocio esta em core.js e views.js. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { view: 'overview', country: 'all', layers: [], minScore: 0, selected: null, calc: {}, internal: null };
  let data = null;

  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } } };

  async function getJson(path, optional) {
    try {
      const r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) { if (optional) return null; throw new Error(path + ' (' + r.status + ')'); }
      return await r.json();
    } catch (e) { if (optional) return null; throw e; }
  }

  async function load() {
    const names = ['config', 'locations', 'sources', 'corridors', 'initiatives', 'kpis', 'opportunities'];
    const [parts, map, projects] = await Promise.all([Promise.all(names.map((n) => getJson('data/' + n + '.json'))), getJson('data/americas-paths.json'), getJson('data/internal/projects.json', true)]);
    data = {}; names.forEach((n, i) => { data[n === 'config' ? 'config' : n] = parts[i]; }); data.map = map;
    if (Array.isArray(projects)) state.internal = { projects };
  }

  function fillCountries() {
    const sel = $('countryFilter');
    const cs = [...new Set(data.locations.map((l) => l.country))].sort();
    sel.innerHTML = '<option value="all">Todos</option>' + cs.map((c) => '<option>' + Core.esc(c) + '</option>').join('');
  }

  function render(keepFocusId) {
    const [t, s] = Views.TITLES[state.view];
    $('pageTitle').textContent = t; $('pageSubtitle').textContent = s;
    document.title = t + ' | ' + data.config.title;
    document.querySelectorAll('.nav-item').forEach((b) => { const on = b.dataset.view === state.view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('appContent').innerHTML = Views.views[state.view](state, data);
    if (keepFocusId && $(keepFocusId)) $(keepFocusId).focus();
  }

  function go(view) {
    if (!Views.views[view]) view = 'overview';
    state.view = view;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    render(); window.scrollTo(0, 0);
  }

  function onClick(e) {
    const t = e.target;
    const layer = t.closest('[data-layer]');
    if (layer) {
      const id = layer.dataset.layer; state.layers = state.layers.includes(id) ? state.layers.filter((x) => x !== id) : state.layers.concat(id);
      render(); const again = document.querySelector('[data-layer="' + id + '"]'); if (again) again.focus(); return;
    }
    if (t.closest('[data-reset-layers]')) { state.layers = []; render(); const r = document.querySelector('[data-reset-layers]'); if (r) r.focus(); return; }
    const loc = t.closest('[data-loc]');
    if (loc) { state.selected = loc.dataset.loc; if (loc.dataset.goto) return go(loc.dataset.goto); return render(); }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset && t.dataset.calc) { state.calc[t.dataset.calc] = t.value; $('calc-results').innerHTML = Views.calcResults(state.calc); return; }
    if (t.dataset && t.dataset.minscore) { state.minScore = Number(t.value); const m = $('minv'); if (m) m.textContent = t.value; }
  }

  function onChange(e) { if (e.target.dataset && e.target.dataset.minscore) render('minscore'); }

  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g[data-loc]')) { e.preventDefault(); state.selected = e.target.dataset.loc; render(); const g = document.querySelector('g[data-loc="' + state.selected + '"]'); if (g) g.focus(); }
  }

  function setTheme(dark) { document.body.classList.toggle('dark', dark); store.set('theme', dark ? 'dark' : 'light'); $('themeToggle').setAttribute('aria-pressed', String(dark)); }
  function setTv(on) { document.body.classList.toggle('tv', on); $('tvMode').textContent = on ? 'Sair do modo TV' : 'Modo TV'; $('tvMode').setAttribute('aria-pressed', String(on)); }

  async function init() {
    const saved = store.get('theme');
    setTheme(saved ? saved === 'dark' : window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    try { await load(); } catch (err) {
      $('appContent').innerHTML = '<div class="panel"><h2>Não foi possível carregar os dados</h2><p>Abra o portal por um servidor HTTP (ex.: <code>python3 -m http.server 8080</code>) ou pelo GitHub Pages; o navegador bloqueia leitura de JSON via <code>file://</code>.</p><p class="muted">' + Core.esc(err.message) + '</p></div>';
      return;
    }
    fillCountries();
    $('dataUpdated').textContent = data.config.dataUpdated.split('-').reverse().join('/');
    document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
    $('countryFilter').addEventListener('change', (e) => { state.country = e.target.value; render(); });
    $('themeToggle').addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
    $('tvMode').addEventListener('click', () => setTv(!document.body.classList.contains('tv')));
    const c = $('appContent'); c.addEventListener('click', onClick); c.addEventListener('input', onInput); c.addEventListener('change', onChange); c.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => go(location.hash.slice(1)));
    go(location.hash.slice(1) || 'overview');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
