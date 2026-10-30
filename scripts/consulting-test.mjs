import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
require('../js/core.js');
if (existsSync(new URL('../js/consulting.js', import.meta.url))) require('../js/consulting.js');
const read = (name) => JSON.parse(readFileSync(new URL('../data/demo/' + name + '.json', import.meta.url), 'utf8'));
const fixture = () => Object.fromEntries(['meta', 'projects', 'terminals', 'cases', 'consultant'].map((name) => [name, read(name)]));
const build = (data) => {
  assert.equal(typeof globalThis.Consulting?.build, 'function', 'A visão deve disponibilizar Consulting.build');
  return globalThis.Consulting.build(data);
};
const render = (data) => {
  assert.equal(typeof globalThis.Consulting?.render, 'function', 'A visão deve disponibilizar Consulting.render');
  return globalThis.Consulting.render(data);
};
const near = (actual, expected, tolerance = 0.000001) => assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' ≠ ' + expected);
const byId = (rows, id) => rows.find((row) => row.id === id);

test('resume o investimento e a previsão sem alterar os cálculos do portfólio', () => {
  const model = build(fixture());
  assert.equal(model.kpis.length, 4);
  assert.equal(model.portfolio.n, 15);
  assert.equal(model.portfolio.budget, 156800000);
  assert.equal(model.portfolio.actual, 72070000);
  near(model.portfolio.eac, 161893057.71032643, 0.01);
  near(model.portfolio.delta, 5093057.710326433, 0.01);
  near(model.portfolio.deltaPct, 0.03248123539749);
  near(model.portfolio.spi, 0.9291087285893632);
  near(model.portfolio.cpi, 0.9827835051546392);
  assert.equal(byId(model.kpis, 'budget').raw, 156800000);
  near(byId(model.kpis, 'eac').raw, 161893057.71032643, 0.01);
  near(byId(model.kpis, 'spi').raw, 0.9291087285893632);
  assert.equal(byId(model.kpis, 'critical').raw, 2);
});

test('exclui concluídos da contagem de projetos em curso e críticos', () => {
  const data = fixture();
  data.projects.find((project) => project.id === 'P13').capexActual = 100000000;
  const model = build(data);
  assert.equal(model.portfolio.activeCount, 11);
  assert.equal(model.portfolio.criticalCount, 2);
  assert.deepEqual(model.portfolio.criticalIds, ['P04', 'P10']);
});

test('vincula três decisões às datas, aos responsáveis e às evidências calculadas', () => {
  const data = fixture();
  data.consultant.decisions.find((decision) => decision.id === 'D1').due = '2026-11-09';
  data.consultant.decisions.find((decision) => decision.id === 'D1').owner = 'Operações e Projetos';
  const model = build(data);
  assert.deepEqual(model.decisions.map((decision) => decision.id), ['D1', 'D2', 'D4']);
  assert.equal(byId(model.decisions, 'D1').facts.seasonGapDays, 51);
  assert.equal(byId(model.decisions, 'D1').due, '2026-11-09');
  assert.equal(byId(model.decisions, 'D1').owner, 'Operações e Projetos');
  assert.equal(byId(model.decisions, 'D2').facts.delayDays, 87);
  near(byId(model.decisions, 'D2').facts.eac, 18157894.736842103, 0.01);
  near(byId(model.decisions, 'D2').facts.cpi, 0.7820289855072464);
});

test('recalcula VPL, TIR e critérios de aprovação dos business cases', () => {
  const model = build(fixture());
  const bc5 = byId(model.cases, 'BC5'), bc4 = byId(model.cases, 'BC4');
  near(bc5.npv, -469926.3938152639, 0.01);
  near(bc5.irr, 0.1031788501607534);
  assert.equal(bc5.rate, 0.11);
  assert.equal(bc5.verdict, 'no');
  near(bc4.npv, 905412.0866731454, 0.01);
  assert.equal(bc4.verdict, 'maybe');
  assert.deepEqual(byId(model.decisions, 'D4').facts.rejectedIds, ['BC5']);
  assert.deepEqual(byId(model.decisions, 'D4').facts.reviewIds, ['BC4']);
  const decision = byId(model.decisions, 'D4');
  assert.match(decision.evidence, /−R\$\s*470\s*mil/);
  assert.doesNotMatch(decision.evidence, /BC4/);
  assert.match(decision.recommendation, /Priorizar 4 casos/);
  assert.match(decision.recommendation, /reavaliar 1 de retorno marginal/);
  assert.match(decision.recommendation, /não aprovar 1 nas premissas atuais/);
  assert.doesNotMatch(decision.recommendation, /\bBC\d+\b/);
  const foundation = decision.details.join(' ');
  for (const id of ['BC1', 'BC2', 'BC3', 'BC4', 'BC5', 'BC6']) assert.ok(foundation.includes(id));
});

test('retira contingência e recuperação quando as condições deixam de existir', () => {
  const data = fixture();
  const scl = data.projects.find((project) => project.id === 'P07');
  scl.endForecast = '2026-11-01';
  const mao = data.projects.find((project) => project.id === 'P04');
  mao.endForecast = mao.endBaseline;
  mao.progress = 60;
  mao.capexActual = 6000000;
  data.cases.find((item) => item.id === 'BC5').benefit = 8000000;
  data.cases.find((item) => item.id === 'BC4').benefit = 10000000;
  const model = build(data);
  const d1 = byId(model.decisions, 'D1'), d2 = byId(model.decisions, 'D2'), d4 = byId(model.decisions, 'D4');
  assert.equal(d1.facts.seasonGapDays, -14);
  assert.match(d1.evidence, /14 dias antes/);
  assert.doesNotMatch(d1.recommendation, /temporári|contingência|câmaras móveis/i);
  assert.equal(d2.facts.delayDays, 0);
  assert.doesNotMatch(d2.title + ' ' + d2.recommendation, /recupera|rebaselin|nova linha de base/i);
  assert.equal(byId(model.cases, 'BC5').verdict, 'yes');
  assert.equal(byId(model.cases, 'BC4').verdict, 'yes');
  assert.deepEqual(d4.facts.rejectedIds, []);
  assert.deepEqual(d4.facts.reviewIds, []);
  assert.match(d4.recommendation, /Priorizar 6 casos/);
  assert.doesNotMatch(d4.recommendation, /não aprovar|retorno marginal|revisar BC4/i);
  const html = render(data);
  assert.doesNotMatch(html, /51 dias|87 dias|undefined|NaN|Infinity/);
});

test('mantém a recomendação ligada ao resultado e não ao identificador do caso', () => {
  const data = fixture();
  data.cases.find((item) => item.id === 'BC4').benefit = 0;
  const model = build(data);
  assert.equal(byId(model.cases, 'BC4').verdict, 'no');
  assert.deepEqual(byId(model.decisions, 'D4').facts.rejectedIds, ['BC4', 'BC5']);
  assert.deepEqual(byId(model.decisions, 'D4').facts.reviewIds, []);
});

test('distingue entrega no início da safra e projeto já concluído', () => {
  const data = fixture(), project = data.projects.find((item) => item.id === 'P07');
  project.endForecast = '2026-11-15';
  let decision = byId(build(data).decisions, 'D1');
  assert.equal(decision.facts.seasonGapDays, 0);
  assert.match(decision.evidence, /Entrega prevista no início da safra/);
  project.progress = 100;
  decision = byId(build(data).decisions, 'D1');
  assert.match(decision.evidence, /concluído/);
  assert.doesNotMatch(decision.recommendation, /temporári|contingência/i);
});

test('escapa conteúdo externo em decisões e fundamentos', () => {
  const data = fixture();
  const attack = '<img src=x onerror="alert(1)"> & teste';
  data.consultant.decisions.find((decision) => decision.id === 'D1').owner = attack;
  data.projects.find((project) => project.id === 'P04').name = '<script>alert(2)</script>';
  data.cases.find((item) => item.id === 'BC5').name = '<script>alert(3)</script>';
  const html = render(data);
  assert.doesNotMatch(html, /<img|<script|onerror="/i);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; teste/);
  assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.match(html, /&lt;script&gt;alert\(3\)&lt;\/script&gt;/);
});

test('rejeita dados ausentes, inválidos ou sem declaração explícita de demonstração', () => {
  assert.throws(() => build(undefined), /Dados incompletos|Dados inválidos/);
  const changes = [
    (data) => { data.meta.synthetic = false; },
    (data) => { delete data.meta.synthetic; },
    (data) => { data.meta.asOf = 'data inválida'; },
    (data) => { data.projects = []; },
    (data) => { data.projects = data.projects.filter((project) => project.id !== 'P07'); },
    (data) => { data.projects[0].budget = Infinity; },
    (data) => { data.cases.find((item) => item.id === 'BC5').rate = NaN; },
    (data) => { data.terminals.find((terminal) => terminal.code === 'SCL').seasonal = null; },
    (data) => { data.consultant.decisions.find((decision) => decision.id === 'D1').due = '2026-02-30'; }
  ];
  for (const change of changes) {
    const data = fixture(); change(data);
    assert.throws(() => build(data), /Dados incompletos|Dados inválidos/);
  }
});

test('retorna saída finita quando não há avanço ou projetos em curso', () => {
  const noCost = fixture();
  noCost.projects.forEach((project) => { project.progress = 0; project.capexActual = 0; });
  assert.doesNotMatch(render(noCost), /undefined|NaN|Infinity/);
  const done = fixture();
  done.projects.forEach((project) => { project.progress = 100; });
  const model = build(done);
  assert.equal(model.portfolio.activeCount, 0);
  assert.equal(model.portfolio.criticalCount, 0);
  assert.equal(model.portfolio.spi, null);
  assert.doesNotMatch(render(done), /undefined|NaN|Infinity/);
});

test('gera fundamentos acessíveis na mesma página e preserva os dados de entrada', () => {
  const data = fixture(), before = JSON.stringify(data);
  const html = render(data);
  assert.equal((html.match(/<details\b/g) || []).length, 4);
  assert.equal((html.match(/<summary>Fundamento<\/summary>/g) || []).length, 3);
  assert.match(html, /<summary>Premissas e critérios<\/summary>/);
  assert.doesNotMatch(html, /<a\b|<button\b|<select\b|<input\b|<h1\b|data-goto|undefined|NaN|Infinity/);
  assert.equal(JSON.stringify(data), before);
});
