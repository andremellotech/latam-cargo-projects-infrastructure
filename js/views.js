/* Telas: funcoes puras que recebem (state, data) e devolvem HTML. */
(function (root) {
  'use strict';
  const C = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./core.js') : root.Core;
  const { esc, safeUrl } = C;

  const TITLES = {
    overview: ['Visão geral', 'Rede, marcos públicos e prioridades de atuação em uma única leitura.'],
    network: ['Mapa de atuação', 'Camadas de demanda, score por localidade e corredores públicos da rede.'],
    locations: ['Localidades e diagnóstico', 'Inventário para diagnóstico de terminais e matriz de verificação em campo.'],
    projects: ['Projetos e marcos', 'Marcos públicos de infraestrutura e carteira interna (quando carregada).'],
    kpis: ['Indicadores', 'Indicadores públicos da rede e modelo de KPIs para medição interna.'],
    business: ['Business case', 'Simulador de VPL, TIR e payback com sensibilidade de premissas.'],
    opportunities: ['Novos negócios', 'Hipóteses de atuação ligadas a evidências públicas, com os dados necessários para validar.'],
    governance: ['Governança, método e fontes', 'Como o score é calculado, regras de dados e fontes oficiais rastreáveis.']
  };

  const srcMap = (d) => Object.fromEntries(d.sources.map((s) => [s.id, s]));
  const chips = (ids, d) => { const m = srcMap(d); return (ids || []).map((id) => m[id] ? `<a class="chip src" href="${esc(safeUrl(m[id].url))}" target="_blank" rel="noopener noreferrer" title="${esc(m[id].title)}">${esc(id)}</a>` : '').join(' '); };
  const layerOf = (d, id) => d.config.layers.find((l) => l.id === id) || { label: id, color: '#868e96' };
  const sc = (loc, d) => C.score(loc.components, d.config.scoreWeights);
  const bandName = { high: 'Alta', mid: 'Média', low: 'Moderada' };

  function visible(state, d) {
    return d.locations.filter((l) =>
      (state.country === 'all' || l.country === state.country) &&
      (state.layers.length === 0 || l.layers.some((x) => state.layers.includes(x))) &&
      sc(l, d) >= state.minScore);
  }

  function scorePill(s, d) { const b = C.band(s, d.config.bands); return `<span class="score-pill ${b}" title="Prioridade ${bandName[b]}">${s}</span>`; }
  const confChip = (c) => `<span class="chip conf-${esc(c)}">Confiança ${esc(c)}</span>`;
  const empty = (msg) => `<div class="empty">${msg}</div>`;

  function kpiCards(d, limit) {
    const items = limit ? d.kpis.slice(0, limit) : d.kpis;
    return `<div class="grid cards">${items.map((k) => `<div class="card"><div class="label">${esc(k.name)}</div><div class="value">${esc(k.prefix || '')}${C.fmtDec(k.value, Number.isInteger(k.value) ? 0 : 1)}</div><div class="sub">${esc(k.unit)} ${chips(k.sources, d)}</div>${k.note ? `<div class="knote">${esc(k.note)}</div>` : ''}</div>`).join('')}</div>`;
  }

  function rankingBars(locs, d) {
    if (!locs.length) return empty('Nenhuma localidade para os filtros selecionados.');
    return [...locs].sort((a, b) => sc(b, d) - sc(a, d)).map((l) => {
      const s = sc(l, d), b = C.band(s, d.config.bands);
      return `<button type="button" class="bar-row" data-loc="${esc(l.code)}" data-goto="network"><span><b>${esc(l.code)}</b> ${esc(l.name)}</span><span class="bar"><i class="${b}" style="width:${s}%"></i></span><b>${s}</b></button>`;
    }).join('');
  }

  function overview(state, d) {
    const locs = visible(state, d);
    const internal = state.internal && state.internal.projects ? `Carregados (${state.internal.projects.length} projetos)` : 'Não carregados';
    return `
      <div class="callout">${esc(d.config.disclaimer)}</div>
      ${kpiCards(d, 8)}
      <div class="grid two">
        <section class="panel"><h2>Ranking de relevância para atuação</h2><p class="muted">Score 0–100 (metodologia em Governança). Clique para abrir no mapa.</p>${rankingBars(locs, d)}</section>
        <section class="panel"><h2>Camadas de dados</h2>
          <ul class="layers-status">
            <li><span class="dot ok"></span><div><b>Públicos</b><small>${d.sources.length} fontes com URL e data de acesso</small></div></li>
            <li><span class="dot an"></span><div><b>Analíticos</b><small>Score, camadas de demanda e hipóteses desta consultoria</small></div></li>
            <li><span class="dot ${state.internal && state.internal.projects ? 'ok' : 'off'}"></span><div><b>Internos</b><small>${esc(internal)} — só em ambiente privado</small></div></li>
          </ul>
        </section>
      </div>
      <section class="panel"><h2>Marcos públicos recentes</h2>${initiativesTable(d.initiatives.slice(0, 4), d)}</section>`;
  }

  function mapSvg(state, d) {
    const m = d.map, k = m.k, lon0 = m.lon0, lat1 = m.lat1;
    const proj = (lon, lat) => [(lon - lon0) * k, (lat1 - lat) * k];
    const vis = new Set(visible(state, d).map((l) => l.code));
    const pos = {};
    d.locations.forEach((l) => { const [x, y] = proj(l.lon, l.lat); const o = l.pinOffset || [0, 0]; pos[l.code] = { x, y, px: x + o[0], py: y + o[1], off: !!l.pinOffset }; });
    const countries = m.countries.map((c) => `<path d="${c.d}" class="land${c.iso === 'BRA' ? ' br' : ''}"><title>${esc(c.name)}</title></path>`).join('');
    const corridors = d.corridors.map((c) => {
      const a = pos[c.from], b = pos[c.to]; if (!a || !b) return '';
      const on = vis.has(c.from) && vis.has(c.to);
      return `<line class="corr${on ? '' : ' dim'}${c.derived ? ' derived' : ''}" x1="${a.px}" y1="${a.py}" x2="${b.px}" y2="${b.py}" stroke-width="${Math.max(2, c.weekly / 2.2)}"><title>${esc(c.from)}→${esc(c.to)}: ${c.weekly}/semana (${esc(c.basis)})</title></line>`;
    }).join('');
    const pins = d.locations.map((l) => {
      const p = pos[l.code], s = sc(l, d), r = 9 + (l.components.demand / 100) * 10, col = layerOf(d, l.primaryLayer).color;
      const on = vis.has(l.code), sel = state.selected === l.code;
      const leader = p.off ? `<line class="leader" x1="${p.x}" y1="${p.y}" x2="${p.px}" y2="${p.py}"/><circle class="anchor" cx="${p.x}" cy="${p.y}" r="2.5"/>` : '';
      return `${leader}<g class="pin${on ? '' : ' dim'}${sel ? ' sel' : ''}" data-loc="${esc(l.code)}" tabindex="0" role="button" aria-label="${esc(l.code)} ${esc(l.name)}, score ${s}" transform="translate(${p.px},${p.py})">
        <circle r="${r + 4}" class="halo"/><circle r="${r}" fill="${col}" class="dotc"/><text class="pt" text-anchor="middle" dy="3.5">${s}</text>
        <text class="pl" x="${l.labelSide === 'left' ? -(r + 6) : r + 6}" text-anchor="${l.labelSide === 'left' ? 'end' : 'start'}" dy="4">${esc(l.code)}</text></g>`;
    }).join('');
    return `<svg class="map" viewBox="0 0 ${m.viewBox[2]} ${m.viewBox[3]}" role="group" aria-label="Mapa das Américas com localidades de atuação">${countries}${corridors}${pins}</svg>`;
  }

  function detail(state, d) {
    const l = d.locations.find((x) => x.code === state.selected);
    if (!l) return `<section class="panel"><h2>Detalhe da localidade</h2>${empty('Selecione um ponto no mapa para ver o score, as evidências e as frentes sugeridas.')}</section>`;
    const s = sc(l, d), w = d.config.scoreWeights, lab = d.config.scoreLabels;
    const bars = Object.keys(w).map((k) => `<div class="brk"><span>${esc(lab[k])} <small>(${Math.round(w[k] * 100)}%)</small></span><span class="bar"><i style="width:${l.components[k]}%"></i></span><b>${l.components[k]}</b></div>`).join('');
    return `<section class="panel detail"><div class="dhead"><div><h2>${esc(l.code)} · ${esc(l.name)}</h2><p class="muted">${esc(l.country)} — ${esc(l.role)}</p></div>${scorePill(s, d)}</div>
      <div class="chips">${l.layers.map((id) => `<span class="chip" style="--c:${layerOf(d, id).color}"><i></i>${esc(layerOf(d, id).label)}</span>`).join('')} ${confChip(l.confidence)}</div>
      <h3>Composição do score</h3>${bars}
      <h3>Evidências públicas ${chips(l.sources, d)}</h3><ul>${l.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      <h3>Frentes sugeridas</h3><ul>${l.focus.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      <p class="note"><b>Racional:</b> ${esc(l.rationale)}</p></section>`;
  }

  function network(state, d) {
    const countries = [...new Set(d.locations.map((l) => l.country))];
    const layerChips = d.config.layers.map((l) => `<button type="button" class="chip toggle${state.layers.includes(l.id) ? ' on' : ''}" style="--c:${l.color}" data-layer="${esc(l.id)}" aria-pressed="${state.layers.includes(l.id)}"><i></i>${esc(l.label)}</button>`).join('');
    const locs = visible(state, d);
    const rows = [...locs].sort((a, b) => sc(b, d) - sc(a, d)).map((l) => `<tr data-loc="${esc(l.code)}" class="clickable${state.selected === l.code ? ' sel' : ''}"><td><b>${esc(l.code)}</b><br><small class="muted">${esc(l.name)}, ${esc(l.country)}</small></td><td>${l.layers.map((id) => esc(layerOf(d, id).label)).join(', ')}</td><td>${scorePill(sc(l, d), d)}</td><td>${confChip(l.confidence)}</td><td>${esc(l.focus[0])}</td></tr>`).join('');
    return `
      <div class="grid map-grid">
        <section class="panel">
          <div class="toolbar"><div class="chips">${layerChips}<button type="button" class="chip" data-reset-layers="1">Todas as camadas</button></div>
            <label class="slider">Score mínimo <b id="minv">${state.minScore}</b><input type="range" id="minscore" min="0" max="100" step="5" value="${state.minScore}" data-minscore="1"></label></div>
          ${mapSvg(state, d)}
          <p class="muted small">Tamanho do ponto = índice de demanda (proxy público); número = score; cor = camada principal. Linhas = corredores com frequência semanal (VCP–MAO é valor derivado). Posições geográficas aproximadas; polígonos: ${esc(d.map.source)}.</p>
        </section>
        ${detail(state, d)}
      </div>
      <section class="panel"><h2>Ranking e camadas (${locs.length} de ${d.locations.length})</h2>${locs.length ? `<div class="scroll"><table><thead><tr><th>Localidade</th><th>Camadas de demanda</th><th>Score</th><th>Evidência</th><th>Primeira frente</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Nenhuma localidade atende aos filtros. Reduza o score mínimo ou limpe as camadas.')}</section>`;
  }

  function locations(state, d) {
    const locs = visible(state, d);
    const matrix = ['Área total e área útil por tipo de carga', 'Docas: quantidade, janelas e tempo de permanência', 'Câmaras frias e zonas de temperatura', 'Equipamentos e ativos de movimentação', 'Sistemas, rastreabilidade e dados', 'Segurança operacional e AVSEC', 'Fluxo: recebimento, triagem, expedição', 'Integração rodoviária e parceiros', 'Restrições aeroportuárias e de expansão'];
    return `<section class="panel"><h2>Inventário para diagnóstico</h2><div class="scroll"><table><thead><tr><th>Localidade</th><th>País</th><th>Papel público</th><th>Condição física</th><th>Score</th><th>Fontes</th></tr></thead><tbody>
      ${locs.map((l) => `<tr><td><b>${esc(l.code)}</b><br><small class="muted">${esc(l.name)}</small></td><td>${esc(l.country)}</td><td>${esc(l.role)}</td><td><span class="chip">A validar em campo</span></td><td>${scorePill(sc(l, d), d)}</td><td>${chips(l.sources, d)}</td></tr>`).join('') || `<tr><td colspan="6">${empty('Nenhuma localidade para os filtros.')}</td></tr>`}
      </tbody></table></div></section>
      <section class="panel"><h2>Matriz de verificação em campo</h2><p class="muted">Itens a levantar em cada terminal antes de qualquer decisão de investimento.</p><div class="grid three">${matrix.map((m) => `<div class="metric">${esc(m)}</div>`).join('')}</div></section>
      <section class="panel"><h2>Classificação de condição</h2><div class="chips"><span class="chip ok-c">Adequado</span><span class="chip warn-c">Atenção</span><span class="chip bad-c">Crítico</span></div><p class="muted">A classificação só deve ser preenchida com dados internos e evidência de campo.</p></section>`;
  }

  function initiativesTable(items, d) {
    return `<div class="scroll"><table><thead><tr><th>Marco</th><th>Local</th><th>Tipo</th><th>Status</th><th>Data</th><th>Fonte</th></tr></thead><tbody>${items.map((i) => `<tr><td><b>${esc(i.name)}</b><br><small class="muted">${esc(i.summary)}</small></td><td>${esc(i.location)}</td><td>${esc(i.type)}</td><td><span class="chip ok-c">${esc(i.status)}</span></td><td>${esc(i.date)}</td><td>${chips(i.sources, d)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function projects(state, d) {
    const stages = ['Diagnóstico', 'Conceito', 'Viabilidade', 'Business case', 'Aprovação', 'Projeto', 'Implantação', 'Operação'];
    const ip = state.internal && state.internal.projects;
    const internal = ip && ip.length ? `<div class="scroll"><table><thead><tr><th>Projeto</th><th>Local</th><th>Fase</th><th>Avanço</th><th>CAPEX</th><th>Risco</th><th>Status</th></tr></thead><tbody>${ip.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.location)}</td><td>${esc(p.phase)}</td><td><span class="bar"><i style="width:${Math.min(100, Math.max(0, Number(p.progress) || 0))}%"></i></span> ${esc(p.progress)}%</td><td>${p.capex == null ? 'n/d' : esc(C.fmtMoney(Number(p.capex)))}</td><td>${esc(p.risk)}</td><td>${esc(p.status)}</td></tr>`).join('')}</tbody></table></div>`
      : empty('Nenhum projeto interno carregado. Para exibir a carteira, crie <code>data/internal/projects.json</code> seguindo <code>templates/internal-projects.template.json</code> em repositório privado.');
    return `<section class="panel"><h2>Marcos públicos de infraestrutura e malha</h2>${initiativesTable(d.initiatives, d)}</section>
      <section class="panel"><h2>Carteira interna</h2>${internal}</section>
      <section class="panel"><h2>Ciclo de projeto</h2><div class="pipeline">${stages.map((s, i) => `<div class="stage"><small>${i + 1}</small>${s}</div>`).join('')}</div></section>`;
  }

  function kpis(state, d) {
    const groups = [['Operacional', 'Throughput, toneladas processadas, produtividade (t/h), tempo de permanência, nível de serviço'], ['Infraestrutura', 'Ocupação, capacidade utilizada, disponibilidade de ativos, condição dos ativos, backlog de melhorias'], ['Projetos', 'Avanço físico e financeiro, aderência ao prazo, CAPEX realizado x planejado, desvios'], ['Financeiro', 'CAPEX, OPEX, custo por tonelada, saving, retorno dos investimentos']];
    return `${kpiCards(d)}<section class="panel"><h2>Modelo de KPIs para medição interna</h2><p class="muted">Sem valores: só devem ser preenchidos com dados autorizados, definição, responsável e periodicidade.</p><div class="grid two">${groups.map((g) => `<div class="metric"><b>${esc(g[0])}</b><p>${esc(g[1])}</p></div>`).join('')}</div></section>`;
  }

  const DEF = { capex: 10000000, benefit: 3000000, opex: 500000, years: 10, rate: 12, benefitGrowth: 3, opexGrowth: 3, residual: 0 };
  const FIELDS = [['capex', 'CAPEX inicial (R$)', 'Investimento no ano 0'], ['benefit', 'Benefício anual (R$)', 'Receita incremental + saving, ano 1'], ['opex', 'OPEX anual (R$)', 'Custo operacional incremental, ano 1'], ['years', 'Horizonte (anos)', '1 a 40'], ['rate', 'Taxa de desconto (% a.a.)', 'Custo de capital'], ['benefitGrowth', 'Crescimento do benefício (% a.a.)', ''], ['opexGrowth', 'Crescimento do OPEX (% a.a.)', ''], ['residual', 'Valor residual (R$)', 'Somado ao último ano']];

  function readCalc(raw) {
    const msgs = []; const g = (k, lo, hi) => { let v = C.parseNum(raw[k], DEF[k]); if (raw[k] !== undefined && String(raw[k]).trim() !== '' && !Number.isFinite(Number(String(raw[k]).replace(',', '.')))) msgs.push(`Valor inválido em "${k}"; usando ${DEF[k]}.`); if (v < lo) { v = lo; msgs.push(`"${k}" ajustado para o mínimo (${lo}).`); } if (v > hi) { v = hi; msgs.push(`"${k}" ajustado para o máximo (${hi}).`); } return v; };
    const inp = { capex: g('capex', 0, 1e12), benefit: g('benefit', 0, 1e12), opex: g('opex', 0, 1e12), years: Math.round(g('years', 1, 40)), rate: g('rate', -50, 100) / 100, benefitGrowth: g('benefitGrowth', -50, 100) / 100, opexGrowth: g('opexGrowth', -50, 100) / 100, residual: g('residual', 0, 1e12) };
    return { inp, msgs };
  }

  function calcResults(raw) {
    const { inp, msgs } = readCalc(raw || {});
    const r = C.evaluate(inp);
    const verdict = r.npv > 0 ? ['ok-c', 'VPL positivo nas premissas informadas'] : ['bad-c', 'VPL não positivo nas premissas informadas'];
    const cls = (v) => (v >= 0 ? 'pos' : 'neg');
    const bv = [-20, -10, 0, 10, 20], cv = [-10, 0, 10, 20, 30];
    const sens = `<div class="scroll"><table class="sens"><thead><tr><th>Benefício \\ CAPEX</th>${cv.map((c) => `<th>${c > 0 ? '+' : ''}${c}%</th>`).join('')}</tr></thead><tbody>${bv.map((b) => `<tr><th>${b > 0 ? '+' : ''}${b}%</th>${cv.map((c) => { const v = C.evaluate({ ...inp, benefit: inp.benefit * (1 + b / 100), capex: inp.capex * (1 + c / 100) }).npv; return `<td class="${cls(v)}">${esc(C.fmtMoney(v))}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const pb = (v) => (v == null ? 'Não recupera no horizonte' : C.fmtDec(v, 1) + ' anos');
    return `${msgs.length ? `<div class="callout warn">${msgs.map(esc).join('<br>')}</div>` : ''}
      <div class="grid cards"><div class="card"><div class="label">VPL</div><div class="value ${cls(r.npv)}">${esc(C.fmtMoney(r.npv))}</div></div><div class="card"><div class="label">TIR</div><div class="value">${r.irr == null ? 'n/d' : C.fmtDec(r.irr * 100, 1) + '%'}</div></div><div class="card"><div class="label">Payback simples</div><div class="value sm">${esc(pb(r.payback))}</div></div><div class="card"><div class="label">Payback descontado</div><div class="value sm">${esc(pb(r.discPayback))}</div></div></div>
      <p><span class="chip ${verdict[0]}">${verdict[1]}</span></p>
      <h3>Sensibilidade do VPL</h3>${sens}
      <h3>Fluxo de caixa (R$)</h3><div class="scroll"><table><thead><tr><th>Ano</th>${r.flows.map((_, t) => `<th>${t}</th>`).join('')}</tr></thead><tbody><tr><th>Fluxo</th>${r.flows.map((v) => `<td class="${cls(v)}">${esc(C.fmtInt(v))}</td>`).join('')}</tr></tbody></table></div>`;
  }

  function business(state, d) {
    const raw = state.calc || {};
    return `<section class="panel"><h2>Simulador de viabilidade</h2><div class="callout warn">Valores iniciais são <b>exemplo ilustrativo sem relação com a LATAM</b>. Substitua por premissas autorizadas. Análise antes de impostos e financiamento.</div>
      <form id="calc" class="calc-form" onsubmit="return false">${FIELDS.map(([k, l, h]) => `<label>${esc(l)}<input inputmode="decimal" data-calc="${k}" value="${esc(raw[k] !== undefined ? raw[k] : DEF[k])}"><small>${esc(h)}</small></label>`).join('')}</form>
      <div id="calc-results" aria-live="polite">${calcResults(raw)}</div></section>
      <section class="panel"><h2>Premissas mínimas para um business case real</h2><p>Demanda e curva de ramp-up, CAPEX por frente, OPEX incremental, impostos, custo de capital, contingência, vida útil, valor residual e alternativa de não investir.</p></section>`;
  }

  function opportunities(state, d) {
    const locs = new Set(visible(state, d).map((l) => l.code));
    const items = d.opportunities.filter((o) => locs.has(o.location));
    return `<section class="panel"><h2>Hipóteses de atuação</h2><p class="muted">Cada hipótese nasce de uma evidência pública e lista os dados internos necessários para validá-la. Não há estimativa de valor.</p>${items.length ? `<div class="scroll"><table><thead><tr><th>Hipótese</th><th>Local</th><th>Gatilho público</th><th>Dados necessários</th><th>Frente</th></tr></thead><tbody>${items.map((o) => `<tr><td><b>${esc(o.title)}</b><br><span class="chip">${esc(o.category)}</span></td><td>${esc(o.location)}</td><td>${esc(o.trigger)} ${chips(o.sources, d)}</td><td><ul class="tight">${o.dataNeeded.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></td><td>${esc(o.function)}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhuma hipótese para os filtros selecionados.')}</section>
      <section class="panel"><h2>Funil</h2><div class="pipeline">${['Hipótese', 'Triagem', 'Conceito', 'Viabilidade', 'Business case', 'Decisão', 'Implantação'].map((s, i) => `<div class="stage${i === 0 ? ' active' : ''}"><small>${i + 1}</small>${s}</div>`).join('')}</div></section>`;
  }

  function governance(state, d) {
    const w = d.config.scoreWeights, lab = d.config.scoreLabels;
    return `<div class="grid two"><section class="panel"><h2>Metodologia do score</h2><div class="scroll"><table><thead><tr><th>Dimensão</th><th>Peso</th></tr></thead><tbody>${Object.keys(w).map((k) => `<tr><td>${esc(lab[k])}</td><td>${Math.round(w[k] * 100)}%</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">Faixas: alta ≥ ${d.config.bands.high}; média ≥ ${d.config.bands.mid}. O score mede <b>relevância para priorizar diagnóstico</b>, não condição nem necessidade de CAPEX. Componentes são julgamento analítico baseado em evidências públicas; a confiança indica a qualidade dessa evidência.</p></section>
      <section class="panel"><h2>Regras de dados</h2><ul><li>Repositório público: somente dados públicos e analíticos.</li><li>Dados internos: repositório privado, <code>data/internal/</code>, revisão por pull request.</li><li>Sem credenciais, layouts de segurança ou dados pessoais.</li><li>Cada fato novo exige fonte, data de acesso e responsável.</li><li>Uso de marcas conforme diretrizes corporativas.</li></ul></section></div>
      <section class="panel"><h2>Fontes (acesso em ${esc(d.config.dataUpdated)})</h2><div class="scroll"><table><thead><tr><th>ID</th><th>Fonte</th><th>Tipo</th><th>Fatos utilizados</th></tr></thead><tbody>${d.sources.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><br><small class="muted">${esc(s.publisher)}</small>${s.note ? `<br><small class="muted">${esc(s.note)}</small>` : ''}</td><td>${esc(s.type)}</td><td><ul class="tight">${s.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></td></tr>`).join('')}</tbody></table></div></section>`;
  }

  const views = { overview, network, locations, projects, kpis, business, opportunities, governance };
  const api = { TITLES, views, calcResults, visible, sc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Views = api;
})(typeof window !== 'undefined' ? window : globalThis);
