import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAll, G } from './_load.mjs';

const require = createRequire(import.meta.url);
for (const name of ['consulting', 'views-executive']) {
  if (existsSync(new URL('../js/' + name + '.js', import.meta.url))) require('../js/' + name + '.js');
}
const data = loadAll();
const state = { view: 'executive', mode: 'demo', country: 'Chile', layers: ['ecommerce'], minScore: 100, calc: {} };
assert.equal(typeof G.Views.views.executive, 'function', 'a síntese deve estar disponível como uma 12ª visão');
const before = JSON.stringify({ state, data });
const html = G.Views.views.executive(state, data);
assert.match(html, /class="consulting-summary"/);
assert.match(html, /15 projetos no portfólio/, 'a síntese deve usar toda a rede mesmo com país, camadas e score restritos');
assert.match(html, /id="actionPlan"/, 'a última etapa da entrevista precisa alcançar o plano');
assert.doesNotMatch(html, /<h1\b|undefined|NaN|Infinity/);
assert.equal(JSON.stringify({ state, data }), before, 'renderizar a rede não pode alterar os filtros nem os dados');

const publicHtml = G.Views.views.executive({ ...state, mode: 'public' }, data);
assert.match(publicHtml, /indisponível no modo público/);
assert.doesNotMatch(publicHtml, /consulting-summary|\bP07\b|\bP04\b|\bBC5\b|51 dias|87 dias/);
const internal = structuredClone(data.sets.demo);
internal.meta.synthetic = false;
internal.projects[0].name = 'SEGREDO INTERNO';
const internalHtml = G.Views.views.executive({ ...state, mode: 'internal' }, { ...data, sets: { demo: data.sets.demo, internal } });
assert.match(internalHtml, /somente no modo demonstração/);
assert.match(internalHtml, /data-goto="consultant"/);
assert.doesNotMatch(internalHtml, /consulting-summary|SEGREDO INTERNO|\bP07\b|\bBC5\b|fictícios/);
const mislabeled = G.Views.views.executive(state, { ...data, sets: { demo: internal, internal: null } });
assert.doesNotMatch(mislabeled, /consulting-summary|SEGREDO INTERNO|\bP07\b/);

for (const [view, key, id] of [['projects', 'proj', 'P07'], ['projects', 'proj', 'P04'], ['business', 'caseId', 'BC5']]) {
  assert.match(html, new RegExp('data-goto="' + view + '" data-set="' + key + '" data-val="' + id + '"'));
}
const routes = ['executive', 'consultant', 'overview', 'network', 'terminals', 'projects', 'kpis', 'business', 'risks', 'suppliers', 'opportunities', 'governance'];
assert.equal(Object.keys(G.Views.views).length, 12);
for (const view of routes) {
  assert.equal(typeof G.Views.views[view], 'function', view + ' deve continuar disponível');
  assert.ok(G.Views.TITLES[view], view + ' precisa de título');
}
const analytical = G.Views.views.consultant({ ...state, country: 'all', layers: [], minScore: 0 }, data);
assert.match(analytical, /O que importa agora/);
assert.match(analytical, /KPIs executivos da rede/);
assert.match(analytical, /cons-rail/);
console.log('OK: 12 visões, síntese de toda a rede, links de evidência, plano e isolamento público/interno.');
