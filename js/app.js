/* Integracao com o DOM. A logica esta em core, analytics, charts e views-*. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const V = window.Views, C = window.Core;
  const state = { view: 'executive', mode: 'demo', kv: 'exec', country: 'all', layers: [], minScore: 0, selected: null, term: null, proj: null, caseId: null, kpi: 'occupancy', metric: 'score', calc: {} };
  let data = null, interview = null;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } } };
  const SET_FILES = ['terminals', 'series', 'projects', 'cases', 'risks', 'suppliers', 'lanes', 'pipeline', 'consultant'];
  const MODE_LABEL = { demo: 'Demonstração', public: 'Públicos', internal: 'Internos' };

  async function getJson(path, optional) {
    try {
      const r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) { if (optional) return null; throw new Error(path + ' (' + r.status + ')'); }
      return await r.json();
    } catch (e) { if (optional) return null; throw e; }
  }
  async function loadSet(dir) {
    const meta = await getJson('data/' + dir + '/meta.json', true);
    if (!meta) return null;
    const parts = await Promise.all(SET_FILES.map((n) => getJson('data/' + dir + '/' + n + '.json', true)));
    if (parts.some((p) => p == null)) return null;
    const o = { meta }; SET_FILES.forEach((n, i) => { o[n] = parts[i]; });
    return o;
  }
  async function load() {
    const names = ['config', 'locations', 'sources', 'corridors', 'initiatives', 'kpis', 'opportunities'];
    const [parts, map, refs, demo, internal] = await Promise.all([Promise.all(names.map((n) => getJson('data/' + n + '.json'))), getJson('data/americas-paths.json'), getJson('data/references.json', true), loadSet('demo'), loadSet('internal')]);
    data = {}; names.forEach((n, i) => { data[n] = parts[i]; });
    data.map = map; data.references = refs || []; data.sets = { demo, internal };
  }
  const available = () => ['internal', 'demo', 'public'].filter((m) => m === 'public' || (data.sets && data.sets[m]));

  function applyMode() {
    const m = state.mode;
    document.body.classList.remove('mode-demo', 'mode-public', 'mode-internal'); document.body.classList.add('mode-' + m);
    $('modeSwitch').innerHTML = available().map((k) => '<button type="button" data-set="mode" data-val="' + k + '" aria-pressed="' + (k === m) + '">' + MODE_LABEL[k] + '</button>').join('');
    const b = $('modeBanner'), alt = m === 'public' ? (data.sets.demo ? '<button type="button" class="linkish" data-set="mode" data-val="demo">Ver exemplo com dados fictícios</button>' : '') : '<button type="button" class="linkish" data-set="mode" data-val="public">Ver somente dados públicos</button>';
    b.className = 'banner ' + m;
    b.innerHTML = m === 'demo' ? '<b>Modo demonstração.</b> Todos os valores de gestão (ocupação, projetos, CAPEX, riscos, fornecedores, pipeline) são <b>fictícios</b> e não representam a LATAM Cargo. Fatos públicos têm selo de fonte. ' + alt
      : m === 'internal' ? '<b>Dados internos carregados.</b> Não publique este painel em site público. ' + alt
      : '<b>Modo público.</b> Somente fatos oficiais e a análise por localidade; sem dados de gestão. ' + alt;
  }

  function render() {
    if (!V.views[state.view]) state.view = 'overview';
    const [t, s] = V.TITLES[state.view];
    $('pageTitle').textContent = t; $('pageSubtitle').textContent = s;
    document.title = (interview && interview.active ? 'Entrevista · ' + (interview.index + 1) + '/' + window.Interview.steps.length + ' · ' : '') + t + ' | ' + data.config.title;
    document.querySelectorAll('.nav-item').forEach((b) => { const on = b.dataset.view === state.view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('appContent').innerHTML = V.views[state.view](state, data);
    $('countryFilter').value = state.country;
    $('countryControl').hidden = state.view === 'executive';
    renderInterview();
    moveInd();
  }

  function renderInterview() {
    const button = $('interviewStart'), panel = $('interviewPanel');
    if (!button || !panel) return;
    const enabled = !!(interview && interview.available), active = !!(interview && interview.active);
    button.hidden = !enabled; button.disabled = !enabled;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Sair da entrevista' : 'Modo entrevista';
    panel.hidden = !active;
    if (!active) { panel.innerHTML = ''; return; }
    const steps = window.Interview.steps, step = interview.step, esc = C.esc, aligned = interview.aligned();
    panel.innerHTML = '<div class="interview-head"><div><p class="interview-kicker">Modo entrevista · etapa ' + (interview.index + 1) + ' de ' + steps.length + '</p><h2 id="interviewHeading" tabindex="-1">' + esc(step.label) + '</h2></div>' +
      '<label class="interview-select" for="interviewStep">Ir para etapa<select id="interviewStep" data-interview-step="1">' + steps.map((s, i) => '<option value="' + i + '"' + (i === interview.index ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(s.label) + '</option>').join('') + '</select></label></div>' +
      '<p class="interview-note">Roteiro de 5 minutos · estudo independente com <b>dados fictícios</b>.</p>' +
      '<p class="interview-context">' + esc(step.context) + '</p><div class="interview-prompt"><b>Sugestão de fala</b><p>' + esc(step.prompt) + '</p></div>' +
      '<p class="interview-status" role="status">' + (aligned ? 'Etapa em exibição: ' + esc(step.label) + '.' : 'Exploração livre: você está em ' + esc(V.TITLES[state.view][0]) + ', com seleção ou filtros diferentes desta etapa.') + '</p>' +
      '<div class="interview-controls"><button type="button" class="btn" data-interview="previous"' + (interview.index === 0 ? ' disabled' : '') + '>Voltar</button><button type="button" class="btn primary" data-interview="next"' + (interview.index === steps.length - 1 ? ' disabled' : '') + '>Avançar</button>' +
      (!aligned ? '<button type="button" class="btn interview-resume" data-interview="resume">Retomar etapa</button>' : '') +
      (step.anchor && aligned ? '<button type="button" class="btn" data-interview="plan">Ver plano de execução</button>' : '') +
      '<button type="button" class="btn" data-interview="exit">Sair</button></div>';
  }

  function updateInterview(change) {
    if (!interview || !change()) return;
    closeSearch(true); applyMode(); go(state.view);
    refocus(interview.active ? '#interviewHeading' : '#interviewStart');
  }

  function interviewAction(action) {
    if (!interview || !interview.active) return;
    if (action === 'plan') {
      const plan = interview.step.anchor && $(interview.step.anchor);
      if (plan) { plan.setAttribute('tabindex', '-1'); plan.focus(); if (plan.scrollIntoView) plan.scrollIntoView({ block: 'start', behavior: 'auto' }); }
      return;
    }
    const changes = { next: () => interview.next(), previous: () => interview.previous(), resume: () => interview.select(interview.index), exit: () => interview.stop() };
    if (changes[action]) updateInterview(changes[action]);
  }
  /* Indicador horizontal; revela a tela ativa apenas quando sai da area visivel. */
  function moveInd() {
    const ind = $('navInd'), a = document.querySelector('.nav-item.active');
    if (!ind || !a || !a.offsetHeight) return;
    ind.style.height = a.offsetHeight + 'px';
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = 'translate(' + a.offsetLeft + 'px,' + a.offsetTop + 'px)';
    document.body.classList.add('ind');
    const nav = $('mainNav');
    if (!nav || !nav.scrollTo || !nav.clientWidth) return;
    const left = nav.scrollLeft, right = a.offsetLeft + a.offsetWidth;
    if (a.offsetLeft >= left && right <= left + nav.clientWidth) return;
    const target = a.offsetLeft < left ? a.offsetLeft - 24 : right - nav.clientWidth + 24;
    const next = Math.max(0, Math.min(target, nav.scrollWidth - nav.clientWidth));
    const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (Math.abs(next - left) > 1) nav.scrollTo({ left: next, behavior: reduced ? 'auto' : 'smooth' });
  }

  /* busca global: termos em AND, sem acento, abre o item no clique ou no Enter */
  const opts = () => { const r = $('searchResults'); return r && r.querySelectorAll ? [...r.querySelectorAll('[role="option"]')] : []; };
  function closeSearch(clear) {
    const r = $('searchResults'), i = $('globalSearch'); if (!r || !i) return;
    r.hidden = true; r.innerHTML = ''; i.setAttribute('aria-expanded', 'false'); if (clear) i.value = '';
  }
  function runSearch() {
    const q = ($('globalSearch').value || '').trim();
    if (!q) return closeSearch(false);
    const r = V.H.search(state, data, q);
    $('searchResults').innerHTML = V.H.searchHtml(r, q); $('searchResults').hidden = false; $('globalSearch').setAttribute('aria-expanded', 'true');
    $('searchStatus').textContent = r.total ? r.total + (r.total > 1 ? ' resultados' : ' resultado') : 'Nenhum resultado';
  }
  function onSearchKey(e) {
    if (e.key === 'Escape') return closeSearch(false);
    const o = opts();
    if (e.key === 'ArrowDown' && o.length) { e.preventDefault(); o[0].focus(); }
    else if (e.key === 'Enter' && o.length) { e.preventDefault(); o[0].click(); }
  }
  function onResultsKey(e) {
    const o = opts(), i = o.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (o[i + 1] || o[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) $('globalSearch').focus(); else o[i - 1].focus(); }
    else if (e.key === 'Escape') { closeSearch(false); $('globalSearch').focus(); }
  }

  function refocus(sel) { try { const el = sel && document.querySelector(sel); if (el && el.focus) el.focus(); } catch (e) { /* seletor invalido */ } }
  function go(view) {
    if (!V.views[view]) view = 'overview';
    state.view = view;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    render(); window.scrollTo(0, 0);
  }

  function setState(key, val) {
    if (key === 'mode') {
      if (!available().includes(val)) return;
      state.mode = val; if (!interview || !interview.active) store.set('mode', val); applyMode(); return;
    }
    if (key === 'proj' || key === 'selected' || key === 'term' || key === 'caseId') { state[key] = val || null; return; }
    if (key === 'kv') { if (['exec', 'financial', 'operational'].includes(val)) state.kv = val; return; }
    if (key === 'kpi') { // abrir um KPI leva a aba do grupo dele (financeiro ou operacional)
      state.kpi = val; const set = data.sets[state.mode], def = set && set.series.defs.find((x) => x.id === val); if (def) state.kv = def.group; return;
    }
    if (key === 'metric') state.metric = val;
  }

  function onClick(e) {
    const t = e.target, q = (s) => (t && t.closest ? t.closest(s) : null);
    const interviewControl = q('[data-interview]');
    if (interviewControl) { interviewAction(interviewControl.dataset.interview); return; }
    if (q('.search-results')) closeSearch(true);
    const layer = q('[data-layer]');
    if (layer) { const id = layer.dataset.layer; state.layers = state.layers.includes(id) ? state.layers.filter((x) => x !== id) : state.layers.concat(id); render(); refocus('[data-layer="' + id + '"]'); return; }
    if (q('[data-reset-layers]')) { state.layers = []; render(); refocus('[data-reset-layers]'); return; }
    const sim = q('[data-load-sim]');
    if (sim) {
      const c = ((data.sets[state.mode] || {}).cases || []).find((x) => x.id === sim.dataset.loadSim);
      if (c) { state.calc = V.calcFromCase(c); render(); const s = $('simulator'); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      return;
    }
    const set = q('[data-set]');
    if (set) {
      const key = set.dataset.set, val = set.dataset.val;
      setState(key, val);
      if (state.view === 'executive' && set.dataset.resetscope === 'all' && set.dataset.goto) {
        state.country = 'all'; state.layers = []; state.minScore = 0;
      }
      if (set.dataset.goto) return go(set.dataset.goto);
      render(); refocus('[data-set="' + key + '"][data-val="' + val + '"]'); return;
    }
    const g = q('[data-goto]');
    if (g) return go(g.dataset.goto);
    const loc = q('[data-loc]');
    if (loc) { state.selected = loc.dataset.loc; render(); refocus('g[data-loc="' + state.selected + '"]'); }
  }
  function onInput(e) {
    const t = e.target;
    if (t.dataset && t.dataset.calc) { state.calc[t.dataset.calc] = t.value; $('calc-results').innerHTML = V.calcResults(state.calc); return; }
    if (t.dataset && t.dataset.minscore) { state.minScore = Number(t.value); const m = $('minv'); if (m) m.textContent = t.value; }
  }
  function onChange(e) { if (e.target.dataset && e.target.dataset.minscore) { render(); refocus('#minscore'); } }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g[data-loc]')) { e.preventDefault(); state.selected = e.target.dataset.loc; render(); refocus('g[data-loc="' + state.selected + '"]'); }
  }

  function setTheme(dark) {
    document.body.classList.toggle('dark', dark); store.set('theme', dark ? 'dark' : 'light'); $('themeToggle').setAttribute('aria-pressed', String(dark));
    // Atualiza tambem os graficos: evita camadas de texto antigas no compositor ao trocar o tema.
    if (data) render();
  }
  function setTv(on) { document.body.classList.toggle('tv', on); $('tvMode').textContent = on ? 'Sair do modo TV' : 'Modo TV'; $('tvMode').setAttribute('aria-pressed', String(on)); }

  async function init() {
    const saved = store.get('theme');
    setTheme(saved ? saved === 'dark' : window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    try { await load(); } catch (err) {
      $('appContent').innerHTML = '<div class="panel"><h2>Não foi possível carregar os dados</h2><p>Abra o portal por um servidor HTTP (ex.: <code>python3 -m http.server 8080</code>) ou pelo GitHub Pages; o navegador bloqueia leitura de JSON via <code>file://</code>.</p><p class="muted">' + C.esc(err.message) + '</p></div>';
      return;
    }
    const sm = store.get('mode'), av = available();
    state.mode = av.includes(sm) ? sm : av[0];
    interview = window.Interview ? window.Interview.create(state, data) : null;
    const cs = [...new Set(data.locations.map((l) => l.country))].sort();
    $('countryFilter').innerHTML = '<option value="all">Todos</option>' + cs.map((c) => '<option>' + C.esc(c) + '</option>').join('');
    $('dataUpdated').textContent = C.fmtDate(data.config.dataUpdated);
    applyMode();
    document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
    $('countryFilter').addEventListener('change', (e) => { state.country = e.target.value; render(); });
    $('themeToggle').addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
    $('tvMode').addEventListener('click', () => setTv(!document.body.classList.contains('tv')));
    const interviewStart = $('interviewStart'), interviewPanel = $('interviewPanel');
    if (interviewStart) interviewStart.addEventListener('click', () => updateInterview(() => interview.active ? interview.stop() : interview.start()));
    if (interviewPanel) interviewPanel.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.interviewStep) updateInterview(() => interview.select(Number(e.target.value))); });
    document.addEventListener('click', (e) => {
      const tg = e.target; if (tg && tg.closest && !tg.closest('.search')) closeSearch(false);
      if (tg && tg.closest && tg.closest('.nav-item')) return; onClick(e);
    });
    $('globalSearch').addEventListener('input', runSearch); $('globalSearch').addEventListener('focus', runSearch); $('globalSearch').addEventListener('keydown', onSearchKey);
    $('searchResults').addEventListener('keydown', onResultsKey);
    document.addEventListener('keydown', (e) => { const tag = ((document.activeElement || {}).tagName || ''); if (e.key === '/' && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) { e.preventDefault(); $('globalSearch').focus(); } });
    window.addEventListener('resize', moveInd); if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
    const c = $('appContent'); c.addEventListener('input', onInput); c.addEventListener('change', onChange); c.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => go(location.hash.slice(1)));
    go(location.hash.slice(1) || (state.mode === 'public' ? 'overview' : 'executive'));
  }
  document.addEventListener('DOMContentLoaded', init);
})();
