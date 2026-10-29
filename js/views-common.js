/* Registro de telas e helpers compartilhados. As telas sao funcoes puras (state, dados) -> HTML. */
(function (root) {
  'use strict';
  const C = root.Core, esc = C.esc;
  const V = (root.Views = root.Views || { TITLES: {}, views: {}, H: {} });
  const H = V.H;

  H.srcMap = (d) => Object.fromEntries(d.sources.map((s) => [s.id, s]));
  H.chips = (ids, d) => { const m = H.srcMap(d); return (ids || []).map((id) => (m[id] ? '<a class="chip src" href="' + esc(C.safeUrl(m[id].url)) + '" target="_blank" rel="noopener noreferrer" title="' + esc(m[id].title) + '">' + esc(id) + '</a>' : '')).join(' '); };
  H.layerOf = (d, id) => d.config.layers.find((l) => l.id === id) || { label: id, color: '#5f6672' };
  H.sc = (loc, d) => C.score(loc.components, d.config.scoreWeights);
  H.bandName = { high: 'Alta', mid: 'Média', low: 'Moderada' };
  H.RAGL = { g: 'No plano', a: 'Atenção', r: 'Crítico', n: 'Sem meta' };
  H.mg = (state, d) => (state.mode !== 'public' && d.sets ? d.sets[state.mode] || null : null);
  H.tname = (d, code) => { const l = d.locations.find((x) => x.code === code); return l ? l.name : code; };

  H.visible = (state, d) => d.locations.filter((l) =>
    (state.country === 'all' || l.country === state.country) &&
    (state.layers.length === 0 || l.layers.some((x) => state.layers.includes(x))) &&
    H.sc(l, d) >= state.minScore);
  H.codes = (state, d) => new Set(H.visible(state, d).map((l) => l.code));
  H.inVis = (vis) => (c) => c === 'REDE' || vis.has(c);

  H.scorePill = (s, d) => { const b = C.band(s, d.config.bands); return '<span class="score-pill ' + b + '" title="Prioridade ' + H.bandName[b] + '">' + s + '</span>'; };
  H.confChip = (c) => '<span class="chip conf-' + esc(c) + '">Confiança ' + esc(c) + '</span>';
  H.empty = (msg) => '<div class="empty">' + msg + '</div>';
  H.rag = (r, label) => '<span class="chip st-' + esc(r) + '"><i></i>' + esc(label || H.RAGL[r] || '') + '</span>';
  H.btn = (key, val, label, cls, extra) => '<button type="button" class="' + (cls || 'linkish') + '" data-set="' + esc(key) + '" data-val="' + esc(val) + '"' + (extra || '') + '>' + label + '</button>';
  H.bar = (pct, cls) => '<span class="bar"><i class="' + (cls || '') + '" style="width:' + C.clamp(Number(pct) || 0, 0, 100) + '%"></i></span>';

  /* Botao "ver" que navega e, quando faz sentido, seleciona o item. */
  const NAVKEY = { terminals: 'term', projects: 'proj', business: 'caseId', network: 'selected', kpis: 'kpi' };
  H.navAttrs = (view, ref) => ' data-goto="' + esc(view) + '"' + (NAVKEY[view] && ref ? ' data-set="' + NAVKEY[view] + '" data-val="' + esc(ref) + '"' : '');
  H.go = (view, ref, label) => '<button type="button" class="linkish go"' + H.navAttrs(view, ref) + '>' + (label || 'Ver') + ' →</button>';
  H.icon = (name, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + esc(name) + '"/></svg>';
  H.refView = (id) => (/^P\d/.test(id) ? 'projects' : /^F\d/.test(id) ? 'suppliers' : /^BC/.test(id) ? 'business' : /^O\d/.test(id) ? 'opportunities' : /^R\d/.test(id) ? 'risks' : id);

  H.notice = (state, d, what) => '<section class="panel notice"><h2>' + esc(what) + ' — indisponível no modo público</h2><p class="muted">O modo público mostra apenas fatos divulgados e a análise por localidade. Dados de gestão (ocupação, projetos, CAPEX, riscos, fornecedores) vêm de uma fonte interna ou, para demonstração, de dados fictícios.</p>' +
    (d.sets && d.sets.demo ? H.btn('mode', 'demo', 'Ver exemplo com dados fictícios', 'btn primary') : '') + '</section>';

  H.kpiCards = (d, limit) => {
    const items = limit ? d.kpis.slice(0, limit) : d.kpis;
    return '<div class="grid cards">' + items.map((k) => '<div class="card"><div class="label">' + esc(k.name) + '</div><div class="value">' + esc(k.prefix || '') + C.fmtDec(k.value, Number.isInteger(k.value) ? 0 : 1) + '</div><div class="sub">' + esc(k.unit) + ' ' + H.chips(k.sources, d) + '</div>' + (k.note ? '<div class="knote">' + esc(k.note) + '</div>' : '') + '</div>').join('') + '</div>';
  };
  H.stat = (label, value, sub, cls, icon) => '<div class="card' + (cls ? ' ' + cls : '') + '">' + (icon ? '<span class="ico">' + H.icon(icon) + '</span>' : '') + '<div class="label">' + esc(label) + '</div><div class="value">' + value + '</div><div class="sub">' + (sub || '') + '</div></div>';


  /* ---------------------------------------------------------------- busca global */
  const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  H.norm = norm;
  const TYPE_ORDER = ['Terminal', 'Localidade', 'Projeto', 'Risco', 'Business case', 'Fornecedor', 'KPI', 'Oportunidade', 'Hipótese', 'Marco', 'Fonte'];
  H.searchItems = (state, d) => {
    const items = [], add = (type, label, sub, hay, view, ref) => items.push({ type, label, sub, hay: norm(hay), view, ref, key: norm(label) });
    d.locations.forEach((l) => add('Localidade', l.code + ' · ' + l.name, l.country + ' · score ' + H.sc(l, d), [l.code, l.name, l.country, l.role].join(' '), 'network', l.code));
    d.initiatives.forEach((i) => add('Marco', i.name, i.location + ' · ' + i.status, [i.name, i.summary, i.location].join(' '), 'projects', null));
    d.opportunities.forEach((o) => add('Hipótese', o.id + ' · ' + o.title, o.location + ' · ' + o.category, [o.id, o.title, o.category, o.location].join(' '), 'opportunities', null));
    d.sources.forEach((s) => add('Fonte', s.id + ' · ' + s.title, s.publisher, [s.id, s.title, s.publisher].join(' '), 'governance', null));
    const mg = H.mg(state, d);
    if (mg) {
      mg.terminals.forEach((t) => add('Terminal', t.code + ' · ' + H.tname(d, t.code), C.fmtInt(t.capacityTMonth) + ' t/mês', [t.code, H.tname(d, t.code)].join(' '), 'terminals', t.code));
      mg.projects.forEach((p) => add('Projeto', p.id + ' · ' + p.name, p.terminal + ' · ' + p.phase, [p.id, p.name, p.terminal, p.type, p.owner].join(' '), 'projects', p.id));
      mg.risks.forEach((r) => add('Risco', r.id + ' · ' + r.title, r.terminal + ' · ' + r.category, [r.id, r.title, r.terminal, r.category].join(' '), 'risks', null));
      mg.suppliers.forEach((f) => add('Fornecedor', f.id + ' · ' + f.name, f.type, [f.id, f.name, f.type].join(' '), 'suppliers', null));
      (mg.cases || []).forEach((c) => add('Business case', c.id + ' · ' + c.name, c.projectId, [c.id, c.name, c.projectId].join(' '), 'business', c.id));
      (mg.pipeline || []).forEach((o) => add('Oportunidade', o.id + ' · ' + o.name, o.location + ' · ' + o.stage, [o.id, o.name, o.category, o.location].join(' '), 'opportunities', null));
      mg.series.defs.forEach((x) => add('KPI', x.name, x.group === 'financial' ? 'Financeiro' : 'Operacional', [x.name, x.id, x.pillar || '', x.definition || ''].join(' '), 'kpis', x.id));
    }
    return items;
  };
  /* Todos os termos precisam aparecer; codigo exato primeiro, depois prefixo, depois qualquer trecho. */
  H.search = (state, d, q, limit) => {
    const terms = norm(q).split(/\s+/).filter(Boolean), max = limit || 8;
    if (!terms.length) return { items: [], total: 0 };
    const hit = [];
    H.searchItems(state, d).forEach((it) => {
      if (!terms.every((t) => it.hay.includes(t))) return;
      const code = it.key.split(' · ')[0], first = terms[0];
      const rank = terms.length === 1 && code === first ? 0 : it.key.startsWith(terms[0]) || code.startsWith(first) ? 1 : it.key.split(/[\s·]+/).some((w) => w.startsWith(first)) ? 2 : 3;
      hit.push({ it, rank });
    });
    hit.sort((a, b) => a.rank - b.rank || TYPE_ORDER.indexOf(a.it.type) - TYPE_ORDER.indexOf(b.it.type) || a.it.label.localeCompare(b.it.label, 'pt-BR'));
    return { items: hit.slice(0, max).map((x) => x.it), total: hit.length };
  };
  H.searchHtml = (r, q) => (r.items.length
    ? r.items.map((it) => '<button type="button" role="option" class="sr"' + H.navAttrs(it.view, it.ref) + '><span class="sr-type">' + esc(it.type) + '</span><span class="sr-main"><b>' + esc(it.label) + '</b><small>' + esc(it.sub) + '</small></span></button>').join('') + (r.total > r.items.length ? '<div role="presentation" class="sr-more">Mostrando ' + r.items.length + ' de ' + r.total + '. Refine a busca para ver o restante.</div>' : '')
    : '<div role="presentation" class="sr-empty">Nada encontrado para “' + esc(q) + '”. Tente um código (GRU, P04) ou parte do nome.</div>');

  V.TITLES = Object.assign(V.TITLES, {
    consultant: ['Visão do consultor', 'O que mudou, o que preocupa e o que decidir: a leitura integrada do portfólio.'],
    overview: ['Visão geral', 'Rede, marcos públicos e prioridades de atuação em uma única leitura.'],
    network: ['Mapa de atuação', 'Camadas de demanda, score por localidade e corredores públicos da rede.'],
    terminals: ['Terminais', 'Saúde física e operacional, indicadores e evolução por terminal.'],
    projects: ['Projetos e portfólio', 'Cronograma, valor agregado, curva S e priorização das iniciativas.'],
    kpis: ['Indicadores', 'Quadro executivo da rede e KPIs de apoio, com meta, semáforo, duração fora da meta e efeito em R$.'],
    business: ['Business cases', 'Carteira de estudos econômicos, sensibilidade e simulador de viabilidade.'],
    risks: ['Riscos', 'Matriz de probabilidade e impacto, registro e planos de mitigação.'],
    suppliers: ['Fornecedores e malha rodoviária', 'Desempenho de ground handling, transportadoras e rotas terrestres.'],
    opportunities: ['Novos negócios', 'Pipeline de oportunidades e hipóteses ligadas a evidências públicas.'],
    governance: ['Governança, método e fontes', 'Como os números são calculados, regras de dados e fontes rastreáveis.']
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
