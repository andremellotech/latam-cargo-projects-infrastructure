// Renderiza todas as telas em todos os modos e cenarios (sem navegador) e procura valores quebrados,
// links que nao resolvem e HTML nao escapado. Uso: node scripts/smoke-test.mjs
import { readFileSync } from 'node:fs';
import { loadAll, G } from './_load.mjs';
const { Views } = G;
const d = loadAll(), S = d.sets.demo, html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bad = /undefined|NaN|Infinity|\[object|null<|>null|>undefined/;
let fails = 0; const f = (m) => { fails++; if (fails <= 40) console.error('FALHA: ' + m); };
const base = { view: 'x', mode: 'demo', country: 'all', layers: [], minScore: 0, selected: null, term: null, proj: null, caseId: null, kpi: 'occupancy', metric: 'score', calc: {} };
const scenarios = {
  padrao: {},
  selecionado: { term: 'SCL', proj: 'P04', caseId: 'BC5', kpi: 'dwell', metric: 'occupancy', selected: 'GRU', layers: ['fresh'], minScore: 70 },
  saude: { metric: 'health', selected: 'MAO', term: 'MAO', proj: 'P13', caseId: 'BC1', kpi: 'throughput' },
  chile: { country: 'Chile', layers: ['ecommerce'], minScore: 0 },
  vazio: { country: 'Chile', layers: ['ecommerce'], minScore: 100, selected: 'GRU' },
  calcInvalido: { calc: { capex: 'abc', years: '999', rate: '-900', benefit: '', opex: '1e3' } }
};
const modes = ['demo', 'public'];
const allHtml = {};
for (const mode of modes) for (const [name, sc] of Object.entries(scenarios)) {
  const st = Object.assign({}, base, { mode }, sc);
  for (const v of Object.keys(Views.TITLES)) {
    st.view = v; let out;
    try { out = Views.views[v](st, d); } catch (e) { f(`${mode}/${name}/${v} lancou erro: ${e.stack.split('\n').slice(0, 2).join(' | ')}`); continue; }
    if (!out || out.length < 60) f(`${mode}/${name}/${v} vazio`);
    const m = out.match(bad); if (m) f(`${mode}/${name}/${v} contem "${m[0]}"`);
    if (/<script/i.test(out)) f(`${mode}/${name}/${v} contem <script>`);
    (allHtml[mode + '/' + v] = allHtml[mode + '/' + v] || []).push(out);
  }
}
// 1) links: todo data-goto e data-set precisam apontar para algo que existe
const tcodes = new Set(S.terminals.map((t) => t.code)), pids = new Set(S.projects.map((p) => p.id)), cids = new Set(S.cases.map((c) => c.id)), lcodes = new Set(d.locations.map((l) => l.code));
const kids = new Set(S.series.defs.map((x) => x.id));
for (const [key, outs] of Object.entries(allHtml)) for (const out of outs) {
  for (const m of out.matchAll(/data-goto="([\w-]+)"/g)) if (!Views.views[m[1]]) f(`${key}: data-goto invalido "${m[1]}"`);
  for (const m of out.matchAll(/data-set="(\w+)" data-val="([^"]*)"/g)) {
    const [, k, v] = m;
    if (k === 'term' && !tcodes.has(v)) f(`${key}: term invalido "${v}"`);
    else if (k === 'proj' && v !== '' && !pids.has(v)) f(`${key}: proj invalido "${v}"`);
    else if (k === 'caseId' && !cids.has(v)) f(`${key}: caseId invalido "${v}"`);
    else if (k === 'selected' && !lcodes.has(v)) f(`${key}: selected invalido "${v}"`);
    else if (k === 'kpi' && !kids.has(v)) f(`${key}: kpi invalido "${v}"`);
    else if (k === 'metric' && !['score', 'occupancy', 'health'].includes(v)) f(`${key}: metric invalida "${v}"`);
    else if (k === 'mode' && !['demo', 'public', 'internal'].includes(v)) f(`${key}: modo invalido "${v}"`);
    else if (k === 'kv' && !['exec', 'financial', 'operational'].includes(v)) f(`${key}: aba de KPIs invalida "${v}"`);
    else if (!['term', 'proj', 'caseId', 'selected', 'kpi', 'metric', 'mode', 'kv'].includes(k)) f(`${key}: data-set desconhecido "${k}"`);
  }
  for (const m of out.matchAll(/data-loc="(\w+)"/g)) if (!lcodes.has(m[1])) f(`${key}: data-loc invalido "${m[1]}"`);
  for (const m of out.matchAll(/data-load-sim="(\w+)"/g)) if (!cids.has(m[1])) f(`${key}: data-load-sim invalido "${m[1]}"`);
}
// 2) modo publico nao pode vazar dados fficticios
for (const v of ['consultant', 'terminals', 'projects', 'kpis', 'business', 'risks', 'suppliers', 'opportunities']) {
  const out = allHtml['public/' + v][0];
  if (/Provedor GH|Transportadora R|\bP04\b|\bBC1\b|\bR01\b/.test(out.replace(/Hipótese|H\d/g, ''))) f(`public/${v}: vaza dado de demonstracao`);
  if (!/indisponível no modo público/.test(out)) f(`public/${v}: deveria exibir aviso de indisponibilidade`);
}
// 3) o modo demonstracao precisa mostrar graficos e marcacao de ficticio
const cnt = (s, re) => (s.match(re) || []).length;
const svgs = (v) => cnt(allHtml['demo/' + v][0], /<svg/g);
const need = { projects: 3, terminals: 4, kpis: 1, business: 3, suppliers: 1, consultant: 0, risks: 0 };
for (const [v, n] of Object.entries(need)) if (svgs(v) < n) f(`demo/${v}: esperado >= ${n} graficos SVG, achou ${svgs(v)}`);
for (const v of ['terminals', 'projects', 'risks', 'suppliers', 'business']) if (!/fictício/.test(allHtml['demo/' + v][0])) f(`demo/${v}: falta marcacao "fictício"`);
if (!/rm"/.test(allHtml['demo/risks'][0])) f('demo/risks: falta a matriz de riscos');
if (cnt(allHtml['demo/projects'][0], /class="gr"/g) !== S.projects.length) f('demo/projects: o Gantt deve ter uma linha por projeto');
for (const code of ['GRU', 'VCP', 'MAO', 'MIA', 'SCL', 'LIM', 'BOG']) if (!allHtml['demo/network'][0].includes(`data-loc="${code}"`)) f('mapa: pino ausente ' + code);
// 3b) KPIs: quadro executivo + KPIs de apoio
{
  const S2 = d.sets.demo, defs = S2.series.defs, t1 = defs.filter((x) => x.tier === 1), t2 = defs.filter((x) => x.tier === 2);
  const k = (kv, kpi) => Views.views.kpis(Object.assign({}, base, { view: 'kpis', mode: 'demo', kv, kpi }), d);
  const exec = k('exec'), fin = k('financial', 'margin'), ope = k('operational', 'occupancy'), opx = k('financial', 'opexAdherence'), con = k('financial', 'contribution');
  // aba executiva
  ['Leitura executiva', 'Quadro de KPIs executivos', 'Mapa de calor: terminal × KPI executivo', 'Contribuição frente ao orçado', 'Como ler este quadro'].forEach((h) => { if (!exec.includes(h)) f('kpis/exec: falta a secao "' + h + '"'); });
  if (cnt(exec, /class="hmb"/g) !== (S2.terminals.length + 1) * t1.length) f('kpis/exec: o mapa de calor deve ter (terminais + rede) x KPIs executivos celulas; achou ' + cnt(exec, /class="hmb"/g));
  t1.forEach((x) => { if (!exec.includes(x.name)) f('kpis/exec: falta o KPI executivo "' + x.name + '"'); });
  t2.forEach((x) => { if (exec.includes('data-set="kpi" data-val="' + x.id + '"')) f('kpis/exec: KPI de apoio "' + x.name + '" nao deve ter linha nem celula no quadro executivo'); });
  if (cnt(exec, /<tr class="[^"]*"><td class="pillar"/g) !== t1.length) f('kpis/exec: uma linha do quadro por KPI executivo');
  const pill = [...exec.matchAll(/<td class="pillar">([^<]*)<\/td>/g)].map((m) => m[1]).filter(Boolean); if (new Set(pill).size !== pill.length) f('kpis/exec: o pilar deve aparecer uma vez por grupo de linhas');
  { const cells = [...exec.matchAll(/<td class="hm st-([gar])">(<button[\s\S]*?<\/button>)<\/td>/g)];
    if (cells.length !== (S2.terminals.length + 1) * t1.length) f('kpis/exec: celulas do mapa de calor nao reconhecidas (' + cells.length + ')');
    cells.forEach(([, r, btn]) => { if (r === 'r' && !btn.includes('▲')) f('kpis/exec: celula vermelha sem simbolo'); if (r === 'a' && !btn.includes('◆')) f('kpis/exec: celula de atencao sem simbolo'); if (r === 'g' && /hmg/.test(btn)) f('kpis/exec: celula na meta nao deve ter simbolo'); if (!/aria-label="[^"]+, (Crítico|Atenção|No plano)"/.test(btn)) f('kpis/exec: celula sem rotulo acessivel com o status'); }); }
  if (!/média esconde terminais no vermelho/.test(exec)) f('kpis/exec: deve sinalar quando a media da rede esconde terminais vermelhos');
  if (!/não é ajustada à sazonalidade/.test(exec) || !/SCL \(safra de cerejas\)/.test(exec)) f('kpis/exec: falta o aviso de sazonalidade com as temporadas do recorte');
  if (!/<details class="panel pubkpi">/.test(exec)) f('kpis/exec: indicadores publicos devem ficar recolhidos quando ha dados de gestao');
  if (/class="kcard/.test(exec) || /Dicionário de KPIs/.test(exec)) f('kpis/exec: a aba executiva nao deve trazer cartoes de apoio nem dicionario');
  if (!new RegExp(t2.length + ' KPIs de apoio').test(exec)) f('kpis/exec: deve informar quantos KPIs de apoio existem');
  // abas de apoio
  S2.series.defs.filter((x) => x.group === 'financial').forEach((x) => { if (!fin.includes(x.name)) f('kpis (financeiros): falta o cartao "' + x.name + '"'); });
  S2.series.defs.filter((x) => x.group === 'operational').forEach((x) => { if (!ope.includes(x.name)) f('kpis (operacionais): falta o cartao "' + x.name + '"'); });
  if (!/Financeiro do portfólio de projetos/.test(fin) || /Financeiro do portfólio de projetos/.test(ope)) f('kpis: o financeiro do portfolio deve aparecer so no grupo financeiro');
  if (!/Dicionário de KPIs/.test(fin) || !/Fórmula/.test(fin) || !/Por que importa/.test(fin)) f('kpis: falta o dicionario, a formula ou o "por que importa"');
  if (!/De onde vem o desvio de OPEX/.test(opx) || /De onde vem o desvio de OPEX/.test(fin)) f('kpis: a ponte do desvio de OPEX deve aparecer so para OPEX');
  if (!/De onde vem o desvio de contribuição/.test(con) || /De onde vem o desvio de contribuição/.test(fin)) f('kpis: a ponte da contribuicao deve aparecer so no KPI de contribuicao');
  if (!/class="kcard on"[^>]*data-val="margin"/.test(fin)) f('kpis: o cartao selecionado deve estar marcado');
  if (cnt(fin, /class="kcard/g) !== defs.filter((x) => x.group === 'financial').length) f('kpis: um cartao por KPI do grupo');
  if (cnt(fin, /class="tier">Executivo/g) !== defs.filter((x) => x.group === 'financial' && x.tier === 1).length) f('kpis: so os KPIs executivos levam a etiqueta "Executivo"');
  if (!/Rede \(recorte\)/.test(fin) || !/Fora da meta há/.test(fin)) f('kpis: falta a linha de rede ou a coluna de duracao na tabela');
  if (!/O que move este KPI/.test(fin) || !/class="chip drv st-/.test(fin)) f('kpis: faltam os KPIs que movem o selecionado (drivers)');
  if (/O que move este KPI/.test(k('operational', 'throughput'))) f('kpis: KPI sem drivers nao deve mostrar o bloco');
  if (!/Por que importa:/.test(fin)) f('kpis: falta o "por que importa" no detalhe');
  if (/class="kcard on"[^>]*data-val="margin"/.test(ope) || !/class="kcard on"[^>]*data-val="occupancy"/.test(ope)) f('kpis: um KPI de outro grupo nao pode ficar selecionado');
  if (!/class="kcard on"[^>]*data-val="contribution"/.test(Views.views.kpis(Object.assign({}, base, { view: 'kpis', kv: 'financial', kpi: 'throughput' }), d))) f('kpis: KPI de outro grupo cai no primeiro executivo do grupo');
  // consultor: so os executivos
  const cons = allHtml['demo/consultant'][0]; if (!/KPIs executivos da rede/.test(cons) || cnt(cons, /class="kb-row"/g) !== t1.length) f('consultor: o quadro deve listar so os ' + t1.length + ' KPIs executivos');
  if (cnt(cons, /class="rdot[^>]*aria-label="Status: /g) !== t1.length) f('consultor: todo ponto de semaforo deve ter rotulo acessivel');
  if (!new RegExp('Abrir os ' + defs.length + ' KPIs').test(cons)) f('consultor: o link deve informar o total de KPIs');
  if (!/KPIs de GRU \(executivos primeiro\)/.test(Views.views.terminals(Object.assign({}, base, { view: 'terminals', term: 'GRU' }), d))) f('terminais: falta a ficha de KPIs do terminal');
  if (/OPEX frente ao orçamento|Margem de contribuição<\/b>/.test(allHtml['public/kpis'][0].replace(/<details[\s\S]*?<\/details>/g, ''))) f('public/kpis: vaza KPI de gestao');
  const none = Views.views.kpis(Object.assign({}, base, { view: 'kpis', country: 'Chile', layers: ['ecommerce'], minScore: 100 }), d); if (!/Nenhum terminal/.test(none)) f('kpis: recorte vazio deve avisar');
  const one = Views.views.kpis(Object.assign({}, base, { view: 'kpis', country: 'Colômbia' }), d); if (/undefined|NaN/.test(one) || !/Mapa de calor/.test(one)) f('kpis: recorte de um terminal deve funcionar');
  // tom de cada frase da leitura executiva vira o ponto de gravidade correspondente
  if (!/class="ins r"|class="ins a"/.test(exec)) f('kpis/exec: a leitura executiva deve usar os tons de gravidade');
}
// 3c) dados no formato antigo (sem tier, sem contribuicao) nao podem quebrar nenhuma tela
{
  const old = JSON.parse(JSON.stringify(d.sets.demo));
  old.series.defs.forEach((x) => { delete x.tier; delete x.why; delete x.pillar; delete x.drivers; delete x.targetSeries; });
  old.series.defs = old.series.defs.filter((x) => x.id !== 'contribution');
  Object.values(old.series.byTerminal).forEach((q) => { delete q.contribution; delete q.contributionBudget; });
  const dOld = Object.assign({}, d, { sets: { demo: old, internal: null } });
  for (const kv of ['exec', 'financial', 'operational']) for (const v of Object.keys(Views.TITLES)) {
    let out; try { out = Views.views[v](Object.assign({}, base, { view: v, kv, term: 'GRU', selected: 'GRU' }), dOld); } catch (e) { f('formato antigo/' + v + '/' + kv + ' lancou erro: ' + e.message.split('\n')[0]); continue; }
    if (/undefined|NaN|\[object/.test(out)) f('formato antigo/' + v + '/' + kv + ' contem valor quebrado');
  }
  const k0 = Views.views.kpis(Object.assign({}, base, { view: 'kpis', kv: 'exec' }), dOld);
  if (/Quadro de KPIs executivos/.test(k0) || !/aria-pressed="true">Financeiros/.test(k0) || /data-val="exec"/.test(k0)) f('formato antigo: sem KPI de nivel 1 a aba executiva deve sumir e a tela abrir em Financeiros');
}
// 3c) tema de vidro: sprite de icones, aneis, barras, painel lateral, busca e menu
{
  const syms = new Set([...html.matchAll(/<symbol id="i-([\w-]+)"/g)].map((m) => m[1])), used = new Set();
  for (const outs of Object.values(allHtml)) for (const o of outs) for (const m of o.matchAll(/<use href="#i-([\w-]+)"/g)) used.add(m[1]);
  for (const m of html.matchAll(/<use href="#i-([\w-]+)"/g)) used.add(m[1]);
  used.forEach((n) => { if (!syms.has(n)) f('icone usado sem simbolo no sprite: ' + n); });
  syms.forEach((n) => { if (!used.has(n)) f('simbolo do sprite nunca usado: ' + n); });
  const navs = [...html.matchAll(/<button class="nav-item"[^>]*>(.*?)<\/button>/g)]; if (!navs.length || navs.some((m) => !/<svg class="ic"/.test(m[1]) || !/<span>[^<]+<\/span>/.test(m[1]))) f('menu: todo item deve ter icone e rotulo em <span>');
  if (!/id="navInd"/.test(html) || !/id="mainNav"/.test(html)) f('menu: falta o indicador (navInd) ou o container (mainNav)');
  const inp = html.match(/<input id="globalSearch"[^>]*>/); if (!inp || !/role="combobox"/.test(inp[0]) || !/aria-controls="searchResults"/.test(inp[0]) || !/aria-label="/.test(inp[0]) || !/aria-expanded="false"/.test(inp[0])) f('busca: o campo deve ser combobox acessivel com aria-controls, aria-label e aria-expanded');
  if (!/id="searchResults"[^>]*role="listbox"[^>]*hidden/.test(html) || !/id="searchStatus"[^>]*aria-live="polite"/.test(html)) f('busca: lista de resultados (listbox, oculta) e regiao de status (aria-live) ausentes');
  const S2 = d.sets.demo, cons = allHtml['demo/consultant'][0];
  if (cnt(cons, /<figure class="ring"/g) !== 3) f('consultor: devem existir 3 aneis de metas');
  if (!/<aside class="cons-rail"/.test(cons) || cnt(cons, /class="qa"/g) !== 4) f('consultor: painel lateral com 4 atalhos ausente');
  const dls = cnt(cons, /class="dl"/g); if (dls < 5 || dls > 7) f('consultor: lista de prazos deve ter de 5 a 7 itens, achou ' + dls);
  if (cnt(cons, /class="card feature"/g) !== 1 || cnt(cons, /<span class="ico">/g) !== 8) f('consultor: 8 cartoes com icone e 1 em destaque');
  if (cnt(cons, /class="bk s1"/g) !== S2.terminals.length) f('consultor: o grafico de barras deve ter uma barra realizada por terminal');
  if (!/role="img" aria-label="Ocupação da rede: 82%/.test(cons)) f('consultor: o anel deve ter rotulo acessivel com o valor');
  if (!/aria-label="CAPEX realizado: \d+% do orçamento; o plano previa \d+% até a data"/.test(cons)) f('consultor: o anel de CAPEX deve informar o plano no rotulo');
  if (/class="dl"[^>]*><span class="dl-ic">.*?(NaN|undefined)/.test(cons)) f('consultor: prazo com valor invalido');
  [...cons.matchAll(/class="dl"([^>]*)>/g)].forEach((m) => { const g = m[1].match(/data-goto="(\w+)"/); if (!g || !Views.views[g[1]]) f('consultor: prazo aponta para tela inexistente'); });
  const chile = Views.views.consultant(Object.assign({}, base, { view: 'consultant', country: 'Chile' }), d); if (cnt(chile, /<figure class="ring"/g) !== 3 || !/R0[3]\b/.test(chile) || /R0[12]\b · /.test(chile.match(/<aside[\s\S]*<\/aside>/)[0])) f('consultor: o recorte por pais deve valer tambem para os prazos');
  const tm = Views.views.terminals(Object.assign({}, base, { view: 'terminals', term: 'GRU' }), d); if (cnt(tm, /class="bub"/g) < 4) f('terminais: graficos de linha devem ter o balao de valor');
  if (/class="ring"|cons-rail/.test(allHtml['public/consultant'][0])) f('public/consultant: nao deve exibir aneis nem painel lateral');
}
// 4) escape de HTML em dados de demonstracao (simula dado interno malicioso)
const evil = '<img src=x onerror=alert(1)>', clone = JSON.parse(JSON.stringify(S));
clone.projects[0].name = evil; clone.projects[0].owner = evil; clone.risks[0].title = evil; clone.suppliers[0].name = evil; clone.cases[0].name = evil; clone.pipeline[0].name = evil; clone.consultant.decisions[0].title = evil; clone.terminals[0].seasonal = { label: evil, start: '2026-11-15' }; clone.series.defs[0].name = evil; clone.series.defs[0].definition = evil; clone.series.defs[0].why = evil; clone.series.defs[0].pillar = evil; clone.series.defs[1].owner = evil; clone.series.defs[1].why = evil; clone.terminals[1].seasonal = { label: evil, start: '2026-11-15' };
const dd = Object.assign({}, d, { sets: { demo: clone, internal: null } });
for (const v of Object.keys(Views.TITLES)) {
  const out = Views.views[v](Object.assign({}, base, { view: v, term: 'GRU', proj: 'P01', caseId: 'BC1', selected: 'GRU', kpi: v === 'kpis' ? clone.series.defs[0].id : 'occupancy', kv: 'financial' }), dd);
  if (v === 'kpis') { const ex = Views.views.kpis(Object.assign({}, base, { view: v, kv: 'exec' }), dd); if (ex.includes('<img src=x')) f('kpis/exec: HTML nao escapado em dado de KPI'); }
  if (out.includes('<img src=x')) f(`${v}: HTML nao escapado em dado de gestao`);
}
// 5) navegacao do index.html coincide com as telas
[...html.matchAll(/data-view="(\w+)"/g)].map((m) => m[1]).forEach((v) => { if (!Views.views[v]) f('botao de navegacao sem tela: ' + v); });
Object.keys(Views.views).forEach((v) => { if (!html.includes(`data-view="${v}"`)) f('tela sem botao: ' + v); });
['core', 'analytics', 'charts', 'views-common', 'views-public', 'views-mgmt', 'app'].forEach((s) => { if (!html.includes(`src="js/${s}.js"`)) f('index.html nao carrega js/' + s + '.js'); });
const order = ['core', 'analytics', 'charts', 'views-common', 'views-public', 'views-mgmt', 'app'].map((s) => html.indexOf(`js/${s}.js`)); if (order.some((v, i) => i && v < order[i - 1])) f('ordem de carga dos scripts incorreta');

if (fails) { console.error(fails + ' falha(s)'); process.exit(1); }
console.log('OK: ' + modes.length * Object.keys(scenarios).length * Object.keys(Views.TITLES).length + ' renderizações, links, escape de HTML e isolamento do modo público verificados.');
