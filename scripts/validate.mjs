// Validacao de dados e formulas. Uso: node scripts/validate.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../js/core.js');
const rd = (n) => JSON.parse(readFileSync(new URL('../data/' + n + '.json', import.meta.url), 'utf8'));
const errors = []; const fail = (m) => errors.push(m); const ok = (c, m) => { if (!c) fail(m); };

const config = rd('config'), locs = rd('locations'), sources = rd('sources'), corr = rd('corridors'), init = rd('initiatives'), kpis = rd('kpis'), opps = rd('opportunities'), map = rd('americas-paths');

// pesos
const wsum = Object.values(config.scoreWeights).reduce((a, b) => a + b, 0);
ok(Math.abs(wsum - 1) < 1e-9, `Pesos do score somam ${wsum}, esperado 1`);
ok(config.bands.high > config.bands.mid, 'Faixas invalidas');

// fontes
const sid = new Set(sources.map((s) => s.id)); ok(sid.size === sources.length, 'IDs de fontes duplicados');
sources.forEach((s) => { ok(/^https:\/\//.test(s.url), `Fonte ${s.id}: URL deve ser https`); ok(/^\d{4}-\d{2}-\d{2}$/.test(s.accessed), `Fonte ${s.id}: data de acesso invalida`); ok(s.facts && s.facts.length, `Fonte ${s.id}: sem fatos`); });
const needSrc = (ids, ctx) => { ok(ids && ids.length, `${ctx}: sem fonte`); (ids || []).forEach((i) => ok(sid.has(i), `${ctx}: fonte inexistente ${i}`)); };

// localidades
const layerIds = new Set(config.layers.map((l) => l.id)); const codes = new Set();
locs.forEach((l) => {
  ok(!codes.has(l.code), `Codigo duplicado ${l.code}`); codes.add(l.code);
  ok(l.lat >= -40 && l.lat <= 32 && l.lon >= -95 && l.lon <= -30, `${l.code}: coordenadas fora do recorte do mapa`);
  Object.keys(config.scoreWeights).forEach((k) => ok(Number.isFinite(l.components[k]) && l.components[k] >= 0 && l.components[k] <= 100, `${l.code}: componente ${k} invalido`));
  l.layers.forEach((x) => ok(layerIds.has(x), `${l.code}: camada inexistente ${x}`)); ok(l.layers.includes(l.primaryLayer), `${l.code}: camada principal fora de layers`);
  ok(['Alta', 'Média', 'Baixa'].includes(l.confidence), `${l.code}: confianca invalida`);
  ok(l.evidence.length > 0 && l.focus.length > 0, `${l.code}: evidencia/frentes ausentes`); needSrc(l.sources, l.code);
});
corr.forEach((c) => { ok(codes.has(c.from) && codes.has(c.to), `Corredor ${c.id}: localidade inexistente`); needSrc(c.sources, 'Corredor ' + c.id); });
init.forEach((i) => { ok(codes.has(i.location) || i.location === 'Rede', `Marco ${i.id}: local invalido`); needSrc(i.sources, 'Marco ' + i.id); });
kpis.forEach((k) => { ok(Number.isFinite(k.value), `KPI ${k.id}: valor invalido`); needSrc(k.sources, 'KPI ' + k.id); });
opps.forEach((o) => { ok(codes.has(o.location), `Hipotese ${o.id}: local invalido`); ok(o.dataNeeded.length > 0, `Hipotese ${o.id}: sem dados necessarios`); needSrc(o.sources, 'Hipotese ' + o.id); });
ok(map.countries.length > 20 && map.countries.every((c) => c.d && c.d.startsWith('M')), 'Geometria do mapa invalida');

// contraste das cores de camada com texto branco (WCAG AA = 4,5)
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
config.layers.forEach((l) => ok(1.05 / (lum(l.color) + 0.05) >= 4.5, `Camada ${l.id}: contraste ${(1.05 / (lum(l.color) + 0.05)).toFixed(2)} com branco < 4,5`));

// toda fonte deve ser usada; nenhuma ficha sem referencia
const used = new Set([...locs, ...corr, ...init, ...kpis, ...opps].flatMap((x) => x.sources || []));
sources.forEach((s) => ok(used.has(s.id), `Fonte ${s.id} nao e referenciada por nenhum dado`));
ok(new Set(kpis.map((k) => k.id)).size === kpis.length, 'IDs de KPI duplicados');

// formulas financeiras (valores de referencia calculados a mao)
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
ok(near(Core.npv(0.1, [-100, 110]), 0), 'NPV: -100 e 110 a 10% deve ser 0');
ok(near(Core.irr([-100, 60, 60]), 0.130662, 1e-5), 'TIR de [-100,60,60] deve ser ~13,07%');
ok(Core.irr([100, 50]) === null && Core.irr([-100, -50]) === null, 'TIR sem inversao de sinal deve ser null');
ok(near(Core.payback([-100, 60, 60], 0), 1 + 40 / 60), 'Payback simples deve ser 1,667');
ok(Core.payback([-100, 10, 10], 0) === null, 'Payback inexistente deve ser null');
const base = { capex: 100, benefit: 60, opex: 0, years: 2, rate: 0.1, benefitGrowth: 0, opexGrowth: 0, residual: 0 };
ok(near(Core.evaluate(base).npv, 4.1322314, 1e-5), 'evaluate: VPL esperado 4,132');
ok(Core.score({ a: 100, b: 0 }, { a: .5, b: .5 }) === 50, 'score: media ponderada');
ok(Core.esc('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;', 'esc: escape HTML');
ok(Core.safeUrl('javascript:alert(1)') === '#', 'safeUrl deve bloquear javascript:');

// sanidade de arquivos referenciados
['index.html', 'styles.css', 'js/app.js', 'js/core.js', 'js/views.js'].forEach((f) => ok(existsSync(new URL('../' + f, import.meta.url)), 'Arquivo ausente: ' + f));

if (errors.length) { console.error('FALHAS (' + errors.length + '):\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: ${locs.length} localidades, ${sources.length} fontes, ${corr.length} corredores, ${init.length} marcos, ${opps.length} hipoteses; formulas verificadas.`);
