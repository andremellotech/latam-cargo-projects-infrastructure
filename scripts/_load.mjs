import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
for (const f of ['core', 'analytics', 'charts', 'views-common', 'views-public', 'views-mgmt']) require(`../js/${f}.js`);
export const G = globalThis;
export const rd = (p) => JSON.parse(readFileSync(new URL('../data/' + p + '.json', import.meta.url), 'utf8'));
export const exists = (p) => existsSync(new URL('../data/' + p, import.meta.url));
export const SET_FILES = ['terminals', 'series', 'projects', 'cases', 'risks', 'suppliers', 'lanes', 'pipeline', 'consultant'];
export function loadSet(dir) {
  if (!exists(dir + '/meta.json')) return null;
  const o = { meta: rd(dir + '/meta') }; SET_FILES.forEach((n) => { o[n] = rd(dir + '/' + n); }); return o;
}
export function loadAll() {
  const d = {}; ['config', 'locations', 'sources', 'corridors', 'initiatives', 'kpis', 'opportunities'].forEach((n) => { d[n] = rd(n); });
  d.map = rd('americas-paths'); d.references = rd('references'); d.sets = { demo: loadSet('demo'), internal: loadSet('internal') };
  return d;
}
