/* Visão consultiva: cálculos e HTML puros, sem DOM, rede ou navegação. */
(function (root) {
  'use strict';
  const C = root.Core;
  const find = (items, id) => items.find((item) => item.id === id);
  const signedMoney = (value) => (value > 0 ? '+' : '') + C.fmtMi(value);
  const signedPct = (value) => (value > 0 ? '+' : '') + C.fmtDec(value * 100, 1) + '%';
  const compactMoney = (value) => Math.abs(value) >= 1e6 ? C.fmtMi(value) : (value < 0 ? '−' : '') + 'R$\u00a0' + C.fmtDec(Math.abs(value) / 1000, 0) + '\u00a0mil';
  const index = (value) => value == null ? '—' : C.fmtDec(value, 2);
  const list = (ids) => ids.length < 2 ? ids.join('') : ids.slice(0, -1).join(', ') + ' e ' + ids[ids.length - 1];

  function need(condition, message) {
    if (!condition) throw new Error('Dados inválidos: ' + message);
  }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function validate(data) {
    need(data && data.meta && data.consultant, 'meta e consultant são obrigatórios.');
    need(data.meta.synthetic === true, 'esta visão exige declaração explícita de dados fictícios (meta.synthetic = true).');
    need(date(data.meta.asOf), 'data de corte inválida.');
    ['projects', 'terminals', 'cases'].forEach((key) => need(Array.isArray(data[key]) && data[key].length, key + ' ausente ou vazio.'));
    need(Array.isArray(data.consultant.decisions), 'decisões ausentes.');
    data.projects.forEach((project) => {
      need(project && typeof project.id === 'string' && project.id && typeof project.name === 'string', 'identificação do projeto ausente.');
      need(Number.isFinite(project.budget) && project.budget > 0, 'orçamento inválido em ' + project.id + '.');
      need(Number.isFinite(project.capexActual) && project.capexActual >= 0, 'CAPEX realizado inválido em ' + project.id + '.');
      need(Number.isFinite(project.progress) && project.progress >= 0 && project.progress <= 100, 'avanço inválido em ' + project.id + '.');
      need(date(project.start) && date(project.endBaseline) && date(project.endForecast), 'datas inválidas em ' + project.id + '.');
      need(project.endBaseline > project.start, 'linha de base inválida em ' + project.id + '.');
    });
    data.cases.forEach((business) => {
      need(business && typeof business.id === 'string' && business.id && typeof business.name === 'string', 'identificação do business case ausente.');
      ['capex', 'benefit', 'opex', 'rate', 'benefitGrowth', 'opexGrowth', 'residual'].forEach((key) => need(Number.isFinite(business[key]), key + ' inválido em ' + business.id + '.'));
      need(business.capex > 0 && business.benefit >= 0 && business.opex >= 0 && business.residual >= 0, 'valores inválidos em ' + business.id + '.');
      need(business.rate >= 0 && business.benefitGrowth > -1 && business.opexGrowth > -1, 'taxas inválidas em ' + business.id + '.');
      need(Number.isInteger(business.years) && business.years >= 1 && business.years <= 40, 'horizonte inválido em ' + business.id + '.');
    });
    ['P04', 'P07'].forEach((id) => need(find(data.projects, id), 'projeto ' + id + ' ausente.'));
    ['BC4', 'BC5'].forEach((id) => need(find(data.cases, id), 'business case ' + id + ' ausente.'));
    ['D1', 'D2', 'D4'].forEach((id) => {
      const decision = find(data.consultant.decisions, id);
      need(decision && typeof decision.owner === 'string' && decision.owner.trim() && date(decision.due), 'responsável ou prazo ausente em ' + id + '.');
    });
    const terminal = data.terminals.find((item) => item.code === find(data.projects, 'P07').terminal);
    need(terminal && terminal.seasonal && date(terminal.seasonal.start), 'início da safra de Santiago ausente.');
  }

  /* Mesmo EVM da demonstração anterior: avanço planejado linear na linha de base. */
  function evm(project, asOf) {
    const start = Date.parse(project.start), end = Date.parse(project.endBaseline);
    const pp = C.clamp((Date.parse(asOf) - start) / (end - start), 0, 1);
    const budget = project.budget, pv = budget * pp, ev = budget * (project.progress / 100), ac = project.capexActual;
    const spi = pv > 0 ? ev / pv : null, cpi = ev > 0 && ac > 0 ? ev / ac : null;
    const done = project.progress >= 100, started = pp > 0 || project.progress > 0;
    const eac = done ? ac : cpi ? budget / cpi : budget;
    const active = started && !done;
    const lowest = Math.min(spi == null ? 9 : spi, cpi == null ? 9 : cpi);
    return { id: project.id, name: project.name, budget, pp, pv, ev, ac, spi, cpi, eac, done, started, active,
      critical: active && lowest < 0.85, delayDays: Math.max(0, C.daysBetween(project.endBaseline, project.endForecast)) };
  }
  function portfolio(projects, asOf) {
    const rows = projects.map((project) => evm(project, asOf));
    const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
    const active = rows.filter((row) => row.active), cost = active.filter((row) => row.cpi != null);
    const pv = sum(active, 'pv'), ac = sum(cost, 'ac');
    const budget = sum(rows, 'budget'), eac = sum(rows, 'eac');
    return { n: rows.length, budget, actual: sum(rows, 'ac'), eac, delta: eac - budget, deltaPct: (eac - budget) / budget,
      spi: pv > 0 ? sum(active, 'ev') / pv : null, cpi: ac > 0 ? sum(cost, 'ev') / ac : null,
      activeCount: active.length, criticalCount: active.filter((row) => row.critical).length,
      criticalIds: active.filter((row) => row.critical).map((row) => row.id), projects: rows };
  }
  function evaluate(business) {
    const result = C.evaluate(business);
    need(Number.isFinite(result.npv) && result.flows.every(Number.isFinite) && (result.irr == null || Number.isFinite(result.irr)), 'fluxo financeiro inválido em ' + business.id + '.');
    const verdict = result.npv <= 0 ? 'no' : result.irr != null && result.irr >= business.rate + 0.05 ? 'yes' : 'maybe';
    return Object.assign({}, business, result, { verdict });
  }
  function caseLine(business) {
    const status = { no: 'não aprovar nas premissas atuais', maybe: 'retorno marginal', yes: 'aprovação recomendada' }[business.verdict];
    return business.id + ': VPL ' + C.fmtMi(business.npv) + '; TIR ' + (business.irr == null ? 'não calculável' : C.fmtDec(business.irr * 100, 1) + '%') +
      ' contra taxa de ' + C.fmtDec(business.rate * 100, 1) + '%; ' + status + '.';
  }

  function build(data) {
    need(C && typeof C.evaluate === 'function', 'módulo financeiro indisponível.');
    validate(data);
    const asOf = data.meta.asOf, pf = portfolio(data.projects, asOf), cases = data.cases.map(evaluate);
    const scl = find(data.projects, 'P07'), mao = find(data.projects, 'P04');
    const sclEvm = find(pf.projects, 'P07'), maoEvm = find(pf.projects, 'P04');
    const seasonal = data.terminals.find((terminal) => terminal.code === scl.terminal).seasonal;
    const gap = C.daysBetween(seasonal.start, scl.endForecast), recovery = maoEvm.delayDays > 0 || maoEvm.eac > mao.budget;
    const source = (id) => { const decision = find(data.consultant.decisions, id); return { id, owner: decision.owner, due: decision.due }; };
    const recommendedIds = cases.filter((business) => business.verdict === 'yes').map((business) => business.id);
    const reviewIds = cases.filter((business) => business.verdict === 'maybe').map((business) => business.id);
    const rejectedIds = cases.filter((business) => business.verdict === 'no').map((business) => business.id);
    const capitalRecommendation = [
      recommendedIds.length ? 'Priorizar ' + recommendedIds.length + (recommendedIds.length === 1 ? ' caso' : ' casos') : '',
      reviewIds.length ? 'reavaliar ' + reviewIds.length + ' de retorno marginal' : '',
      rejectedIds.length ? 'não aprovar ' + rejectedIds.length + ' nas premissas atuais' : ''
    ].filter(Boolean).join('; ') + '.';
    const kpis = [
      { id: 'budget', label: 'CAPEX aprovado', value: C.fmtMi(pf.budget), note: pf.n + ' projetos no portfólio', raw: pf.budget },
      { id: 'eac', label: 'Previsão final', value: C.fmtMi(pf.eac), note: signedMoney(pf.delta) + ' (' + signedPct(pf.deltaPct) + ') vs. aprovado', raw: pf.eac },
      { id: 'spi', label: 'Prazo do portfólio', value: index(pf.spi), note: 'SPI · referência 1,00', raw: pf.spi },
      { id: 'critical', label: 'Projetos críticos', value: String(pf.criticalCount), note: 'de ' + pf.activeCount + ' em curso', raw: pf.criticalCount }
    ];
    const decisions = [
      Object.assign(source('D1'), {
        type: 'Continuidade operacional', title: 'Proteger a safra de Santiago',
        evidence: sclEvm.done ? 'Projeto concluído; validar capacidade entregue e aceite para a safra.' : gap === 0 ? 'Entrega prevista no início da safra.' :
          'Entrega prevista ' + Math.abs(gap) + ' dias ' + (gap > 0 ? 'após o' : 'antes do') + ' início da safra.',
        recommendation: sclEvm.done ? 'Verificar capacidade, treinamento e aceite operacional para a safra.' : gap > 0 ?
          'Aprovar capacidade temporária e comissionamento por módulos, condicionados a custo, testes e aceite.' :
          'Preservar o prazo e validar capacidade, testes e aceite antes da safra.',
        facts: { projectId: scl.id, seasonStart: seasonal.start, forecast: scl.endForecast, seasonGapDays: gap, delayDays: sclEvm.delayDays, eac: sclEvm.eac },
        details: [scl.id + ' · ' + scl.name + '.', 'Início da safra: ' + C.fmtDate(seasonal.start) + '; entrega prevista: ' + C.fmtDate(scl.endForecast) + '.',
          'Avanço físico: ' + C.fmtDec(scl.progress, 0) + '%; SPI ' + index(sclEvm.spi) + '; previsão final ' + C.fmtMi(sclEvm.eac) + '.']
      }),
      Object.assign(source('D2'), {
        type: 'Governança da execução', title: maoEvm.done ? 'Verificar benefícios em Manaus' : recovery ? 'Recuperar a expansão de Manaus' : 'Preservar a entrega de Manaus',
        evidence: (maoEvm.delayDays ? '+' + maoEvm.delayDays + ' dias; ' : 'Sem atraso previsto; ') + C.fmtMi(maoEvm.eac) + ' previstos contra ' + C.fmtMi(mao.budget) + ' aprovados.',
        recommendation: maoEvm.done ? 'Confirmar aceite e medir os benefícios contra o business case.' : recovery ?
          'Revalidar escopo e retorno; submeter recuperação e nova linha de base ao comitê.' : 'Manter os marcos de entrega, o controle de mudanças e a revisão de benefícios.',
        facts: { projectId: mao.id, delayDays: maoEvm.delayDays, eac: maoEvm.eac, budget: mao.budget, deltaPct: (maoEvm.eac - mao.budget) / mao.budget, spi: maoEvm.spi, cpi: maoEvm.cpi },
        details: [mao.id + ' · ' + mao.name + '.', 'Linha de base: ' + C.fmtDate(mao.endBaseline) + '; previsão: ' + C.fmtDate(mao.endForecast) + '.',
          'SPI ' + index(maoEvm.spi) + '; CPI ' + index(maoEvm.cpi) + '; variação de CAPEX: ' + signedPct((maoEvm.eac - mao.budget) / mao.budget) + '.',
          'Revalidar o business case com a previsão atual de CAPEX antes de nova aprovação.']
      }),
      Object.assign(source('D4'), {
        type: 'Alocação de capital', title: 'Rever a próxima aprovação de capital',
        evidence: 'BC5: VPL ' + compactMoney(find(cases, 'BC5').npv) + '; TIR ' + (find(cases, 'BC5').irr == null ? 'não calculável' : C.fmtDec(find(cases, 'BC5').irr * 100, 1) + '%') +
          ' (taxa ' + C.fmtDec(find(cases, 'BC5').rate * 100, 1) + '%).',
        recommendation: capitalRecommendation,
        facts: { recommendedIds, reviewIds, rejectedIds, bc4: find(cases, 'BC4'), bc5: find(cases, 'BC5') },
        details: ['BC5 · ' + find(cases, 'BC5').name + '. ' + caseLine(find(cases, 'BC5')), 'BC4 · ' + find(cases, 'BC4').name + '. ' + caseLine(find(cases, 'BC4')),
          'Recomendados: ' + (list(recommendedIds) || 'nenhum') + '; em revisão: ' + (list(reviewIds) || 'nenhum') + '; não recomendados: ' + (list(rejectedIds) || 'nenhum') + '.',
          'Retorno projetado pelas premissas do caso; não representa benefício realizado. Validar demanda, custos e sensibilidade com Finanças.']
      })
    ];
    const plan = [
      { days: 30, title: 'Diagnóstico pactuado', text: 'Avaliar maturidade e interfaces; validar evidências e prioridades em workshop entre áreas.' },
      { days: 60, title: 'Modelo operacional', text: 'Definir fluxos, papéis e gates; revisar alternativas e business cases com Finanças.' },
      { days: 90, title: 'Piloto e benefícios', text: 'Acompanhar iniciativas aprovadas, capacitar equipes e medir adoção e resultados contra a linha de base.' }
    ];
    const method = 'Diagnóstico com evidências → workshop entre áreas → papéis e gates → piloto e benefícios medidos.';
    const rates = [...new Set(cases.map((business) => C.fmtDec(business.rate * 100, 1) + '%'))];
    const criteria = [
      'Demonstração fictícia com corte em ' + C.fmtDate(asOf) + '. Os dados e as recomendações não representam a LATAM Cargo.',
      'Prazo: avanço planejado linear entre início e término da linha de base. PV = orçamento × avanço planejado; EV = orçamento × avanço físico; SPI = EV ÷ PV. SPI 1,00 corresponde ao plano. O indicador do portfólio considera projetos iniciados e ainda não concluídos.',
      'Custo: CPI = EV ÷ CAPEX realizado; previsão final (EAC) = orçamento ÷ CPI. Sem CPI, usa-se o orçamento; em concluídos, o realizado. A previsão do portfólio soma os projetos. É uma extrapolação, sujeita à validação da linha de base e do avanço físico.',
      'Projetos críticos: menor índice entre SPI e CPI abaixo de 0,85; concluídos e não iniciados ficam fora dessa contagem. Os limites são propostos para esta demonstração.',
      'Retorno: fluxo inicial = −CAPEX; fluxos anuais = benefício incremental − OPEX incremental, com os crescimentos e o residual informados em cada caso. VPL desconta esses fluxos pela taxa do caso; TIR é a taxa que zera o VPL. Taxas atuais: ' + rates.join(', ') + ' ao ano. VPL não positivo: não aprovar nas premissas atuais; positivo e TIR pelo menos 5 pontos percentuais acima da taxa: recomendar; demais casos: revisar. São critérios ilustrativos.',
      'Método proposto: avaliar governança de capital, portfólio, engenharia/implantação, processos, dados/benefícios e pessoas. Registrar evidências e lacunas, sem atribuir maturidade à companhia. Workshop valida o problema, o fluxo futuro, os responsáveis e o piloto. Gates organizam demanda, alternativas, investimento, implantação, aceite e benefícios. Aprovações seguem as alçadas reais; este modelo não descreve o processo oficial da LATAM.'
    ];
    return { asOf, synthetic: true, portfolio: pf, cases, kpis, decisions, plan, method, criteria };
  }

  function render(data, options) {
    const model = build(data), esc = C.esc;
    const actions = { D1: ['projects', 'proj', 'P07', 'Abrir projeto P07'], D2: ['projects', 'proj', 'P04', 'Abrir projeto P04'], D4: ['business', 'caseId', 'BC5', 'Abrir business case BC5'] };
    const action = (id) => {
      const target = options && options.actions && actions[id];
      return target ? '<button type="button" class="linkish decision-action" data-goto="' + esc(target[0]) + '" data-set="' + esc(target[1]) + '" data-val="' + esc(target[2]) + '" data-resetscope="all">' + esc(target[3]) + ' →</button>' : '';
    };
    const kpis = '<section class="kpis" aria-label="Indicadores do portfólio">' + model.kpis.map((kpi) =>
      '<article class="kpi"><p class="kpi-label">' + esc(kpi.label) + '</p><strong class="kpi-value">' + esc(kpi.value) + '</strong><p class="kpi-note">' + esc(kpi.note) + '</p></article>').join('') + '</section>';
    const decisions = '<section class="decisions-section" aria-labelledby="decisions-title"><h2 id="decisions-title">Decisões prioritárias</h2><div class="decisions">' + model.decisions.map((decision) =>
      '<article class="decision"><p class="decision-type">' + esc(decision.type) + '</p><h3>' + esc(decision.title) + '</h3><p class="evidence">' + esc(decision.evidence) + '</p>' +
      '<p class="recommendation">' + esc(decision.recommendation) + '</p><div class="decision-meta"><span>' + esc(decision.owner) + '</span><span>Decidir até <time datetime="' + esc(decision.due) + '">' + esc(C.fmtDate(decision.due)) + '</time></span></div>' +
      '<details class="decision-details"><summary>Fundamento</summary><ul>' + decision.details.map((detail) => '<li>' + esc(detail) + '</li>').join('') + '</ul></details>' + action(decision.id) + '</article>').join('') + '</div></section>';
    const plan = '<section id="actionPlan" class="plan-section" aria-labelledby="plan-title"><h2 id="plan-title">Plano proposto</h2><div class="plan-grid">' + model.plan.map((item) =>
      '<article class="plan-item"><h3><span>' + item.days + ' dias</span> ' + esc(item.title) + '</h3><p>' + esc(item.text) + '</p></article>').join('') + '</div></section>';
    return kpis + decisions + plan + '<p class="method"><strong>Método</strong> ' + esc(model.method) + '</p>' +
      '<details class="method-details"><summary>Premissas e critérios</summary>' + model.criteria.map((criterion) => '<p>' + esc(criterion) + '</p>').join('') + '</details>';
  }

  const api = { build, render };
  root.Consulting = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
