import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const files = ['meta', 'projects', 'terminals', 'cases', 'consultant'];
const fixture = Object.fromEntries(files.map((name) => [
  `data/demo/${name}.json`, JSON.parse(readFileSync(new URL(`data/demo/${name}.json`, root), 'utf8'))
]));

function element() {
  const classes = new Set(), attrs = {}, listeners = {};
  return {
    textContent: '', innerHTML: '', attrs, listeners,
    setAttribute(name, value) { attrs[name] = String(value); },
    removeAttribute(name) { delete attrs[name]; },
    addEventListener(name, listener) { (listeners[name] ||= []).push(listener); },
    classList: {
      contains(name) { return classes.has(name); },
      toggle(name, on = !classes.has(name)) { on ? classes.add(name) : classes.delete(name); }
    },
    click() { for (const listener of listeners.click || []) listener({ target: this }); }
  };
}

function browser(options = {}) {
  const nodes = Object.fromEntries(['main', 'mainContent', 'reportDate', 'themeToggle', 'printReport'].map((id) => [id, element()]));
  const storage = { mode: 'internal', ...(options.storage || {}) };
  const reads = [], writes = [], requests = [], replacements = [];
  let ready, printed = 0;
  if (Object.hasOwn(options, 'bundle')) nodes.portfolioBundle = { textContent: options.bundle };
  const document = {
    body: element(), readyState: 'loading',
    getElementById(id) { return nodes[id] || null; },
    querySelector() { return null; },
    addEventListener(name, fn) { if (name === 'DOMContentLoaded') ready = fn; }
  };
  const context = {
    document, console, Intl, URL, Date, JSON, Promise, setTimeout,
    location: { hash: options.hash || '', pathname: '/index.html', search: '?review=1' },
    history: { state: null, replaceState(...args) { if (options.historyThrows) throw new Error('History unavailable'); replacements.push(args); } },
    localStorage: {
      getItem(key) { reads.push(key); if (options.storageThrows) throw new Error('Storage blocked'); return storage[key] ?? null; },
      setItem(key, value) { if (options.storageThrows) throw new Error('Storage blocked'); writes.push([key, value]); storage[key] = value; }
    },
    matchMedia() { return { matches: Boolean(options.darkSystem) }; },
    print() { printed++; },
    fetch: async (path) => {
      requests.push(path);
      if (options.pending) await options.pending;
      if (options.fetchError) throw new Error(options.fetchError);
      const data = options.data || fixture;
      return { ok: !options.httpError && Object.hasOwn(data, path), status: options.httpError || 404, json: async () => data[path] };
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const name of ['core', 'consulting', 'app']) {
    vm.runInContext(readFileSync(new URL(`js/${name}.js`, root), 'utf8'), context, { filename: `js/${name}.js` });
  }
  return { nodes, storage, reads, writes, requests, replacements, document,
    get printed() { return printed; },
    start() { assert.equal(typeof ready, 'function', 'app registers initialization'); return ready(); }
  };
}

test('loads exactly the five demonstration files and renders the dated report', async () => {
  const app = browser({ hash: '#projects' });
  await app.start();
  assert.deepEqual([...app.requests].sort(), [
    'data/demo/cases.json', 'data/demo/consultant.json', 'data/demo/meta.json',
    'data/demo/projects.json', 'data/demo/terminals.json'
  ]);
  assert.match(app.nodes.mainContent.innerHTML, /decis|Decis/);
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /NaN|undefined/);
  assert.equal(app.nodes.reportDate.textContent, '29/10/2026');
  assert.deepEqual(app.reads, ['theme']);
  assert.equal(app.storage.mode, 'internal', 'the retired data preference is untouched');
  assert.equal(app.replacements.length, 1);
  assert.equal(app.replacements[0][2], '/index.html?review=1');
});

test('shows an accessible loading message before the data is available', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const app = browser({ pending });
  const started = app.start();
  assert.match(app.nodes.mainContent.innerHTML, /role="status"/);
  assert.match(app.nodes.mainContent.innerHTML, /Carregando/);
  release();
  await started;
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /Carregando/);
});

test('opens an embedded offline portfolio without making any fetch', async () => {
  const app = browser({ bundle: JSON.stringify(fixture) });
  await app.start();
  assert.deepEqual(app.requests, []);
  assert.match(app.nodes.mainContent.innerHTML, /decis|Decis/);
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /role="alert"|NaN|undefined/);
});

test('an incomplete offline bundle fails visibly and never falls back to network', async () => {
  const app = browser({ bundle: JSON.stringify({ 'data/demo/meta.json': fixture['data/demo/meta.json'] }) });
  await app.start();
  assert.deepEqual(app.requests, []);
  assert.match(app.nodes.mainContent.innerHTML, /role="alert"/);
  assert.match(app.nodes.mainContent.innerHTML, /Não foi possível/);
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /NaN|undefined/);
});

test('HTTP failures show a readable error instead of partial results', async () => {
  const app = browser({ httpError: 503 });
  await app.start();
  assert.match(app.nodes.mainContent.innerHTML, /role="alert"/);
  assert.match(app.nodes.mainContent.innerHTML, /503/);
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /NaN|undefined/);
});

test('incomplete fetched data is rejected before a broken report is shown', async () => {
  const app = browser({ data: { ...fixture, 'data/demo/projects.json': null } });
  await app.start();
  assert.match(app.nodes.mainContent.innerHTML, /role="alert"/);
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /NaN|undefined/);
});

test('escapes errors before displaying them', async () => {
  const app = browser({ fetchError: '<img src=x onerror=alert(1)>&' });
  await app.start();
  assert.match(app.nodes.mainContent.innerHTML, /&lt;img/);
  assert.match(app.nodes.mainContent.innerHTML, /&amp;/);
  assert.doesNotMatch(app.nodes.mainContent.innerHTML, /<img/);
});

test('restores the theme and updates the action label, accessibility and preference', async () => {
  const app = browser({ storage: { theme: 'dark' } });
  await app.start();
  assert.equal(app.document.body.classList.contains('dark'), true);
  assert.equal(app.nodes.themeToggle.attrs['aria-pressed'], 'true');
  assert.equal(app.nodes.themeToggle.textContent, 'Tema claro');
  app.nodes.themeToggle.click();
  assert.equal(app.document.body.classList.contains('dark'), false);
  assert.equal(app.nodes.themeToggle.attrs['aria-pressed'], 'false');
  assert.equal(app.nodes.themeToggle.textContent, 'Tema escuro');
  assert.equal(app.storage.theme, 'light');
  assert.ok(app.writes.every(([key]) => key === 'theme'));
});

test('storage failures do not block rendering, system theme or printing', async () => {
  const app = browser({ storageThrows: true, darkSystem: true, historyThrows: true, hash: '#kpis' });
  await app.start();
  assert.match(app.nodes.mainContent.innerHTML, /decis|Decis/);
  assert.equal(app.document.body.classList.contains('dark'), true);
  app.nodes.themeToggle.click();
  assert.equal(app.document.body.classList.contains('dark'), false);
  app.nodes.printReport.click();
  assert.equal(app.printed, 1);
});

test('preserves the skip-link fragment and does not install legacy navigation', async () => {
  const app = browser({ hash: '#main' });
  await app.start();
  assert.deepEqual(app.replacements, []);
  assert.match(app.nodes.mainContent.innerHTML, /decis|Decis/);
});

test('the local server serves the portfolio and rejects paths outside its root', async (t) => {
  const child = spawn(process.execPath, ['scripts/serve.mjs', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const address = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    child.once('exit', () => { clearTimeout(timer); resolve(null); });
    child.once('error', () => { clearTimeout(timer); resolve(null); });
    child.stdout.on('data', (chunk) => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  assert.ok(address, 'the Node server starts and reports its loopback address');
  const index = await fetch(address + '/?review=1');
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);
  assert.match(await index.text(), /<html/);
  const json = await fetch(address + '/data/demo/meta.json');
  assert.match(json.headers.get('content-type'), /application\/json/);
  assert.equal((await json.json()).asOf, '2026-10-29');
  const script = await fetch(address + '/js/app.js');
  assert.match(script.headers.get('content-type'), /javascript/);
  const css = await fetch(address + '/styles.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  const markdown = await fetch(address + '/README.md');
  assert.match(markdown.headers.get('content-type'), /text\/markdown/);
  for (const [path, status] of [['/%2e%2e%2fpackage.json', 400], ['/%', 400], ['/absent-file.json', 404]]) {
    const response = await fetch(address + path);
    assert.equal(response.status, status, path);
    assert.doesNotMatch(await response.text(), /[A-Z]:\\|work[\\/]repo/i);
  }
});
