import assert from 'node:assert/strict';
import { loadAll, G } from './_load.mjs';

const data = loadAll();
const state = { mode: 'demo', country: 'all', layers: [], minScore: 0, calc: {} };
const render = (changes = {}, d = data) => G.Views.views.consultant({ ...state, ...changes }, d);
const focus = (html) => html.match(/<section class="decision-focus"[\s\S]*?<\/section>/)?.[0] || '';

assert.match(focus(render()), /D1/);
assert.match(focus(render()), /data-goto="projects" data-set="proj" data-val="P07"/);
assert.match(focus(render()), /Diretoria de Operações/);
assert.match(focus(render({ country: 'Brasil' })), /D2/);
assert.doesNotMatch(focus(render({ country: 'Brasil' })), /D1/);
assert.match(focus(render({ country: 'Chile' })), /D1/);
assert.equal(focus(render({ country: 'Peru' })), '', 'Sem decisão vinculada ao recorte, não mostrar decisão de outro país');
assert.equal(focus(render({ mode: 'public' })), '', 'Modo público não deve mostrar decisões fictícias');

const escaped = structuredClone(data);
escaped.sets.demo.consultant.decisions[0].title = '<img src=x onerror=alert(1)>';
assert.doesNotMatch(focus(render({}, escaped)), /<img/);
assert.match(focus(render({}, escaped)), /&lt;img/);
console.log('OK: pauta inicial prioriza a decisão por prazo, respeita país, modo público e escape de conteúdo.');
