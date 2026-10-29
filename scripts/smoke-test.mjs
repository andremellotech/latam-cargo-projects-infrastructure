// Renderiza todas as telas em Node (sem navegador) e procura valores quebrados.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Views = require('../js/views.js');
const rd = (n) => JSON.parse(readFileSync(new URL('../data/' + n + '.json', import.meta.url), 'utf8'));
const data = { config: rd('config'), locations: rd('locations'), sources: rd('sources'), corridors: rd('corridors'), initiatives: rd('initiatives'), kpis: rd('kpis'), opportunities: rd('opportunities'), map: rd('americas-paths') };
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const bad = /undefined|NaN|Infinity|\[object|null</;
let fails = 0; const f = (m) => { fails++; console.error('FALHA: ' + m); };

const scenarios = {
  padrao: { view: 'x', country: 'all', layers: [], minScore: 0, selected: null, calc: {}, internal: null },
  selecionado: { country: 'all', layers: ['fresh'], minScore: 80, selected: 'SCL', calc: {}, internal: { projects: [{ name: 'Teste <b>', location: 'GRU', phase: 'Projeto', progress: 40, capex: null, risk: 'Médio', status: 'Em andamento' }] } },
  vazio: { country: 'Chile', layers: ['ecommerce'], minScore: 100, selected: 'GRU', calc: {}, internal: null },
  calcInvalido: { country: 'all', layers: [], minScore: 0, selected: null, calc: { capex: 'abc', years: '999', rate: '-900', benefit: '', opex: '1e3' }, internal: null }
};
for (const [name, st] of Object.entries(scenarios)) {
  for (const v of Object.keys(Views.TITLES)) {
    st.view = v; let out;
    try { out = Views.views[v](st, data); } catch (e) { f(`${name}/${v} lancou erro: ${e.message}`); continue; }
    if (!out || out.length < 50) f(`${name}/${v} vazio`);
    const m = out.match(bad); if (m) f(`${name}/${v} contem "${m[0]}"`);
    if (/<script/i.test(out)) f(`${name}/${v} contem <script>`);
  }
}
// escape de dado interno
const o = Views.views.projects(scenarios.selecionado, data); if (o.includes('Teste <b>')) f('dados internos nao escapados'); if (!o.includes('n/d')) f('CAPEX nulo deve exibir n/d');
// mapa: todos os pinos presentes
const net = Views.views.network(scenarios.padrao, data); data.locations.forEach((l) => { if (!net.includes(`data-loc="${l.code}"`)) f('pino ausente ' + l.code); });
// IDs usados no app.js devem existir no index.html (ou ser gerados pelas telas)
const dyn = new Set(['minscore', 'minv', 'calc-results']);
[...app.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]).forEach((id) => { if (!dyn.has(id) && !html.includes(`id="${id}"`)) f('id ausente no index.html: ' + id); });
dyn.forEach((id) => { if (!Object.values(Views.views).map((fn) => fn(scenarios.padrao, data)).join('').includes(`id="${id}"`)) f('id dinamico nao gerado: ' + id); });
// navegacao coincide com telas
[...html.matchAll(/data-view="(\w+)"/g)].map((m) => m[1]).forEach((v) => { if (!Views.views[v]) f('botao de navegacao sem tela: ' + v); });
Object.keys(Views.views).forEach((v) => { if (!html.includes(`data-view="${v}"`)) f('tela sem botao: ' + v); });

if (fails) { console.error(fails + ' falha(s)'); process.exit(1); }
console.log('OK: ' + Object.keys(scenarios).length * Object.keys(Views.TITLES).length + ' renderizacoes sem erros.');
