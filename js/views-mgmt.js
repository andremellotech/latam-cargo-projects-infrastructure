/* Telas de gestao: visao do consultor, terminais, projetos, indicadores, business cases, riscos, fornecedores, pipeline.
   Funcionam com qualquer conjunto de dados no formato de data/demo (demonstracao) ou data/internal (interno). */
(function (root) {
  'use strict';
  const C = root.Core, A = root.Analytics, X = root.Charts, V = root.Views, H = V.H, esc = C.esc;

  const ORDER = { r: 0, a: 1, g: 2, n: 3 };
  const mi = (v) => (v < 0 ? '−' : '') + C.fmtDec(Math.abs(v) / 1e6, 1);
  const mgmt = (state, d, title, fn) => { const mg = H.mg(state, d); return mg ? fn(mg, H.codes(state, d), mg.meta.asOf) : H.notice(state, d, title); };
  const demoTag = (state) => (state.mode === 'demo' ? ' <span class="chip demo-c">fictício</span>' : '');
  const tlLabels = (meta) => { const [y, m] = meta.timeline.start.split('-').map(Number); return Array.from({ length: meta.timeline.months }, (_, i) => { const k = m - 1 + i; return (y + Math.floor(k / 12)) + '-' + String((k % 12) + 1).padStart(2, '0'); }); };
  const lastDay = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  const linkRef = (l) => (/^[A-Z]{1,2}\d+$/.test(l) ? l : null);
  const GROUPS = [['financial', 'Financeiros'], ['operational', 'Operacionais']];
  const tgtTxt = (def, v) => (v == null ? '–' : (def.dir === 'min' ? '≤ ' : def.dir === 'max' ? '≥ ' : '') + A.kfmt(def, v));
  const deltaHtml = (def, st) => (st.delta == null ? '<span class="muted">–</span>' : '<span class="' + (st.good == null ? 'muted' : st.good ? 'pos' : 'neg') + '">' + esc(A.kdelta(def, st.delta)) + '</span>');
  const milFmt = (v) => (v < 0 ? '−' : '') + C.fmtDec(Math.abs(v) / 1e3, 0);
  const sevLabel = { r: 'Crítico', a: 'Atenção', i: 'Informativo' };
  const arrow = (t) => (t === 'up' ? '▲' : t === 'down' ? '▼' : '►');
  const dueChip = (days) => H.rag(days <= 14 ? 'r' : days <= 30 ? 'a' : 'g', days < 0 ? 'vencida há ' + (-days) + ' d' : 'em ' + days + ' dias');

  function kpiBoard(state, mg, vis) {
    const rows = A.execRows(mg, vis).filter((r) => r.net), nAll = mg.series.defs.length;
    const li = rows.map((r) => { const df = r.def, ns = r.net, sub = [ns.target != null ? 'meta ' + tgtTxt(df, ns.target) : null, ns.streak >= 2 ? 'fora há ' + ns.streak + ' meses' : null].filter(Boolean).join(' · ');
      return '<li><button type="button" class="kb-row" data-goto="kpis" data-set="kpi" data-val="' + esc(df.id) + '"><span class="rdot st-' + ns.rag + '" role="img" aria-label="Status: ' + esc(H.RAGL[ns.rag]) + '" title="' + esc(H.RAGL[ns.rag]) + '"></span><span class="kb-name">' + esc(df.name) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><span class="kb-val">' + esc(A.kfmt(df, ns.value)) + ' <small>' + esc(df.unit) + '</small></span><span class="kb-d">' + deltaHtml(df, ns) + '</span></button></li>'; }).join('');
    const nOk = rows.filter((r) => r.net.rag === 'g').length;
    return '<section class="panel"><div class="dhead"><h2>KPIs executivos da rede' + demoTag(state) + '</h2>' + H.go('kpis', null, 'Abrir os ' + nAll + ' KPIs') + '</div><p class="muted small"><b>' + nOk + ' de ' + rows.length + '</b> na meta no último mês, consolidado dos terminais do recorte. Cor = semáforo contra a meta; seta = variação contra a média dos 3 meses anteriores. A média da rede pode esconder terminais fora da meta: veja o mapa de calor em Indicadores.</p><ul class="kb kb2">' + li + '</ul></section>';
  }

  /* ------------------------------------------------------------ Visao do consultor */
  V.views.consultant = (state, d) => mgmt(state, d, 'Visão do consultor', (mg, vis, asOf) => {
    const inV = H.inVis(vis), projs = mg.projects.filter((p) => inV(p.terminal)), pf = A.portfolio(projs, asOf);
    const crit = mg.risks.filter((r) => inV(r.terminal) && C.riskScore(r.probability, r.impact) >= 15).length;
    const occ = A.networkOcc(mg, vis), ins = A.insights(mg, asOf, vis).slice(0, 10);
    const rec = (mg.cases || []).map((c) => A.evalCase(c)).filter((e, i) => e.verdict.key === 'yes' && inV((mg.projects.find((p) => p.id === mg.cases[i].projectId) || { terminal: 'REDE' }).terminal));
    const over = pf.eac - pf.budget, overRag = over <= 0 ? 'g' : pf.vacPct <= 0.05 ? 'a' : 'r';
    const idx = (v) => (v == null ? '–' : C.fmtDec(v, 2)), idxRag = (v) => (v == null ? 'n' : v >= 0.95 ? 'g' : v >= 0.85 ? 'a' : 'r');
    const decisions = (mg.consultant.decisions || []).filter((decision) => {
      const business = mg.cases.find((c) => c.id === decision.link);
      const project = mg.projects.find((p) => p.id === (business ? business.projectId : decision.link));
      if (project) return inV(project.terminal);
      const supplier = mg.suppliers.find((s) => s.id === decision.link);
      if (supplier) return supplier.terminals.some(inV);
      const risk = mg.risks.find((r) => r.id === decision.link);
      return risk ? inV(risk.terminal) : state.country === 'all';
    }).sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
    const first = decisions[0];
    const focus = first ? '<section class="decision-focus" aria-labelledby="decisionTitle"><div class="focus-main"><p class="eyebrow">PAUTA DO COMITÊ <span> / ' + esc(first.id) + ' · prioridade por prazo</span></p><h2 id="decisionTitle">' + esc(first.title) + '</h2><p class="focus-recommendation">' + esc(first.recommendation) + '</p><p class="focus-evidence"><b>Evidência:</b> ' + esc(first.why) + '</p></div><div class="focus-action">' + dueChip(C.daysBetween(asOf, first.due)) + '<p><b>' + esc(first.owner) + '</b><span>Decidir até ' + esc(C.fmtDate(first.due)) + '</span></p>' + H.go(H.refView(first.link), linkRef(first.link), 'Analisar ' + esc(first.link)) + '</div></section>' : '';
    const cards = '<div class="grid cards">' +
      H.stat('Orçamento do portfólio', C.fmtMi(pf.budget), pf.n + ' projetos no recorte', '', 'layers') +
      H.stat('CAPEX realizado', C.fmtMi(pf.actual), C.fmtDec(pf.budget ? (pf.actual / pf.budget) * 100 : 0, 0) + '% do orçamento', '', 'money') +
      H.stat('Previsão no término (EAC)', C.fmtMi(pf.eac), H.rag(overRag, (over > 0 ? '+' : '') + C.fmtMi(over) + ' (' + C.fmtDec(pf.vacPct * 100, 1) + '%)'), 'feature', 'trend') +
      H.stat('Projetos por status', '<span class="big-chips">' + ['r', 'a', 'g', 'n'].map((k) => '<span class="chip st-' + k + '"><i></i>' + pf.counts[k] + '</span>').join('') + '</span>', 'crítico · atenção · no plano · não iniciado', '', 'folder') +
      H.stat('SPI / CPI do portfólio', '<span class="st-txt st-' + idxRag(pf.spi) + '">' + idx(pf.spi) + '</span> / <span class="st-txt st-' + idxRag(pf.cpi) + '">' + idx(pf.cpi) + '</span>', 'prazo / custo (1,00 = conforme o plano)', '', 'gauge') +
      H.stat('Ocupação da rede', occ == null ? '–' : C.fmtDec(occ, 1) + '%', occ == null ? '' : H.rag(C.rag(occ, 85, 'min', 0.04), 'meta ≤ 85%'), '', 'building') +
      H.stat('Riscos críticos', String(crit), 'pontuação ≥ 15 (de 25)', '', 'alert') +
      H.stat('VPL dos casos recomendados', C.fmtMi(rec.reduce((a, e) => a + e.npv, 0)), rec.length + ' caso(s) com aprovação recomendada', '', 'check') + '</div>';
    const insHtml = ins.length ? '<ul class="ins-list">' + ins.map((i) => '<li class="ins ' + i.sev + '"><span class="sevdot" title="' + sevLabel[i.sev] + '"></span><div><b>' + esc(i.title) + '</b><p>' + esc(i.detail) + '</p><p class="reco"><b>Recomendação:</b> ' + esc(i.reco) + '</p></div>' + H.go(i.goto, i.ref) + '</li>').join('') + '</ul>' : H.empty('Nenhum alerta para os filtros selecionados.');
    const decs = decisions.map((x) => { const days = C.daysBetween(asOf, x.due); return '<li class="dec"><div class="dec-h"><b>' + esc(x.id + ' · ' + x.title) + '</b>' + dueChip(days) + '</div><p class="muted small">Responsável: ' + esc(x.owner) + ' · prazo ' + esc(C.fmtDate(x.due)) + '</p><p><b>Recomendação:</b> ' + esc(x.recommendation) + '</p><p class="muted small">Por quê: ' + esc(x.why) + '</p>' + H.go(H.refView(x.link), linkRef(x.link)) + '</li>'; }).join('');
    const hz = [30, 60, 90].map((h) => '<div class="hz"><h3>Próximos ' + h + ' dias</h3><ul class="act-list">' + (mg.consultant.actions || []).filter((a) => a.horizon === h).map((a) => '<li><span class="chip ' + (a.status === 'Em andamento' ? 'st-g' : 'st-n') + '"><i></i>' + esc(a.status) + '</span><b>' + esc(a.title) + '</b><small class="muted">' + esc(a.owner) + '</small>' + H.go(H.refView(a.link), linkRef(a.link), 'Ver') + '</li>').join('') + '</ul></div>').join('');
    const pff = A.portfolioFinance(mg, vis, asOf), lastI = mg.series.months.length - 1;
    const okN = pf.counts.g, runN = pf.counts.g + pf.counts.a + pf.counts.r;
    const planDevRag = pff.planDev == null ? 'n' : pff.planDev < 0.9 ? 'a' : pff.planDev > 1.05 ? 'r' : 'g';
    const rings = '<section class="panel"><h2>Metas e saúde' + demoTag(state) + '</h2><p class="muted small">O marcador no anel indica a meta ou o plano.</p><div class="rings">' +
      (occ == null ? '' : X.ring({ pct: occ, value: C.fmtDec(occ, 0) + '%', label: 'Ocupação da rede', sub: 'meta ≤ 85%', rag: C.rag(occ, 85, 'min', 0.04), target: 85 })) +
      X.ring({ pct: pf.budget ? (pf.actual / pf.budget) * 100 : 0, value: C.fmtDec(pf.budget ? (pf.actual / pf.budget) * 100 : 0, 0) + '%', label: 'CAPEX realizado', sub: C.fmtMi(pf.actual) + ' de ' + C.fmtMi(pf.budget) + (pf.budget ? ' · plano ' + C.fmtDec((pff.planned / pf.budget) * 100, 0) + '%' : ''), rag: planDevRag === 'n' ? null : planDevRag, target: pf.budget ? (pff.planned / pf.budget) * 100 : null, aria: 'CAPEX realizado: ' + C.fmtDec(pf.budget ? (pf.actual / pf.budget) * 100 : 0, 0) + '% do orçamento; o plano previa ' + C.fmtDec(pf.budget ? (pff.planned / pf.budget) * 100 : 0, 0) + '% até a data' }) +
      X.ring({ pct: runN ? (okN / runN) * 100 : 0, value: okN + '/' + runN, label: 'Projetos no plano', sub: 'entre os em andamento' }) + '</div><p class="ring-note muted small"><span class="lgi"><i class="lgd g"></i>no plano</span><span class="lgi"><i class="lgd a"></i>atenção</span><span class="lgi"><i class="lgd r"></i>crítico</span></p></section>';
    const hasBud = mg.series.byTerminal[(mg.terminals[0] || {}).code] && mg.series.byTerminal[mg.terminals[0].code].opexBudget;
    let bars = '';
    if (hasBud) {
      const br = A.opexBridge(mg, vis, lastI), rows = br.rows;
      if (rows.length) bars = '<section class="panel"><h2>OPEX por terminal: orçado x realizado' + demoTag(state) + '</h2><p class="muted small">R$ mi, último mês. ▲ marca terminais acima de 3% do orçado. ' + H.go('kpis', 'opexAdherence', 'Ver a ponte do desvio') + '</p>' +
        X.bars({ labels: rows.map((r) => r.code), series: [{ name: 'Orçado', values: rows.map((r) => r.budget), cls: 's0' }, { name: 'Realizado', values: rows.map((r) => r.actual), cls: 's1' }], flags: rows.map((r) => (r.budget && r.actual / r.budget > 1.03 ? '▲ +' + C.fmtDec((r.actual / r.budget - 1) * 100, 0) + '%' : '')), fmt: (v) => C.fmtDec(v / 1e6, 1), w: 400, h: 300, fit: true, title: 'OPEX orçado e realizado por terminal no último mês' }) + '</section>';
    }
    const ups = A.upcoming(mg, asOf, vis, 7);
    const grp = (d) => (d <= 7 ? 'Esta semana' : d <= 31 ? 'Este mês' : 'Depois');
    let lastG = '';
    const dl = ups.length ? '<ul class="dl-list">' + ups.map((u) => { const g = grp(u.days), head = g !== lastG ? '<li class="dl-grp" role="presentation">' + g + '</li>' : ''; lastG = g; const view = H.refView(u.link); return head + '<li><button type="button" class="dl"' + H.navAttrs(view, /^(P\d|BC)/.test(u.link) ? u.link : null) + '><span class="dl-ic">' + H.icon(u.icon) + '</span><span class="dl-t"><b>' + esc(u.title) + '</b><small>' + esc(u.kind) + ' · ' + esc(C.fmtDate(u.date)) + '</small></span>' + H.rag(u.days <= 14 ? 'r' : u.days <= 30 ? 'a' : 'g', u.days === 0 ? 'hoje' : u.days + ' d') + '</button></li>'; }).join('') + '</ul>' : H.empty('Nenhum prazo nos próximos dias para o recorte.');
    const quick = [['network', 'pin', 'Mapa'], ['projects', 'folder', 'Projetos'], ['kpis', 'bars', 'KPIs'], ['business', 'calc', 'Casos']].map((q) => '<button type="button" class="qa" data-goto="' + q[0] + '">' + H.icon(q[1]) + '<span>' + q[2] + '</span></button>').join('');
    const rail = '<aside class="cons-rail" aria-label="Atalhos e próximos prazos"><section class="panel"><div class="who"><span class="avatar" aria-hidden="true">PI</span><div><b>Painel do consultor</b><small>Posição em ' + esc(C.fmtDate(asOf)) + '</small></div></div><div class="quick">' + quick + '</div></section>' +
      '<section class="panel"><h2>' + H.icon('calendar') + ' Próximos prazos' + demoTag(state) + '</h2>' + dl + '</section></aside>';
    return focus + '<div class="cons"><div class="cons-main"><div class="callout lead">' + H.icon('calendar') + ' Posição em <b>' + esc(C.fmtDate(asOf)) + '</b>' + demoTag(state) + '<span class="snapshot-note">Recomendações para discussão e validação do comitê.</span></div>' + cards +
      '<div class="grid two eq">' + rings + bars + '</div>' + (mg.series.defs.some((x) => x.tier === 1) ? kpiBoard(state, mg, vis) : '') +
      '<div class="grid two"><section class="panel"><h2>O que importa agora</h2>' + insHtml + '</section><section class="panel"><h2>Decisões necessárias</h2>' + (decs ? '<ul class="dec-list">' + decs + '</ul>' : H.empty('Nenhuma decisão vinculada ao recorte selecionado.')) + '</section></div>' +
      '<section class="panel" id="actionPlan"><h2>Plano de 30, 60 e 90 dias</h2><div class="grid three">' + hz + '</div></section></div>' + rail + '</div>';
  });

  /* ------------------------------------------------------------ Terminais */
  const DIMS = [['capacity', 'Capacidade'], ['flow', 'Fluxo'], ['assets', 'Ativos'], ['safety', 'Segurança'], ['systems', 'Sistemas'], ['coldchain', 'Cadeia fria']];

  function publicInventory(state, d) {
    const locs = H.visible(state, d), matrix = ['Área total e área útil por tipo de carga', 'Docas: quantidade, janelas e tempo de permanência', 'Câmaras frias e zonas de temperatura', 'Equipamentos e ativos de movimentação', 'Sistemas, rastreabilidade e dados', 'Segurança operacional e AVSEC', 'Fluxo: recebimento, triagem e expedição', 'Integração rodoviária e parceiros', 'Restrições aeroportuárias e de expansão'];
    return '<section class="panel"><h2>Inventário para diagnóstico</h2><div class="scroll"><table><thead><tr><th>Localidade</th><th>País</th><th>Papel público</th><th>Condição física</th><th>Score</th><th>Fontes</th></tr></thead><tbody>' +
      (locs.map((l) => '<tr><td><b>' + esc(l.code) + '</b><br><small class="muted">' + esc(l.name) + '</small></td><td>' + esc(l.country) + '</td><td>' + esc(l.role) + '</td><td><span class="chip">A validar em campo</span></td><td>' + H.scorePill(H.sc(l, d), d) + '</td><td>' + H.chips(l.sources, d) + '</td></tr>').join('') || '<tr><td colspan="6">' + H.empty('Nenhuma localidade para os filtros.') + '</td></tr>') +
      '</tbody></table></div></section><section class="panel"><h2>Matriz de verificação em campo</h2><p class="muted">Itens a levantar em cada terminal antes de qualquer decisão de investimento.</p><div class="grid three">' + matrix.map((m) => '<div class="metric">' + esc(m) + '</div>').join('') + '</div></section>' +
      H.notice(state, d, 'Saúde e indicadores operacionais dos terminais');
  }

  V.views.terminals = (state, d) => {
    const mg = H.mg(state, d);
    if (!mg) return publicInventory(state, d);
    const vis = H.codes(state, d), asOf = mg.meta.asOf, ts = mg.terminals.filter((t) => vis.has(t.code));
    if (!ts.length) return '<section class="panel">' + H.empty('Nenhum terminal para os filtros selecionados.') + '</section>';
    const sel = ts.find((t) => t.code === state.term) || ts[0], defs = mg.series.defs;
    const heat = '<section class="panel"><h2>Mapa de calor da saúde dos terminais' + demoTag(state) + '</h2><p class="muted small">Avaliação de 1 (crítico) a 5 (excelente) em seis dimensões. É o ponto de partida do diagnóstico em campo.</p><div class="scroll"><table class="heat"><thead><tr><th>Terminal</th>' + DIMS.map((x) => '<th>' + x[1] + '</th>').join('') + '<th>Saúde geral</th></tr></thead><tbody>' +
      ts.map((t) => { const h = A.health(t); return '<tr class="' + (t.code === sel.code ? 'sel' : '') + '"><td>' + H.btn('term', t.code, '<b>' + esc(t.code) + '</b>') + '<br><small class="muted">' + esc(H.tname(d, t.code)) + '</small></td>' + DIMS.map((x) => '<td class="hm st-' + h.cell(t.assessment[x[0]]) + '" title="' + esc(x[1]) + '">' + t.assessment[x[0]] + '</td>').join('') + '<td>' + H.rag(h.rag, C.fmtDec(h.avg, 1)) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    const cols = defs.filter((x) => x.tier === 1 && mg.series.byTerminal[ts[0].code][x.id]);
    const kt = '<section class="panel"><h2>Indicadores do último mês</h2><div class="scroll"><table><thead><tr><th>Terminal</th>' + cols.map((c) => '<th>' + esc(c.name) + ' <small>(' + esc(c.unit) + ')</small></th>').join('') + '</tr></thead><tbody>' +
      ts.map((t) => '<tr class="' + (t.code === sel.code ? 'sel' : '') + '"><td>' + H.btn('term', t.code, '<b>' + esc(t.code) + '</b>') + '</td>' + cols.map((c) => { const vals = mg.series.byTerminal[t.code][c.id], st = A.termStatus(mg, c, t.code); return '<td><span class="kv st-' + st.rag + '" title="' + (st.target != null ? 'Meta ' + esc(tgtTxt(c, st.target)) : 'Sem meta') + '">' + A.kfmt(c, st.value) + '</span> ' + X.spark(vals, { label: c.name + ' ' + t.code, cls: 'sp-' + st.rag, w: 60 }) + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div><p class="muted small">Cor = semáforo contra a meta do terminal. A linha mostra os últimos 12 meses. ' + H.go('kpis', null, 'Abrir o quadro executivo') + '</p></section>';
    const ficha = (t) => {
      const S = mg.series.byTerminal[t.code];
      return '<h3>KPIs de ' + esc(t.code) + ' (executivos primeiro)</h3><div class="scroll"><table class="ficha"><thead><tr><th>KPI</th><th>Último mês</th><th>Meta</th><th>Status</th><th>vs. 3 meses ant.</th><th>12 meses</th></tr></thead><tbody>' + GROUPS.map(([g, label]) => '<tr class="grp"><th colspan="6">' + label + '</th></tr>' + [...defs].filter((x) => x.group === g && S[x.id]).sort((x, y) => x.tier - y.tier).map((df) => { const st = A.termStatus(mg, df, t.code); return '<tr><td>' + H.btn('kpi', df.id, esc(df.name), 'linkish', ' data-goto="kpis"') + (df.tier === 1 ? ' <span class="tier">Executivo</span>' : '') + '</td><td><b>' + A.kfmt(df, st.value) + '</b> <small class="muted">' + esc(df.unit) + '</small></td><td>' + esc(tgtTxt(df, st.target)) + '</td><td>' + (df.dir === 'info' ? '<span class="muted">–</span>' : H.rag(st.rag)) + '</td><td>' + deltaHtml(df, st) + '</td><td>' + X.spark(S[df.id], { label: df.name + ' ' + t.code, cls: 'sp-' + st.rag, w: 70 }) + '</td></tr>'; }).join('')).join('') + '</tbody></table></div>';
    };
    const sr = mg.series.byTerminal[sel.code], labels = mg.series.months, xf = C.monthLabel;
    const ch = (title, o) => '<div class="panel mini-panel"><h3>' + esc(title) + '</h3>' + X.line(Object.assign({ labels, xfmt: xf, h: 240, w: 480, fit: true }, o)) + '</div>';
    const tp = mg.projects.filter((p) => p.terminal === sel.code), tr = mg.risks.filter((r) => r.terminal === sel.code);
    const season = sel.seasonal ? '<p class="note"><b>' + esc(sel.seasonal.label) + ':</b> início em ' + esc(C.fmtDate(sel.seasonal.start)) + '. O dimensionamento deve considerar o pico, não a média.</p>' : '';
    const drill = '<section class="panel"><div class="dhead"><div><h2>' + esc(sel.code) + ' · ' + esc(H.tname(d, sel.code)) + demoTag(state) + '</h2><p class="muted">' + C.fmtInt(sel.areaM2) + ' m² · ' + C.fmtInt(sel.capacityTMonth) + ' t/mês · ' + sel.docks + ' docas · ' + C.fmtInt(sel.coldRoomM2) + ' m² refrigerados</p></div>' + H.go('network', sel.code, 'Ver no mapa') + '</div>' + season +
      '<div class="grid two eq">' +
      ch('Ocupação da capacidade (%)', { series: [{ name: 'Ocupação', values: sr.occupancy, cls: 'c0', strong: true, bubble: true }], refs: [{ value: sel.targets.occupancy, label: 'Meta ' + sel.targets.occupancy + '%' }], fmt: (v) => C.fmtDec(v, 0) + '%', yMin: 50, yMax: 100, title: 'Ocupação mensal de ' + sel.code }) +
      ch('Volume processado x capacidade (t)', { series: [{ name: 'Volume', values: sr.throughput, cls: 'c1', strong: true, bubble: true }], refs: [{ value: sel.capacityTMonth, label: 'Capacidade' }], yMin: 0, title: 'Volume mensal de ' + sel.code }) +
      ch('Tempo de permanência (h)', { series: [{ name: 'Permanência', values: sr.dwell, cls: 'c2', strong: true, bubble: true }], refs: [{ value: sel.targets.dwell, label: 'Meta ' + sel.targets.dwell + ' h' }], fmt: (v) => C.fmtDec(v, 0), title: 'Tempo de permanência de ' + sel.code }) +
      ch('Custo por tonelada (R$)', { series: [{ name: 'Custo/t', values: sr.costPerT, cls: 'c3', strong: true, bubble: true }], refs: [{ value: sel.targets.costPerT, label: 'Meta R$ ' + sel.targets.costPerT }], title: 'Custo por tonelada de ' + sel.code }) +
      (sr.opexBudget ? ch('OPEX x orçamento (R$ mi)', { series: [{ name: 'OPEX realizado', values: sr.opex, cls: 'c3', strong: true, bubble: true }, { name: 'OPEX orçado', values: sr.opexBudget, cls: 'c1', dashed: true }], fmt: (v) => C.fmtDec(v / 1e6, 1), title: 'OPEX realizado e orçado de ' + sel.code }) : '') +
      (sr.margin ? ch('Margem de contribuição (%)', { series: [{ name: 'Margem', values: sr.margin, cls: 'c4', strong: true, bubble: true }], refs: sel.targets.margin != null ? [{ value: sel.targets.margin, label: 'Meta ' + C.fmtDec(sel.targets.margin, 0) + '%' }] : [], fmt: (v) => C.fmtDec(v, 0) + '%', title: 'Margem de contribuição de ' + sel.code }) : '') + '</div>' +
      ficha(sel) +
      '<div class="grid two eq"><div><h3>Projetos neste terminal</h3>' + (tp.length ? '<ul class="plain">' + tp.map((p) => { const s = A.projectStatus(p, asOf); return '<li>' + H.btn('proj', p.id, esc(p.id), 'linkish', ' data-goto="projects"') + ' ' + esc(p.name) + ' ' + H.rag(s.rag, s.label) + '</li>'; }).join('') + '</ul>' : '<p class="muted">Nenhum projeto.</p>') + '</div><div><h3>Riscos neste terminal</h3>' + (tr.length ? '<ul class="plain">' + tr.map((r) => '<li><b>' + esc(r.id) + '</b> ' + esc(r.title) + ' ' + H.rag(C.riskBand(C.riskScore(r.probability, r.impact)), String(C.riskScore(r.probability, r.impact))) + '</li>').join('') + '</ul>' : '<p class="muted">Nenhum risco registrado.</p>') + '</div></div></section>';
    return heat + kt + drill;
  };

  /* ------------------------------------------------------------ Projetos */
  function sortedStatus(projs, asOf) { return projs.map((p) => ({ p, s: A.projectStatus(p, asOf) })).sort((a, b) => ORDER[a.s.rag] - ORDER[b.s.rag] || a.p.id.localeCompare(b.p.id)); }

  function projectDetail(state, mg, asOf, d) {
    const p = mg.projects.find((x) => x.id === state.proj);
    if (!p) return '';
    const s = A.projectStatus(p, asOf), e = s.e, risks = mg.risks.filter((r) => r.projectId === p.id), bc = (mg.cases || []).filter((c) => c.projectId === p.id).map((c) => ({ c, ev: A.evalCase(c) }));
    const kv = (k, v) => '<div class="mini"><span class="label">' + esc(k) + '</span><b>' + v + '</b></div>';
    return '<section class="panel detail"><div class="dhead"><div><h2>' + esc(p.id + ' · ' + p.name) + '</h2><p class="muted">' + esc(p.terminal === 'REDE' ? 'Rede' : H.tname(d, p.terminal)) + ' · ' + esc(p.type) + ' · fase: ' + esc(p.phase) + ' · ' + esc(p.owner) + '</p></div><div>' + H.rag(s.rag, s.label) + ' ' + H.btn('proj', '', 'Fechar', 'linkish') + '</div></div>' +
      '<div class="mini-grid">' + kv('Início', esc(C.fmtDate(p.start))) + kv('Fim (linha de base)', esc(C.fmtDate(p.endBaseline))) + kv('Fim previsto', esc(C.fmtDate(p.endForecast)) + (e.delayDays ? ' <small>(+' + e.delayDays + ' d)</small>' : '')) + kv('Avanço físico / planejado', C.fmtDec(p.progress, 0) + '% / ' + C.fmtDec(e.pp * 100, 0) + '%') +
      kv('Orçamento (BAC)', C.fmtMi(p.budget)) + kv('Realizado (AC)', C.fmtMi(p.capexActual)) + kv('Valor agregado (EV)', C.fmtMi(e.ev)) + kv('Previsão no término (EAC)', C.fmtMi(e.eac) + ' <small>(' + (e.vacPct >= 0 ? '+' : '') + C.fmtDec(e.vacPct * 100, 1) + '%)</small>') +
      kv('SPI', e.spi == null ? '–' : C.fmtDec(e.spi, 2)) + kv('CPI', e.cpi == null ? '–' : C.fmtDec(e.cpi, 2)) + kv('Impacto / esforço', p.impact + ' / ' + p.effort) + kv('Benefício esperado', esc(p.benefit)) + '</div>' +
      '<div class="grid two"><div><h3>Riscos vinculados</h3>' + (risks.length ? '<ul class="plain">' + risks.map((r) => '<li><b>' + esc(r.id) + '</b> ' + esc(r.title) + ' ' + H.rag(C.riskBand(C.riskScore(r.probability, r.impact)), String(C.riskScore(r.probability, r.impact))) + '</li>').join('') + '</ul>' : '<p class="muted">Nenhum.</p>') + '</div><div><h3>Business case</h3>' + (bc.length ? '<ul class="plain">' + bc.map((x) => '<li>' + H.btn('caseId', x.c.id, esc(x.c.id), 'linkish', ' data-goto="business"') + ' VPL ' + esc(C.fmtMi(x.ev.npv)) + ' ' + H.rag(x.ev.verdict.rag, x.ev.verdict.label) + '</li>').join('') + '</ul>' : '<p class="muted">Sem caso vinculado.</p>') + '</div></div></section>';
  }

  V.views.projects = (state, d) => {
    const mg = H.mg(state, d), marcos = '<section class="panel"><h2>Marcos públicos de infraestrutura e malha</h2><p class="muted small">Fatos divulgados oficialmente, independentes do modo de dados.</p>' + H.initiativesTable(d.initiatives, d) + '</section>';
    if (!mg) return H.notice(state, d, 'Portfólio de projetos, valor agregado e curva S') + marcos;
    const vis = H.codes(state, d), inV = H.inVis(vis), asOf = mg.meta.asOf, projs = mg.projects.filter((p) => inV(p.terminal));
    if (!projs.length) return '<section class="panel">' + H.empty('Nenhum projeto para os filtros selecionados.') + '</section>' + marcos;
    const pf = A.portfolio(projs, asOf), st = sortedStatus(projs, asOf), labels = tlLabels(mg.meta), asIdx = mg.meta.timeline.asOfIdx;
    const idx = (v) => (v == null ? '–' : C.fmtDec(v, 2)), idxRag = (v) => (v == null ? 'n' : v >= 0.95 ? 'g' : v >= 0.85 ? 'a' : 'r');
    const strip = '<div class="grid cards">' + H.stat('Orçamento (BAC)', C.fmtMi(pf.budget), pf.n + ' projetos') + H.stat('Realizado (AC)', C.fmtMi(pf.actual), C.fmtDec(pf.budget ? (pf.actual / pf.budget) * 100 : 0, 0) + '% do BAC') +
      H.stat('Previsão (EAC)', C.fmtMi(pf.eac), (pf.eac - pf.budget > 0 ? '+' : '') + C.fmtMi(pf.eac - pf.budget) + ' vs BAC') + H.stat('SPI / CPI', '<span class="st-txt st-' + idxRag(pf.spi) + '">' + idx(pf.spi) + '</span> / <span class="st-txt st-' + idxRag(pf.cpi) + '">' + idx(pf.cpi) + '</span>', 'prazo / custo') + '</div>';
    const rows = st.map(({ p, s }) => { const e = s.e; return '<tr class="' + (state.proj === p.id ? 'sel' : '') + '"><td>' + H.btn('proj', p.id, '<b>' + esc(p.id) + '</b> ' + esc(p.name)) + '</td><td>' + esc(p.terminal) + '</td><td>' + esc(p.phase) + '</td><td>' + H.bar(p.progress, s.rag) + ' ' + C.fmtDec(p.progress, 0) + '%<br><small class="muted">plan. ' + C.fmtDec(e.pp * 100, 0) + '%</small></td><td>' + idx(e.spi) + '</td><td>' + idx(e.cpi) + '</td><td>' + esc(C.fmtMi(p.budget)) + '</td><td>' + esc(C.fmtMi(e.eac)) + (e.started && !e.done ? '<br><small class="' + (e.vacPct > 0.05 ? 'neg' : 'muted') + '">' + (e.vacPct >= 0 ? '+' : '') + C.fmtDec(e.vacPct * 100, 0) + '%</small>' : '') + '</td><td>' + esc(C.fmtDate(p.endForecast)) + (e.delayDays ? '<br><small class="neg">+' + e.delayDays + ' d</small>' : '') + '</td><td>' + H.rag(s.rag, s.label) + '</td></tr>'; }).join('');
    const table = '<section class="panel"><h2>Status do portfólio' + demoTag(state) + '</h2><div class="scroll"><table><thead><tr><th>Projeto</th><th>Local</th><th>Fase</th><th>Avanço</th><th>SPI</th><th>CPI</th><th>Orçamento</th><th>EAC</th><th>Fim previsto</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
    const gantt = '<section class="panel"><h2>Cronograma</h2>' + X.gantt({ from: mg.meta.timeline.start + '-01', to: lastDay(labels[labels.length - 1]), today: asOf, items: st.map(({ p, s }) => ({ id: p.id, name: p.name, start: p.start, endB: p.endBaseline, endF: p.endForecast, pct: p.progress, rag: s.rag === 'n' ? 'g' : s.rag, started: s.e.started })), title: 'Cronograma dos projetos com semáforo' }) + '</section>';
    const sc = A.scurve(projs, labels.length, asIdx);
    const curve = '<section class="panel"><h2>Curva S de CAPEX (acumulado, R$ mi)</h2>' + X.line({ labels, xfmt: C.monthLabel, h: 300, w: 600, fit: true, yMin: 0, fmt: (v) => C.fmtDec(v / 1e6, 0), shadeFrom: asIdx + 1, markIdx: asIdx, series: [{ name: 'Planejado', values: sc.planned, cls: 'c1', dashed: true }, { name: 'Realizado', values: sc.actual, cls: 'c0', strong: true }, { name: 'Previsão (EAC)', values: sc.forecast, cls: 'c2', dashed: true }], refs: [{ value: pf.budget, label: 'Orçamento (BAC)', align: 'left' }], endLabels: [1], title: 'Curva S de CAPEX do portfólio' }) + '</section>';
    const pts = st.filter((x) => !x.s.e.done).map(({ p, s }) => ({ id: p.id, x: p.effort, y: p.impact, r: p.budget, rag: s.rag, label: p.id + ' · ' + p.name + ' — impacto ' + p.impact + ', esforço ' + p.effort + ', ' + C.fmtMi(p.budget) }));
    const matrix = '<section class="panel"><h2>Priorização: impacto x esforço</h2>' + X.bubble({ points: pts, title: 'Matriz impacto x esforço dos projetos' }) + '</section>';
    const types = {}; projs.forEach((p) => { const t = (types[p.type] = types[p.type] || { b: 0, a: 0 }); t.b += p.budget; t.a += p.capexActual; });
    const maxB = Math.max.apply(null, Object.values(types).map((t) => t.b));
    const byType = '<section class="panel"><h2>CAPEX por tipo de iniciativa</h2>' + Object.keys(types).sort((a, b) => types[b].b - types[a].b).map((k) => '<div class="tbar"><span>' + esc(k) + '</span><span class="stack"><i class="bg" style="width:' + (types[k].b / maxB) * 100 + '%"><i class="fg" style="width:' + (types[k].b ? (types[k].a / types[k].b) * 100 : 0) + '%"></i></i></span><small>' + esc(C.fmtMi(types[k].a)) + ' de ' + esc(C.fmtMi(types[k].b)) + '</small></div>').join('') + '<p class="muted small">Barra clara = orçamento; barra escura = realizado.</p></section>';
    return strip + table + projectDetail(state, mg, asOf, d) + gantt + '<div class="grid two eq">' + curve + matrix + '</div>' + byType + marcos;
  };

  /* ------------------------------------------------------------ Indicadores */
  const KPI_MODEL = [
    ['Financeiro', 'Contribuição e margem, custo por tonelada, receita por tonelada, OPEX e aderência ao orçamento, CAPEX realizado x planejado, retorno dos investimentos (VPL, TIR, payback)'],
    ['Operacional', 'Ocupação, volume, produtividade (kg por hora-homem), permanência, nível de serviço, utilização de docas, giro de caminhão, avarias, cargas fora da faixa de temperatura, rastreabilidade, incidentes'],
    ['Projetos', 'Avanço físico e financeiro, SPI e CPI, CAPEX realizado x planejado, previsão no término (EAC), desvios'],
    ['Infraestrutura', 'Condição dos ativos, backlog de melhorias, capacidade instalada, disponibilidade de equipamentos']];
  const modelPanel = () => '<section class="panel"><h2>Modelo de KPIs para medição interna</h2><p class="muted">Sem valores: só devem ser preenchidos com dados autorizados, com definição, fórmula, responsável e periodicidade (ver o dicionário de dados).</p><div class="grid two">' + KPI_MODEL.map((g) => '<div class="metric"><b>' + esc(g[0]) + '</b><p>' + esc(g[1]) + '</p></div>').join('') + '</div></section>';

  const TAB_LABEL = { exec: 'Executivo', financial: 'Financeiros', operational: 'Operacionais' };
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const wrapExec = (mg, vis) => A.execRows(mg, vis);

  function kpiCardsBoard(state, mg, vis, grp, selId) {
    const defs = [...mg.series.defs.filter((x) => x.group === grp)].sort((a, b) => a.tier - b.tier);
    return '<div class="kgrid">' + defs.map((df) => {
      const ns = A.networkStatus(mg, df, vis); if (!ns) return '';
      return '<button type="button" class="kcard' + (df.id === selId ? ' on' : '') + '" data-set="kpi" data-val="' + esc(df.id) + '" aria-pressed="' + (df.id === selId) + '"><span class="kc-top"><span class="kc-name">' + esc(df.name) + '</span>' + (df.dir === 'info' ? '' : '<span class="rdot st-' + ns.rag + '" role="img" aria-label="Status: ' + esc(H.RAGL[ns.rag]) + '" title="' + esc(H.RAGL[ns.rag]) + '"></span>') + '</span>' + (df.tier === 1 ? '<span class="tier">Executivo</span>' : '') + '<span class="kc-val">' + esc(A.kfmt(df, ns.value)) + ' <small>' + esc(df.unit) + '</small></span><span class="kc-sub">' + (ns.target != null ? 'meta ' + esc(tgtTxt(df, ns.target)) + ' · ' : '') + deltaHtml(df, ns) + '</span>' + X.spark(ns.series, { label: df.name + ' (rede)', cls: 'sp-' + ns.rag, w: 120, h: 28 }) + '</button>';
    }).join('') + '</div>';
  }

  function driverChips(mg, vis, df) {
    const chips = (df.drivers || []).map((id) => A.defById(mg, id)).filter(Boolean).map((dd) => { const ns = A.networkStatus(mg, dd, vis); if (!ns) return ''; return '<button type="button" class="chip drv st-' + ns.rag + '" data-set="kpi" data-val="' + esc(dd.id) + '" title="Abrir ' + esc(dd.name) + '"><i></i>' + esc(dd.name) + ' <small>' + esc(A.kfmt(dd, ns.value)) + ' ' + esc(dd.unit) + '</small></button>'; }).join('');
    return chips ? '<div class="drv-box"><b>O que move este KPI</b> <small class="muted">(relação analítica a validar com a operação; cor = status atual na rede)</small><div class="chips">' + chips + '</div></div>' : '';
  }

  function kpiDetail(state, mg, vis, ts, df) {
    const labels = mg.series.months, net = A.networkStatus(mg, df, vis), same = df.targetKey ? [...new Set(ts.map((t) => t.targets[df.targetKey]))] : [];
    const zero = df.dir === 'info' || ['incidents', 'damage', 'tempExc'].includes(df.id);
    const dirTxt = df.dir === 'min' ? 'quanto menor, melhor' : df.dir === 'max' ? 'quanto maior, melhor' : 'informativo (sem meta)';
    const head = '<div class="dhead"><div><h2>' + esc(df.name) + ' <span class="chip">' + esc(df.group === 'financial' ? 'Financeiro' : 'Operacional') + '</span> <span class="chip ' + (df.tier === 1 ? 'ok-c' : '') + '">' + (df.tier === 1 ? 'Executivo' : 'Apoio') + '</span>' + demoTag(state) + '</h2><p class="muted">' + esc(df.definition) + '</p></div></div>' +
      (df.why ? '<p class="why"><b>Por que importa:</b> ' + esc(df.why) + '</p>' : '') +
      '<p class="formula"><b>Fórmula:</b> ' + esc(df.formula) + '</p><div class="mini-grid"><div class="mini"><span class="label">Leitura</span><b>' + esc(dirTxt) + '</b></div><div class="mini"><span class="label">Responsável</span><b>' + esc(df.owner) + '</b></div><div class="mini"><span class="label">Periodicidade</span><b>' + esc(df.frequency) + '</b></div></div>' + driverChips(mg, vis, df);
    const lineSeries = df.targetSeries && net
      ? [{ name: 'Realizado (rede)', values: net.series, cls: 'c0', strong: true }, { name: 'Orçado (rede)', values: A.networkTargetSeries(mg, df, vis), cls: 'c1', dashed: true }]
      : ts.map((t) => ({ name: t.code, values: mg.series.byTerminal[t.code][df.id], cls: 'c' + (mg.terminals.indexOf(t) % 7), strong: t.code === state.term }));
    const chart = X.line({ labels, xfmt: C.monthLabel, h: 300, yMin: zero ? 0 : undefined, fmt: (v) => A.kfmt(df, v), refs: same.length === 1 ? [{ value: same[0], label: 'Meta ' + tgtTxt(df, same[0]) }] : [], title: df.name + (df.targetSeries ? ' da rede' : ' por terminal'), series: lineSeries });
    const row = (label, vals, st, strong) => '<tr class="' + (strong ? 'net' : '') + '"><td>' + label + '</td><td><b>' + A.kfmt(df, st.value) + '</b> <small class="muted">' + esc(df.unit) + '</small></td><td>' + esc(tgtTxt(df, st.target)) + '</td><td>' + (df.dir === 'info' ? '<span class="muted">–</span>' : H.rag(st.rag)) + '</td><td>' + deltaHtml(df, st) + '</td><td>' + (st.streak ? plural(st.streak, 'mês', 'meses') : '<span class="muted">–</span>') + '</td><td>' + X.spark(vals, { label: df.name, cls: 'sp-' + st.rag }) + '</td></tr>';
    const rows = (net ? row('<b>Rede (recorte)</b>', net.series, net, true) : '') + ts.map((t) => { const st = A.termStatus(mg, df, t.code); return row(H.btn('term', t.code, '<b>' + esc(t.code) + '</b>') + ' <small class="muted">' + esc(H.tname(state.d, t.code)) + '</small>', st.values, st, false); }).join('');
    const table = '<div class="scroll"><table><thead><tr><th>Terminal</th><th>Último mês</th><th>Meta</th><th>Status</th><th>vs. 3 meses anteriores</th><th>Fora da meta há</th><th>12 meses</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    let extra = '';
    if (['opexAdherence', 'opex'].includes(df.id) && mg.series.byTerminal[ts[0].code].volumeBudget) {
      const br = A.opexBridge(mg, vis, labels.length - 1), tone = (v) => (v > 0 ? 'neg' : v < 0 ? 'pos' : '');
      extra = '<h3>De onde vem o desvio de OPEX no último mês (R$ mil)</h3><p class="muted small">Desvio = realizado − orçado. O <b>efeito volume</b> é custo variável de movimentar mais ou menos carga que o orçado; o <b>efeito custo unitário</b> é pagar mais ou menos por tonelada que a meta. Só o segundo é ineficiência ou preço.</p><div class="grid two eq"><div>' +
        X.waterfall({ w: 480, fit: true, invert: true, steps: [{ label: 'Efeito volume', value: br.volume }, { label: 'Efeito custo unitário', value: br.rate }], totalLabel: 'Desvio total', fmt: milFmt, title: 'Ponte do desvio de OPEX' }) + '</div><div class="scroll"><table><thead><tr><th>Terminal</th><th>Orçado</th><th>Realizado</th><th>Desvio</th><th>Efeito volume</th><th>Efeito custo unit.</th></tr></thead><tbody>' +
        br.rows.map((r) => '<tr><td><b>' + esc(r.code) + '</b></td><td>' + milFmt(r.budget) + '</td><td>' + milFmt(r.actual) + '</td><td class="' + tone(r.total) + '">' + milFmt(r.total) + '</td><td class="' + tone(r.volume) + '">' + milFmt(r.volume) + '</td><td class="' + tone(r.rate) + '">' + milFmt(r.rate) + '</td></tr>').join('') + '<tr class="net"><td><b>Total</b></td><td>' + milFmt(br.budget) + '</td><td>' + milFmt(br.actual) + '</td><td class="' + tone(br.total) + '">' + milFmt(br.total) + '</td><td class="' + tone(br.volume) + '">' + milFmt(br.volume) + '</td><td class="' + tone(br.rate) + '">' + milFmt(br.rate) + '</td></tr></tbody></table></div></div>';
    }
    if (df.id === 'contribution' && A.hasContribution(mg, vis)) extra = contributionPanel(mg, vis, true);
    return '<section class="panel">' + head + chart + table + extra + '</section>';
  }

  /* Contribuicao real x orcada: volume, preco (receita por tonelada) e custo por tonelada. */
  function contributionPanel(mg, vis, inner) {
    const br = A.contributionBridge(mg, vis, mg.series.months.length - 1), tone = (v) => (v < 0 ? 'neg' : v > 0 ? 'pos' : '');
    const body = '<h3>' + (inner ? 'De onde vem o desvio de contribuição' : 'Contribuição frente ao orçado: volume, preço e custo') + ' no último mês (R$ mil)</h3><p class="muted small">Desvio = realizado − orçado, decomposto sem sobra. <b>Volume</b>: mais ou menos carga que o orçado, valorada à margem unitária da meta. <b>Receita por tonelada</b>: preço médio acima ou abaixo da meta. <b>Custo por tonelada</b>: custo acima da meta reduz a contribuição. Positivo = ajuda o resultado.</p><div class="grid two eq"><div>' +
      X.waterfall({ w: 480, fit: true, steps: [{ label: 'Volume', value: br.volume }, { label: 'Receita por tonelada', value: br.price }, { label: 'Custo por tonelada', value: br.cost }], totalLabel: 'Desvio na contribuição', fmt: milFmt, title: 'Ponte do desvio de contribuição' }) +
      '</div><div class="scroll"><table><thead><tr><th>Terminal</th><th>Orçada</th><th>Realizada</th><th>Desvio</th><th>Volume</th><th>Receita/t</th><th>Custo/t</th></tr></thead><tbody>' +
      br.rows.map((r) => '<tr><td><b>' + esc(r.code) + '</b></td><td>' + milFmt(r.budget) + '</td><td>' + milFmt(r.actual) + '</td><td class="' + tone(r.total) + '">' + milFmt(r.total) + '</td><td class="' + tone(r.volume) + '">' + milFmt(r.volume) + '</td><td class="' + tone(r.price) + '">' + milFmt(r.price) + '</td><td class="' + tone(r.cost) + '">' + milFmt(r.cost) + '</td></tr>').join('') +
      '<tr class="net"><td><b>Total</b></td><td>' + milFmt(br.budget) + '</td><td>' + milFmt(br.actual) + '</td><td class="' + tone(br.total) + '">' + milFmt(br.total) + '</td><td class="' + tone(br.volume) + '">' + milFmt(br.volume) + '</td><td class="' + tone(br.price) + '">' + milFmt(br.price) + '</td><td class="' + tone(br.cost) + '">' + milFmt(br.cost) + '</td></tr></tbody></table></div></div>';
    return inner ? body : '<section class="panel">' + body + '</section>';
  }

  function portfolioFinancePanel(state, mg, vis, asOf) {
    const f = A.portfolioFinance(mg, vis, asOf), devRag = f.planDev == null ? 'n' : f.planDev < 0.9 ? 'a' : f.planDev > 1.05 ? 'r' : 'g', eacRag = f.eacDev == null ? 'n' : f.eacDev > 1.05 ? 'r' : f.eacDev > 1 ? 'a' : 'g';
    return '<section class="panel"><h2>Financeiro do portfólio de projetos' + demoTag(state) + '</h2><div class="grid cards">' +
      H.stat('CAPEX realizado x planejado', f.planDev == null ? '–' : C.fmtDec(f.planDev * 100, 0) + '%', C.fmtMi(f.actual) + ' de ' + C.fmtMi(f.planned) + ' até a data ' + H.rag(devRag, devRag === 'a' ? 'abaixo do plano' : devRag === 'r' ? 'acima do plano' : 'no plano')) +
      H.stat('Previsão (EAC) x orçamento', f.eacDev == null ? '–' : C.fmtDec(f.eacDev * 100, 1) + '%', C.fmtMi(f.eac) + ' vs ' + C.fmtMi(f.bac) + ' ' + H.rag(eacRag, eacRag === 'g' ? 'dentro do orçamento' : 'acima do orçamento')) +
      H.stat('VPL dos casos recomendados', C.fmtMi(f.npvRec), f.nRec + ' caso(s) · CAPEX de ' + C.fmtMi(f.capexRec)) +
      H.stat('Índice de rentabilidade', f.pi == null ? '–' : C.fmtDec(f.pi, 2), 'VPL ÷ CAPEX dos casos recomendados') + '</div><p class="muted small">CAPEX realizado abaixo do plano pode indicar atraso na execução, e não economia: leia junto com o SPI na tela de projetos. ' + H.go('projects', null, 'Ver projetos') + ' &nbsp;·&nbsp; ' + H.go('business', null, 'Ver business cases') + '</p></section>';
  }

  function kpiDictionary(mg) {
    return '<section class="panel"><h2>Dicionário de KPIs</h2><p class="muted small">Cada KPI tem nível (executivo ou apoio), definição, motivo, fórmula, responsável e periodicidade. A mesma estrutura vale para os dados internos.</p><div class="scroll"><table><thead><tr><th>KPI</th><th>Nível</th><th>Grupo</th><th>Definição</th><th>Por que importa</th><th>Fórmula</th><th>Unidade</th><th>Direção</th><th>Responsável</th></tr></thead><tbody>' +
      [...mg.series.defs].sort((a, b) => a.tier - b.tier).map((x) => '<tr><td><b>' + esc(x.name) + '</b></td><td>' + (x.tier === 1 ? 'Executivo' : 'Apoio') + '</td><td>' + (x.group === 'financial' ? 'Financeiro' : 'Operacional') + '</td><td>' + esc(x.definition) + '</td><td>' + esc(x.why || '') + '</td><td>' + esc(x.formula) + '</td><td>' + esc(x.unit) + '</td><td>' + (x.dir === 'min' ? 'menor é melhor' : x.dir === 'max' ? 'maior é melhor' : 'informativo') + '</td><td>' + esc(x.owner) + '</td></tr>').join('') + '</tbody></table></div></section>';
  }

  /* ---- aba Executivo ---- */
  function execLead(state, mg, vis) {
    const lines = A.execSummary(mg, vis);
    return '<section class="panel"><h2>Leitura executiva' + demoTag(state) + '</h2>' + (lines.length ? '<ul class="ins-list">' + lines.map((l) => '<li class="ins ' + (l.tone === 'g' ? 'i' : l.tone) + '"><span class="sevdot"></span><div class="lead-txt">' + esc(l.text) + '</div></li>').join('') + '</ul>' : H.empty('Sem dados para o recorte.')) + '<p class="muted small">Frases calculadas dos dados pelas regras do repositório; são o ponto de partida da conversa, não uma conclusão.</p></section>';
  }
  function execScorecard(state, mg, rows) {
    let last = null;
    const body = rows.map((r) => {
      const df = r.def, ns = r.net; if (!ns) return '';
      const eff = r.effect == null ? '<span class="muted">–</span>' : '<span class="' + (r.effect < 0 ? 'neg' : 'pos') + '">' + milFmt(r.effect) + '</span>';
      const worst = r.worst ? H.btn('term', r.worst.code, '<b>' + esc(r.worst.code) + '</b>', 'linkish', ' data-goto="terminals"') + ' <small class="muted">' + esc(A.kfmt(df, r.worst.value)) + '</small>' : '<span class="muted">–</span>';
      const terms = '<span class="cnt st-r" title="Vermelhos">' + r.nRed + '</span><span class="cnt st-a" title="Atenção">' + r.nAmber + '</span><span class="cnt st-g" title="Na meta">' + (r.nT - r.nRed - r.nAmber) + '</span>';
      const first = df.pillar !== last; last = df.pillar;
      return '<tr class="' + (first ? 'pgrp' : '') + '"><td class="pillar">' + (first ? esc(df.pillar || '') : '') + '</td><td>' + H.btn('kpi', df.id, '<b>' + esc(df.name) + '</b>', 'linkish', ' data-goto="kpis"') + '<br><small class="muted">' + esc(df.owner) + '</small></td><td class="nw"><b>' + esc(A.kfmt(df, ns.value)) + '</b> <small class="muted">' + esc(df.unit) + '</small></td><td class="nw">' + esc(tgtTxt(df, ns.target)) + '</td><td>' + H.rag(ns.rag) + (r.masked ? '<br><small class="maskwarn">média esconde terminais no vermelho</small>' : '') + '</td><td class="nw">' + deltaHtml(df, ns) + '</td><td class="nw">' + (ns.streak ? plural(ns.streak, 'mês', 'meses') : '<span class="muted">–</span>') + '</td><td class="nw">' + terms + '</td><td class="nw">' + worst + '</td><td class="nw">' + eff + '</td></tr>';
    }).join('');
    return '<section class="panel"><h2>Quadro de KPIs executivos' + demoTag(state) + '</h2><p class="muted small">Oito indicadores respondem às perguntas da gestão: o resultado está saindo? O custo está sob controle? Há capacidade? O cliente está bem servido? A carga está protegida? A operação é segura? Os demais KPIs explicam o que está por trás.</p><div class="scroll"><table class="exec"><thead><tr><th>Pilar</th><th>KPI</th><th>Rede</th><th>Meta</th><th>Status</th><th>vs. 3 meses</th><th>Fora da meta há</th><th>Terminais</th><th>Pior terminal</th><th class="wrapth">Efeito na contribuição<br><small>R$ mil/mês</small></th></tr></thead><tbody>' + body + '</tbody></table></div><div class="legend-row"><span class="muted small">Coluna Terminais:</span><span class="lg"><span class="cnt st-r">V</span>vermelho</span><span class="lg"><span class="cnt st-a">A</span>atenção</span><span class="lg"><span class="cnt st-g">OK</span>na meta</span></div></section>';
  }
  function execHeatmap(state, mg, vis, rows) {
    const ts = A.selTerminals(mg, vis), valid = rows.filter((r) => r.net);
    const head = '<tr><th>Terminal</th>' + valid.map((r) => '<th>' + esc(r.def.name) + '<br><small>' + esc(r.def.unit) + '</small></th>').join('') + '</tr>';
    const GLYPH = { r: '▲', a: '◆', g: '', n: '' };
    const cell = (df, st, label) => { const txt = label + ', ' + df.name + ': ' + A.kfmt(df, st.value) + ' ' + df.unit + ', ' + H.RAGL[st.rag]; return '<td class="hm st-' + st.rag + '"><button type="button" class="hmb" data-goto="kpis" data-set="kpi" data-val="' + esc(df.id) + '" aria-label="' + esc(txt) + '" title="' + esc(txt) + '">' + (GLYPH[st.rag] ? '<span class="hmg" aria-hidden="true">' + GLYPH[st.rag] + '</span>' : '') + esc(A.kfmt(df, st.value)) + '</button></td>'; };
    const body = '<tr class="net"><td><b>Rede</b></td>' + valid.map((r) => cell(r.def, r.net, 'Rede')).join('') + '</tr>' + ts.map((t) => '<tr><td>' + H.btn('term', t.code, '<b>' + esc(t.code) + '</b>', 'linkish', ' data-goto="terminals"') + '</td>' + valid.map((r) => cell(r.def, r.terms.find((x) => x.code === t.code), t.code)).join('') + '</tr>').join('');
    return '<section class="panel"><h2>Mapa de calor: terminal × KPI executivo' + demoTag(state) + '</h2><p class="muted small">Cada célula é o último mês contra a meta do terminal. Mostra o que a média da rede esconde. Clique para abrir o KPI.</p><div class="scroll"><table class="heat exec-heat"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div><div class="legend-row"><span class="lg"><i class="sw rag-g"></i>Na meta</span><span class="lg"><i class="sw rag-a"></i>◆ Atenção (dentro da tolerância)</span><span class="lg"><i class="sw rag-r"></i>▲ Vermelho</span><span class="muted small">Os símbolos reforçam a cor.</span></div></section>';
  }
  function execNotes(mg, vis) {
    const seas = A.selTerminals(mg, vis).filter((t) => t.seasonal).map((t) => t.code + ' (' + t.seasonal.label.toLowerCase() + ')');
    const li = [
      'Semáforo: verde atinge a meta; âmbar fica dentro da tolerância do KPI; vermelho vai além. As tolerâncias estão no dicionário.',
      'A rede é consolidada (somas e razões recalculadas). Por isso pode estar verde com terminais vermelhos; use as colunas de terminais e o mapa de calor.',
      'A variação compara o último mês com a média dos 3 anteriores e <b>não é ajustada à sazonalidade</b>' + (seas.length ? ' (temporadas no recorte: ' + esc(seas.join(', ')) + ')' : '') + '. Só há 12 meses de série, então não há comparação com o mesmo mês do ano anterior.',
      'As metas de margem e de contribuição são derivadas das metas de receita e custo por tonelada, para que os três indicadores contem a mesma história.',
      'O efeito em R$ só aparece onde há identidade contábil (contribuição e custo por tonelada). Para os demais KPIs não há base para converter em reais, e o campo fica em branco de propósito.',
      'Receita é <b>alocada</b> por regra com Finanças; a LATAM Cargo não divulga receita por terminal.'];
    return '<section class="panel"><h2>Como ler este quadro</h2><ul class="notes">' + li.map((x) => '<li>' + x + '</li>').join('') + '</ul></section>';
  }

  V.views.kpis = (state, d) => {
    const mg = H.mg(state, d), pubCards = '<details class="panel pubkpi"' + (mg ? '' : ' open') + '><summary><h2>Indicadores públicos da rede (fatos divulgados)</h2></summary>' + H.kpiCards(d) + '</details>';
    if (!mg) return pubCards + modelPanel() + H.notice(state, d, 'Painel de KPIs financeiros e operacionais');
    const vis = H.codes(state, d), ts = A.selTerminals(mg, vis), defs = mg.series.defs;
    if (!ts.length) return '<section class="panel">' + H.empty('Nenhum terminal para os filtros selecionados.') + '</section>' + pubCards;
    const cnt = { exec: A.tierDefs(mg, 1).length, financial: defs.filter((x) => x.group === 'financial').length, operational: defs.filter((x) => x.group === 'operational').length };
    const hasExec = cnt.exec > 0, kv = ['exec', 'financial', 'operational'].includes(state.kv) && (hasExec || state.kv !== 'exec') ? state.kv : hasExec ? 'exec' : 'financial';   // sem KPI de nivel 1 (formato antigo), a aba executiva nao existe
    const tabs = '<div class="chips tabs" role="group" aria-label="Visão dos KPIs">' + ['exec', 'financial', 'operational'].filter((k) => k !== 'exec' || hasExec).map((k) => '<button type="button" class="chip toggle neutral' + (k === kv ? ' on' : '') + '" data-set="kv" data-val="' + k + '" aria-pressed="' + (k === kv) + '">' + TAB_LABEL[k] + ' <small>(' + cnt[k] + ')</small></button>').join('') + '</div>';
    const st = Object.assign({}, state, { d });
    if (kv === 'exec') {
      const rows = wrapExec(mg, vis), supp = defs.length - cnt.exec;
      return '<section class="panel tabs-panel"><div class="dhead"><h2>KPIs da rede</h2></div>' + tabs + '</section>' + execLead(st, mg, vis) + execScorecard(st, mg, rows) + execHeatmap(st, mg, vis, rows) + (A.hasContribution(mg, vis) ? contributionPanel(mg, vis, false) : '') + execNotes(mg, vis) +
        '<section class="panel tight"><p class="muted small">Há ainda <b>' + supp + ' KPIs de apoio</b> que explicam o que move os executivos (ex.: produtividade, permanência, docas, OPEX frente ao orçamento). ' + H.btn('kv', 'financial', 'Ver financeiros', 'linkish') + ' &nbsp;·&nbsp; ' + H.btn('kv', 'operational', 'Ver operacionais', 'linkish') + '</p></section>' + pubCards;
    }
    const inGroup = defs.filter((x) => x.group === kv), df = inGroup.find((x) => x.id === state.kpi) || [...inGroup].sort((a, b) => a.tier - b.tier)[0];
    const board = '<section class="panel"><h2>KPIs ' + esc(TAB_LABEL[kv].toLowerCase()) + demoTag(st) + '</h2><p class="muted small">Rede no último mês, consolidada dos terminais do recorte (somas e razões recalculadas). Os cartões marcados como <b>Executivo</b> compõem o quadro executivo; os demais explicam o que os move. Clique para ver o detalhe por terminal.</p>' + tabs + kpiCardsBoard(st, mg, vis, kv, df.id) + '</section>';
    return board + kpiDetail(st, mg, vis, ts, df) + (kv === 'financial' ? portfolioFinancePanel(st, mg, vis, mg.meta.asOf) : '') + kpiDictionary(mg) + modelPanel() + pubCards;
  };

  /* ------------------------------------------------------------ Business case */
  const DEF = { capex: 10000000, benefit: 3000000, opex: 500000, years: 10, rate: 12, benefitGrowth: 3, opexGrowth: 3, residual: 0 };
  const FIELDS = [['capex', 'CAPEX inicial (R$)', 'Investimento no ano 0'], ['benefit', 'Benefício anual (R$)', 'Receita incremental + saving, ano 1'], ['opex', 'OPEX anual (R$)', 'Custo operacional incremental, ano 1'], ['years', 'Horizonte (anos)', '1 a 40'], ['rate', 'Taxa de desconto (% a.a.)', 'Custo de capital'], ['benefitGrowth', 'Crescimento do benefício (% a.a.)', ''], ['opexGrowth', 'Crescimento do OPEX (% a.a.)', ''], ['residual', 'Valor residual (R$)', 'Somado ao último ano']];
  V.calcFromCase = (c) => ({ capex: c.capex, benefit: c.benefit, opex: c.opex, years: c.years, rate: C.fmtDec(c.rate * 100, 1).replace(',', '.'), benefitGrowth: C.fmtDec(c.benefitGrowth * 100, 1).replace(',', '.'), opexGrowth: C.fmtDec(c.opexGrowth * 100, 1).replace(',', '.'), residual: c.residual });
  function readCalc(raw) {
    const msgs = [], g = (k, lo, hi) => {
      let v = C.parseNum(raw[k], DEF[k]);
      if (raw[k] !== undefined && String(raw[k]).trim() !== '' && !Number.isFinite(Number(String(raw[k]).replace(',', '.')))) msgs.push('Valor inválido em "' + k + '"; usando ' + DEF[k] + '.');
      if (v < lo) { v = lo; msgs.push('"' + k + '" ajustado para o mínimo (' + lo + ').'); }
      if (v > hi) { v = hi; msgs.push('"' + k + '" ajustado para o máximo (' + hi + ').'); }
      return v;
    };
    return { inp: { capex: g('capex', 0, 1e12), benefit: g('benefit', 0, 1e12), opex: g('opex', 0, 1e12), years: Math.round(g('years', 1, 40)), rate: g('rate', -50, 100) / 100, benefitGrowth: g('benefitGrowth', -50, 100) / 100, opexGrowth: g('opexGrowth', -50, 100) / 100, residual: g('residual', 0, 1e12) }, msgs };
  }
  V.calcResults = (raw) => {
    const { inp, msgs } = readCalc(raw || {}), r = C.evaluate(inp), cls = (v) => (v >= 0 ? 'pos' : 'neg'), pb = (v) => (v == null ? 'Não recupera no horizonte' : C.fmtDec(v, 1) + ' anos');
    const vd = A.verdict(r, inp.rate), bv = [-20, -10, 0, 10, 20], cv = [-10, 0, 10, 20, 30];
    const sens = '<div class="scroll"><table class="sens"><thead><tr><th>Benefício \\ CAPEX</th>' + cv.map((c) => '<th>' + (c > 0 ? '+' : '') + c + '%</th>').join('') + '</tr></thead><tbody>' + bv.map((b) => '<tr><th>' + (b > 0 ? '+' : '') + b + '%</th>' + cv.map((c) => { const v = C.evaluate(Object.assign({}, inp, { benefit: inp.benefit * (1 + b / 100), capex: inp.capex * (1 + c / 100) })).npv; return '<td class="' + cls(v) + '">' + esc(C.fmtMoney(v)) + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>';
    return (msgs.length ? '<div class="callout warn">' + msgs.map(esc).join('<br>') + '</div>' : '') +
      '<div class="grid cards"><div class="card"><div class="label">VPL</div><div class="value ' + cls(r.npv) + '">' + esc(C.fmtMoney(r.npv)) + '</div></div><div class="card"><div class="label">TIR</div><div class="value">' + (r.irr == null ? 'n/d' : C.fmtDec(r.irr * 100, 1) + '%') + '</div></div><div class="card"><div class="label">Payback simples</div><div class="value sm">' + esc(pb(r.payback)) + '</div></div><div class="card"><div class="label">Payback descontado</div><div class="value sm">' + esc(pb(r.discPayback)) + '</div></div></div>' +
      '<p>' + H.rag(vd.rag, vd.label) + '</p><h3>Sensibilidade do VPL</h3>' + sens + '<h3>Fluxo de caixa (R$)</h3><div class="scroll"><table><thead><tr><th>Ano</th>' + r.flows.map((_, t) => '<th>' + t + '</th>').join('') + '</tr></thead><tbody><tr><th>Fluxo</th>' + r.flows.map((v) => '<td class="' + cls(v) + '">' + esc(C.fmtInt(v)) + '</td>').join('') + '</tr></tbody></table></div>';
  };

  function caseSection(state, d, mg, vis, asOf) {
    const inV = H.inVis(vis), cases = (mg.cases || []).filter((c) => { const p = mg.projects.find((x) => x.id === c.projectId); return !p || inV(p.terminal); });
    if (!cases.length) return '<section class="panel">' + H.empty('Nenhum business case para os filtros selecionados.') + '</section>';
    const sel = cases.find((c) => c.id === state.caseId) || cases[0], ev = cases.map((c) => ({ c, ev: A.evalCase(c) }));
    const table = '<section class="panel"><h2>Carteira de estudos' + demoTag(state) + '</h2><div class="scroll"><table><thead><tr><th>Caso</th><th>Projeto</th><th>CAPEX</th><th>Benefício (ano 1)</th><th>VPL</th><th>TIR</th><th>Payback</th><th>Recomendação</th></tr></thead><tbody>' +
      ev.map(({ c, ev: e }) => '<tr class="' + (c.id === sel.id ? 'sel' : '') + '"><td>' + H.btn('caseId', c.id, '<b>' + esc(c.id) + '</b> ' + esc(c.name)) + '</td><td>' + esc(c.projectId) + '</td><td>' + esc(C.fmtMi(c.capex)) + '</td><td>' + esc(C.fmtMi(c.benefit)) + '</td><td class="' + (e.npv >= 0 ? 'pos' : 'neg') + '">' + esc(C.fmtMi(e.npv)) + '</td><td>' + (e.irr == null ? 'n/d' : C.fmtDec(e.irr * 100, 1) + '%') + '</td><td>' + (e.payback == null ? '>' + c.years + ' a' : C.fmtDec(e.payback, 1) + ' a') + '</td><td>' + H.rag(e.verdict.rag, e.verdict.label) + '</td></tr>').join('') + '</tbody></table></div></section>';
    const e = A.evalCase(sel), tor = A.tornado(sel), mf = (v) => (v < 0 ? '−' : '') + C.fmtDec(Math.abs(v) / 1e6, 1);
    let cum = 0, dis = 0; const cumA = e.flows.map((v) => (cum += v)), cumD = e.flows.map((v, t) => (dis += v / Math.pow(1 + sel.rate, t)));
    const pr = mg.projects.find((p) => p.id === sel.projectId), pe = pr ? A.evm(pr, asOf) : null;
    const warn = pe && pe.started && !pe.done && pe.eac > sel.capex * 1.05 ? '<div class="callout warn">O projeto vinculado ' + esc(pr.id) + ' prevê CAPEX de <b>' + esc(C.fmtMi(pe.eac)) + '</b> (EAC), acima dos <b>' + esc(C.fmtMi(sel.capex)) + '</b> do caso. Com o EAC, o VPL passa a <b>' + esc(C.fmtMi(C.evaluate(Object.assign({}, e.inp, { capex: pe.eac })).npv)) + '</b>.</div>' : '';
    const detail = '<section class="panel detail"><div class="dhead"><div><h2>' + esc(sel.id + ' · ' + sel.name) + '</h2><p class="muted">' + esc(sel.assumptions) + '</p></div><div>' + H.rag(e.verdict.rag, e.verdict.label) + '<br><button type="button" class="btn primary" data-load-sim="' + esc(sel.id) + '">Abrir no simulador</button></div></div>' + warn +
      '<div class="grid cards">' + H.stat('VPL', C.fmtMi(e.npv), 'a ' + C.fmtDec(sel.rate * 100, 0) + '% a.a., ' + sel.years + ' anos') + H.stat('TIR', e.irr == null ? 'n/d' : C.fmtDec(e.irr * 100, 1) + '%', 'custo de capital ' + C.fmtDec(sel.rate * 100, 0) + '%') + H.stat('Payback simples', e.payback == null ? 'n/d' : C.fmtDec(e.payback, 1) + ' anos', '') + H.stat('Payback descontado', e.discPayback == null ? 'n/d' : C.fmtDec(e.discPayback, 1) + ' anos', '') + '</div>' +
      '<div class="grid two eq"><div><h3>Composição do fluxo líquido do ano 1 (R$ mi)</h3>' + X.waterfall({ w: 480, fit: true, steps: sel.breakdown.map((b) => ({ label: b.label, value: b.value })).concat([{ label: 'OPEX incremental', value: -sel.opex }]), totalLabel: 'Fluxo líquido', fmt: mf, title: 'Composição do fluxo líquido do ano 1' }) + '</div><div><h3>Fluxo de caixa acumulado (R$ mi)</h3>' + X.line({ labels: e.flows.map((_, t) => String(t)), xfmt: (l) => 'ano ' + l, h: 270, w: 480, fit: true, fmt: (v) => C.fmtDec(v / 1e6, 0), refs: [{ value: 0, label: 'Ponto de equilíbrio' }], series: [{ name: 'Acumulado', values: cumA, cls: 'c0', strong: true }, { name: 'Descontado', values: cumD, cls: 'c3', dashed: true }], title: 'Fluxo de caixa acumulado' }) + '</div></div>' +
      '<h3>Sensibilidade do VPL (R$ mi): pior e melhor caso por variável</h3>' + X.tornado({ base: tor.base, items: tor.items, fmt: mf, title: 'Tornado de sensibilidade do VPL' }) + '</section>';
    return table + detail;
  }

  V.views.business = (state, d) => {
    const mg = H.mg(state, d), raw = state.calc || {};
    const sim = '<section class="panel" id="simulator"><h2>Simulador de viabilidade</h2><div class="callout warn">Valores iniciais são <b>exemplo ilustrativo, sem relação com a LATAM</b>. Substitua por premissas autorizadas. Análise antes de impostos e financiamento.</div><form id="calc" class="calc-form" onsubmit="return false">' +
      FIELDS.map((f) => '<label>' + esc(f[1]) + '<input inputmode="decimal" data-calc="' + f[0] + '" value="' + esc(raw[f[0]] !== undefined ? raw[f[0]] : DEF[f[0]]) + '"><small>' + esc(f[2]) + '</small></label>').join('') + '</form><div id="calc-results" aria-live="polite">' + V.calcResults(raw) + '</div></section>';
    const prem = '<section class="panel"><h2>Premissas mínimas para um business case real</h2><p>Demanda e curva de ramp-up, CAPEX por frente, OPEX incremental, impostos, custo de capital, contingência, vida útil, valor residual e a alternativa de não investir.</p></section>';
    return (mg ? caseSection(state, d, mg, H.codes(state, d), mg.meta.asOf) : H.notice(state, d, 'Carteira de business cases')) + sim + prem;
  };

  /* ------------------------------------------------------------ Riscos */
  V.views.risks = (state, d) => mgmt(state, d, 'Riscos', (mg, vis) => {
    const inV = H.inVis(vis), rs = mg.risks.filter((r) => inV(r.terminal)).map((r) => Object.assign({ score: C.riskScore(r.probability, r.impact) }, r)).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (!rs.length) return '<section class="panel">' + H.empty('Nenhum risco para os filtros selecionados.') + '</section>';
    let grid = '<div class="rm"><div></div>' + [1, 2, 3, 4, 5].map((i) => '<div class="rmh">Imp. ' + i + '</div>').join('');
    for (let p = 5; p >= 1; p--) {
      grid += '<div class="rmh">Prob. ' + p + '</div>';
      for (let i = 1; i <= 5; i++) { const ids = rs.filter((r) => r.probability === p && r.impact === i).map((r) => r.id); grid += '<div class="rmc st-' + C.riskBand(p * i) + '" title="Probabilidade ' + p + ' × impacto ' + i + ' = ' + (p * i) + '"><span class="rmn">' + p * i + '</span>' + ids.map((x) => '<b>' + esc(x) + '</b>').join(' ') + '</div>'; }
    }
    grid += '</div>';
    const cnt = { r: 0, a: 0, g: 0 }; rs.forEach((r) => { cnt[C.riskBand(r.score)]++; });
    const cats = {}; rs.forEach((r) => { cats[r.category] = (cats[r.category] || 0) + 1; });
    const mx = Math.max.apply(null, Object.values(cats));
    const summary = '<div class="grid cards">' + H.stat('Riscos no recorte', String(rs.length), 'registrados') + H.stat('Críticos (≥ 15)', '<span class="st-txt st-r">' + cnt.r + '</span>', 'prioridade máxima') + H.stat('Médios (8 a 14)', '<span class="st-txt st-a">' + cnt.a + '</span>', 'monitorar de perto') + H.stat('Baixos (< 8)', '<span class="st-txt st-g">' + cnt.g + '</span>', 'rotina') + '</div>';
    const table = '<div class="scroll"><table><thead><tr><th>ID</th><th>Risco</th><th>Local</th><th>Categoria</th><th>P</th><th>I</th><th>Nota</th><th>Tendência</th><th>Mitigação</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>' + rs.map((r) => '<tr><td><b>' + esc(r.id) + '</b></td><td>' + esc(r.title) + (r.projectId ? '<br>' + H.btn('proj', r.projectId, esc(r.projectId), 'linkish', ' data-goto="projects"') : '') + '</td><td>' + esc(r.terminal) + '</td><td>' + esc(r.category) + '</td><td>' + r.probability + '</td><td>' + r.impact + '</td><td>' + H.rag(C.riskBand(r.score), String(r.score)) + '</td><td class="' + (r.trend === 'up' ? 'neg' : r.trend === 'down' ? 'pos' : '') + '" title="' + esc(r.trend) + '">' + arrow(r.trend) + '</td><td>' + esc(r.mitigation) + '<br><small class="muted">' + esc(r.status) + '</small></td><td>' + esc(r.owner) + '</td><td>' + esc(C.fmtDate(r.due)) + '</td></tr>').join('') + '</tbody></table></div>';
    return summary + '<div class="grid two"><section class="panel"><h2>Matriz de riscos' + demoTag(state) + '</h2>' + grid + '<p class="muted small">Nota = probabilidade × impacto. Vermelho ≥ 15, âmbar 8 a 14, verde &lt; 8.</p></section><section class="panel"><h2>Riscos por categoria</h2>' + Object.keys(cats).sort((a, b) => cats[b] - cats[a]).map((k) => '<div class="tbar"><span>' + esc(k) + '</span><span class="stack"><i class="bg" style="width:' + (cats[k] / mx) * 100 + '%"><i class="fg" style="width:100%"></i></i></span><small>' + cats[k] + '</small></div>').join('') + '</section></div><section class="panel"><h2>Registro de riscos</h2>' + table + '</section>';
  });

  /* ------------------------------------------------------------ Fornecedores */
  V.views.suppliers = (state, d) => mgmt(state, d, 'Fornecedores e malha rodoviária', (mg, vis, asOf) => {
    const inV = H.inVis(vis), sup = mg.suppliers.filter((s) => s.terminals.some(inV)).map((s) => ({ s, k: A.supplierScore(s, asOf) }));
    if (!sup.length) return '<section class="panel">' + H.empty('Nenhum fornecedor para os filtros selecionados.') + '</section>';
    const total = sup.reduce((a, x) => a + x.s.annualValue, 0), soon = sup.filter((x) => x.k.days >= 0 && x.k.days <= 180).length, wsla = sup.reduce((a, x) => a + x.k.slaAvg * x.s.annualValue, 0) / total;
    const cards = '<div class="grid cards">' + H.stat('Contratos no recorte', String(sup.length), 'ground handling, transporte, TI e manutenção') + H.stat('Valor anual contratado', C.fmtMi(total), '') + H.stat('Vencem em até 180 dias', '<span class="st-txt st-' + (soon ? 'a' : 'g') + '">' + soon + '</span>', 'preparar renovação ou nova cotação') + H.stat('SLA médio ponderado', C.fmtDec(wsla, 1) + '%', 'ponderado pelo valor anual') + '</div>';
    const rows = [...sup].sort((a, b) => a.k.score - b.k.score).map(({ s, k }) => '<tr><td><b>' + esc(s.id) + '</b> ' + esc(s.name) + '<br><small class="muted">' + esc(s.type) + ' · ' + esc(s.terminals.length > 4 ? 'Rede' : s.terminals.join(', ')) + '</small></td><td>' + esc(C.fmtMi(s.annualValue)) + '</td><td>' + C.fmtDec(k.slaAvg, 1) + '% <small class="muted">/ ' + s.slaTarget + '%</small> ' + X.spark(s.sla, { label: 'SLA ' + s.name, cls: 'sp-' + (k.slaGap >= 0 ? 'g' : k.slaGap > -2 ? 'a' : 'r') }) + '</td><td>' + s.costIndex + '</td><td>' + s.safety + '/5 · ' + s.responsiveness + '/5</td><td>' + H.rag(k.rag, String(k.score)) + '</td><td>' + esc(C.fmtDate(s.contractEnd)) + '<br>' + H.rag(k.days <= 90 ? 'r' : k.days <= 180 ? 'a' : 'g', k.days + ' dias') + '</td><td>' + esc(k.action) + '</td></tr>').join('');
    const table = '<section class="panel"><h2>Scorecard de fornecedores' + demoTag(state) + '</h2><div class="scroll"><table><thead><tr><th>Fornecedor</th><th>Valor/ano</th><th>SLA (6 meses)</th><th>Índice de custo</th><th>Segurança · resp.</th><th>Score</th><th>Contrato</th><th>Ação sugerida</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="muted small">Índice de custo: 100 = referência de mercado (menor é melhor). Score = SLA 40%, custo 25%, segurança 20%, responsividade 15%.</p></section>';
    const sc = '<section class="panel"><h2>Custo x atingimento do SLA</h2>' + X.scatter({ points: sup.map(({ s, k }) => ({ id: s.id, x: s.costIndex, y: (k.slaAvg / s.slaTarget) * 100, r: s.annualValue, rag: k.rag, label: s.name + ' — custo ' + s.costIndex + ', SLA ' + C.fmtDec((k.slaAvg / s.slaTarget) * 100, 1) + '% da meta, ' + C.fmtMi(s.annualValue) + '/ano' })), refX: 100, refY: 100, xLabel: 'Índice de custo (100 = referência) →', yLabel: 'Atingimento do SLA (%) →', caption: 'Ideal: canto superior esquerdo (custo baixo, SLA acima da meta). Tamanho = valor anual.', title: 'Custo x atingimento do SLA dos fornecedores' }) + '</section>';
    const byId = Object.fromEntries(mg.suppliers.map((s) => [s.id, s])), lanes = (mg.lanes || []).filter((l) => inV(l.terminal));
    const lt = '<section class="panel"><h2>Malha rodoviária e integração terrestre' + demoTag(state) + '</h2>' + (lanes.length ? '<div class="scroll"><table><thead><tr><th>Rota</th><th>Parceiro</th><th>km</th><th>Viagens/sem.</th><th>t/sem.</th><th>Pontualidade</th><th>Custo/t</th><th>Utilização</th></tr></thead><tbody>' + lanes.map((l) => { const p = byId[l.supplier], r = p ? C.rag(l.onTime, p.slaTarget, 'max', 0.02) : 'n'; return '<tr><td><b>' + esc(l.from + ' → ' + l.to) + '</b></td><td>' + esc(p ? p.name : l.supplier) + '</td><td>' + l.km + '</td><td>' + l.tripsWeek + '</td><td>' + C.fmtInt(l.tonsWeek) + '</td><td>' + H.rag(r, C.fmtDec(l.onTime, 1) + '%') + '</td><td>R$ ' + l.costPerT + '</td><td>' + H.bar(l.utilization, l.utilization > 85 ? 'a' : '') + ' ' + l.utilization + '%</td></tr>'; }).join('') + '</tbody></table></div>' : H.empty('Nenhuma rota para os filtros.')) + '</section>';
    return cards + table + '<div class="grid two">' + sc + '<div>' + lt + '</div></div>';
  });

  /* ------------------------------------------------------------ Novos negocios */
  const STAGES = ['Hipótese', 'Triagem', 'Conceito', 'Viabilidade', 'Business case', 'Decisão', 'Implantação'];
  V.views.opportunities = (state, d) => {
    const mg = H.mg(state, d), hyp = H.hypotheses(state, d);
    if (!mg) return H.notice(state, d, 'Pipeline de novos negócios') + hyp;
    const vis = H.codes(state, d), ops = (mg.pipeline || []).filter((o) => vis.has(o.location));
    if (!ops.length) return '<section class="panel">' + H.empty('Nenhuma oportunidade para os filtros selecionados.') + '</section>' + hyp;
    const tot = ops.reduce((a, o) => a + o.annualValue, 0), wt = ops.reduce((a, o) => a + A.weightedValue(o), 0), mx = Math.max.apply(null, STAGES.map((s) => ops.filter((o) => o.stage === s).reduce((a, o) => a + o.annualValue, 0))) || 1;
    const cards = '<div class="grid cards">' + H.stat('Oportunidades', String(ops.length), 'no funil') + H.stat('Valor anual potencial', C.fmtMi(tot), 'EBITDA anual estimado (fictício)') + H.stat('Valor ponderado', C.fmtMi(wt), 'valor × probabilidade') + H.stat('Probabilidade média', C.fmtDec(ops.reduce((a, o) => a + o.probability, 0) / ops.length, 0) + '%', '') + '</div>';
    const funnel = '<section class="panel"><h2>Funil por estágio' + demoTag(state) + '</h2>' + STAGES.map((s) => { const g = ops.filter((o) => o.stage === s), v = g.reduce((a, o) => a + o.annualValue, 0), w = g.reduce((a, o) => a + A.weightedValue(o), 0); return '<div class="fun"><span>' + esc(s) + '</span><span class="stack"><i class="bg" style="width:' + (v / mx) * 100 + '%"><i class="fg" style="width:' + (v ? (w / v) * 100 : 0) + '%"></i></i></span><small>' + g.length + ' · ' + esc(C.fmtMi(v)) + ' (pond. ' + esc(C.fmtMi(w)) + ')</small></div>'; }).join('') + '<p class="muted small">Barra clara = valor potencial; escura = valor ponderado pela probabilidade.</p></section>';
    const table = '<section class="panel"><h2>Pipeline</h2><div class="scroll"><table><thead><tr><th>Oportunidade</th><th>Local</th><th>Categoria</th><th>Estágio</th><th>Valor/ano</th><th>Prob.</th><th>Ponderado</th><th>Próximo passo</th><th>Decisão</th></tr></thead><tbody>' + [...ops].sort((a, b) => A.weightedValue(b) - A.weightedValue(a)).map((o) => '<tr><td><b>' + esc(o.id) + '</b> ' + esc(o.name) + (o.hypothesis ? '<br><small class="muted">Origem: hipótese ' + esc(o.hypothesis) + '</small>' : '') + '</td><td>' + esc(o.location) + '</td><td>' + esc(o.category) + '</td><td><span class="chip">' + esc(o.stage) + '</span></td><td>' + esc(C.fmtMi(o.annualValue)) + '</td><td>' + o.probability + '%</td><td>' + esc(C.fmtMi(A.weightedValue(o))) + '</td><td>' + esc(o.nextStep) + '<br><small class="muted">' + esc(o.owner) + '</small></td><td>' + esc(C.fmtDate(o.decisionDate)) + '</td></tr>').join('') + '</tbody></table></div></section>';
    return cards + funnel + table + hyp;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
