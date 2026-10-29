/* Graficos SVG sem dependencias. Todas as funcoes sao puras e devolvem HTML/SVG como string.
   Padroes inspirados em paineis de mercado (curva S/EVM, Gantt com semaforo, matriz impacto x esforco,
   cascata, tornado, sparklines), implementados do zero. */
(function (root) {
  'use strict';
  const C = root.Core, esc = C.esc;
  const f1 = (n) => Math.round(n * 10) / 10;
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  function niceTicks(min, max, count) {
    if (!(max > min)) max = min + 1;
    const raw = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step, n = Math.round((hi - lo) / step), ticks = [];
    for (let k = 0; k <= n; k++) ticks.push(+(lo + k * step).toFixed(10));
    return { min: lo, max: hi, ticks };
  }
  const emptyBox = (msg) => '<div class="empty">' + esc(msg || 'Sem dados para o gráfico.') + '</div>';

  function spark(values, o) {
    o = o || {};
    const v = (values || []).filter(Number.isFinite);
    if (v.length < 2) return '';
    const w = o.w || 84, h = o.h || 26, p = 3, mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
    const sx = (i) => p + (i * (w - 2 * p)) / (values.length - 1), sy = (x) => (mx === mn ? h / 2 : h - p - ((x - mn) / (mx - mn)) * (h - 2 * p));
    const pts = values.map((x, i) => f1(sx(i)) + ',' + f1(sy(x))).join(' '), last = values.length - 1;
    return '<svg class="spark ' + esc(o.cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(o.label || 'Tendência') + '"><polyline points="' + pts + '" fill="none"/><circle cx="' + f1(sx(last)) + '" cy="' + f1(sy(values[last])) + '" r="2.6"/></svg>';
  }

  /* Linhas: series [{name, values, cls, dashed, strong}], labels, refs [{value,label}], shadeFrom, markIdx */
  function line(o) {
    const W = o.w || 720, H = o.h || 260, m = { l: 52, r: 30, t: 14, b: 30 }, n = o.labels.length, fmt = o.fmt || ((v) => C.fmtInt(v));
    const vals = [];
    o.series.forEach((s) => s.values.forEach((v) => { if (Number.isFinite(v)) vals.push(v); }));
    (o.refs || []).forEach((r) => vals.push(r.value));
    if (!vals.length) return emptyBox();
    let mn = o.yMin != null ? o.yMin : Math.min.apply(null, vals), mx = o.yMax != null ? o.yMax : Math.max.apply(null, vals);
    if (o.yMin == null) mn -= (mx - mn) * 0.1 || 1;
    if (o.yMax == null) mx += (mx - mn) * 0.1 || 1;
    const tk = niceTicks(mn, mx, 5), pw = W - m.l - m.r;
    const x = (i) => m.l + (n === 1 ? pw / 2 : (i * pw) / (n - 1)), y = (v) => m.t + (1 - (v - tk.min) / (tk.max - tk.min)) * (H - m.t - m.b);
    let g = '';
    if (o.shadeFrom != null) g += '<rect class="shade" x="' + f1(x(o.shadeFrom)) + '" y="' + m.t + '" width="' + f1(W - m.r - x(o.shadeFrom)) + '" height="' + (H - m.t - m.b) + '"/><text class="axl" x="' + f1(W - m.r - 4) + '" y="' + (m.t + 11) + '" text-anchor="end">Previsão</text>';
    tk.ticks.forEach((t) => { g += '<line class="gln" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(y(t)) + '" y2="' + f1(y(t)) + '"/><text class="axl" x="' + (m.l - 6) + '" y="' + f1(y(t) + 3.5) + '" text-anchor="end">' + esc(fmt(t)) + '</text>'; });
    const step = Math.ceil(n / 9);
    o.labels.forEach((l, i) => { if ((n - 1 - i) % step === 0) g += '<text class="axl" x="' + f1(x(i)) + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(o.xfmt ? o.xfmt(l) : l) + '</text>'; });
    (o.refs || []).forEach((r) => { const left = r.align === 'left'; g += '<line class="ref" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(y(r.value)) + '" y2="' + f1(y(r.value)) + '"/><text class="reft" x="' + (left ? m.l + 4 : W - m.r - 4) + '" y="' + f1(y(r.value) - 4) + '" text-anchor="' + (left ? 'start' : 'end') + '">' + esc(r.label) + '</text>'; });
    if (o.markIdx != null) g += '<line class="mark" x1="' + f1(x(o.markIdx)) + '" x2="' + f1(x(o.markIdx)) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/><text class="axl" x="' + f1(x(o.markIdx)) + '" y="' + (m.t - 3) + '" text-anchor="middle">' + esc(o.markLabel || 'Hoje') + '</text>';
    const endSel = o.endLabels === undefined ? o.series.length <= 2 : o.endLabels;
    o.series.forEach((s, si) => {
      let d = '', pen = false, lastI = -1;
      s.values.forEach((v, i) => { if (!Number.isFinite(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + f1(x(i)) + ' ' + f1(y(v)); pen = true; lastI = i; });
      if (!d) return;
      g += '<path class="ln ' + esc(s.cls || 'c0') + (s.dashed ? ' dashed' : '') + (s.strong ? ' strong' : '') + '" d="' + d + '" fill="none"/>';
      if (lastI >= 0 && s.bubble) {
        const px = x(lastI), py = y(s.values[lastI]), txt = fmt(s.values[lastI]), bw = Math.max(34, String(txt).length * 7.4 + 16), bh = 22;
        const bx = C.clamp(px - bw / 2, m.l, W - m.r - bw + 4), by = py - 12 - bh < m.t ? py + 12 : py - 12 - bh;
        g += '<circle class="pt-halo" cx="' + f1(px) + '" cy="' + f1(py) + '" r="10"/><circle class="pt ' + esc(s.cls || 'c0') + '" cx="' + f1(px) + '" cy="' + f1(py) + '" r="4.4"/>' +
          '<g class="bubg"><rect class="bub" x="' + f1(bx) + '" y="' + f1(by) + '" width="' + f1(bw) + '" height="' + bh + '" rx="11"/><text class="bubt" x="' + f1(bx + bw / 2) + '" y="' + f1(by + 15) + '" text-anchor="middle">' + esc(txt) + '</text></g>';
      } else if (lastI >= 0) {
        g += '<circle class="pt ' + esc(s.cls || 'c0') + '" cx="' + f1(x(lastI)) + '" cy="' + f1(y(s.values[lastI])) + '" r="3.4"/>';
        if (endSel === true || (Array.isArray(endSel) && endSel.includes(si))) g += '<text class="vl ' + esc(s.cls || 'c0') + '" x="' + f1(x(lastI)) + '" y="' + f1(y(s.values[lastI]) - 8) + '" text-anchor="' + (lastI === n - 1 ? 'end' : 'middle') + '">' + esc(fmt(s.values[lastI])) + '</text>';
      }
    });
    const legend = o.series.length > 1 || o.legend ? '<div class="legend-row">' + o.series.map((s) => '<span class="lg"><i class="sw ' + esc(s.cls || 'c0') + (s.dashed ? ' dashed' : '') + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : '';
    return '<figure class="chart">' + legend + '<div class="scroll"><svg class="svgc' + (o.fit ? ' fit' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Gráfico de linhas') + '"><title>' + esc(o.title || 'Gráfico de linhas') + '</title>' + g + '</svg></div></figure>';
  }

  /* Gantt: items [{id,name,start,endB,endF,pct,rag,done,started}] */
  function gantt(o) {
    const items = o.items;
    if (!items.length) return emptyBox('Nenhum projeto para os filtros.');
    const W = 900, labelW = 262, rowH = 28, headH = 36, padR = 12, H = headH + items.length * rowH + 12;
    const t0 = Date.parse(o.from), t1 = Date.parse(o.to), X = (d) => f1(labelW + C.clamp((Date.parse(d) - t0) / (t1 - t0), 0, 1) * (W - labelW - padR));
    let g = '';
    const cur = new Date(t0);
    while (cur.getTime() <= t1) {
      const iso = cur.toISOString().slice(0, 10), q = cur.getUTCMonth() % 3 === 0;
      g += '<line class="gln' + (q ? ' q' : '') + '" x1="' + X(iso) + '" x2="' + X(iso) + '" y1="' + (headH - 6) + '" y2="' + (H - 6) + '"/>' + (q ? '<text class="axl" x="' + (Number(X(iso)) + 3) + '" y="' + (headH - 12) + '">' + esc(C.monthLabel(iso.slice(0, 7))) + '</text>' : '');
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    items.forEach((it, i) => {
      const y0 = headH + i * rowH, xs = Number(X(it.start)), xb = Number(X(it.endB)), xf = Number(X(it.endF > it.endB ? it.endF : it.endB));
      const tip = it.id + ' · ' + it.name + ' — ' + Math.round(it.pct) + '% | início ' + C.fmtDate(it.start) + ' | fim base ' + C.fmtDate(it.endB) + ' | fim previsto ' + C.fmtDate(it.endF);
      g += '<g class="gr"><title>' + esc(tip) + '</title><text class="gl" x="4" y="' + (y0 + 15) + '">' + esc(trunc(it.id + ' ' + it.name, 40)) + '</text>';
      if (!it.started) g += '<rect class="gb-ns" x="' + xs + '" y="' + (y0 + 5) + '" width="' + Math.max(3, f1(xb - xs)) + '" height="12" rx="3"/>';
      else {
        g += '<rect class="gb rag-' + it.rag + '" x="' + xs + '" y="' + (y0 + 5) + '" width="' + Math.max(3, f1(xf - xs)) + '" height="12" rx="3"/>';
        g += '<rect class="gp rag-' + it.rag + '" x="' + xs + '" y="' + (y0 + 5) + '" width="' + Math.max(2, f1((xf - xs) * C.clamp(it.pct, 0, 100) / 100)) + '" height="12" rx="3"/>';
        if (xf > xb + 1) g += '<rect class="gd" x="' + xb + '" y="' + (y0 + 5) + '" width="' + f1(xf - xb) + '" height="12"/>';
      }
      g += '<line class="gbase" x1="' + xs + '" x2="' + xb + '" y1="' + (y0 + 21) + '" y2="' + (y0 + 21) + '"/></g>';
    });
    if (o.today) g += '<line class="mark" x1="' + X(o.today) + '" x2="' + X(o.today) + '" y1="' + (headH - 6) + '" y2="' + (H - 6) + '"/><text class="axl" x="' + X(o.today) + '" y="10" text-anchor="middle">Hoje</text>';
    return '<figure class="chart"><div class="legend-row"><span class="lg"><i class="sw rag-g"></i>No plano</span><span class="lg"><i class="sw rag-a"></i>Atenção</span><span class="lg"><i class="sw rag-r"></i>Crítico</span><span class="lg"><i class="sw ns"></i>Não iniciado</span><span class="lg"><i class="sw delay"></i>Atraso previsto</span><span class="lg muted">Linha fina = linha de base</span></div><div class="scroll"><svg class="svgc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Cronograma dos projetos') + '"><title>' + esc(o.title || 'Cronograma dos projetos') + '</title>' + g + '</svg></div></figure>';
  }

  /* Bolhas (impacto x esforco): points [{id,x,y,r,rag,label}] com x e y em 1..5 */
  function bubble(o) {
    const pts = o.points;
    if (!pts.length) return emptyBox('Nenhuma iniciativa para os filtros.');
    const W = 560, H = 420, m = { l: 58, r: 18, t: 18, b: 46 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const X = (v) => m.l + ((v - 0.5) / 5) * pw, Y = (v) => m.t + (1 - (v - 0.5) / 5) * ph;
    let g = '<rect class="qbg" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '"/><line class="gln q" x1="' + f1(X(3)) + '" x2="' + f1(X(3)) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/><line class="gln q" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(Y(3)) + '" y2="' + f1(Y(3)) + '"/>';
    g += '<text class="qlab" x="' + (m.l + 8) + '" y="' + (m.t + 16) + '">Ganhos rápidos</text><text class="qlab" x="' + (W - m.r - 8) + '" y="' + (m.t + 16) + '" text-anchor="end">Projetos estratégicos</text><text class="qlab" x="' + (m.l + 8) + '" y="' + (H - m.b - 8) + '">Preencher</text><text class="qlab" x="' + (W - m.r - 8) + '" y="' + (H - m.b - 8) + '" text-anchor="end">Repensar</text>';
    for (let v = 1; v <= 5; v++) g += '<text class="axl" x="' + f1(X(v)) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + v + '</text><text class="axl" x="' + (m.l - 8) + '" y="' + f1(Y(v) + 3.5) + '" text-anchor="end">' + v + '</text>';
    g += '<text class="axt" x="' + f1(m.l + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Esforço →</text><text class="axt" transform="translate(14 ' + f1(m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">Impacto →</text>';
    const groups = {}; [...pts].sort((a, b) => b.r - a.r).forEach((p) => { (groups[p.x + ',' + p.y] = groups[p.x + ',' + p.y] || []).push(p); });
    const maxR = Math.max.apply(null, pts.map((p) => p.r)) || 1;
    Object.keys(groups).forEach((k) => {
      const grp = groups[k];
      grp.forEach((p, i) => {
        const ang = (2 * Math.PI * i) / grp.length, off = grp.length > 1 ? 17 : 0, cx = X(p.x) + Math.cos(ang) * off, cy = Y(p.y) + Math.sin(ang) * off, r = 7 + Math.sqrt(p.r / maxR) * 13;
        g += '<g class="bb"><title>' + esc(p.label) + '</title><circle class="bc rag-' + esc(p.rag) + '" cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '"/><text class="bt" x="' + f1(cx) + '" y="' + f1(cy + 3.5) + '" text-anchor="middle">' + esc(p.id) + '</text></g>';
      });
    });
    return '<figure class="chart"><div class="scroll"><svg class="svgc bubble" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Matriz impacto x esforço') + '"><title>' + esc(o.title || 'Matriz impacto x esforço') + '</title>' + g + '</svg></div><figcaption class="muted small">Tamanho da bolha = orçamento. Cor = status do projeto.</figcaption></figure>';
  }

  /* Cascata: steps [{label,value}] mais total */
  function waterfall(o) {
    const st = o.steps;
    if (!st.length) return emptyBox();
    const wrap = (t, n) => { const l = ['']; t.split(' ').forEach((w) => { const c = (l[l.length - 1] + ' ' + w).trim(); if (c.length <= n || !l[l.length - 1]) l[l.length - 1] = c; else l.push(w); }); return l.length > 2 ? [l[0], trunc(l.slice(1).join(' '), n)] : l; };
    const fmt = o.fmt || ((v) => C.fmtInt(v)), W = o.w || 640, H = 290, m = { l: 14, r: 14, t: 26, b: 62 }, n = st.length + 1, bw = Math.min(70, ((W - m.l - m.r) / n) * 0.62);
    let run = 0; const bars = st.map((s) => { const a = run; run += s.value; return { label: s.label, from: a, to: run, v: s.value }; });
    bars.push({ label: o.totalLabel || 'Total', from: 0, to: run, v: run, total: true });
    const lo = Math.min(0, Math.min.apply(null, bars.map((b) => Math.min(b.from, b.to)))), hi = Math.max(0, Math.max.apply(null, bars.map((b) => Math.max(b.from, b.to)))), span = hi - lo || 1;
    const Y = (v) => m.t + (1 - (v - lo) / span) * (H - m.t - m.b), cx = (i) => m.l + ((i + 0.5) * (W - m.l - m.r)) / n;
    let g = '<line class="gln" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(Y(0)) + '" y2="' + f1(Y(0)) + '"/>';
    bars.forEach((b, i) => {
      const y1 = Y(Math.max(b.from, b.to)), y2 = Y(Math.min(b.from, b.to)), cls = b.total ? 'tot' : (b.v >= 0) !== !!o.invert ? 'up' : 'dn';
      g += '<g><title>' + esc(b.label + ': ' + fmt(b.v)) + '</title><rect class="wf ' + cls + '" x="' + f1(cx(i) - bw / 2) + '" y="' + f1(y1) + '" width="' + f1(bw) + '" height="' + Math.max(2, f1(y2 - y1)) + '" rx="3"/><text class="vl" x="' + f1(cx(i)) + '" y="' + f1(y1 - 5) + '" text-anchor="middle">' + esc(fmt(b.v)) + '</text><text class="axl" text-anchor="middle">' + wrap(b.label, 15).map((ln, k) => '<tspan x="' + f1(cx(i)) + '" y="' + (H - 36 + k * 13) + '">' + esc(ln) + '</tspan>').join('') + '</text></g>';
    });
    return '<figure class="chart"><div class="scroll"><svg class="svgc' + (o.fit ? ' fit' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Cascata') + '"><title>' + esc(o.title || 'Cascata') + '</title>' + g + '</svg></div></figure>';
  }

  /* Tornado: items [{label, low, high}] como deltas em relacao ao valor base */
  function tornado(o) {
    const it = o.items;
    if (!it.length) return emptyBox();
    const fmt = o.fmt || ((v) => C.fmtInt(v)), W = 720, rowH = 34, H = it.length * rowH + 44, labelW = 230, mid = labelW + (W - labelW - 20) / 2, half = (W - labelW - 20) / 2 - 56;
    const mx = Math.max.apply(null, it.map((x) => Math.max(Math.abs(x.low), Math.abs(x.high)))) || 1, sc = (v) => (Math.abs(v) / mx) * half;
    let g = '<line class="mark" x1="' + f1(mid) + '" x2="' + f1(mid) + '" y1="22" y2="' + (H - 6) + '"/><text class="axl" x="' + f1(mid) + '" y="12" text-anchor="middle">VPL base: ' + esc(fmt(o.base)) + '</text>';
    it.forEach((x, i) => {
      const y = 28 + i * rowH, lw = sc(x.low), hw = sc(x.high);
      g += '<g><title>' + esc(x.label + ': pior ' + fmt(o.base + x.low) + ' | melhor ' + fmt(o.base + x.high)) + '</title><text class="gl" x="4" y="' + (y + 16) + '">' + esc(x.label) + '</text>' +
        '<rect class="tn lo" x="' + f1(mid - lw) + '" y="' + y + '" width="' + f1(lw) + '" height="22" rx="3"/><rect class="tn hi" x="' + f1(mid) + '" y="' + y + '" width="' + f1(hw) + '" height="22" rx="3"/>' +
        '<text class="vl" x="' + f1(mid - lw - 4) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(fmt(o.base + x.low)) + '</text><text class="vl" x="' + f1(mid + hw + 4) + '" y="' + (y + 15) + '">' + esc(fmt(o.base + x.high)) + '</text></g>';
    });
    return '<figure class="chart"><div class="scroll"><svg class="svgc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Sensibilidade do VPL') + '"><title>' + esc(o.title || 'Sensibilidade do VPL') + '</title>' + g + '</svg></div></figure>';
  }

  /* Bolhas livres (fornecedores): points [{id,x,y,r,rag,label}] com dominios numericos */
  function scatter(o) {
    const pts = o.points;
    if (!pts.length) return emptyBox();
    const W = 560, H = 380, m = { l: 56, r: 18, t: 16, b: 46 }, xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const tx = niceTicks(Math.min.apply(null, xs) - 2, Math.max.apply(null, xs) + 2, 5), ty = niceTicks(Math.min.apply(null, ys) - 1, Math.max.apply(null, ys) + 1, 5);
    const X = (v) => m.l + ((v - tx.min) / (tx.max - tx.min)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - ty.min) / (ty.max - ty.min)) * (H - m.t - m.b), maxR = Math.max.apply(null, pts.map((p) => p.r)) || 1;
    let g = '';
    tx.ticks.forEach((t) => { g += '<line class="gln" x1="' + f1(X(t)) + '" x2="' + f1(X(t)) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/><text class="axl" x="' + f1(X(t)) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + esc(C.fmtDec(t, 0)) + '</text>'; });
    ty.ticks.forEach((t) => { g += '<line class="gln" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(Y(t)) + '" y2="' + f1(Y(t)) + '"/><text class="axl" x="' + (m.l - 6) + '" y="' + f1(Y(t) + 3.5) + '" text-anchor="end">' + esc(C.fmtDec(t, 0)) + '</text>'; });
    if (o.refX != null) g += '<line class="ref" x1="' + f1(X(o.refX)) + '" x2="' + f1(X(o.refX)) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/>';
    if (o.refY != null) g += '<line class="ref" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(Y(o.refY)) + '" y2="' + f1(Y(o.refY)) + '"/>';
    g += '<text class="axt" x="' + f1(m.l + (W - m.l - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(o.xLabel) + '</text><text class="axt" transform="translate(14 ' + f1(m.t + (H - m.t - m.b) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(o.yLabel) + '</text>';
    [...pts].sort((a, b) => b.r - a.r).forEach((p) => { const r = 8 + Math.sqrt(p.r / maxR) * 14; g += '<g class="bb"><title>' + esc(p.label) + '</title><circle class="bc rag-' + esc(p.rag) + '" cx="' + f1(X(p.x)) + '" cy="' + f1(Y(p.y)) + '" r="' + f1(r) + '"/><text class="bt" x="' + f1(X(p.x)) + '" y="' + f1(Y(p.y) + 3.5) + '" text-anchor="middle">' + esc(p.id) + '</text></g>'; });
    return '<figure class="chart"><div class="scroll"><svg class="svgc bubble" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Dispersão') + '"><title>' + esc(o.title || 'Dispersão') + '</title>' + g + '</svg></div><figcaption class="muted small">' + esc(o.caption || '') + '</figcaption></figure>';
  }


  /* Anel (gauge): pct 0-100; target (opcional) desenha um marcador; rag g/a/r ou omitido (cor de destaque). */
  function ring(o) {
    const pct = C.clamp(Number(o.pct) || 0, 0, 100), r = 46, cx = 60, cy = 60, rag = ['g', 'a', 'r'].includes(o.rag) ? o.rag : 'n';
    let tick = '';
    if (o.target != null && Number.isFinite(Number(o.target))) {
      const a = ((-90 + C.clamp(Number(o.target), 0, 100) * 3.6) * Math.PI) / 180;
      tick = '<line class="rg-tick" x1="' + f1(cx + (r - 9) * Math.cos(a)) + '" y1="' + f1(cy + (r - 9) * Math.sin(a)) + '" x2="' + f1(cx + (r + 9) * Math.cos(a)) + '" y2="' + f1(cy + (r + 9) * Math.sin(a)) + '"/>';
    }
    const arc = pct >= 0.5 ? '<circle class="rg-arc rg-' + rag + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" pathLength="100" stroke-dasharray="' + f1(pct) + ' 100" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>' : '';
    const aria = o.aria || (o.label + ': ' + o.value + (o.sub ? ' (' + o.sub + ')' : ''));
    return '<figure class="ring"><svg class="rg" viewBox="0 0 120 120" role="img" aria-label="' + esc(aria) + '"><title>' + esc(aria) + '</title><circle class="rg-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' + arc + tick +
      '<text class="rg-v" x="60" y="64" text-anchor="middle">' + esc(o.value) + '</text>' + (o.unit ? '<text class="rg-s" x="60" y="80" text-anchor="middle">' + esc(o.unit) + '</text>' : '') + '</svg>' +
      '<figcaption><b>' + esc(o.label) + '</b><span>' + esc(o.sub || '') + '</span></figcaption></figure>';
  }

  /* Barras agrupadas: labels (categorias) x series [{name, values, cls: s0|s1|s2}]; flags[i] = texto de alerta acima do grupo. */
  function bars(o) {
    const n = o.labels.length, k = o.series.length;
    if (!n || !k) return emptyBox();
    const W = o.w || 640, H = o.h || 280, m = { l: 44, r: 12, t: 26, b: 34 }, fmt = o.fmt || ((v) => C.fmtInt(v));
    const all = []; o.series.forEach((s) => s.values.forEach((v) => { if (Number.isFinite(v)) all.push(v); }));
    const tk = niceTicks(0, (Math.max.apply(null, all) || 1) * 1.08, 4), band = (W - m.l - m.r) / n, bw = Math.min(28, (band * 0.72) / k), gap = 3;
    const Y = (v) => m.t + (1 - (v - tk.min) / (tk.max - tk.min)) * (H - m.t - m.b);
    let g = '';
    tk.ticks.forEach((t) => { g += '<line class="gln" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + f1(Y(t)) + '" y2="' + f1(Y(t)) + '"/><text class="axl" x="' + (m.l - 6) + '" y="' + f1(Y(t) + 3.5) + '" text-anchor="end">' + esc(fmt(t)) + '</text>'; });
    o.labels.forEach((lab, i) => {
      const cx = m.l + band * (i + 0.5), total = k * bw + (k - 1) * gap;
      g += '<g class="bkg">';
      o.series.forEach((s, j) => {
        const v = s.values[i]; if (!Number.isFinite(v)) return;
        const x0 = cx - total / 2 + j * (bw + gap), y0 = Y(Math.max(v, 0)), h = Math.max(1, Y(0) - y0);
        g += '<rect class="bk ' + esc(s.cls || 's' + j) + '" x="' + f1(x0) + '" y="' + f1(y0) + '" width="' + f1(bw) + '" height="' + f1(h) + '" rx="4"><title>' + esc(lab + ' · ' + s.name + ': ' + fmt(v)) + '</title></rect>';
      });
      g += '</g><text class="axl" x="' + f1(cx) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(lab) + '</text>';
      if (o.flags && o.flags[i]) { const top = Math.min.apply(null, o.series.map((s) => (Number.isFinite(s.values[i]) ? Y(Math.max(s.values[i], 0)) : H))); g += '<text class="bflag" x="' + f1(cx) + '" y="' + f1(Math.max(12, top - 6)) + '" text-anchor="middle">' + esc(o.flags[i]) + '</text>'; }
    });
    const legend = '<div class="legend-row">' + o.series.map((s, j) => '<span class="lg"><i class="sw ' + esc(s.cls || 's' + j) + '"></i>' + esc(s.name) + '</span>').join('') + '</div>';
    return '<figure class="chart">' + legend + '<div class="scroll"><svg class="svgc' + (o.fit ? ' fit' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Barras agrupadas') + '"><title>' + esc(o.title || 'Barras agrupadas') + '</title>' + g + '</svg></div></figure>';
  }

  root.Charts = { niceTicks, spark, line, gantt, bubble, waterfall, tornado, scatter, ring, bars };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Charts;
})(typeof window !== 'undefined' ? window : globalThis);
