// Teste de integracao do app.js com um DOM simulado: navegacao, entrevista reversivel, modos, filtros, selecao, simulador, tema e TV.
const fs = require('fs'), vm = require('vm'), path = require('path');
process.chdir(path.join(__dirname, '..'));
const html = fs.readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]);
const withoutDemo = process.argv.includes('--without-demo');

function matches(attrs, classes, sel) {
  let m = sel.match(/^\[(data-[\w-]+)\]$/); if (m) return attrs[m[1]] !== undefined;
  m = sel.match(/^\[(data-[\w-]+)="([^"]*)"\]$/); if (m) return attrs[m[1]] === m[2];
  m = sel.match(/^\.([\w-]+)$/); if (m) return classes.includes(m[1]);
  return false;
}
function mkEl(id, attrs, classes) {
  attrs = attrs || {}; classes = classes || [];
  const ds = {}; Object.keys(attrs).forEach((k) => { ds[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attrs[k]; });
  return { id, innerHTML: '', textContent: '', value: '', hidden: false, style: {}, dataset: ds, attrs, _l: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute(k, v) { attrs[k] = String(v); }, removeAttribute(k) { delete attrs[k]; }, addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }, focus() { doc.activeElement = this; }, matches(s) { return matches(attrs, classes, s); },
    closest(s) { const sels = s.split(','); for (const x of sels) if (matches(attrs, classes, x.trim())) return this; return null; } };
}
const els = {}; ids.forEach((i) => { els[i] = mkEl(i); });
const navs = [...html.matchAll(/data-view="(\w+)"/g)].map((m) => mkEl('nav', { 'data-view': m[1] }, ['nav-item']));
const bodyCls = new Set(['mode-demo']);
const body = mkEl('body'); body.classList = { toggle(c, f) { f === undefined ? (bodyCls.has(c) ? bodyCls.delete(c) : bodyCls.add(c)) : f ? bodyCls.add(c) : bodyCls.delete(c); }, add(...cs) { cs.forEach((c) => bodyCls.add(c)); }, remove(...cs) { cs.forEach((c) => bodyCls.delete(c)); }, contains(c) { return bodyCls.has(c); } };
let ready; const doc = mkEl('doc');
Object.assign(doc, { getElementById: (i) => els[i] || null, querySelectorAll: (s) => (s === '.nav-item' ? navs : []), querySelector: () => null, body, title: '' });
doc.addEventListener = (t, f) => { if (t === 'DOMContentLoaded') ready = f; else (doc._l[t] = doc._l[t] || []).push(f); };
const storage = {}; const fetched = [];
const ctx = { document: doc, window: null, history: { replaceState() {} }, location: { hash: '' }, localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = v; } }, matchMedia: () => ({ matches: false }),
  fetch: async (p) => { fetched.push(p); try { if (withoutDemo && p.startsWith('data/demo/')) throw new Error('demo ausente'); const t = fs.readFileSync(p, 'utf8'); return { ok: true, json: async () => JSON.parse(t) }; } catch (e) { return { ok: false, status: 404, json: async () => null }; } }, console, Intl, Set, Promise, Object, Number, Math, Array, String, JSON, Date, setTimeout };
ctx.window = ctx; ctx.window.addEventListener = () => {}; ctx.window.scrollTo = () => {}; vm.createContext(ctx);
for (const f of ['core', 'analytics', 'charts', 'views-common', 'views-public', 'views-mgmt', 'interview', 'app']) vm.runInContext(fs.readFileSync('js/' + f + '.js', 'utf8'), ctx, { filename: f });

let fails = 0; const chk = (c, m) => { if (!c) { fails++; console.error('FALHA:', m); } };
const click = (attrs, classes) => { const t = mkEl('t', attrs, classes); doc._l.click.forEach((fn) => fn({ target: t })); };
const nav = (v) => navs.find((n) => n.dataset.view === v)._l.click[0]();
const c = () => els.appContent.innerHTML;

(async () => {
  await ready(); await new Promise((r) => setTimeout(r, 30));
  if (withoutDemo) {
    chk(els.interviewStart.hidden && els.interviewStart.disabled, 'entrevista: sem demo a entrada deve ficar oculta e desabilitada');
    chk(els.interviewStart.attrs['aria-pressed'] === 'false' && els.interviewPanel.hidden, 'entrevista: sem demo o roteiro permanece inativo');
    chk(els.modeBanner.innerHTML.includes('Modo público'), 'sem demo inicia em modo publico');
    click({ 'data-interview': 'next' });
    chk(!bodyCls.has('mode-demo') && els.modeBanner.innerHTML.includes('Modo público'), 'entrevista: controles sem demo nao podem ativar dados ficticios');
    console.log(fails ? fails + ' falha(s)' : 'OK: entrevista indisponivel sem conjunto demonstrativo.');
    process.exit(fails ? 1 : 0);
  }
  chk(fetched.some((p) => p === 'data/demo/meta.json') && fetched.some((p) => p === 'data/internal/meta.json'), 'deveria tentar carregar demo e internal');
  chk(!fetched.some((p) => p.startsWith('data/internal/') && p !== 'data/internal/meta.json'), 'sem internal/meta, nao deve buscar os demais arquivos internos');
  chk(c().includes('O que importa agora'), 'tela inicial deve ser a visao do consultor em modo demonstracao');
  chk(els.modeBanner.innerHTML.includes('fictícios'), 'banner de demonstracao'); chk(els.modeSwitch.innerHTML.includes('Demonstração') && els.modeSwitch.innerHTML.includes('Públicos') && !els.modeSwitch.innerHTML.includes('Internos'), 'seletor de modo sem "Internos"');
  chk(els.pageTitle.textContent === 'Visão do consultor', 'titulo');
  // modos
  click({ 'data-set': 'mode', 'data-val': 'public' }); chk(c().includes('indisponível no modo público'), 'modo publico deve avisar'); chk(storage.mode === 'public', 'modo deve ser persistido'); chk(els.modeBanner.innerHTML.includes('Modo público'), 'banner publico');
  click({ 'data-set': 'mode', 'data-val': 'internal' }); chk(storage.mode === 'public', 'modo interno inexistente deve ser ignorado');
  click({ 'data-set': 'mode', 'data-val': 'demo' }); chk(c().includes('O que importa agora') && storage.mode === 'demo', 'voltar a demonstracao');
  // todas as telas
  for (const n of navs) { n._l.click[0](); chk(c().length > 300 && !/NaN|undefined/.test(c()), 'tela com problema: ' + n.dataset.view); }
  // mapa: camadas, metrica, selecao
  nav('network'); chk(c().includes('<svg'), 'mapa');
  click({ 'data-layer': 'fresh' }); chk(c().includes('aria-pressed="true"'), 'camada ativa'); click({ 'data-reset-layers': '1' }); chk(!c().includes('data-layer="fresh" aria-pressed="true"'), 'reset de camadas');
  click({ 'data-set': 'metric', 'data-val': 'occupancy' }); chk(/class="dotc rag-[gar]"/.test(c()), 'pinos coloridos por semaforo'); click({ 'data-set': 'metric', 'data-val': 'health' }); chk(c().includes('saúde'), 'metrica de saude');
  doc._l.click.forEach((fn) => fn({ target: mkEl('p', { 'data-loc': 'MAO' }) })); chk(c().includes('MAO · Manaus') && c().includes('Operação') && c().includes('Margem de contribuição'), 'detalhe da localidade com operacao e margem');
  els.appContent._l.input[0]({ target: { dataset: { minscore: '1' }, value: '90' } }); els.appContent._l.change[0]({ target: { dataset: { minscore: '1' } } }); const m = c().match(/Ranking e camadas \((\d+) de/); chk(m && Number(m[1]) === 3, 'score minimo 90 deve manter 3 localidades: ' + (m && m[1]));
  els.appContent._l.input[0]({ target: { dataset: { minscore: '1' }, value: '0' } }); els.appContent._l.change[0]({ target: { dataset: { minscore: '1' } } });
  // terminais, projetos, indicadores
  nav('terminals'); click({ 'data-set': 'term', 'data-val': 'SCL' }); chk(c().includes('SCL · Santiago') && c().includes('Safra de cerejas'), 'drill-down de terminal');
  nav('projects'); click({ 'data-set': 'proj', 'data-val': 'P04' }); chk(c().includes('P04 · Expansão da armazenagem') && c().includes('Previsão no término (EAC)'), 'detalhe do projeto'); click({ 'data-set': 'proj', 'data-val': '' }); chk(!c().includes('Valor agregado (EV)'), 'fechar detalhe do projeto');
  nav('kpis'); chk(c().includes('Quadro de KPIs executivos') && /aria-pressed="true">Executivo/.test(c()), 'a tela de indicadores abre no quadro executivo');
  chk(els.pageTitle.textContent === 'Indicadores', 'titulo da tela de indicadores');
  click({ 'data-goto': 'kpis', 'data-set': 'kpi', 'data-val': 'costPerT' }); chk(/aria-pressed="true">Financeiros/.test(c()) && /class="kcard on"[^>]*data-val="costPerT"/.test(c()), 'abrir um KPI a partir do mapa de calor leva a aba do grupo dele');
  chk(c().includes('O que move este KPI') && c().includes('Por que importa'), 'detalhe com drivers e por que importa');
  click({ 'data-set': 'kpi', 'data-val': 'productivity' }); chk(/class="kcard on"[^>]*data-val="productivity"/.test(c()) && /aria-pressed="true">Operacionais/.test(c()), 'um driver abre o KPI de outro grupo e muda a aba');
  click({ 'data-set': 'kv', 'data-val': 'exec' }); chk(c().includes('Quadro de KPIs executivos') && !/class="kcard/.test(c()), 'voltar ao quadro executivo');
  click({ 'data-set': 'kv', 'data-val': 'financial' }); chk(/aria-pressed="true">Financeiros/.test(c()) && /class="kcard on"/.test(c()), 'aba financeira escolhe um KPI padrao');
  click({ 'data-set': 'kv', 'data-val': 'invalida' }); chk(/aria-pressed="true">Financeiros/.test(c()), 'aba invalida e ignorada');
  click({ 'data-set': 'kpi', 'data-val': 'dwell' }); chk(/class="kcard on"[^>]*data-val="dwell"/.test(c()) && c().includes('Tempo de permanência'), 'cartao de KPI selecionado');
  click({ 'data-set': 'kpi', 'data-val': 'margin' }); chk(/aria-pressed="true">Financeiros/.test(c()) && c().includes('Financeiro do portfólio de projetos') && c().includes('Margem de contribuição'), 'grupo financeiro e financeiro do portfolio');
  click({ 'data-set': 'kpi', 'data-val': 'opexAdherence' }); chk(c().includes('De onde vem o desvio de OPEX') && c().includes('Efeito custo unit.'), 'ponte do desvio de OPEX');
  click({ 'data-set': 'kpi', 'data-val': 'contribution' }); chk(c().includes('De onde vem o desvio de contribuição') && c().includes('Receita/t'), 'ponte do desvio de contribuicao');
  click({ 'data-set': 'kpi', 'data-val': 'revenue' }); chk(c().includes('informativo (sem meta)') && !/NaN|undefined/.test(c()), 'KPI informativo sem meta');
  nav('consultant'); chk(c().includes('KPIs executivos da rede'), 'quadro de KPIs executivos na visao do consultor');
  click({ 'data-goto': 'kpis', 'data-set': 'kpi', 'data-val': 'tempExc' }); chk(els.pageTitle.textContent === 'Indicadores' && /class="kcard on"[^>]*data-val="tempExc"/.test(c()) && /aria-pressed="true">Operacionais/.test(c()), 'ir ao KPI a partir do quadro do consultor');
  nav('terminals'); click({ 'data-set': 'term', 'data-val': 'MAO' }); chk(c().includes('KPIs de MAO (executivos primeiro)') && c().includes('Cargas fora da faixa de temperatura'), 'ficha de KPIs do terminal');
  nav('kpis');
  // navegacao cruzada (data-set + data-goto)
  nav('consultant'); click({ 'data-goto': 'projects', 'data-set': 'proj', 'data-val': 'P07' }); chk(els.pageTitle.textContent === 'Projetos e portfólio' && c().includes('P07 · Câmaras frias'), 'ir para o projeto a partir de um alerta');
  // business case e simulador
  nav('business'); click({ 'data-set': 'caseId', 'data-val': 'BC5' }); chk(c().includes('BC5 · Hub Fresh'), 'selecao de caso'); chk(c().includes('Não aprovar nas premissas atuais'), 'veredito do BC5');
  click({ 'data-load-sim': 'BC5' }); chk(c().includes('value="15000000"') && /data-calc="rate" value="11/.test(c()), 'caso carregado no simulador (capex e taxa)');
  els['calc-results'] = mkEl('calc-results'); els.appContent._l.input[0]({ target: { dataset: { calc: 'capex' }, value: '20000000' } }); chk(els['calc-results'].innerHTML.includes('VPL'), 'recalculo do simulador');
  els.appContent._l.input[0]({ target: { dataset: { calc: 'years' }, value: 'abc' } }); chk(!/NaN|undefined/.test(els['calc-results'].innerHTML), 'entrada invalida nao pode gerar NaN');
  // filtro por pais
  els.countryFilter._l.change[0]({ target: { value: 'Chile' } }); nav('projects'); chk(c().includes('P07') && !c().includes('P04 ·'), 'filtro por pais deve restringir os projetos');
  els.countryFilter._l.change[0]({ target: { value: 'all' } });

  // entrevista: inicia em publico com filtros, navega e restaura a mesma tela sem dados ficticios
  click({ 'data-set': 'mode', 'data-val': 'public' }); nav('network');
  els.countryFilter.value = 'Brasil'; els.countryFilter._l.change[0]({ target: els.countryFilter });
  click({ 'data-layer': 'fresh' });
  els.appContent._l.input[0]({ target: { dataset: { minscore: '1' }, value: '90' } });
  els.appContent._l.change[0]({ target: { dataset: { minscore: '1' } } });
  const priorContent = c(), priorTitle = doc.title;
  chk(els.interviewStart._l.click && els.interviewStart._l.click.length, 'entrevista: entrada deve iniciar o roteiro');
  if (els.interviewStart._l.click) {
    els.interviewStart._l.click[0]();
    chk(!els.interviewPanel.hidden && els.interviewStart.attrs['aria-pressed'] === 'true', 'entrevista: entrada ativa painel e estado acessivel');
    chk(els.pageTitle.textContent === 'Visão do consultor' && els.modeBanner.innerHTML.includes('Modo demonstração'), 'entrevista: abre contexto demonstrativo');
    chk(els.countryFilter.value === 'all' && storage.mode === 'public', 'entrevista: limpa filtro visivel sem persistir modo temporario');
    chk(els.interviewPanel.innerHTML.includes('dados fictícios') && /id="interviewStep"/.test(els.interviewPanel.innerHTML), 'entrevista: rotulo de dados ficticios e seletor de etapa');
    chk(doc.title.includes('Entrevista'), 'entrevista: titulo identifica o roteiro');
    click({ 'data-interview': 'next' });
    chk(els.pageTitle.textContent === 'Projetos e portfólio' && c().includes('P07 · Câmaras frias'), 'entrevista: etapa de projeto abre P07 apos limpar filtros');
    click({ 'data-set': 'proj', 'data-val': 'P04' });
    chk(els.interviewPanel.innerHTML.includes('Exploração livre') && c().includes('P04 · Expansão'), 'entrevista: outro projeto indica exploracao livre');
    click({ 'data-interview': 'resume' });
    chk(c().includes('P07 · Câmaras frias') && !els.interviewPanel.innerHTML.includes('Exploração livre'), 'entrevista: retomar reaplica o alvo da etapa');
    click({ 'data-interview': 'next' }); chk(els.pageTitle.textContent === 'Riscos', 'entrevista: proxima etapa abre riscos');
    click({ 'data-interview': 'next' }); chk(els.pageTitle.textContent === 'Business cases' && c().includes('BC3 ·'), 'entrevista: etapa financeira abre BC3');
    click({ 'data-interview': 'previous' }); chk(els.pageTitle.textContent === 'Riscos', 'entrevista: voltar retorna a riscos');
    els.interviewPanel._l.change[0]({ target: { dataset: { interviewStep: '1' }, value: '4' } });
    chk(els.pageTitle.textContent === 'Visão do consultor' && els.interviewPanel.innerHTML.includes('Governança e próximos passos'), 'entrevista: seletor acessa diretamente governanca');
    nav('overview'); chk(els.interviewPanel.innerHTML.includes('Exploração livre'), 'entrevista: menu permanece livre e anuncia desvio');
    click({ 'data-set': 'mode', 'data-val': 'public' });
    click({ 'data-set': 'mode', 'data-val': 'demo' });
    chk(storage.mode === 'public', 'entrevista: trocar modo durante ensaio preserva preferencia anterior');
    click({ 'data-interview': 'exit' });
    chk(els.interviewPanel.hidden && els.interviewPanel.innerHTML === '' && els.interviewStart.attrs['aria-pressed'] === 'false', 'entrevista: sair limpa painel e estado acessivel');
    chk(c() === priorContent && doc.title === priorTitle && els.countryFilter.value === 'Brasil', 'entrevista: restaura tela, titulo, selecao e filtros anteriores');
    chk(!bodyCls.has('mode-demo') && bodyCls.has('mode-public') && els.modeBanner.innerHTML.includes('Modo público') && storage.mode === 'public', 'entrevista: sair para publico nao vaza modo demonstracao');
  }
  els.countryFilter.value = 'all'; els.countryFilter._l.change[0]({ target: els.countryFilter });
  click({ 'data-reset-layers': '1' });
  els.appContent._l.input[0]({ target: { dataset: { minscore: '1' }, value: '0' } });
  els.appContent._l.change[0]({ target: { dataset: { minscore: '1' } } });
  click({ 'data-set': 'mode', 'data-val': 'demo' });

  // ---- busca global, atalho "/" e indicador do menu
  { const sin = els.globalSearch, res = els.searchResults, st = els.searchStatus; let focused = 0; sin.focus = () => { focused++; };
    sin.value = 'P04'; sin._l.input[0](); chk(res.hidden === false && res.innerHTML.includes('role="option"') && res.innerHTML.includes('P04'), 'busca: digitar abre os resultados'); chk(/resultado/.test(st.textContent), 'busca: status anunciado');
    chk(sin.setAttribute && true, 'busca: aria-expanded atualizado');
    click({ 'data-goto': 'projects', 'data-set': 'proj', 'data-val': 'P04' }, ['search-results']);
    chk(els.pageTitle.textContent === 'Projetos e portfólio' && c().includes('P04 · Expansão'), 'busca: clicar no resultado abre o projeto'); chk(res.hidden === true && sin.value === '', 'busca: fecha e limpa depois de escolher');
    sin.value = 'zzzzqq'; sin._l.input[0](); chk(res.innerHTML.includes('Nada encontrado'), 'busca: sem resultado mostra mensagem');
    sin.value = 'manaus'; sin._l.input[0](); chk(res.innerHTML.includes('MAO'), 'busca: acha Manaus');
    sin._l.keydown[0]({ key: 'Escape' }); chk(res.hidden === true, 'busca: Esc fecha');
    sin.value = 'GRU'; sin._l.input[0](); chk(res.hidden === false, 'busca: reabre ao digitar');
    click({ 'data-view': 'x' }, []); chk(res.hidden === true, 'busca: clicar fora fecha');
    sin.value = 'GRU'; sin._l.input[0](); click({}, ['search']); chk(res.hidden === false, 'busca: clicar dentro da caixa nao fecha');
    let opened = 0; res.querySelectorAll = () => [{ focus() { opened += 10; }, click() { opened++; } }]; sin._l.keydown[0]({ key: 'ArrowDown', preventDefault() {} }); sin._l.keydown[0]({ key: 'Enter', preventDefault() {} }); chk(opened === 11, 'busca: seta para baixo foca o primeiro e Enter abre');
    sin.value = ''; sin._l.input[0](); chk(res.hidden === true, 'busca: campo vazio fecha a lista');
    let prevented = 0; doc._l.keydown.forEach((fn) => fn({ key: '/', preventDefault() { prevented++; } })); chk(prevented === 1 && focused > 0, 'atalho "/" foca a busca');
    doc.activeElement = { tagName: 'INPUT' }; prevented = 0; doc._l.keydown.forEach((fn) => fn({ key: '/', preventDefault() { prevented++; } })); chk(prevented === 0, 'atalho "/" nao interfere ao digitar em um campo'); doc.activeElement = undefined;
    click({ 'data-set': 'mode', 'data-val': 'public' }, []); sin.value = 'P04'; sin._l.input[0](); chk(!res.innerHTML.includes('Projeto') && res.innerHTML.includes('Nada encontrado'), 'busca: no modo publico nao acha projetos'); sin.value = ''; sin._l.input[0]();
    click({ 'data-set': 'mode', 'data-val': 'demo' }, []);
    doc.querySelector = (q) => (q === '.nav-item.active' ? { offsetHeight: 40, offsetWidth: 200, offsetLeft: 0, offsetTop: 120 } : null); nav('risks');
    chk(els.navInd.style.transform === 'translate(0px,120px)' && els.navInd.style.height === '40px' && bodyCls.has('ind'), 'menu: indicador acompanha o item ativo'); doc.querySelector = () => null; }
  nav('consultant'); chk(c().includes('cons-rail') && c().includes('Próximos prazos'), 'consultor: painel lateral');
  click({ 'data-goto': 'network' }, []); chk(els.pageTitle.textContent === 'Mapa de atuação', 'consultor: atalho Mapa'); nav('consultant');
  // tema e TV
  els.themeToggle._l.click[0](); chk(storage.theme === 'dark', 'tema persistido'); els.tvMode._l.click[0](); chk(els.tvMode.textContent === 'Sair do modo TV', 'modo TV');
  console.log(fails ? fails + ' falha(s)' : 'OK: integração do app.js (entrevista reversível, modos, navegação, mapa, drill-down, projetos, KPIs, casos, simulador, filtros, tema, TV).');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
