/* Logica de gestao: valor agregado (EVM), status de projetos, casos, fornecedores, riscos e insights do consultor. */
(function (root) {
  'use strict';
  const C = root.Core;

  function plannedPct(p, asOf) {
    const s = Date.parse(p.start), e = Date.parse(p.endBaseline), t = Date.parse(asOf);
    return e > s ? C.clamp((t - s) / (e - s), 0, 1) : 0;
  }
  /* Linha de base: progresso planejado linear entre inicio e fim base. */
  function evm(p, asOf) {
    const pp = plannedPct(p, asOf), b = p.budget, ac = p.capexActual;
    const pv = b * pp, ev = b * (p.progress / 100);
    const spi = pv > 0 ? ev / pv : null, cpi = ev > 0 && ac > 0 ? ev / ac : null;
    const done = p.progress >= 100;
    const eac = done ? ac : cpi ? b / cpi : b;
    return { pp, pv, ev, ac, spi, cpi, eac, vac: b - eac, vacPct: (eac - b) / b, done, started: pp > 0 || p.progress > 0, delayDays: Math.max(0, C.daysBetween(p.endBaseline, p.endForecast)) };
  }
  function projectStatus(p, asOf) {
    const e = evm(p, asOf);
    if (e.done) return { rag: e.eac <= p.budget * 1.05 ? 'g' : 'a', label: 'Concluído', e };
    if (!e.started) return { rag: 'n', label: 'Não iniciado', e };
    const m = Math.min(e.spi == null ? 9 : e.spi, e.cpi == null ? 9 : e.cpi);
    const r = m < 0.85 ? 'r' : m < 0.95 ? 'a' : 'g';
    return { rag: r, label: { r: 'Crítico', a: 'Atenção', g: 'No plano' }[r], e };
  }
  function portfolio(projects, asOf) {
    const st = projects.map((p) => ({ p, s: projectStatus(p, asOf) }));
    const sum = (f) => st.reduce((a, x) => a + f(x), 0);
    const act = st.filter((x) => x.s.e.started && !x.s.e.done);
    const pv = act.reduce((a, x) => a + x.s.e.pv, 0), ev = act.reduce((a, x) => a + x.s.e.ev, 0);
    const acs = act.filter((x) => x.s.e.cpi != null), evc = acs.reduce((a, x) => a + x.s.e.ev, 0), acc = acs.reduce((a, x) => a + x.s.e.ac, 0);
    const counts = { g: 0, a: 0, r: 0, n: 0 }; st.forEach((x) => { counts[x.s.rag]++; });
    const budget = sum((x) => x.p.budget), eac = sum((x) => x.s.e.eac);
    return { n: projects.length, budget, actual: sum((x) => x.p.capexActual), eac, vac: budget - eac, vacPct: budget ? (eac - budget) / budget : 0, spi: pv > 0 ? ev / pv : null, cpi: acc > 0 ? evc / acc : null, counts, st };
  }
  /* S-curve acumulada (planejado, realizado ate a data e previsao) a partir dos arrays mensais dos projetos. */
  function scurve(projects, tlMonths, asOfIdx) {
    const plan = Array(tlMonths).fill(0), act = Array(tlMonths).fill(0), fc = Array(tlMonths).fill(0);
    projects.forEach((p) => {
      p.spendPlan.forEach((v, i) => { plan[i] += v; });
      p.spendActual.forEach((v, i) => { act[i] += v; });
      p.spendForecast.forEach((v, i) => { fc[asOfIdx + 1 + i] += v; });
    });
    const cum = (a) => { let s = 0; return a.map((v) => (s += v)); };
    const cp = cum(plan), ca = cum(act), cf = cum(act.map((v, i) => v + fc[i]));
    return { planned: cp, actual: ca.map((v, i) => (i <= asOfIdx ? v : null)), forecast: cf.map((v, i) => (i >= asOfIdx ? v : null)) };
  }

  const caseInputs = (c) => ({ capex: c.capex, benefit: c.benefit, opex: c.opex, years: c.years, rate: c.rate, benefitGrowth: c.benefitGrowth, opexGrowth: c.opexGrowth, residual: c.residual });
  function verdict(r, rate) {
    if (!(r.npv > 0)) return { key: 'no', label: 'Não aprovar nas premissas atuais', rag: 'r' };
    if (r.irr != null && r.irr >= rate + 0.05) return { key: 'yes', label: 'Recomendar aprovação', rag: 'g' };
    return { key: 'maybe', label: 'Reavaliar premissas (retorno marginal)', rag: 'a' };
  }
  function evalCase(c) { const inp = caseInputs(c), r = C.evaluate(inp); return Object.assign({ inp }, r, { verdict: verdict(r, c.rate) }); }
  function tornado(c) {
    const inp = caseInputs(c), base = C.evaluate(inp).npv, at = (o) => C.evaluate(Object.assign({}, inp, o)).npv - base;
    const items = [
      { label: 'Benefício anual (±20%)', low: at({ benefit: inp.benefit * 0.8 }), high: at({ benefit: inp.benefit * 1.2 }) },
      { label: 'CAPEX (±20%)', low: at({ capex: inp.capex * 1.2 }), high: at({ capex: inp.capex * 0.8 }) },
      { label: 'OPEX anual (±20%)', low: at({ opex: inp.opex * 1.2 }), high: at({ opex: inp.opex * 0.8 }) },
      { label: 'Taxa de desconto (±2 p.p.)', low: at({ rate: inp.rate + 0.02 }), high: at({ rate: inp.rate - 0.02 }) },
      { label: 'Crescimento do benefício (±2 p.p.)', low: at({ benefitGrowth: inp.benefitGrowth - 0.02 }), high: at({ benefitGrowth: inp.benefitGrowth + 0.02 }) }];
    items.sort((a, b) => (b.high - b.low) - (a.high - a.low));
    return { base, items };
  }

  const SUP_W = { sla: 0.4, cost: 0.25, safety: 0.2, resp: 0.15 };
  function supplierScore(s, asOf) {
    const slaAvg = s.sla.reduce((a, b) => a + b, 0) / s.sla.length;
    const slaTrend = s.sla.slice(-3).reduce((a, b) => a + b, 0) / 3 - s.sla.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const slaPts = C.clamp((slaAvg / s.slaTarget) * 100, 0, 100), costPts = C.clamp(100 - (s.costIndex - 100) * 2.5, 0, 100);
    const sc = Math.round(slaPts * SUP_W.sla + costPts * SUP_W.cost + (s.safety / 5) * 100 * SUP_W.safety + (s.responsiveness / 5) * 100 * SUP_W.resp);
    const days = C.daysBetween(asOf, s.contractEnd);
    const rag = sc >= 85 ? 'g' : sc >= 70 ? 'a' : 'r';
    const action = days <= 180 ? (sc < 85 ? 'Renegociar antes do vencimento' : 'Renovar') : rag === 'g' ? 'Manter' : rag === 'a' ? 'Plano de melhoria' : 'Reavaliar contrato';
    return { score: sc, slaAvg, slaGap: slaAvg - s.slaTarget, slaTrend, costPts, days, rag, action };
  }
  const weightedValue = (o) => o.annualValue * (o.probability / 100);

  const latest = (a) => a[a.length - 1];
  const kscale = (def) => def.scale || 1;
  const kfmt = (def, v) => (Number.isFinite(v) ? C.fmtDec(v / kscale(def), def.decimals) : '–');
  const kflat = (def, d) => Math.abs(d) < 0.5 * Math.pow(10, -(def.decimals || 0)) * kscale(def);   // variacao que arredonda para zero
  const kdelta = (def, d) => (d == null ? '–' : (kflat(def, d) ? '► ' : d > 0 ? '▲ +' : '▼ −') + C.fmtDec(Math.abs(d) / kscale(def), def.decimals));
  /* Status de uma serie contra uma meta: ultimo valor, variacao vs media dos 3 meses anteriores e semaforo. */
  function statusFor(def, values, target) {
    const v = latest(values), prev = values.length > 3 ? values.slice(-4, -1).reduce((a, b) => a + b, 0) / 3 : null;
    const hasT = target != null && Number.isFinite(target);
    const delta = prev == null ? null : v - prev;
    const good = delta == null || kflat(def, delta) || def.dir === 'info' ? null : def.dir === 'min' ? delta < 0 : delta > 0;
    return { value: v, target: hasT ? target : null, rag: hasT ? C.rag(v, target, def.dir, def.tol) : 'n', delta, good };
  }
  const kpiStatus = (def, terminal, values) => statusFor(def, values, def.targetKey ? terminal.targets[def.targetKey] : null);

  const tierDefs = (mg, tier) => mg.series.defs.filter((x) => x.tier === tier);
  const defById = (mg, id) => mg.series.defs.find((x) => x.id === id);
  /* Meses consecutivos (ate o ultimo) fora da meta, isto e, em atencao ou vermelho. Sem meta: 0. */
  function streak(def, values, targets) {
    let n = 0;
    for (let i = values.length - 1; i >= 0; i--) { const r = C.rag(values[i], targets[i], def.dir, def.tol); if (r === 'g' || r === 'n') break; n++; }
    return n;
  }
  /* Meta mensal de um terminal: serie propria (ex.: contribuicao orcada) ou o valor fixo do terminal. */
  function targetSeriesFor(mg, def, code) {
    const S = mg.series.byTerminal[code];
    if (def.targetSeries) return S[def.targetSeries] || null;
    const t = mg.terminals.find((x) => x.code === code);
    return def.targetKey && t && t.targets[def.targetKey] != null ? Array(mg.series.months.length).fill(t.targets[def.targetKey]) : null;
  }
  function termStatus(mg, def, code) {
    const vals = mg.series.byTerminal[code][def.id], ts = targetSeriesFor(mg, def, code);
    return Object.assign(statusFor(def, vals, ts ? latest(ts) : null), { streak: ts ? streak(def, vals, ts) : 0, values: vals });
  }

  /* ---- consolidacao da rede: somas e razoes recalculadas (nao media de medias) ---- */
  const selTerminals = (mg, vis) => mg.terminals.filter((t) => !vis || vis.has(t.code));
  function netValue(mg, def, ts, i) {
    const S = mg.series.byTerminal, sum = (k) => ts.reduce((a, t) => a + S[t.code][k][i], 0);
    switch (def.id) {
      case 'occupancy': return (sum('throughput') / ts.reduce((a, t) => a + t.capacityTMonth, 0)) * 100;
      case 'costPerT': return sum('opex') / sum('throughput');
      case 'yield': return sum('revenue') / sum('throughput');
      case 'opexAdherence': return (sum('opex') / sum('opexBudget')) * 100;
      case 'margin': { const r = sum('revenue'); return ((r - sum('opex')) / r) * 100; }
      default: {
        if (def.agg === 'sum') return sum(def.id);
        const w = sum('throughput');
        return ts.reduce((a, t) => a + S[t.code][def.id][i] * S[t.code].throughput[i], 0) / w;
      }
    }
  }
  function networkSeries(mg, def, vis) {
    const ts = selTerminals(mg, vis);
    if (!ts.length || !mg.series.byTerminal[ts[0].code][def.id]) return null;
    return mg.series.months.map((_, i) => netValue(mg, def, ts, i));
  }
  function networkTarget(mg, def, vis) {
    const ts = selTerminals(mg, vis); if (!ts.length) return null;
    if (def.targetSeries) return ts.reduce((a, t) => a + latest(mg.series.byTerminal[t.code][def.targetSeries]), 0);
    if (!def.targetKey) return null;
    if (def.agg === 'sum') return ts.reduce((a, t) => a + t.targets[def.targetKey], 0);
    const S = mg.series.byTerminal, w = (t) => latest(S[t.code].throughput), tw = ts.reduce((a, t) => a + w(t), 0);
    return ts.reduce((a, t) => a + t.targets[def.targetKey] * w(t), 0) / tw;
  }
  function networkTargetSeries(mg, def, vis) {
    const ts = selTerminals(mg, vis), tg = networkTarget(mg, def, vis); if (!ts.length || tg == null) return null;
    return def.targetSeries ? mg.series.months.map((_, i) => ts.reduce((a, t) => a + mg.series.byTerminal[t.code][def.targetSeries][i], 0)) : Array(mg.series.months.length).fill(tg);
  }
  function networkStatus(mg, def, vis) {
    const v = networkSeries(mg, def, vis); if (!v) return null;
    const tg = networkTarget(mg, def, vis), tser = tg == null ? null : networkTargetSeries(mg, def, vis);
    return Object.assign({ series: v }, statusFor(def, v, tg), { streak: tser ? streak(def, v, tser) : 0 });
  }

  /* Desvio de OPEX = efeito volume (custo variavel) + efeito custo unitario. Identidade exata:
     real - orcado = (vol_real - vol_orcado) x custo_meta + (custo_real - custo_meta) x vol_real. */
  function opexVariance(mg, code, i) {
    const S = mg.series.byTerminal[code], t = mg.terminals.find((x) => x.code === code), tgt = t.targets.costPerT;
    return { code, actual: S.opex[i], budget: S.opexBudget[i], total: S.opex[i] - S.opexBudget[i], volume: (S.throughput[i] - S.volumeBudget[i]) * tgt, rate: (S.costPerT[i] - tgt) * S.throughput[i] };
  }
  function opexBridge(mg, vis, i) {
    const rows = selTerminals(mg, vis).map((t) => opexVariance(mg, t.code, i)), sum = (k) => rows.reduce((a, r) => a + r[k], 0);
    return { rows, actual: sum('actual'), budget: sum('budget'), total: sum('total'), volume: sum('volume'), rate: sum('rate') };
  }

  /* Contribuicao real - orcada = efeito volume + efeito receita por tonelada (preco) + efeito custo por tonelada.
     Identidade exata: (v - vb)(yT - cT) + v(y - yT) - v(c - cT) = v(y - c) - vb(yT - cT). */
  function contributionVariance(mg, code, i) {
    const S = mg.series.byTerminal[code], t = mg.terminals.find((x) => x.code === code), yT = t.targets.yield, cT = t.targets.costPerT;
    const v = S.throughput[i], vb = S.volumeBudget[i], y = S.yield[i], c = S.costPerT[i];
    return { code, actual: S.contribution[i], budget: S.contributionBudget[i], total: S.contribution[i] - S.contributionBudget[i], volume: (v - vb) * (yT - cT), price: v * (y - yT), cost: -v * (c - cT) };
  }
  function contributionBridge(mg, vis, i) {
    const rows = selTerminals(mg, vis).map((t) => contributionVariance(mg, t.code, i)), sum = (k) => rows.reduce((a, r) => a + r[k], 0);
    return { rows, actual: sum('actual'), budget: sum('budget'), total: sum('total'), volume: sum('volume'), price: sum('price'), cost: sum('cost') };
  }
  const hasContribution = (mg, vis) => { const ts = selTerminals(mg, vis); return !!(ts.length && ts.every((t) => mg.series.byTerminal[t.code].contribution && mg.series.byTerminal[t.code].contributionBudget && mg.series.byTerminal[t.code].volumeBudget && mg.series.byTerminal[t.code].yield)); };

  /* Linhas do quadro executivo: um KPI de nivel 1 por linha, com rede, terminais, duracao e efeito em R$. */
  function execRows(mg, vis) {
    const ts = selTerminals(mg, vis), br = hasContribution(mg, vis) ? contributionBridge(mg, vis, mg.series.months.length - 1) : null;
    return tierDefs(mg, 1).map((def) => {
      const net = networkStatus(mg, def, vis);
      const terms = ts.map((t) => Object.assign({ code: t.code }, termStatus(mg, def, t.code)));
      const gap = (x) => (x.target == null ? -1 : (def.dir === 'min' ? x.value - x.target : x.target - x.value) / Math.abs(x.target));
      const off = terms.filter((x) => x.rag === 'r' || x.rag === 'a').sort((a, b) => (b.rag === 'r') - (a.rag === 'r') || gap(b) - gap(a));
      const nRed = terms.filter((x) => x.rag === 'r').length, nAmber = terms.filter((x) => x.rag === 'a').length;
      const effect = !br ? null : def.id === 'contribution' ? br.total : def.id === 'costPerT' ? br.cost : null;
      return { def, net, terms, nRed, nAmber, nT: terms.length, worst: off[0] || null, masked: !!(net && net.rag === 'g' && nRed > 0), effect };
    });
  }
  /* Leitura executiva: poucas frases, todas calculadas dos dados (sem texto fixo com numeros). */
  function execSummary(mg, vis) {
    const rows = execRows(mg, vis), out = [], tg = rows.filter((r) => r.net && r.net.rag !== 'n');
    if (!tg.length) return out;
    const by = (k) => tg.filter((r) => r.net.rag === k), g = by('g'), a = by('a'), r = by('r'), names = (l) => l.map((x) => x.def.name).join(', ');
    out.push({ tone: r.length ? 'r' : a.length ? 'a' : 'g', text: g.length + ' dos ' + tg.length + ' KPIs executivos da rede estão na meta' + (r.length ? '; ' + r.length + ' no vermelho (' + names(r) + ')' : '') + (a.length ? (r.length ? ' e ' : '; ') + a.length + ' em atenção (' + names(a) + ')' : '') + '.' });
    if (hasContribution(mg, vis)) {
      const br = contributionBridge(mg, vis, mg.series.months.length - 1), pct = br.budget ? (br.total / br.budget) * 100 : 0;
      const eff = [['o volume', br.volume], ['a receita por tonelada', br.price], ['o custo por tonelada', br.cost]].sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0];
      out.push({ tone: pct <= -5 ? 'r' : pct < 0 ? 'a' : 'g', text: 'A contribuição do último mês foi de ' + C.fmtMi(br.actual) + ', ' + C.fmtMi(Math.abs(br.total)) + ' (' + C.fmtDec(Math.abs(pct), 1) + '%) ' + (br.total < 0 ? 'abaixo' : 'acima') + ' do orçado. O maior efeito veio d' + eff[0] + ' (' + (eff[1] >= 0 ? '+' : '−') + C.fmtMi(Math.abs(eff[1])) + ').' });
    }
    const reds = {}; rows.forEach((x) => x.terms.forEach((t) => { if (t.rag === 'r') reds[t.code] = (reds[t.code] || 0) + 1; }));
    const top = Object.keys(reds).sort((x, y) => reds[y] - reds[x] || x.localeCompare(y))[0];
    if (top) out.push({ tone: reds[top] >= 3 ? 'r' : 'a', text: top + ' concentra ' + reds[top] + (reds[top] === 1 ? ' vermelho' : ' vermelhos') + ' entre os ' + rows.length + ' KPIs executivos' + (Object.keys(reds).length > 1 ? '; ao todo, ' + Object.keys(reds).length + ' terminais têm ao menos um vermelho' : '') + '.' });
    const nm = mg.series.months.length, join = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1] : l[0]);
    const groups = {}; rows.filter((x) => x.net && x.net.streak >= 3).forEach((x) => { (groups[x.net.streak] = groups[x.net.streak] || []).push(x.def.name); });
    const keys = Object.keys(groups).map(Number).sort((x, y) => y - x);
    if (keys.length) out.push({ tone: 'a', text: 'Fora da meta há mais tempo: ' + keys.map((k) => join(groups[k]) + ' (' + (k >= nm ? 'todos os ' + nm + ' meses da série' : k + ' meses seguidos') + ')').join('; ') + '.' });
    const hid = rows.filter((x) => x.masked);
    if (hid.length) out.push({ tone: 'a', text: 'A média da rede esconde terminais no vermelho em: ' + hid.map((x) => x.def.name + ' (' + join(x.terms.filter((t) => t.rag === 'r').map((t) => t.code)) + ')').join('; ') + '.' });
    return out;
  }

  /* Financeiro do portfolio de projetos: CAPEX x plano, previsao x orcamento e retorno dos casos recomendados. */
  function portfolioFinance(mg, vis, asOf) {
    const inV = (c) => c === 'REDE' || !vis || vis.has(c), idx = mg.meta.timeline.asOfIdx;
    const projs = mg.projects.filter((p) => inV(p.terminal)), pf = portfolio(projs, asOf), ids = new Set(projs.map((p) => p.id));
    const planned = projs.reduce((a, p) => a + p.spendPlan.slice(0, idx + 1).reduce((x, y) => x + y, 0), 0), actual = projs.reduce((a, p) => a + p.capexActual, 0);
    const rec = (mg.cases || []).filter((c) => !c.projectId || ids.has(c.projectId)).map((c) => ({ c, e: evalCase(c) })).filter((x) => x.e.verdict.key === 'yes');
    const npvRec = rec.reduce((a, x) => a + x.e.npv, 0), capexRec = rec.reduce((a, x) => a + x.c.capex, 0);
    return { planned, actual, planDev: planned ? actual / planned : null, bac: pf.budget, eac: pf.eac, eacDev: pf.budget ? pf.eac / pf.budget : null, nRec: rec.length, npvRec, capexRec, pi: capexRec ? npvRec / capexRec : null };
  }

  function health(t) {
    const v = Object.values(t.assessment), avg = v.reduce((a, b) => a + b, 0) / v.length;
    return { avg, rag: avg < 2.5 ? 'r' : avg < 3.5 ? 'a' : 'g', cell: (x) => (x <= 2 ? 'r' : x === 3 ? 'a' : 'g') };
  }
  function networkOcc(mg, vis) {
    let thr = 0, cap = 0;
    mg.terminals.forEach((t) => { if (!vis || vis.has(t.code)) { thr += latest(mg.series.byTerminal[t.code].throughput); cap += t.capacityTMonth; } });
    return cap ? (thr / cap) * 100 : null;
  }

  const SEV = { r: 0, a: 1, i: 2 };
  function insights(mg, asOf, vis) {
    const out = [], inVis = (c) => !vis || c === 'REDE' || vis.has(c), push = (x) => out.push(x);
    const stat = mg.projects.filter((p) => inVis(p.terminal)).map((p) => ({ p, s: projectStatus(p, asOf) }));
    mg.terminals.filter((t) => inVis(t.code)).forEach((t) => {
      const occ = mg.series.byTerminal[t.code].occupancy, last = latest(occ), tgt = t.targets.occupancy; let n = 0;
      for (let i = occ.length - 1; i >= 0 && occ[i] > tgt; i--) n++;
      if (last > tgt) {
        const lk = stat.find((x) => x.p.terminal === t.code && !x.s.e.done && ['Expansão de terminal', 'Fluxo logístico', 'Automação'].includes(x.p.type));
        push({ sev: last >= 90 ? 'r' : 'a', title: t.code + ' opera a ' + C.fmtDec(last, 1) + '% da capacidade (meta ≤ ' + tgt + '%) há ' + n + ' ' + (n === 1 ? 'mês' : 'meses'), detail: 'Permanência de ' + C.fmtDec(latest(mg.series.byTerminal[t.code].dwell), 1) + ' h e nível de serviço de ' + C.fmtDec(latest(mg.series.byTerminal[t.code].service), 1) + '%.', reco: lk ? 'Proteger o prazo de ' + lk.p.id + ' e definir capacidade temporária para os picos.' : 'Avaliar capacidade temporária e abrir diagnóstico de expansão.', goto: 'terminals', ref: t.code });
      }
      if (t.seasonal) {
        stat.filter((x) => x.p.terminal === t.code && x.p.type === 'Cadeia fria' && !x.s.e.done && Date.parse(x.p.endForecast) > Date.parse(t.seasonal.start)).forEach((x) => {
          push({ sev: 'r', title: x.p.id + ' conclui após o início da ' + t.seasonal.label.toLowerCase() + ' em ' + t.code, detail: 'Previsão de ' + C.fmtDate(x.p.endForecast) + ' contra início da temporada em ' + C.fmtDate(t.seasonal.start) + ' (' + C.daysBetween(t.seasonal.start, x.p.endForecast) + ' dias depois).', reco: 'Contratar capacidade temporária e antecipar o comissionamento por módulos.', goto: 'projects', ref: x.p.id });
        });
      }
    });
    stat.filter((x) => x.s.rag === 'r').forEach((x) => {
      push({ sev: 'r', title: x.p.id + ' · ' + x.p.name + ' está crítico', detail: 'SPI ' + C.fmtDec(x.s.e.spi, 2) + ' e CPI ' + C.fmtDec(x.s.e.cpi, 2) + '; EAC de ' + C.fmtMi(x.s.e.eac) + ' (' + (x.s.e.vacPct >= 0 ? '+' : '') + C.fmtDec(x.s.e.vacPct * 100, 0) + '% sobre o orçamento) e ' + x.s.e.delayDays + ' dias de atraso previsto.', reco: 'Replanejar com plano de recuperação, rever escopo e submeter ao comitê.', goto: 'projects', ref: x.p.id });
    });
    const crit = mg.risks.filter((r) => inVis(r.terminal) && C.riskScore(r.probability, r.impact) >= 15);
    if (crit.length) push({ sev: 'r', title: crit.length + ' risco(s) crítico(s) (pontuação ≥ 15)', detail: crit.map((r) => r.id + ' ' + r.title).join('; ') + '.', reco: 'Reservar tempo no comitê para os planos de mitigação e prazos.', goto: 'risks', ref: crit[0].id });
    mg.suppliers.filter((s) => s.terminals.some(inVis)).forEach((s) => {
      const sc = supplierScore(s, asOf);
      if (sc.days >= 0 && sc.days <= 180) push({ sev: sc.rag === 'g' ? 'i' : 'a', title: 'Contrato ' + s.name + ' vence em ' + sc.days + ' dias', detail: 'SLA médio de ' + C.fmtDec(sc.slaAvg, 1) + '% contra meta de ' + s.slaTarget + '%; índice de custo ' + s.costIndex + '; pontuação ' + sc.score + '.', reco: sc.action + '.', goto: 'suppliers', ref: s.id });
    });
    const costly = mg.terminals.filter((t) => inVis(t.code) && latest(mg.series.byTerminal[t.code].costPerT) > t.targets.costPerT * 1.05);
    if (costly.length) push({ sev: 'a', title: costly.length + ' terminal(is) com custo por tonelada acima da meta', detail: costly.map((t) => t.code + ' R$ ' + latest(mg.series.byTerminal[t.code].costPerT) + ' (meta R$ ' + t.targets.costPerT + ')').join('; ') + '.', reco: 'Separar efeito de volume, contrato e ineficiência antes de agir.', goto: 'kpis', ref: 'costPerT' });
    mg.suppliers.filter((s) => s.terminals.some(inVis)).forEach((s) => {
      const sc = supplierScore(s, asOf);
      if (sc.slaTrend <= -1) push({ sev: 'a', title: 'SLA de ' + s.name + ' em queda (' + C.fmtDec(sc.slaTrend, 1).replace('-', '−') + ' p.p. em 6 meses)', detail: 'Média recente de ' + C.fmtDec(s.sla.slice(-3).reduce((a, b) => a + b, 0) / 3, 1) + '% contra meta de ' + s.slaTarget + '%.', reco: 'Abrir plano de ação com o fornecedor antes da renovação.', goto: 'suppliers', ref: s.id });
    });
    const sdef = (id) => mg.series.defs.find((x) => x.id === id), vt = mg.terminals.filter((t) => inVis(t.code)), hasS = (id) => !!(vt.length && mg.series.byTerminal[vt[0].code][id]), has = (id) => !!sdef(id) && hasS(id);
    if (sdef('opexAdherence') && hasS('opexBudget') && hasS('volumeBudget')) {
      const br = opexBridge(mg, vis, mg.series.months.length - 1), ratio = br.actual / br.budget;
      if (ratio > 1.03) {
        const top = [...br.rows].sort((a, b) => b.total - a.total).slice(0, 3).filter((r) => r.total > 0);
        push({ sev: ratio > 1.08 ? 'r' : 'a', title: 'OPEX do último mês em ' + C.fmtMi(br.actual) + ', ' + C.fmtDec((ratio - 1) * 100, 1) + '% acima do orçado (' + C.fmtMi(br.budget) + ')', detail: 'Efeito volume de ' + C.fmtMi(br.volume) + ' e efeito custo unitário de ' + C.fmtMi(br.rate) + '. Maiores desvios: ' + top.map((r) => r.code + ' ' + C.fmtMi(r.total)).join(', ') + '.', reco: 'Tratar separadamente: o efeito volume é custo variável (revisar o orçamento); o efeito custo unitário é preço ou ineficiência (atuar).', goto: 'kpis', ref: 'opexAdherence' });
      }
    }
    if (has('margin')) {
      const low = vt.map((t) => ({ t, s: kpiStatus(sdef('margin'), t, mg.series.byTerminal[t.code].margin) })).filter((x) => x.s.rag === 'r');
      if (low.length) push({ sev: 'a', title: 'Margem de contribuição abaixo da meta em ' + low.map((x) => x.t.code).join(', '), detail: low.map((x) => x.t.code + ' ' + C.fmtDec(x.s.value, 1) + '% (meta ' + C.fmtDec(x.s.target, 0) + '%)').join('; ') + '.', reco: 'Atacar custo por tonelada e permanência nesses terminais e revisar com Finanças a regra de alocação de receita.', goto: 'kpis', ref: 'margin' });
    }
    if (has('tempExc')) vt.forEach((t) => {
      const st = kpiStatus(sdef('tempExc'), t, mg.series.byTerminal[t.code].tempExc);
      if (st.rag !== 'r') return;
      const pj = stat.find((x) => x.p.terminal === t.code && !x.s.e.done && (x.p.type === 'Cadeia fria' || /c[âa]mara|frio/i.test(x.p.name)));
      push({ sev: st.value >= st.target * 2 ? 'r' : 'a', title: 'Cargas fora da faixa de temperatura em ' + t.code + ': ' + C.fmtDec(st.value, 2) + '% das cargas refrigeradas (meta ≤ ' + C.fmtDec(st.target, 2) + '%)', detail: 'Risco de perda de produto e de não conformidade em cargas sensíveis' + (pj ? '; ' + pj.p.id + ' (' + pj.s.label.toLowerCase() + ') trata a capacidade de frio do terminal' : '') + '.', reco: pj ? 'Proteger o prazo de ' + pj.p.id + ' e adotar controle temporário (monitoramento e câmaras móveis).' : 'Auditar a cadeia fria e reforçar o monitoramento de temperatura.', goto: 'kpis', ref: 'tempExc' });
    });
    if (has('traceAcc')) {
      const lowT = vt.map((t) => ({ t, s: kpiStatus(sdef('traceAcc'), t, mg.series.byTerminal[t.code].traceAcc) })).filter((x) => x.s.rag === 'r');
      if (lowT.length) {
        const tech = stat.filter((x) => x.p.type === 'Tecnologia e dados' && !x.s.e.done).map((x) => x.p.id);
        push({ sev: 'a', title: 'Acurácia de rastreabilidade abaixo da meta em ' + lowT.map((x) => x.t.code).join(', '), detail: lowT.map((x) => x.t.code + ' ' + C.fmtDec(x.s.value, 1) + '% (meta ' + C.fmtDec(x.s.target, 1) + '%)').join('; ') + '.', reco: tech.length ? 'Priorizar a implantação de ' + tech.join(' e ') + ' nesses terminais.' : 'Priorizar a implantação de rastreabilidade nesses terminais.', goto: 'kpis', ref: 'traceAcc' });
      }
    }
    (mg.cases || []).forEach((c) => {
      const ev = evalCase(c), pr = mg.projects.find((p) => p.id === c.projectId), pe = pr ? evm(pr, asOf) : null;
      if (ev.verdict.key === 'no') push({ sev: 'a', title: c.id + ' tem VPL negativo (' + C.fmtMi(ev.npv) + ')', detail: c.name + ': TIR ' + (ev.irr == null ? 'n/d' : C.fmtDec(ev.irr * 100, 1) + '%') + ' contra custo de capital de ' + C.fmtDec(c.rate * 100, 0) + '%.', reco: 'Não aprovar nas premissas atuais; validar demanda antes de reapresentar.', goto: 'business', ref: c.id });
      if (pe && pe.started && !pe.done && pe.eac > c.capex * 1.05) {
        const r2 = C.evaluate(Object.assign({}, ev.inp, { capex: pe.eac }));
        push({ sev: r2.npv > 0 ? 'i' : 'a', title: c.id + (r2.npv > 0 ? ' continua viável' : ' deixa de ser viável') + ' com o CAPEX no EAC de ' + c.projectId, detail: 'VPL de ' + C.fmtMi(r2.npv) + ' com CAPEX de ' + C.fmtMi(pe.eac) + ' (base: ' + C.fmtMi(ev.npv) + ' com ' + C.fmtMi(c.capex) + ').', reco: r2.npv > 0 ? 'Manter o projeto, mas atualizar o caso com o CAPEX previsto.' : 'Reapresentar ao comitê com o CAPEX atualizado.', goto: 'business', ref: c.id });
      }
    });
    return out.map((x, i) => ({ x, i })).sort((a, b) => SEV[a.x.sev] - SEV[b.x.sev] || a.i - b.i).map((o) => o.x);
  }


  /* Proximos prazos: decisoes, riscos criticos, contratos, entregas de projetos e decisoes de pipeline,
     a partir da data de corte, ordenados por data. Respeita o recorte de localidades (vis). */
  const KIND_ORDER = { 'Decisão': 0, 'Risco': 1, 'Entrega': 2, 'Contrato': 3, 'Oportunidade': 4 };
  function upcoming(mg, asOf, vis, n) {
    const inV = (c) => c === 'REDE' || !vis || vis.has(c), out = [];
    const push = (o) => { const days = C.daysBetween(asOf, o.date); if (days >= 0) out.push(Object.assign({ days }, o)); };
    ((mg.consultant && mg.consultant.decisions) || []).forEach((x) => push({ date: x.due, kind: 'Decisão', icon: 'flag', title: x.id + ' · ' + x.title, link: x.link }));
    mg.risks.filter((r) => inV(r.terminal) && C.riskScore(r.probability, r.impact) >= 15).forEach((r) => push({ date: r.due, kind: 'Risco', icon: 'alert', title: r.id + ' · ' + r.title, link: r.id }));
    mg.projects.filter((p) => inV(p.terminal) && p.progress < 100 && p.progress > 0 && C.daysBetween(asOf, p.endForecast) <= 60).forEach((p) => push({ date: p.endForecast, kind: 'Entrega', icon: 'box', title: p.id + ' · ' + p.name, link: p.id }));
    mg.suppliers.filter((s) => s.terminals.some(inV) && C.daysBetween(asOf, s.contractEnd) <= 120).forEach((s) => push({ date: s.contractEnd, kind: 'Contrato', icon: 'truck', title: 'Vence contrato · ' + s.name, link: s.id }));
    (mg.pipeline || []).filter((o) => inV(o.location) && C.daysBetween(asOf, o.decisionDate) <= 45).forEach((o) => push({ date: o.decisionDate, kind: 'Oportunidade', icon: 'bulb', title: 'Decisão · ' + o.name, link: o.id }));
    out.sort((a, b) => a.days - b.days || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title, 'pt-BR'));
    return out.slice(0, n || 8);
  }

  root.Analytics = { plannedPct, evm, projectStatus, portfolio, scurve, caseInputs, verdict, evalCase, tornado, supplierScore, weightedValue, latest, kscale, kfmt, kdelta, statusFor, kpiStatus, tierDefs, defById, streak, targetSeriesFor, termStatus, networkTargetSeries, contributionVariance, contributionBridge, hasContribution, execRows, execSummary, selTerminals, netValue, networkSeries, networkTarget, networkStatus, opexVariance, opexBridge, portfolioFinance, upcoming, health, networkOcc, insights, SUP_W };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Analytics;
})(typeof window !== 'undefined' ? window : globalThis);
