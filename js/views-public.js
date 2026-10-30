/* Telas baseadas em dados publicos: visao geral, mapa de atuacao e governanca. */
(function (root) {
  'use strict';
  const C = root.Core, A = root.Analytics, V = root.Views, H = V.H, esc = C.esc;

  H.initiativesTable = (items, d) => '<div class="scroll"><table><thead><tr><th>Marco</th><th>Local</th><th>Tipo</th><th>Status</th><th>Data</th><th>Fonte</th></tr></thead><tbody>' +
    items.map((i) => '<tr><td><b>' + esc(i.name) + '</b><br><small class="muted">' + esc(i.summary) + '</small></td><td>' + esc(i.location) + '</td><td>' + esc(i.type) + '</td><td><span class="chip ok-c">' + esc(i.status) + '</span></td><td>' + esc(i.date) + '</td><td>' + H.chips(i.sources, d) + '</td></tr>').join('') + '</tbody></table></div>';

  H.hypotheses = (state, d) => {
    const vis = H.codes(state, d), items = d.opportunities.filter((o) => vis.has(o.location));
    return '<section class="panel"><h2>Hipóteses de atuação (a partir de evidências públicas)</h2><p class="muted">Cada hipótese nasce de uma evidência pública e lista os dados internos necessários para validá-la. Não há estimativa de valor.</p>' +
      (items.length ? '<div class="scroll"><table><thead><tr><th>Hipótese</th><th>Local</th><th>Gatilho público</th><th>Dados necessários</th><th>Frente</th></tr></thead><tbody>' +
        items.map((o) => '<tr><td><b>' + esc(o.id) + ' · ' + esc(o.title) + '</b><br><span class="chip">' + esc(o.category) + '</span></td><td>' + esc(o.location) + '</td><td>' + esc(o.trigger) + ' ' + H.chips(o.sources, d) + '</td><td><ul class="tight">' + o.dataNeeded.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></td><td>' + esc(o.function) + '</td></tr>').join('') + '</tbody></table></div>'
        : H.empty('Nenhuma hipótese para os filtros selecionados.')) + '</section>';
  };

  function rankingBars(locs, d) {
    if (!locs.length) return H.empty('Nenhuma localidade para os filtros selecionados.');
    return [...locs].sort((a, b) => H.sc(b, d) - H.sc(a, d)).map((l) => {
      const s = H.sc(l, d), b = C.band(s, d.config.bands);
      return '<button type="button" class="bar-row" data-goto="network" data-set="selected" data-val="' + esc(l.code) + '"><span><b>' + esc(l.code) + '</b> ' + esc(l.name) + '</span>' + H.bar(s, b) + '<b>' + s + '</b></button>';
    }).join('');
  }

  V.views.overview = (state, d) => {
    const locs = H.visible(state, d), mg = H.mg(state, d);
    const status = '<ul class="layers-status"><li><span class="dot ok"></span><div><b>Públicos</b><small>' + d.sources.length + ' fontes com URL e data de acesso</small></div></li><li><span class="dot an"></span><div><b>Analíticos</b><small>Score, camadas de demanda e hipóteses desta consultoria</small></div></li><li><span class="dot ' + (mg ? (state.mode === 'demo' ? 'demo' : 'ok') : 'off') + '"></span><div><b>Gestão (' + (state.mode === 'demo' ? 'fictícia' : state.mode === 'internal' ? 'interna' : 'não carregada') + ')</b><small>' + (mg ? 'Ocupação, projetos, CAPEX, riscos e fornecedores' : 'Alterne para o modo demonstração para ver um exemplo') + '</small></div></li></ul>';
    return '<div class="callout">' + esc(d.config.disclaimer) + '</div>' + H.kpiCards(d, 8) +
      '<div class="grid two"><section class="panel"><h2>Ranking de relevância para atuação</h2><p class="muted">Score 0–100 (metodologia em Governança). Clique para abrir no mapa.</p>' + rankingBars(locs, d) + '</section><section class="panel"><h2>Camadas de dados</h2>' + status + '</section></div>' +
      '<section class="panel"><h2>Marcos públicos recentes</h2>' + H.initiativesTable(d.initiatives.slice(0, 4), d) + '</section>';
  };

  const METRICS = { score: 'Score de atuação', occupancy: 'Ocupação', health: 'Saúde do terminal' };

  function mapSvg(state, d) {
    const m = d.map, k = m.k, mg = H.mg(state, d), metric = mg ? state.metric : 'score';
    const proj = (lon, lat) => [(lon - m.lon0) * k, (m.lat1 - lat) * k];
    const vis = H.codes(state, d), pos = {}, mt = {};
    if (mg) mg.terminals.forEach((t) => { mt[t.code] = t; });
    const occDef = mg ? mg.series.defs.find((x) => x.id === 'occupancy') : null;
    d.locations.forEach((l) => { const [x, y] = proj(l.lon, l.lat), o = l.pinOffset || [0, 0]; pos[l.code] = { x, y, px: x + o[0], py: y + o[1], off: !!l.pinOffset }; });
    const countries = m.countries.map((c) => '<path d="' + c.d + '" class="land' + (c.iso === 'BRA' ? ' br' : '') + '"><title>' + esc(c.name) + '</title></path>').join('');
    const corridors = d.corridors.map((c) => {
      const a = pos[c.from], b = pos[c.to]; if (!a || !b) return '';
      return '<line class="corr' + (vis.has(c.from) && vis.has(c.to) ? '' : ' dim') + (c.derived ? ' derived' : '') + '" x1="' + a.px + '" y1="' + a.py + '" x2="' + b.px + '" y2="' + b.py + '" stroke-width="' + Math.max(2, c.weekly / 2.2) + '"><title>' + esc(c.from + '→' + c.to + ': ' + c.weekly + '/semana (' + c.basis + ')') + '</title></line>';
    }).join('');
    const pins = d.locations.map((l) => {
      const p = pos[l.code], s = H.sc(l, d), r = 9 + (l.components.demand / 100) * 10, on = vis.has(l.code), sel = state.selected === l.code;
      let fillCls = '', fill = H.layerOf(d, l.primaryLayer).color, txt = String(s), ttl = 'score ' + s;
      if (metric !== 'score' && mt[l.code]) {
        const t = mt[l.code];
        if (metric === 'occupancy') { const st = A.kpiStatus(occDef, t, mg.series.byTerminal[l.code].occupancy); fillCls = ' rag-' + st.rag; txt = String(Math.round(st.value)); ttl = 'ocupação ' + C.fmtDec(st.value, 1) + '%'; }
        else { const h = A.health(t); fillCls = ' rag-' + h.rag; txt = C.fmtDec(h.avg, 1); ttl = 'saúde ' + C.fmtDec(h.avg, 1) + ' de 5'; }
      } else if (metric !== 'score') { fillCls = ' rag-n'; txt = '–'; ttl = 'sem dados de gestão'; }
      const leader = p.off ? '<line class="leader" x1="' + p.x + '" y1="' + p.y + '" x2="' + p.px + '" y2="' + p.py + '"/><circle class="anchor" cx="' + p.x + '" cy="' + p.y + '" r="2.5"/>' : '';
      const left = l.labelSide === 'left';
      return leader + '<g class="pin' + (on ? '' : ' dim') + (sel ? ' sel' : '') + '" data-loc="' + esc(l.code) + '" tabindex="0" role="button" aria-label="' + esc(l.code + ' ' + l.name + ', ' + ttl) + '" transform="translate(' + p.px + ',' + p.py + ')"><circle r="' + (r + 4) + '" class="halo"/><circle r="' + r + '" class="dotc' + fillCls + '"' + (fillCls ? '' : ' fill="' + fill + '"') + '/><text class="pt" text-anchor="middle" dy="3.5">' + esc(txt) + '</text><text class="pl" x="' + (left ? -(r + 6) : r + 6) + '" text-anchor="' + (left ? 'end' : 'start') + '" dy="4">' + esc(l.code) + '</text></g>';
    }).join('');
    return '<svg class="map" viewBox="0 0 ' + m.viewBox[2] + ' ' + m.viewBox[3] + '" role="group" aria-label="Mapa das Américas com localidades de atuação">' + countries + corridors + pins + '</svg>';
  }

  function detail(state, d) {
    const l = d.locations.find((x) => x.code === state.selected);
    if (!l) return '<section class="panel"><h2>Detalhe da localidade</h2>' + H.empty('Selecione um ponto no mapa para ver o score, as evidências e as frentes sugeridas.') + '</section>';
    const s = H.sc(l, d), w = d.config.scoreWeights, lab = d.config.scoreLabels, mg = H.mg(state, d);
    const bars = Object.keys(w).map((k) => '<div class="brk"><span>' + esc(lab[k]) + ' <small>(' + Math.round(w[k] * 100) + '%)</small></span>' + H.bar(l.components[k]) + '<b>' + l.components[k] + '</b></div>').join('');
    let ops = '';
    if (mg && mg.terminals.some((t) => t.code === l.code)) {
      const t = mg.terminals.find((x) => x.code === l.code), hh = A.health(t), sr = mg.series.byTerminal[l.code];
      const cells = mg.series.defs.filter((x) => x.tier === 1 && sr[x.id]).map((df) => { const st = A.termStatus(mg, df, l.code); return '<div class="mini"><span class="label">' + esc(df.name) + '</span><b>' + A.kfmt(df, st.value) + ' <small>' + esc(df.unit) + '</small></b>' + H.rag(st.rag, st.target != null ? 'meta ' + A.kfmt(df, st.target) : '') + '</div>'; }).join('');
      const np = mg.projects.filter((p) => p.terminal === l.code && p.progress < 100).length, nr = mg.risks.filter((r) => r.terminal === l.code).length;
      ops = '<h3>Operação' + (state.mode === 'demo' ? ' <span class="chip demo-c">fictício</span>' : '') + '</h3><div class="mini-grid">' + cells + '</div><p class="small muted">Saúde ' + C.fmtDec(hh.avg, 1) + '/5 · ' + np + ' projeto(s) em andamento · ' + nr + ' risco(s) ' + H.go('terminals', l.code, 'Abrir terminal') + '</p>';
    }
    return '<section class="panel detail"><div class="dhead"><div><h2>' + esc(l.code) + ' · ' + esc(l.name) + '</h2><p class="muted">' + esc(l.country) + ' — ' + esc(l.role) + '</p></div>' + H.scorePill(s, d) + '</div>' +
      '<div class="chips">' + l.layers.map((id) => '<span class="chip" style="--c:' + H.layerOf(d, id).color + '"><i></i>' + esc(H.layerOf(d, id).label) + '</span>').join('') + ' ' + H.confChip(l.confidence) + '</div>' +
      '<h3>Composição do score</h3>' + bars + '<h3>Evidências públicas ' + H.chips(l.sources, d) + '</h3><ul>' + l.evidence.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul><h3>Frentes sugeridas</h3><ul>' + l.focus.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' + ops + '<p class="note"><b>Racional:</b> ' + esc(l.rationale) + '</p></section>';
  }

  V.views.network = (state, d) => {
    const mg = H.mg(state, d), locs = H.visible(state, d);
    const layerChips = d.config.layers.map((l) => '<button type="button" class="chip toggle' + (state.layers.includes(l.id) ? ' on' : '') + '" style="--c:' + l.color + '" data-layer="' + esc(l.id) + '" aria-pressed="' + state.layers.includes(l.id) + '"><i></i>' + esc(l.label) + '</button>').join('');
    const metricChips = mg ? '<div class="chips metric-row"><span class="muted small">Colorir por:</span>' + Object.keys(METRICS).map((k) => '<button type="button" class="chip toggle neutral' + (state.metric === k ? ' on' : '') + '" data-set="metric" data-val="' + k + '" aria-pressed="' + (state.metric === k) + '">' + esc(METRICS[k]) + '</button>').join('') + (state.mode === 'demo' ? '<span class="chip demo-c">ocupação e saúde: dados fictícios</span>' : '') + '</div>' : '';
    const rows = [...locs].sort((a, b) => H.sc(b, d) - H.sc(a, d)).map((l) => '<tr class="' + (state.selected === l.code ? 'sel' : '') + '"><td>' + H.btn('selected', l.code, '<b>' + esc(l.code) + '</b>') + '<br><small class="muted">' + esc(l.name) + ', ' + esc(l.country) + '</small></td><td>' + l.layers.map((id) => esc(H.layerOf(d, id).label)).join(', ') + '</td><td>' + H.scorePill(H.sc(l, d), d) + '</td><td>' + H.confChip(l.confidence) + '</td><td>' + esc(l.focus[0]) + '</td></tr>').join('');
    const legend = state.metric !== 'score' && mg ? '<p class="muted small">Cor = semáforo contra a meta (verde no plano, âmbar atenção, vermelho crítico). Número no ponto = ' + (state.metric === 'occupancy' ? 'ocupação (%)' : 'nota de saúde (1 a 5)') + '. Tamanho = índice de demanda público.</p>' : '<p class="muted small">Tamanho do ponto = índice de demanda (proxy público); número = score; cor = camada principal. Linhas = corredores com frequência semanal (VCP–MAO é valor derivado). Posições aproximadas; polígonos: ' + esc(d.map.source) + '.</p>';
    return '<div class="grid map-grid"><section class="panel"><div class="toolbar"><div class="chips">' + layerChips + '<button type="button" class="chip" data-reset-layers="1">Todas as camadas</button></div><label class="slider">Score mínimo <b id="minv">' + state.minScore + '</b><input type="range" id="minscore" min="0" max="100" step="5" value="' + state.minScore + '" data-minscore="1"></label></div>' + metricChips + mapSvg(state, d) + legend + '</section>' + detail(state, d) + '</div>' +
      '<section class="panel"><h2>Ranking e camadas (' + locs.length + ' de ' + d.locations.length + ')</h2>' + (locs.length ? '<div class="scroll"><table><thead><tr><th>Localidade</th><th>Camadas de demanda</th><th>Score</th><th>Evidência</th><th>Primeira frente</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : H.empty('Nenhuma localidade atende aos filtros. Reduza o score mínimo ou limpe as camadas.')) + '</section>';
  };

  V.views.governance = (state, d) => {
    const w = d.config.scoreWeights, lab = d.config.scoreLabels, mg = H.mg(state, d);
    const supW = A.SUP_W;
    const consulting = '<section class="panel"><h2>Modelo de atuação consultiva</h2><p><span class="chip">Proposta para discussão</span></p><p class="muted">Abordagem do candidato para governança de CAPEX, modelos operacionais de engenharia e implantação e melhoria contínua. Não descreve o processo oficial da LATAM. Pode ser discutida com informações públicas, sem dados internos ou ativação do modo demonstração.</p>' +
      '<h3>Fluxo de investimento proposto</h3><div class="grid three">' +
      '<div class="metric"><b>1. Diagnosticar</b><p>Artefato: diagnóstico de maturidade e mapa do fluxo atual, com lacunas e evidências a validar.</p></div>' +
      '<div class="metric"><b>2. Priorizar</b><p>Artefato: carteira de iniciativas com critérios de valor, risco e capacidade de execução a pactuar.</p></div>' +
      '<div class="metric"><b>3. Aprovar</b><p>Artefato: business case e registro do gate de decisão, com premissas, responsável e condições conforme alçadas existentes.</p></div>' +
      '<div class="metric"><b>4. Implantar</b><p>Artefato: plano de implantação, comissionamento e aceite, com entregas e responsabilidades entre Engenharia, Implantação e Operações.</p></div>' +
      '<div class="metric"><b>5. Medir</b><p>Artefato: plano de benefícios com linha de base, medida, responsável pela captura e revisão das lições aprendidas.</p></div></div>' +
      '<div class="grid two"><div><h3>Maturidade: perguntas antes de pontuar</h3><p class="small muted">Nenhuma nota atribuída. Registrar “não avaliado” até validar evidências, lacunas e próximos passos com as áreas. As evidências abaixo orientam um diagnóstico futuro, conforme autorização.</p><div class="scroll"><table><thead><tr><th>Dimensão</th><th>Pergunta</th><th>Evidências a levantar</th></tr></thead><tbody>' +
      '<tr><td><b>Capital e portfólio</b></td><td>Como as demandas competem por capital e quem decide?</td><td>Carteira, critérios de priorização, alçadas e decisões registradas.</td></tr>' +
      '<tr><td><b>Processos e modelo operacional</b></td><td>Onde há espera ou retrabalho entre Engenharia, Implantação e Operações?</td><td>Fluxos atuais, papéis, entregáveis e critérios de comissionamento e aceite.</td></tr>' +
      '<tr><td><b>Dados, benefícios e mudança</b></td><td>Quem acompanha a adoção e confirma o benefício após a entrega?</td><td>Linha de base, fonte de medição, responsável, treinamento e revisão dos resultados.</td></tr></tbody></table></div></div>' +
      '<div><h3>Workshop executivo proposto</h3><p class="small muted">Reunir Operações, Engenharia, Implantação e Investimentos/Finanças para validar o diagnóstico e pactuar três saídas:</p><ol class="small"><li><b>Problema e prioridades:</b> pergunta de decisão, lacunas validadas e critérios acordados.</li><li><b>Fluxo futuro e papéis:</b> redesenho das interfaces, entregas e pontos de decisão.</li><li><b>Plano de ação:</b> piloto com responsável, prazo, linha de base e medida do benefício, sujeito às aprovações cabíveis.</li></ol></div></div></section>';
    return consulting + '<div class="grid two"><section class="panel"><h2>Metodologia do score por localidade</h2><div class="scroll"><table><thead><tr><th>Dimensão</th><th>Peso</th></tr></thead><tbody>' + Object.keys(w).map((k) => '<tr><td>' + esc(lab[k]) + '</td><td>' + Math.round(w[k] * 100) + '%</td></tr>').join('') + '</tbody></table></div><p class="muted">Faixas: alta ≥ ' + d.config.bands.high + '; média ≥ ' + d.config.bands.mid + '. O score mede <b>relevância para priorizar diagnóstico</b>, não condição nem necessidade de CAPEX. Os componentes são julgamento analítico sobre evidência pública; a confiança indica a qualidade dessa evidência.</p></section>' +
      '<section class="panel"><h2>Regras de dados</h2><ul><li>Repositório público: dados públicos, análise e dados <b>fictícios claramente identificados</b>.</li><li>Dados internos: somente em repositório privado, em <code>data/internal/</code>, com revisão por pull request.</li><li>Sem credenciais, layouts de segurança ou dados pessoais.</li><li>Todo fato público exige fonte, data de acesso e responsável.</li><li>Uso de marcas conforme as diretrizes corporativas.</li></ul></section></div>' +
      '<section class="panel"><h2>Como os números de gestão são calculados</h2><div class="grid three">' +
      '<div class="metric"><b>Valor agregado (EVM)</b><p>PV = orçamento × % planejado (linear entre início e fim da linha de base). EV = orçamento × % físico. AC = CAPEX realizado. SPI = EV/PV; CPI = EV/AC; EAC = orçamento/CPI.</p></div>' +
      '<div class="metric"><b>Semáforo do projeto</b><p>Pelo menor entre SPI e CPI: ≥ 0,95 no plano; ≥ 0,85 atenção; abaixo disso, crítico. Concluídos e não iniciados têm tratamento próprio.</p></div>' +
      '<div class="metric"><b>Semáforo dos indicadores</b><p>Compara o último mês com a meta do terminal, com tolerância por indicador (ex.: ocupação 4%, nível de serviço 1,5%).</p></div>' +
      '<div class="metric"><b>Saúde do terminal</b><p>Média de 6 dimensões (1 a 5): capacidade, fluxo, ativos, segurança, sistemas e cadeia fria. Célula ≤ 2 vermelho, 3 âmbar, ≥ 4 verde.</p></div>' +
      '<div class="metric"><b>Score de fornecedor</b><p>SLA ' + supW.sla * 100 + '%, custo ' + supW.cost * 100 + '%, segurança ' + supW.safety * 100 + '%, responsividade ' + supW.resp * 100 + '%. ≥ 85 verde; ≥ 70 âmbar.</p></div>' +
      '<div class="metric"><b>KPIs da rede</b><p>Somas somam; razões são recalculadas (ex.: margem = Σ receita − Σ OPEX sobre Σ receita); o restante é média ponderada pelo volume. Meta da rede = soma ou média ponderada das metas.</p></div>' +
      '<div class="metric"><b>Desvio de OPEX</b><p>Realizado − orçado = efeito volume (custo variável) + efeito custo unitário (preço ou ineficiência). Fecha exatamente, por terminal e na rede.</p></div>' +
      '<div class="metric"><b>Business case</b><p>Fluxo anual com crescimento de benefício e OPEX; VPL, TIR, payback simples e descontado. Recomenda aprovar se VPL &gt; 0 e TIR ≥ custo de capital + 5 p.p.</p></div></div></section>' +
      '<section class="panel"><h2>Modos de dados</h2><div class="grid three"><div class="metric"><b>Públicos</b><p>Somente fatos oficiais com fonte e o score analítico. Não há valores de gestão.</p></div><div class="metric"><b>Demonstração</b><p>Dados <b>fictícios</b> em <code>data/demo/</code>, gerados por <code>scripts/build-demo.py</code>, para mostrar como seria a gestão.</p></div><div class="metric"><b>Interno</b><p>Mesmo formato do modo demonstração, lido de <code>data/internal/</code>. Aparece automaticamente quando os arquivos existem.</p></div></div>' + (mg ? '<p class="note">Modo atual: <b>' + esc(state.mode === 'demo' ? 'demonstração (dados fictícios)' : 'interno') + '</b>.</p>' : '') + '</section>' +
      '<section class="panel"><h2>Padrões de mercado usados como referência</h2><p class="muted">Inspiração conceitual de layouts e métricas de painéis existentes; nenhum código, marca ou conteúdo proprietário foi copiado.</p><div class="scroll"><table><thead><tr><th>Padrão</th><th>Onde aparece aqui</th><th>Referência</th></tr></thead><tbody>' + (d.references || []).map((r) => '<tr><td><b>' + esc(r.pattern) + '</b></td><td>' + esc(r.where) + '</td><td><a href="' + esc(C.safeUrl(r.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + '</a></td></tr>').join('') + '</tbody></table></div></section>' +
      '<section class="panel"><h2>Fontes públicas (acesso em ' + esc(C.fmtDate(d.config.dataUpdated)) + ')</h2><div class="scroll"><table><thead><tr><th>ID</th><th>Fonte</th><th>Tipo</th><th>Fatos utilizados</th></tr></thead><tbody>' + d.sources.map((s) => '<tr><td><b>' + esc(s.id) + '</b></td><td><a href="' + esc(C.safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + '</a><br><small class="muted">' + esc(s.publisher) + '</small>' + (s.note ? '<br><small class="muted">' + esc(s.note) + '</small>' : '') + '</td><td>' + esc(s.type) + '</td><td><ul class="tight">' + s.facts.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></td></tr>').join('') + '</tbody></table></div></section>';
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
