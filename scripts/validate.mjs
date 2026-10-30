// Validacao de dados (publicos e de demonstracao), formulas e regras de analise. Uso: node scripts/validate.mjs
import { readFileSync } from 'node:fs';
import { rd, loadAll, G } from './_load.mjs';
const { Core, Analytics: A } = G;
const errors = []; const ok = (c, m) => { if (!c) errors.push(m); };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const d = loadAll(), { config, locations: locs, sources, corridors: corr, initiatives: init, kpis, opportunities: opps, map } = d;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// ---------- dados publicos
ok(Math.abs(Object.values(config.scoreWeights).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'Pesos do score nao somam 1');
const sid = new Set(sources.map((s) => s.id)); ok(sid.size === sources.length, 'IDs de fontes duplicados');
sources.forEach((s) => { ok(/^https:\/\//.test(s.url), `Fonte ${s.id}: URL deve ser https`); ok(isDate(s.accessed), `Fonte ${s.id}: data de acesso invalida`); ok(s.facts && s.facts.length, `Fonte ${s.id}: sem fatos`); });
const needSrc = (ids, ctx) => { ok(ids && ids.length, `${ctx}: sem fonte`); (ids || []).forEach((i) => ok(sid.has(i), `${ctx}: fonte inexistente ${i}`)); };
const layerIds = new Set(config.layers.map((l) => l.id)), codes = new Set();
locs.forEach((l) => {
  ok(!codes.has(l.code), `Codigo duplicado ${l.code}`); codes.add(l.code);
  ok(l.lat >= -40 && l.lat <= 32 && l.lon >= -95 && l.lon <= -30, `${l.code}: coordenadas fora do mapa`);
  Object.keys(config.scoreWeights).forEach((k) => ok(Number.isFinite(l.components[k]) && l.components[k] >= 0 && l.components[k] <= 100, `${l.code}: componente ${k} invalido`));
  l.layers.forEach((x) => ok(layerIds.has(x), `${l.code}: camada inexistente ${x}`)); ok(l.layers.includes(l.primaryLayer), `${l.code}: camada principal fora de layers`);
  ok(['Alta', 'Média', 'Baixa'].includes(l.confidence), `${l.code}: confianca invalida`); ok(l.evidence.length && l.focus.length, `${l.code}: evidencia/frentes ausentes`); needSrc(l.sources, l.code);
});
corr.forEach((c) => { ok(codes.has(c.from) && codes.has(c.to), `Corredor ${c.id}: localidade inexistente`); needSrc(c.sources, 'Corredor ' + c.id); });
init.forEach((i) => { ok(codes.has(i.location) || i.location === 'Rede', `Marco ${i.id}: local invalido`); needSrc(i.sources, 'Marco ' + i.id); });
kpis.forEach((k) => { ok(Number.isFinite(k.value), `KPI ${k.id}: valor invalido`); needSrc(k.sources, 'KPI ' + k.id); });
opps.forEach((o) => { ok(codes.has(o.location), `Hipotese ${o.id}: local invalido`); ok(o.dataNeeded.length, `Hipotese ${o.id}: sem dados necessarios`); needSrc(o.sources, 'Hipotese ' + o.id); });
ok(map.countries.length > 20 && map.countries.every((c) => c.d && c.d.startsWith('M')), 'Geometria do mapa invalida');
const used = new Set([...locs, ...corr, ...init, ...kpis, ...opps].flatMap((x) => x.sources || []));
sources.forEach((s) => ok(used.has(s.id), `Fonte ${s.id} nao e referenciada por nenhum dado`));
d.references.forEach((r) => ok(/^https:\/\//.test(r.url) && r.pattern && r.where, 'Referencia de mercado invalida: ' + r.title));

// ---------- contraste (WCAG AA = 4,5) de texto branco sobre cores e de pares texto/fundo
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
config.layers.forEach((l) => ok(cr(l.color, '#ffffff') >= 4.5, `Camada ${l.id}: contraste ${cr(l.color, '#ffffff').toFixed(2)} com branco`));
['#1b7f4f', '#b45309', '#c0263f', '#5f6672', '#6a3fe0'].forEach((c) => ok(cr(c, '#ffffff') >= 4.5, `Cor ${c}: contraste com branco < 4,5`));
[['#4cc38a', '#181c2e'], ['#e8a13a', '#181c2e'], ['#ff7a8f', '#181c2e'], ['#98a0b8', '#181c2e'], ['#4cc38a', '#25214a'], ['#ff7a8f', '#25214a'], ['#1b7f4f', '#ffffff'], ['#c0263f', '#f1edff'], ['#1d6b46', '#e3f6ec'], ['#8a5a00', '#fff1d6'], ['#a3213a', '#fde6ea'], ['#505769', '#eceef3'], ['#5c4000', '#fff4d6'], ['#8be0b3', '#143a2a'], ['#ffe3a1', '#3a2f12'], ['#ffb3c0', '#47202b'], ['#b8bfd6', '#242a44']].forEach(([f, b]) => ok(cr(f, b) >= 4.5, `Par ${f} sobre ${b}: ${cr(f, b).toFixed(2)} < 4,5`));

// ---------- dados de demonstracao (fictícios): consistencia interna
ok(!!d.sets.demo, 'data/demo ausente');
for (const [setName, S] of Object.entries(d.sets)) {
  if (!S) continue;
  ok(setName === 'demo' ? S.meta.synthetic === true : S.meta.synthetic !== true, `${setName}: meta.synthetic deve ser ${setName === 'demo'}`); ok(isDate(S.meta.asOf), `${setName}: meta.asOf invalida`);
  const tm = S.meta.timeline, months = S.series.months, tcodes = new Set(S.terminals.map((t) => t.code)), codesR = new Set([...codes, 'REDE']);
  const tlLast = new Date(Date.UTC(Number(tm.start.slice(0, 4)), Number(tm.start.slice(5)) - 1 + tm.months - 1, 1)).toISOString().slice(0, 7);
  ok(S.meta.asOf.slice(0, 7) === (() => { const [y, m] = tm.start.split('-').map(Number); const k = m - 1 + tm.asOfIdx; return `${y + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`; })(), 'meta.timeline.asOfIdx nao corresponde a meta.asOf');
  ok(months.length === 12, 'serie deve ter 12 meses'); ok(S.series.months[11] === S.meta.asOf.slice(0, 7), 'ultimo mes da serie deve ser o mes de asOf');
  S.terminals.forEach((t) => {
    ok(codes.has(t.code), `Terminal ${t.code} fora de locations`);
    ['occupancy', 'dwell', 'costPerT', 'service', 'incidents'].forEach((k) => ok(Number.isFinite(t.targets[k]), `${t.code}: meta ${k} ausente`));
    ['capacity', 'flow', 'assets', 'safety', 'systems', 'coldchain'].forEach((k) => ok(Number.isInteger(t.assessment[k]) && t.assessment[k] >= 1 && t.assessment[k] <= 5, `${t.code}: avaliacao ${k} invalida`));
    const s = S.series.byTerminal[t.code]; ok(!!s, `${t.code}: sem serie`);
    Object.keys(s).forEach((k) => { ok(s[k].length === 12 && s[k].every(Number.isFinite), `${t.code}.${k}: serie invalida`); });
    s.occupancy.forEach((o, i) => { ok(o >= 0 && o <= 100, `${t.code}: ocupacao fora de 0-100`); ok(Math.abs(o - (s.throughput[i] / t.capacityTMonth) * 100) <= 0.06, `${t.code}: ocupacao inconsistente com volume/capacidade no mes ${i}`); });
    if (t.seasonal) ok(isDate(t.seasonal.start), `${t.code}: inicio de temporada invalido`);
  });
  { // definicoes de KPI: metadados completos, series coerentes e identidades financeiras
    const ids = new Set(), PCT = ['occupancy', 'service', 'dockUtil', 'traceAcc', 'margin'];
    S.series.defs.forEach((df) => {
      const c = `${setName}/KPI ${df.id}`; ok(!ids.has(df.id), `${c}: id duplicado`); ids.add(df.id);
      ok(['min', 'max', 'info'].includes(df.dir), `${c}: dir invalido`); ok(['financial', 'operational'].includes(df.group), `${c}: grupo invalido`);
      ['name', 'definition', 'formula', 'owner', 'frequency'].forEach((k) => ok(typeof df[k] === 'string' && df[k].length > 2, `${c}: ${k} ausente`)); ok(typeof df.unit === 'string' && df.unit.length >= 1, `${c}: unit ausente`);
      ok(Number.isInteger(df.decimals) && df.decimals >= 0, `${c}: decimals invalido`); ok(['sum', 'ratio', 'wavg'].includes(df.agg), `${c}: agg invalido`); ok(df.scale == null || df.scale > 0, `${c}: scale invalida`);
      if (df.dir !== 'info') {
        if (df.targetSeries) { ok(df.agg === 'sum', `${c}: meta em serie exige agg=sum`); S.terminals.forEach((t) => { const ts = S.series.byTerminal[t.code][df.targetSeries]; ok(Array.isArray(ts) && ts.length === 12 && ts.every(Number.isFinite), `${c}/${t.code}: serie de meta ${df.targetSeries} ausente`); }); }
        else ok(S.terminals.every((t) => Number.isFinite(t.targets[df.targetKey])), `${c}: meta ausente em algum terminal`);
        ok(df.tol > 0, `${c}: tolerancia ausente`);
      }
      ok(df.tier === 1 || df.tier === 2, `${c}: tier deve ser 1 (executivo) ou 2 (apoio)`); ok(typeof df.why === 'string' && df.why.length >= 20, `${c}: 'por que importa' ausente`);
      if (df.tier === 1) ok(typeof df.pillar === 'string' && df.pillar.length > 2, `${c}: KPI executivo precisa de pilar`);
      (df.drivers || []).forEach((id) => { ok(id !== df.id, `${c}: driver aponta para si mesmo`); ok(S.series.defs.some((x) => x.id === id), `${c}: driver inexistente ${id}`); });
      S.terminals.forEach((t) => { const v = S.series.byTerminal[t.code][df.id]; ok(Array.isArray(v) && v.length === 12 && v.every(Number.isFinite), `${c}/${t.code}: serie ausente ou invalida`); if (v && PCT.includes(df.id)) ok(v.every((x) => x >= 0 && x <= 100), `${c}/${t.code}: percentual fora de 0-100`); if (v && ['damage', 'tempExc', 'opex', 'revenue', 'yield', 'productivity', 'truckTurn'].includes(df.id)) ok(v.every((x) => x >= 0), `${c}/${t.code}: valor negativo`); });
    });
    ['financial', 'operational'].forEach((g) => ok(S.series.defs.filter((x) => x.group === g).length >= 4, `${setName}: poucos KPIs no grupo ${g}`));
    const t1 = S.series.defs.filter((x) => x.tier === 1);
    ok(t1.length >= 6 && t1.length <= 9, `${setName}: o quadro executivo deve ter de 6 a 9 KPIs (tem ${t1.length}); executivo com muitos indicadores perde foco`);
    ok(t1.some((x) => x.group === 'financial') && t1.some((x) => x.group === 'operational'), `${setName}: o quadro executivo precisa ter KPI financeiro e operacional`);
    ok(t1.every((x) => x.dir !== 'info'), `${setName}: KPI executivo precisa ter meta`);
    ok(new Set(S.series.defs.map((x) => x.name)).size === S.series.defs.length, `${setName}: nomes de KPI duplicados`);
    S.series.defs.forEach((x) => ok(!/\bHH\b|\bexcurs/i.test(x.name + ' ' + x.unit), `${setName}/${x.id}: use linguagem simples no nome e na unidade (evite siglas e jargao)`));
    S.terminals.forEach((t) => { // metas coerentes entre si: se o custo e a receita por tonelada baterem a meta, a margem-meta tem de ser alcancavel
      const tg = t.targets, implied = ((tg.yield - tg.costPerT) / tg.yield) * 100;
      ok(tg.margin <= implied + 0.1, `${setName}/${t.code}: meta de margem (${tg.margin}%) e inalcancavel mesmo cumprindo as metas de receita e custo por tonelada (${implied.toFixed(1)}%)`);
      ok(Math.abs(tg.margin - implied) <= 0.6, `${setName}/${t.code}: meta de margem (${tg.margin}%) destoa da implicita (${implied.toFixed(1)}%); derive-a das metas de receita e custo para as tres contarem a mesma historia`);
    });
    S.terminals.forEach((t) => { // identidades exatas e relacoes entre series
      const q = S.series.byTerminal[t.code]; q.throughput.forEach((thr, i) => {
        ok(q.opex[i] === thr * q.costPerT[i], `${setName}/${t.code}[${i}]: OPEX deve ser toneladas x custo por tonelada`);
        ok(q.revenue[i] === thr * q.yield[i], `${setName}/${t.code}[${i}]: receita deve ser toneladas x receita por tonelada`);
        ok(q.opexBudget[i] === q.volumeBudget[i] * t.targets.costPerT, `${setName}/${t.code}[${i}]: orcado deve ser volume orcado x custo-meta`);
        ok(Math.abs(q.opexAdherence[i] - (q.opex[i] / q.opexBudget[i]) * 100) <= 0.06, `${setName}/${t.code}[${i}]: aderencia do OPEX inconsistente`);
        ok(Math.abs(q.margin[i] - ((q.revenue[i] - q.opex[i]) / q.revenue[i]) * 100) <= 0.06, `${setName}/${t.code}[${i}]: margem inconsistente`);
        ok(q.contribution[i] === q.revenue[i] - q.opex[i], `${setName}/${t.code}[${i}]: contribuicao deve ser receita - OPEX`);
        ok(q.contributionBudget[i] === q.volumeBudget[i] * (t.targets.yield - t.targets.costPerT), `${setName}/${t.code}[${i}]: contribuicao orcada = volume orcado x (receita-meta - custo-meta)`);
        const cv = A.contributionVariance(S, t.code, i); ok(Math.round(cv.volume + cv.price + cv.cost) === cv.total && cv.total === q.contribution[i] - q.contributionBudget[i], `${setName}/${t.code}[${i}]: volume + preco + custo deve fechar o desvio da contribuicao`);
        const v = A.opexVariance(S, t.code, i); ok(v.volume + v.rate === v.total && v.total === q.opex[i] - q.opexBudget[i], `${setName}/${t.code}[${i}]: efeito volume + custo unitario deve fechar o desvio`);
      });
    });
  }
  const pid = new Set();
  S.projects.forEach((p) => {
    ok(!pid.has(p.id), `Projeto duplicado ${p.id}`); pid.add(p.id); ok(codesR.has(p.terminal), `${p.id}: terminal invalido`);
    ok(isDate(p.start) && isDate(p.endBaseline) && isDate(p.endForecast), `${p.id}: datas invalidas`);
    ok(Date.parse(p.start) < Date.parse(p.endBaseline), `${p.id}: inicio deve ser antes do fim`); ok(Date.parse(p.endForecast) >= Date.parse(p.endBaseline) - 864e5 * 60, `${p.id}: previsao muito anterior a linha de base`);
    ok(p.progress >= 0 && p.progress <= 100 && p.budget > 0 && p.capexActual >= 0, `${p.id}: valores invalidos`);
    ok([p.impact, p.effort].every((v) => Number.isInteger(v) && v >= 1 && v <= 5), `${p.id}: impacto/esforco fora de 1-5`);
    ok(p.spendPlan.length === tm.months && p.spendPlan.reduce((a, b) => a + b, 0) === p.budget, `${p.id}: plano mensal nao soma o orcamento`);
    ok(p.spendActual.length === tm.asOfIdx + 1 && p.spendActual.reduce((a, b) => a + b, 0) === p.capexActual, `${p.id}: realizado mensal nao soma o CAPEX realizado`);
    ok(p.spendForecast.length === tm.months - tm.asOfIdx - 1, `${p.id}: previsao mensal com tamanho errado`);
    const e = A.evm(p, S.meta.asOf), tot = p.spendActual.reduce((a, b) => a + b, 0) + p.spendForecast.reduce((a, b) => a + b, 0);
    ok(Math.abs(tot - e.eac) <= Math.max(3, e.eac * 0.001), `${p.id}: realizado+previsao (${tot}) difere do EAC (${Math.round(e.eac)})`);
  });
  const cid = new Set();
  S.cases.forEach((c) => { ok(!cid.has(c.id), `Caso duplicado ${c.id}`); cid.add(c.id); ok(pid.has(c.projectId), `${c.id}: projeto inexistente`); ok(c.breakdown.reduce((a, b) => a + b.value, 0) === c.benefit, `${c.id}: composicao do beneficio nao soma o beneficio`); ok(c.rate > 0 && c.rate < 1 && c.years >= 1, `${c.id}: premissas invalidas`); });
  const rid = new Set();
  S.risks.forEach((r) => { ok(!rid.has(r.id), `Risco duplicado ${r.id}`); rid.add(r.id); ok(codesR.has(r.terminal), `${r.id}: terminal invalido`); ok(!r.projectId || pid.has(r.projectId), `${r.id}: projeto inexistente`); ok([r.probability, r.impact].every((v) => Number.isInteger(v) && v >= 1 && v <= 5), `${r.id}: P/I fora de 1-5`); ok(isDate(r.due), `${r.id}: prazo invalido`); ok(['up', 'down', 'flat'].includes(r.trend), `${r.id}: tendencia invalida`); });
  const fid = new Set();
  S.suppliers.forEach((s) => { ok(!fid.has(s.id), `Fornecedor duplicado ${s.id}`); fid.add(s.id); ok(s.terminals.every((t) => tcodes.has(t)), `${s.id}: terminal invalido`); ok(s.sla.length === 6 && s.sla.every((v) => v > 0 && v <= 100), `${s.id}: SLA invalido`); ok(s.safety >= 1 && s.safety <= 5 && s.responsiveness >= 1 && s.responsiveness <= 5, `${s.id}: notas fora de 1-5`); ok(isDate(s.contractEnd), `${s.id}: fim de contrato invalido`); });
  S.lanes.forEach((l) => { ok(fid.has(l.supplier), `${l.id}: fornecedor inexistente`); ok(tcodes.has(l.terminal), `${l.id}: terminal invalido`); ok(l.onTime > 0 && l.onTime <= 100 && l.utilization > 0 && l.utilization <= 100, `${l.id}: percentuais invalidos`); });
  const STG = ['Hipótese', 'Triagem', 'Conceito', 'Viabilidade', 'Business case', 'Decisão', 'Implantação'], hid = new Set(opps.map((o) => o.id)), oid = new Set();
  S.pipeline.forEach((o) => { oid.add(o.id); ok(STG.includes(o.stage), `${o.id}: estagio invalido`); ok(o.probability >= 0 && o.probability <= 100 && o.annualValue > 0, `${o.id}: valores invalidos`); ok(!o.hypothesis || hid.has(o.hypothesis), `${o.id}: hipotese inexistente`); ok(codes.has(o.location), `${o.id}: local invalido`); });
  const exists = (id) => pid.has(id) || fid.has(id) || cid.has(id) || oid.has(id) || rid.has(id) || id === 'network';
  S.consultant.decisions.forEach((x) => { ok(exists(x.link), `Decisao ${x.id}: vinculo inexistente (${x.link})`); ok(isDate(x.due), `Decisao ${x.id}: prazo invalido`); });
  S.consultant.actions.forEach((x) => { ok(exists(x.link), `Acao ${x.id}: vinculo inexistente (${x.link})`); ok([30, 60, 90].includes(x.horizon), `Acao ${x.id}: horizonte invalido`); });
}

const S = d.sets.demo;
// ---------- formulas financeiras e regras de analise (valores de referencia calculados a mao)
ok(near(Core.npv(0.1, [-100, 110]), 0), 'NPV: -100 e 110 a 10% deve ser 0');
ok(near(Core.irr([-100, 60, 60]), 0.130662, 1e-5), 'TIR de [-100,60,60] deve ser ~13,07%');
ok(Core.irr([100, 50]) === null && Core.irr([-100, -50]) === null, 'TIR sem inversao de sinal deve ser null');
ok(near(Core.payback([-100, 60, 60], 0), 1 + 40 / 60), 'Payback simples deve ser 1,667');
ok(Core.payback([-100, 10, 10], 0) === null, 'Payback inexistente deve ser null');
ok(near(Core.evaluate({ capex: 100, benefit: 60, opex: 0, years: 2, rate: 0.1, benefitGrowth: 0, opexGrowth: 0, residual: 0 }).npv, 4.1322314, 1e-5), 'evaluate: VPL esperado 4,132');
ok(Core.score({ a: 100, b: 0 }, { a: 0.5, b: 0.5 }) === 50, 'score: media ponderada');
ok(Core.esc('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;', 'esc: escape HTML');
ok(Core.safeUrl('javascript:alert(1)') === '#', 'safeUrl deve bloquear javascript:');
ok(Core.rag(92, 85, 'min', 0.04) === 'r' && Core.rag(88, 85, 'min', 0.04) === 'a' && Core.rag(85, 85, 'min', 0.04) === 'g', 'rag min');
ok(Core.rag(93, 95, 'max', 0.015) === 'r' && Core.rag(94, 95, 'max', 0.015) === 'a' && Core.rag(95, 95, 'max', 0.015) === 'g', 'rag max');
ok(Core.rag(NaN, 5, 'min') === 'n' && Core.rag(5, null, 'min') === 'n', 'rag sem meta');
ok(Core.riskBand(14) === 'a' && Core.riskBand(15) === 'r' && Core.riskBand(7) === 'g', 'riskBand');
ok(Core.fmtMi(12600000) === 'R$\u00a012,6\u00a0mi' && Core.fmtMi(-500000) === '−R$\u00a00,5\u00a0mi', 'fmtMi');
ok(Core.monthLabel('2026-10') === 'out/26' && Core.fmtDate('2026-10-29') === '29/10/2026', 'datas');
{ // EVM com resultado conhecido: 10 dias, 50% decorrido, 40% fisico, gasto 50
  const p = { start: '2026-01-01', endBaseline: '2026-01-11', endForecast: '2026-01-21', budget: 100, capexActual: 50, progress: 40 };
  const e = A.evm(p, '2026-01-06'); ok(near(e.pv, 50) && near(e.ev, 40) && near(e.spi, 0.8) && near(e.cpi, 0.8) && near(e.eac, 125) && e.delayDays === 10, 'EVM: PV/EV/SPI/CPI/EAC');
  ok(A.projectStatus(p, '2026-01-06').rag === 'r', 'status critico com SPI/CPI 0,8');
  ok(A.projectStatus({ ...p, start: '2026-02-01', endBaseline: '2026-03-01', progress: 0, capexActual: 0 }, '2026-01-06').rag === 'n', 'nao iniciado');
  ok(A.projectStatus({ ...p, progress: 100, capexActual: 90 }, '2026-02-01').label === 'Concluído', 'concluido');
  ok(A.projectStatus({ ...p, progress: 50, capexActual: 50 }, '2026-01-06').rag === 'g', 'no plano (SPI 1,0 e CPI 1,0)');
}
{ const c = { capex: 1e7, benefit: 3e6, opex: 5e5, years: 10, rate: 0.12, benefitGrowth: 0.03, opexGrowth: 0.03, residual: 0 }, t = A.tornado(c);
  ok(t.items.every((x) => x.low <= 0 && x.high >= 0), 'tornado: pior caso <= 0 <= melhor caso'); ok(near(t.base, 5758191, 1), 'VPL de referencia do caso de teste (cruzado com Python)');
  ok(A.verdict({ npv: -1, irr: 0.1 }, 0.11).key === 'no' && A.verdict({ npv: 1, irr: 0.12 }, 0.11).key === 'maybe' && A.verdict({ npv: 1, irr: 0.17 }, 0.11).key === 'yes', 'veredito do business case'); }
{ const base = { sla: [95, 95, 95, 95, 95, 95], slaTarget: 95, costIndex: 100, safety: 4, responsiveness: 4, contractEnd: '2027-12-31' };
  const a = A.supplierScore(base, '2026-10-29'), b = A.supplierScore({ ...base, sla: [90, 90, 90, 90, 90, 90] }, '2026-10-29'), c = A.supplierScore({ ...base, costIndex: 120 }, '2026-10-29');
  ok(a.score > b.score && a.score > c.score, 'score de fornecedor deve cair com SLA menor ou custo maior'); ok(A.supplierScore({ ...base, contractEnd: '2026-12-01' }, '2026-10-29').days === 33, 'dias ate o fim do contrato'); }
if (S) { // consolidacao da rede, formatacao e financeiro do portfolio
  const D = Object.fromEntries(S.series.defs.map((x) => [x.id, x])), B = S.series.byTerminal, ALL = S.terminals, i = 11, vis2 = new Set(['GRU', 'VCP']), sub = ALL.filter((t) => vis2.has(t.code));
  const sm = (ts, k) => ts.reduce((a, t) => a + B[t.code][k][i], 0), tsum = (ts) => sm(ts, 'throughput'), capsum = (ts) => ts.reduce((a, t) => a + t.capacityTMonth, 0);
  const net = (id, vis) => A.networkSeries(S, D[id], vis)[i];
  ok(near(net('occupancy'), (tsum(ALL) / capsum(ALL)) * 100, 1e-9), 'rede: ocupacao = toneladas / capacidade');
  ok(near(net('occupancy', vis2), (tsum(sub) / capsum(sub)) * 100, 1e-9), 'recorte: ocupacao = toneladas / capacidade do recorte');
  ok(near(net('costPerT'), sm(ALL, 'opex') / tsum(ALL), 1e-9), 'rede: custo por tonelada = OPEX / toneladas');
  ok(near(net('margin'), ((sm(ALL, 'revenue') - sm(ALL, 'opex')) / sm(ALL, 'revenue')) * 100, 1e-9), 'rede: margem consolidada');
  ok(near(net('opexAdherence'), (sm(ALL, 'opex') / sm(ALL, 'opexBudget')) * 100, 1e-9), 'rede: aderencia consolidada');
  ok(near(net('opex'), sm(ALL, 'opex'), 1e-6) && near(net('incidents'), sm(ALL, 'incidents'), 1e-9) && near(net('throughput', vis2), tsum(sub), 1e-6), 'rede: KPIs aditivos somam');
  ok(near(net('productivity'), ALL.reduce((a, t) => a + B[t.code].productivity[i] * B[t.code].throughput[i], 0) / tsum(ALL), 1e-9), 'rede: produtividade ponderada pelo volume');
  ok(A.networkSeries(S, D.margin, new Set()) === null, 'rede: recorte vazio retorna null');
  ok(A.networkTarget(S, D.incidents, null) === ALL.reduce((a, t) => a + t.targets.incidents, 0), 'rede: meta de KPI aditivo = soma das metas');
  ok(near(A.networkTarget(S, D.margin, null), ALL.reduce((a, t) => a + t.targets.margin * B[t.code].throughput[i], 0) / tsum(ALL), 1e-9), 'rede: meta de razao = media ponderada pelo volume');
  ok(A.networkTarget(S, D.opex, null) === null, 'rede: KPI informativo nao tem meta');
  const br = A.opexBridge(S, null, i); ok(Math.round(br.volume + br.rate) === br.total && br.total === sm(ALL, 'opex') - sm(ALL, 'opexBudget'), 'ponte do OPEX da rede fecha');
  ok(A.kfmt({ scale: 1e6, decimals: 1 }, 38543011) === '38,5' && A.kfmt({ decimals: 2 }, 0.456) === '0,46' && A.kfmt({ decimals: 0 }, NaN) === '–', 'kfmt');
  ok(A.kdelta({ decimals: 1 }, 1.26) === '▲ +1,3' && A.kdelta({ decimals: 1 }, -1.26) === '▼ −1,3' && A.kdelta({ decimals: 1 }, -0.04) === '► 0,0' && A.kdelta({ decimals: 1 }, null) === '–' && A.kdelta({ decimals: 1, scale: 1e6 }, 1.2e6) === '▲ +1,2', 'kdelta: seta, sinal, variacao desprezivel e escala');
  { const st = A.statusFor({ dir: 'min', tol: 0.05 }, [10, 10, 10, 12], 10), sx = A.statusFor({ dir: 'max', tol: 0.05 }, [10, 10, 10, 12], 10), si = A.statusFor({ dir: 'info' }, [1, 2, 3, 4], null);
    ok(st.rag === 'r' && st.delta === 2 && st.good === false && sx.rag === 'g' && sx.good === true && si.rag === 'n' && si.good === null, 'statusFor: semaforo, variacao e sentido');
    ok(A.statusFor({ dir: 'min', tol: 0.05, decimals: 2 }, [1, 1, 1, 0.996], 1).good === null, 'statusFor: variacao que arredonda para zero e neutra'); }
  { // duracao fora da meta (streak): conta atencao e vermelho, para no primeiro verde
    const dmin = { dir: 'min', tol: 0.05 }, dmax = { dir: 'max', tol: 0.05 };
    ok(A.streak(dmin, [5, 11, 11, 12], [10, 10, 10, 10]) === 3, 'streak: 3 meses fora (atencao e vermelho) e verde antes');
    ok(A.streak(dmin, [11, 9, 9, 10], [10, 10, 10, 10]) === 0, 'streak: ultimo mes na meta zera a contagem');
    ok(A.streak(dmax, [9, 9, 9, 9], [10, 10, 10, 10]) === 4, 'streak: serie inteira fora da meta');
    ok(A.streak(dmin, [11, 11], [null, null]) === 0 && A.streak({ dir: 'info' }, [1, 2], [1, 1]) === 0, 'streak: sem meta nao conta');
    ok(A.streak(dmin, [11, 11, 8, 11], [10, 10, 10, 10]) === 1, 'streak: so os meses consecutivos ate o ultimo');
    const occ = D.occupancy, gru = A.termStatus(S, occ, 'GRU'); let n = 0; for (let k = 11; k >= 0 && B.GRU.occupancy[k] > ALL.find((x) => x.code === 'GRU').targets.occupancy; k--) n++;
    ok(gru.streak === n && n > 0, 'termStatus: duracao de GRU deve bater com a contagem direta (' + gru.streak + ' x ' + n + ')'); }
  { // quadro executivo
    const rows = A.execRows(S, null), t1 = S.series.defs.filter((x) => x.tier === 1);
    ok(rows.length === t1.length && rows.every((r) => r.nT === ALL.length && r.nRed + r.nAmber <= r.nT), 'execRows: uma linha por KPI executivo e contagens coerentes');
    ok(rows.every((r) => r.net && ['g', 'a', 'r'].includes(r.net.rag)), 'execRows: rede com semaforo');
    ok(rows.some((r) => r.masked), 'dados de demonstracao devem exercitar o caso em que a media da rede esconde terminais vermelhos');
    rows.filter((r) => r.masked).forEach((r) => ok(r.net.rag === 'g' && r.nRed > 0, `execRows: ${r.def.id} marcado como mascarado sem ser`));
    const worst = rows.find((r) => r.def.id === 'margin').worst; ok(worst && worst.rag === 'r', 'execRows: pior terminal deve ser vermelho quando ha vermelho');
    const br = A.contributionBridge(S, null, 11), cr = rows.find((r) => r.def.id === 'contribution'), cc = rows.find((r) => r.def.id === 'costPerT');
    ok(cr.effect === br.total && cc.effect === br.cost && rows.filter((r) => r.effect != null).length === 2, 'execRows: efeito em R$ apenas para contribuicao e custo por tonelada');
    ok(Math.round(br.volume + br.price + br.cost) === br.total && br.total === br.actual - br.budget, 'ponte de contribuicao da rede fecha');
    const sub = A.execRows(S, new Set(['VCP', 'MIA'])); ok(sub.every((r) => r.nT === 2), 'execRows respeita o recorte');
    ok(A.networkStatus(S, D.contribution, null).target === ALL.reduce((a, t) => a + B[t.code].contributionBudget[11], 0), 'rede: meta da contribuicao = soma das contribuicoes orcadas');
    const ns = A.networkStatus(S, D.contribution, null), tsr = A.networkTargetSeries(S, D.contribution, null); ok(tsr.length === 12 && tsr[11] === ns.target, 'rede: serie de metas da contribuicao');
    const sum = A.execSummary(S, null), txt = sum.map((x) => x.text).join(' | ');
    ok(sum.length >= 3 && sum.length <= 5, 'execSummary: a leitura executiva deve ter de 3 a 5 frases (tem ' + sum.length + ')');
    ok(sum.every((x) => x.text.length <= 260), 'execSummary: cada frase deve ser curta (ate 260 caracteres)');
    ok(sum.length >= 3 && sum[0].text.includes('dos ' + rows.length + ' KPIs executivos') && !/NaN|undefined|null/.test(txt), 'execSummary: frases presentes e sem valores quebrados');
    ok(sum[0].text.startsWith(rows.filter((r) => r.net.rag === 'g').length + ' dos '), 'execSummary: a contagem de KPIs na meta deve bater com o quadro');
    ok(/abaixo|acima/.test(sum[1].text) && /orçado/.test(sum[1].text), 'execSummary: frase da contribuicao');
    ok(sum.every((x) => ['r', 'a', 'g'].includes(x.tone)), 'execSummary: tom valido');
    ok(A.execSummary(S, new Set()).length === 0, 'execSummary: recorte vazio nao gera frases');
    ok(!/MAO|GRU/.test(A.execSummary(S, new Set(['VCP'])).map((x) => x.text).join(' ')), 'execSummary respeita o recorte'); }
  const pfn = A.portfolioFinance(S, null, S.meta.asOf), idx = S.meta.timeline.asOfIdx;
  ok(pfn.planned === S.projects.reduce((a, p) => a + p.spendPlan.slice(0, idx + 1).reduce((x, y) => x + y, 0), 0) && pfn.actual === S.projects.reduce((a, p) => a + p.capexActual, 0), 'financeiro do portfolio: planejado e realizado ate a data');
  ok(near(pfn.pi, pfn.npvRec / pfn.capexRec, 1e-12) && pfn.nRec === S.cases.filter((c) => A.evalCase(c).verdict.key === 'yes').length, 'financeiro do portfolio: indice de rentabilidade');
  ok(A.portfolioFinance(S, new Set(['SCL']), S.meta.asOf).bac < pfn.bac, 'financeiro do portfolio respeita o recorte');
  const T4 = A.insights(S, S.meta.asOf, null).map((x) => x.title).join(' | ');
  ['OPEX do último mês', 'Margem de contribuição abaixo da meta', 'Cargas fora da faixa de temperatura em MAO', 'Acurácia de rastreabilidade abaixo da meta'].forEach((k) => ok(T4.includes(k), `mensagens do consultor devem incluir "${k}"`));
  ok(!/MAO|LIM|BOG/.test(A.insights(S, S.meta.asOf, new Set(['VCP'])).map((x) => x.title).join(' ')), 'mensagens de KPI respeitam o recorte');
}
if (S) {
  const pf = A.portfolio(S.projects, S.meta.asOf);
  ok(pf.counts.g + pf.counts.a + pf.counts.r + pf.counts.n === S.projects.length, 'portfolio: contagem por status');
  ok(near(pf.budget, S.projects.reduce((a, p) => a + p.budget, 0)), 'portfolio: orcamento total');
  const sc = A.scurve(S.projects, S.meta.timeline.months, S.meta.timeline.asOfIdx);
  ok(near(sc.planned[sc.planned.length - 1], pf.budget, 1), 'curva S: planejado final = orcamento'); ok(near(sc.forecast[sc.forecast.length - 1], pf.eac, pf.eac * 0.001 + 3), 'curva S: previsao final = EAC');
  ok(near(sc.actual[S.meta.timeline.asOfIdx], pf.actual, 1), 'curva S: realizado na data = CAPEX realizado');
  const ins = A.insights(S, S.meta.asOf, null); ok(ins.length >= 5 && ins[0].sev === 'r', 'insights: devem existir alertas criticos primeiro');
  ok(ins.every((x) => x.title && x.detail && x.reco && x.goto), 'insights: campos obrigatorios');
  ok(A.insights(S, S.meta.asOf, new Set(['VCP'])).every((x) => !/GRU|MAO/.test(x.title)), 'insights respeitam o filtro de localidade');
}

// ---------- tema de vidro: contraste calculado a partir de styles.css (fonte unica), prazos, graficos novos e busca
{
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const block = (re) => { const m = css.match(re); return m ? m[1] : ''; };
  const vars = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):([^;]+);?/g)].map((m) => [m[1], m[2].trim()]));
  const light = vars(block(/:root\{([^}]*)\}/)), dark = { ...light, ...vars(block(/body\.dark\{([^}]*)\}/)) };
  const rgba = (c) => { c = c.trim(); let m = c.match(/^#([0-9a-f]{6})$/i); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
    m = c.match(/^rgba?\(([^)]+)\)$/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; } return null; };
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const L = (c) => { const [r, g, b] = c.slice(0, 3).map((v) => v / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const [name, v] of [['claro', light], ['escuro', dark]]) {
    const panel = rgba(v.panel), inset = rgba(v.inset), stops = ['pg0', 'pg1', 'pg2', 'pg3'].map((k) => rgba(v[k]));
    ok(panel && inset && stops.every(Boolean), `tema ${name}: variaveis de vidro ausentes ou ilegiveis`); if (!panel || !inset || !stops.every(Boolean)) continue;
    ok(panel[3] >= 0.7 && panel[3] < 1, `tema ${name}: opacidade do painel (${panel[3]}) deve ficar entre 0,70 e 1`);
    const fgs = { texto: v.text, 'texto secundário': v.muted, destaque: v.accent, 'verde': v['t-g'], 'âmbar': v['t-a'], vermelho: v['t-r'], neutro: v['t-n'] };
    stops.forEach((st, i) => { const surf = over(panel, st), nested = over(inset, surf);
      Object.entries(fgs).forEach(([k, c]) => { const f = rgba(c); [['painel', surf], ['painel aninhado', nested]].forEach(([w, bg]) => ok(ratio(f, bg) >= 4.5, `tema ${name}: ${k} sobre ${w} (fundo ${i}) com contraste ${ratio(f, bg).toFixed(2)} < 4,5`)); }); });
    ok(ratio(rgba(v['on-ink']), rgba(v.ink)) >= 4.5, `tema ${name}: texto sobre fundo escuro/claro de destaque (on-ink) < 4,5`);
    ok(ratio(rgba(v['on-accent']), rgba(v.accent)) >= 4.5, `tema ${name}: balao de valor (on-accent sobre accent) < 4,5`);
  }
  ['#3141bd', '#4b5de6'].forEach((g) => { const a = ratio([255, 255, 255, 1], rgba(g)), b = ratio(over([255, 255, 255, 0.9], rgba(g)).concat(1), rgba(g)); ok(a >= 4.5 && b >= 4.5, `cartao em destaque: branco sobre ${g} com contraste ${Math.min(a, b).toFixed(2)} < 4,5`); });
  ok(ratio(rgba(light['on-accent']), rgba(light.accent)) >= 4.5 && ratio(rgba(dark['on-accent']), rgba(dark.accent)) >= 4.5, 'avatar: texto sobre accent deve ter contraste >= 4,5');
  ok(/prefers-reduced-transparency/.test(css) && /@supports not \(\(backdrop-filter/.test(css) && /prefers-contrast:more/.test(css) && /prefers-reduced-motion/.test(css), 'tema de vidro deve ter alternativas para transparencia reduzida, sem backdrop-filter, alto contraste e movimento reduzido');
  ok(/body\.tv\{--blur:none/.test(css), 'modo TV deve desligar o desfoque');
}
if (S) { // proximos prazos
  const asOf = S.meta.asOf, up = A.upcoming(S, asOf, null, 50);
  ok(up.length >= 5, 'prazos: deve haver ao menos 5 itens na demonstracao');
  ok(up.every((x, i) => i === 0 || x.days >= up[i - 1].days), 'prazos: devem estar em ordem crescente de data');
  ok(up.every((x) => x.days >= 0 && x.date && x.title && x.kind && x.icon && x.link), 'prazos: campos obrigatorios e nenhum prazo no passado');
  ok(up.every((x) => x.days === Core.daysBetween(asOf, x.date)), 'prazos: dias coerentes com a data');
  ok(['Decisão', 'Risco', 'Entrega', 'Contrato', 'Oportunidade'].every((k) => up.some((x) => x.kind === k)), 'prazos: devem existir os 5 tipos na demonstracao');
  ok(A.upcoming(S, asOf, null, 3).length === 3 && A.upcoming(S, asOf, null).length <= 8, 'prazos: limite de itens');
  const vcp = A.upcoming(S, asOf, new Set(['VCP']), 50); ok(vcp.every((x) => !/Manaus|MAO|Santiago|Bogot/.test(x.title.replace('Decisão', '')) || x.kind === 'Decisão'), 'prazos: riscos, contratos e entregas respeitam o recorte');
  ok(!A.upcoming(S, asOf, new Set(['VCP']), 50).some((x) => x.kind === 'Risco' && /R0[1-4]\b/.test(x.title)), 'prazos: riscos de outros terminais nao aparecem no recorte');
  ok(A.upcoming(S, '2030-01-01', null, 50).length === 0, 'prazos: nada a listar depois de todas as datas');
  const lk = new Set([...S.projects.map((p) => p.id), ...S.risks.map((r) => r.id), ...S.suppliers.map((x) => x.id), ...S.pipeline.map((o) => o.id), 'network']);
  up.filter((x) => x.kind !== 'Decisão').forEach((x) => ok(lk.has(x.link), `prazos: vinculo inexistente (${x.link})`));
}
{ // graficos novos
  const X = G.Charts, cnt = (t, re) => (t.match(re) || []).length;
  const r1 = X.ring({ pct: 82.4, value: '82%', label: 'Ocupação', sub: 'meta ≤ 85%', rag: 'g', target: 85 });
  ok(/stroke-dasharray="82\.4 100"/.test(r1) && /rg-g/.test(r1) && /rg-tick/.test(r1) && /role="img"/.test(r1) && /aria-label="Ocupação: 82%/.test(r1), 'anel: arco, cor, marcador e rotulo acessivel');
  ok(!/rg-arc/.test(X.ring({ pct: 0, value: '0%', label: 'x' })), 'anel: 0% nao desenha arco (evita ponto)');
  ok(/stroke-dasharray="100 100"/.test(X.ring({ pct: 250, value: 'x', label: 'x' })) && /stroke-dasharray="100 100"/.test(X.ring({ pct: 100, value: 'x', label: 'x' })), 'anel: limita a 100%');
  ok(!/NaN|undefined/.test(X.ring({ pct: NaN, value: '–', label: 'x', target: 'abc' })) && !/rg-tick/.test(X.ring({ pct: 5, value: 'x', label: 'x', target: 'abc' })), 'anel: entradas invalidas nao geram NaN');
  ok(/rg-n/.test(X.ring({ pct: 10, value: 'x', label: 'x' })) && /rg-n/.test(X.ring({ pct: 10, value: 'x', label: 'x', rag: 'zzz' })), 'anel: sem semaforo usa a cor de destaque');
  { const ev = X.ring({ pct: 1, value: '<img src=x onerror=1>', label: '<script>x</script>', sub: '<iframe>' }); ok(/&lt;img/.test(ev) && /&lt;script/.test(ev) && /&lt;iframe/.test(ev) && !/<img|<script|<iframe/.test(ev), 'anel: escapa HTML'); }
  const b1 = X.bars({ labels: ['A', 'B', 'C'], series: [{ name: 'x', values: [1, 2, 3], cls: 's0' }, { name: 'y', values: [2, 3, 4], cls: 's1' }], flags: ['', '▲ +5%', ''], fmt: (v) => String(v) });
  ok(cnt(b1, /class="bk /g) === 6 && cnt(b1, /class="bflag"/g) === 1 && cnt(b1, /<title>/g) >= 7, 'barras: uma barra por serie e categoria, com 1 alerta e dicas');
  ok(X.bars({ labels: [], series: [] }).includes('empty') && !/NaN|undefined/.test(X.bars({ labels: ['A'], series: [{ name: 'x', values: [NaN] }] })), 'barras: vazio e valor invalido tratados');
  const bh = [...b1.matchAll(/class="bk s(\d)"[^>]* height="([\d.]+)"/g)].map((m) => +m[2]); ok(bh.length === 6 && bh[1] > bh[0] && bh[5] > bh[1], 'barras: altura proporcional ao valor');
  const l1 = X.line({ labels: ['a', 'b', 'c'], series: [{ name: 's', values: [1, 2, 3], cls: 'c0', bubble: true }], fmt: (v) => 'v' + v });
  ok(/class="bub"/.test(l1) && />v3</.test(l1) && /pt-halo/.test(l1), 'linha: balao de valor no ultimo ponto');
  ok(!/class="bub"/.test(X.line({ labels: ['a', 'b'], series: [{ name: 's', values: [1, 2], cls: 'c0' }] })), 'linha: sem balao quando nao pedido');
  const lw = X.line({ labels: ['a', 'b', 'c'], series: [{ name: 's', values: [1, 2, 99999999], cls: 'c0', bubble: true }], fmt: (v) => 'R$ ' + v, w: 480 }), bx = lw.match(/class="bub" x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)"/);
  ok(bx && +bx[1] >= 0 && +bx[1] + +bx[3] <= 480 + 6 && +bx[2] >= 0, 'linha: balao nao sai da area do grafico');
}
{ // busca global
  const H = G.Views.H, st = (mode) => ({ view: 'x', mode, country: 'all', layers: [], minScore: 0 });
  ok(H.search(st('demo'), d, '').total === 0 && H.search(st('demo'), d, '   ').items.length === 0, 'busca: consulta vazia nao retorna nada');
  const p4 = H.search(st('demo'), d, 'P04'); ok(p4.items[0] && p4.items[0].type === 'Projeto' && p4.items[0].ref === 'P04' && p4.items[0].view === 'projects', 'busca: codigo exato de projeto vem primeiro');
  const man = H.search(st('demo'), d, 'manaus').items.map((x) => x.type + ':' + x.ref); ok(man.includes('Localidade:MAO') && man.includes('Terminal:MAO'), 'busca: "manaus" acha localidade e terminal');
  ok(H.search(st('demo'), d, 'ocupacao').items.some((x) => x.type === 'KPI'), 'busca: ignora acentos ("ocupacao" acha "Ocupação")');
  ok(H.search(st('demo'), d, 'GRU').items[0].ref === 'GRU', 'busca: codigo da localidade vem primeiro');
  ok(H.search(st('demo'), d, 'câmara fria').items.length > 0 && H.search(st('demo'), d, 'camara zzzzqq').total === 0, 'busca: varios termos sao combinados com E');
  ok(H.search(st('demo'), d, 'a', 5).items.length === 5 && H.search(st('demo'), d, 'a').items.length <= 8, 'busca: limite de resultados');
  ok(H.search(st('demo'), d, 'a').total >= H.search(st('demo'), d, 'a').items.length, 'busca: total >= exibidos');
  const pub = H.search(st('public'), d, 'P04'); ok(!H.search(st('public'), d, 'R01').items.some((x) => x.type === 'Risco') && !pub.items.some((x) => x.type === 'Projeto'), 'busca: modo publico nao expoe projetos nem riscos');
  ok(H.search(st('public'), d, 'guarulhos').items.some((x) => x.type === 'Localidade'), 'busca: modo publico acha localidades');
  ok(H.search(st('demo'), d, '(*+[').items.length === 0 && H.search(st('demo'), d, '\\').total === 0, 'busca: caracteres de expressao regular sao tratados como texto');
  const html = H.searchHtml({ items: [{ type: 'Projeto', label: '<img src=x onerror=alert(1)>', sub: '<b>', view: 'projects', ref: 'P01' }], total: 1 }, '<script>'), none = H.searchHtml({ items: [], total: 0 }, '<script>alert(1)</script>');
  ok(!/<img|<script|<u>/.test(html + none) && /&lt;img/.test(html) && /&lt;script/.test(none) && /role="option"/.test(html) && /data-goto="projects"/.test(html) && /data-set="proj" data-val="P01"/.test(html), 'busca: HTML dos resultados escapado, com papel de opcao e atributos de navegacao');
  ok(/Nada encontrado/.test(none), 'busca: mensagem quando nao ha resultado');
  const all = H.search(st('demo'), d, 'a', 999); ok(all.items.every((x) => x.view && x.type && x.label), 'busca: todo resultado tem destino, tipo e rotulo');
  ok(new Set(['kpis', 'terminals', 'projects', 'risks', 'suppliers', 'business', 'opportunities', 'network', 'governance']).size >= 9 && all.items.every((x) => G.Views.views[x.view]), 'busca: todo destino e uma tela existente');
  ok(H.search(st('demo'), d, 'P04').items.length === new Set(H.search(st('demo'), d, 'P04').items.map((x) => x.type + x.label)).size, 'busca: sem resultados duplicados');
}

if (errors.length) { console.error('FALHAS (' + errors.length + '):\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: ${locs.length} localidades, ${sources.length} fontes públicas; demonstração: ${S ? S.projects.length + ' projetos, ' + S.cases.length + ' casos, ' + S.risks.length + ' riscos, ' + S.suppliers.length + ' fornecedores' : 'ausente'}; fórmulas e regras verificadas.`);
