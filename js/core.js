/* Funcoes puras (sem DOM). Publica em window.Core (navegador) e em module.exports (Node). */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  function score(components, weights) {
    let total = 0, wsum = 0;
    Object.keys(weights).forEach((k) => {
      const v = Number(components[k]);
      if (Number.isFinite(v)) { total += clamp(v, 0, 100) * weights[k]; wsum += weights[k]; }
    });
    return wsum ? Math.round(total / wsum) : 0;
  }
  const band = (s, bands) => (s >= bands.high ? 'high' : s >= bands.mid ? 'mid' : 'low');

  function npv(rate, flows) { return flows.reduce((a, cf, t) => a + cf / Math.pow(1 + rate, t), 0); }
  function irr(flows) {
    if (!flows.some((v) => v > 0) || !flows.some((v) => v < 0)) return null;
    let lo = -0.99, hi = 10, flo = npv(lo, flows);
    if (flo * npv(hi, flows) > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, fm = npv(mid, flows);
      if (Math.abs(fm) < 1e-7) return mid;
      if (flo * fm < 0) hi = mid; else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }
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
      const b = i.benefit * Math.pow(1 + i.benefitGrowth, t - 1), o = i.opex * Math.pow(1 + i.opexGrowth, t - 1);
      flows.push(b - o + (t === i.years ? i.residual : 0));
    }
    return flows;
  }
  function evaluate(i) {
    const flows = buildFlows(i);
    return { flows, npv: npv(i.rate, flows), irr: irr(flows), payback: payback(flows, 0), discPayback: payback(flows, i.rate) };
  }

  /* Semaforo: dir 'min' = quanto menor melhor; 'max' = quanto maior melhor. */
  function rag(value, target, dir, tol) {
    if (!Number.isFinite(value) || !Number.isFinite(target)) return 'n';
    const t = tol == null ? 0.05 : tol;
    if (dir === 'min') return value <= target ? 'g' : value <= target * (1 + t) ? 'a' : 'r';
    if (dir === 'max') return value >= target ? 'g' : value >= target * (1 - t) ? 'a' : 'r';
    return 'n';
  }
  const riskScore = (p, i) => Number(p) * Number(i);
  const riskBand = (s) => (s >= 15 ? 'r' : s >= 8 ? 'a' : 'g');

  const parseNum = (v, def) => { const s = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.'); const n = Number(s); return s !== '' && Number.isFinite(n) ? n : def; };
  const fmtInt = (n) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
  const fmtDec = (n, d) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  const NB = '\u00a0';
  const fmtMoney = (n) => (n < 0 ? '−' : '') + 'R$' + NB + fmtInt(Math.abs(n));
  const fmtMi = (n) => (n < 0 ? '−' : '') + 'R$' + NB + fmtDec(Math.abs(n) / 1e6, 1) + NB + 'mi';
  const fmtPct = (n, d) => fmtDec(n, d == null ? 0 : d) + '%';
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthLabel = (ym) => MES[Number(ym.slice(5, 7)) - 1] + '/' + ym.slice(2, 4);
  const fmtDate = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

  const api = { esc, safeUrl, clamp, score, band, npv, irr, payback, buildFlows, evaluate, rag, riskScore, riskBand, parseNum, fmtInt, fmtDec, fmtMoney, fmtMi, fmtPct, monthLabel, fmtDate, daysBetween };
  root.Core = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
