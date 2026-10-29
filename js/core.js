/* Funcoes puras (sem DOM): usadas no navegador e nos testes em Node. */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');

  function score(components, weights) {
    let total = 0, wsum = 0;
    Object.keys(weights).forEach((k) => {
      const v = Number(components[k]);
      if (Number.isFinite(v)) { total += Math.min(100, Math.max(0, v)) * weights[k]; wsum += weights[k]; }
    });
    return wsum ? Math.round(total / wsum) : 0;
  }
  const band = (s, bands) => (s >= bands.high ? 'high' : s >= bands.mid ? 'mid' : 'low');

  function npv(rate, flows) { return flows.reduce((a, cf, t) => a + cf / Math.pow(1 + rate, t), 0); }

  function irr(flows) {
    const hasPos = flows.some((v) => v > 0), hasNeg = flows.some((v) => v < 0);
    if (!hasPos || !hasNeg) return null;
    let lo = -0.99, hi = 10, flo = npv(lo, flows), fhi = npv(hi, flows);
    if (flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, fm = npv(mid, flows);
      if (Math.abs(fm) < 1e-7) return mid;
      if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  /* Retorna anos (fracionado) ate recuperar o investimento; null se nao recupera. */
  function payback(flows, rate) {
    let cum = 0;
    for (let t = 0; t < flows.length; t++) {
      const cf = rate ? flows[t] / Math.pow(1 + rate, t) : flows[t];
      const prev = cum; cum += cf;
      if (t > 0 && prev < 0 && cum >= 0) return t - 1 + (-prev / cf);
    }
    return null;
  }

  function buildFlows(i) {
    const flows = [-i.capex];
    for (let t = 1; t <= i.years; t++) {
      const b = i.benefit * Math.pow(1 + i.benefitGrowth, t - 1);
      const o = i.opex * Math.pow(1 + i.opexGrowth, t - 1);
      flows.push(b - o + (t === i.years ? i.residual : 0));
    }
    return flows;
  }

  function evaluate(i) {
    const flows = buildFlows(i);
    return { flows, npv: npv(i.rate, flows), irr: irr(flows), payback: payback(flows, 0), discPayback: payback(flows, i.rate) };
  }

  function parseNum(v, def) { const n = Number(String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) && String(v).trim() !== '' ? n : def; }

  const fmtInt = (n) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
  const fmtDec = (n, d) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  const fmtMoney = (n) => (n < 0 ? '−' : '') + 'R$ ' + fmtInt(Math.abs(n));

  const api = { esc, safeUrl, score, band, npv, irr, payback, buildFlows, evaluate, parseNum, fmtInt, fmtDec, fmtMoney };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
