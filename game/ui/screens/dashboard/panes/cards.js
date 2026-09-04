/* War of Attrition — ui part: the Balance Dashboard's CARDS pane.
   THE QUESTION: which cards are dead weight, and when do cards
   actually fire? Three .chcard sections — sight quadrant (x = the doctrine
   win-slice), the dead-card Simple% dumbbells, and the when-cards-fire strips —
   fed by the SAME two runs' skirmish rows as Overview/Maps
   (dashLoadSkirmishRows/SKIRMISH_CACHE in ui/net.js).

   Render-only: all shaping is CHART_MODEL.buildCardsModel (ui/chart-model.js),
   which folds per-card via WOA_REPORT.cardRows (report-model.js — the ONE
   card-row derivation, reused unmodified for a run's DB rows). Draws over the
   shared toolkit (ui/chart-primitives.js): chDivFill, chMakePlacer, chLine/
   chText/chTipAttrs/chSwatch, and the .chtip/ch-hit hover layer (chBindHits).
   Mirrors the Overview/Maps dual-run idiom throughout: A ghost/hollow, B
   solid/filled. */
'use strict';
// the Cards strip's swatch — the shared uiSwatch at its 11px size (the .chkey/.sw
// CSS is scoped under .chcard, and these strips sit in plain
// .ov-grid, so they need the inline-styled swatch, not the class).
function crdSw(css) { return uiSwatch(css, { size: 11, valign: -1 }); }

/* The Cards pane's data-shaping — per-run card view (cardRunView), fleet-wide
   fire-time quartiles (cardFleetFireTimes), and the whole-pane display model
   (CHART_MODEL.buildCardsModel) — lives in report-model.js / ui/chart-model.js;
   these functions only draw whatever the model hands them. */

/* =================== Cards §1: sight quadrant ===================
   x = win % — the doctrine slice (HQ-capture endings × non-simple
   plays only; report-model.js cardHqWinSlice). Pooled card Win% NEVER appears
   on this axis — the slice is what tells you whether a card wins the games it
   is meant to. y = played-on-first-sight % (pooled —
   Simple%/Noop%/1stSight%/AvgSeen/Plays are all pooled, correct here unlike
   Win%).
   A ghost (hollow ink ring) -> B solid (fill = win % deviation from 50, the
   SAME chDivFill scale from the shared toolkit, chart-primitives.js), joined by
   a plain connector — the map dumbbells' A→B idiom (ovMapDumbbells), not a new
   arrowhead-marker convention. Bubble AREA = plays (max of A/B). Greyed marks
   + "(n=N)" in the tooltip = the small-n rule on the SLICE's own n
   (fleet scope: this chart is fleet-wide, never per-map, so SMALL_N.fleet=240
   — deliberately strict; the slice is thin by construction and greying often
   IS the honest answer).
   Corner: "OP WATCHLIST" moves to top-RIGHT (wins big in HQ endings AND
   always played on sight) — a deliberate reading of design 5a's corner for
   THIS chart's axes: x is win% here (danger = top-RIGHT), not AvgSeen (which
   would put danger top-LEFT). Documented here since it's a discretionary call,
   not a spec-pinned coordinate. */
function chartCardSightQuadrant(rows, maxPlays) {
  var W = 860, H = 500, L = 48, R = 18, T = 44, B = 48;
  var pw = W - L - R, ph = H - T - B;
  function sx(v) { return L + v / 100 * pw; }
  function sy(v) { return T + (100 - v) / 100 * ph; }
  var s = chSvgOpen({ id: 'chCardQuad', vb: '0 0 ' + W + ' ' + H, role: 'img', aria: 'Card sight quadrant' });
  s += chRect(0, 0, W, H, { fill: CHART.surface, rx: 6 });
  [0, 25, 75, 100].forEach(function (v) {
    s += chLine(sx(v), T, sx(v), T + ph, CHART.grid, 1);
    s += chLine(L, sy(v), L + pw, sy(v), CHART.grid, 1);
  });
  s += chLine(sx(50), T, sx(50), T + ph, CHART.axis, 1.4);
  s += chLine(L, sy(50), L + pw, sy(50), CHART.axis, 1.4);
  var chrome = '';
  [0, 25, 50, 75, 100].forEach(function (v) {
    chrome += chText(sx(v), T + ph + 14, String(v), { fs: 10.5, anchor: 'middle' });
    chrome += chText(L - 6, sy(v) + 3.5, String(v), { fs: 10.5, anchor: 'end' });
  });
  chrome += chText(L + pw / 2, H - 6, 'win % — HQ-capture endings, non-simple plays (DB slice)', { fs: 12, anchor: 'middle' });
  chrome += chText(14, T + ph / 2, 'played on first sight %', { fs: 12, anchor: 'middle', rotate: true });
  chrome += chText(L + pw - 4, T + 16, 'OP WATCHLIST →', { fs: 11.5, fill: CHART.breach, bold: true, anchor: 'end' });
  chrome += chText(L + pw - 4, T + ph - 8, 'over-performs →', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'end' });
  chrome += chText(L + 6, T + ph - 8, '← under-performs', { fs: 10.5, fill: CHART.muted, italic: true });

  function rad(p) { return Math.max(5, 20 * Math.sqrt(p / maxPlays)); }

  var pts = rows.map(function (r) {
    var pr = rad(Math.max(r.a ? r.a.plays : 0, r.b ? r.b.plays : 0));
    var a = (r.a && r.a.winHq != null) ? { x: sx(r.a.winHq), y: sy(r.a.sight), small: WOA_REPORT.smallN(r.a.winHqN, 'fleet') } : null;
    var b = (r.b && r.b.winHq != null) ? { x: sx(r.b.winHq), y: sy(r.b.sight), small: WOA_REPORT.smallN(r.b.winHqN, 'fleet') } : null;
    return { r: r, a: a, b: b, rad: pr };
  }).filter(function (p) { return p.a || p.b; })
    .sort(function (x, y) { return y.rad - x.rad; }); // big dots block space first — the sqrt-area convention shared across the scatter panes

  var placer = chMakePlacer(W, H);
  pts.forEach(function (p) {
    if (p.a) placer.block(p.a.x - p.rad, p.a.y - p.rad, p.rad * 2, p.rad * 2);
    if (p.b) placer.block(p.b.x - p.rad, p.b.y - p.rad, p.rad * 2, p.rad * 2);
  });

  var marks = '', labels = '', hits = '';
  pts.forEach(function (p, i) {
    var r = p.r, idA = 'chCq' + i + 'a', idB = 'chCq' + i + 'b', markIds = [];
    if (p.a && p.b) {
      marks += chLine(p.a.x.toFixed(1), p.a.y.toFixed(1), p.b.x.toFixed(1), p.b.y.toFixed(1),
        CHART.axis, 1.3, null, (p.a.small || p.b.small) ? '0.5' : null);
    }
    if (p.a) {
      markIds.push(idA);
      marks += chCircle({ id: idA, cx: p.a.x.toFixed(1), cy: p.a.y.toFixed(1), r: p.rad.toFixed(1),
        fill: CHART.runADot, stroke: CHART.ink, sw: 2, opacity: p.a.small ? '0.5' : null, ring: CHART.ink });
    }
    if (p.b) {
      markIds.push(idB);
      var bRad = Math.max(4, p.rad - 1.5);
      marks += chCircle({ id: idB, cx: p.b.x.toFixed(1), cy: p.b.y.toFixed(1), r: bRad.toFixed(1),
        fill: chDivFill(r.b.winHq - 50), stroke: CHART.surface, sw: 2, opacity: p.b.small ? '0.5' : null, ring: CHART.surface });
    }
    var anchor = p.b || p.a;
    var pl = placer.place(anchor.x, anchor.y, p.rad, r.name, 10.5) || { x: anchor.x + p.rad + 4, y: anchor.y + 3.5 };
    labels += chText(pl.x, pl.y, r.name, { fs: 10.5, fill: CHART.ink });
    hits += chCircle({ cls: 'ch-hit', cx: anchor.x.toFixed(1), cy: anchor.y.toFixed(1), r: Math.max(p.rad + 6, 14),
      fill: 'transparent', extra: chTipAttrs(r.name, [
        ['win % A (HQ × non-simple)', r.a && r.a.winHq != null ? r.a.winHq + '% (n=' + r.a.winHqN + ')' : 'n/a'],
        ['win % B (HQ × non-simple)', r.b && r.b.winHq != null ? r.b.winHq + '% (n=' + r.b.winHqN + ')' : 'n/a'],
        ['1st-sight % A → B', (r.a ? r.a.sight : '—') + '% → ' + (r.b ? r.b.sight : '—') + '%'],
        ['plays A → B', (r.a ? r.a.plays : 0) + ' → ' + (r.b ? r.b.plays : 0)]
      ], markIds.join(',')) });
  });
  s += marks + chrome + labels + hits + '</svg>';
  return s;
}

/* =================== Cards §2: dead-card check ===================
   Simple% A→B dumbbells (design 5a) — the SAME connector-and-two-dots idiom
   ovMapDumbbells uses above, on a 0–100% scale instead of the 0–20 balance
   score. HIGHER Simple% is WORSE (the card's own printed effect rarely beat
   the basic-attack/reposition fallback), so "regressed" = B > A, the SAME
   polarity ovMapDumbbells already uses for balance score. Sorted worst-first
   on B (design 5a: "sorted by B"). A red ⚠ stamps any row where Noop% > 2 on
   whichever run has data (B preferred; A as a fallback when B has none). */
function crdSimpleDumbbells(rows) {
  var live = rows.slice().sort(function (x, y) {
    var xv = x.b ? x.b.simple : (x.a ? x.a.simple : -1), yv = y.b ? y.b.simple : (y.a ? y.a.simple : -1);
    return yv - xv;
  });
  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Dead-card check: Simple%, A&rarr;B ' +
    '<span class="small" style="font-style:italic;">(sorted worst-first on B — high Simple% = the card’s own effect rarely mattered)</span></div>';
  if (!live.length) return h + '<p class="small">No card plays for either run yet.</p>';
  h += '<div class="ov-legend"><span>run A = hollow ring, run B = filled dot</span>' +
    '<span style="color:' + CHART.breach + ';">⚠ Noop% &gt; 2%</span></div>';
  h += '<div class="ov-grid">';
  live.forEach(function (r) {
    var av = r.a ? r.a.simple : null, bv = r.b ? r.b.simple : null;
    var regressed = av != null && bv != null && bv > av;
    var improved = av != null && bv != null && bv < av;
    var connColor = regressed ? CHART.regress : (improved ? CHART.improve : CHART.grid);
    var bFill = regressed ? CHART.breach : (improved ? CHART.improveDot : CHART.ink);
    var inner = chDumbbell(av, bv, CHART.ink, bFill, connColor);
    var noopV = r.b ? r.b.noop : (r.a ? r.a.noop : 0);
    var warn = noopV > 2;
    var valText = (av == null ? '—' : av + '%') + ' → ' + (bv == null ? '—' : bv + '%') + (warn ? ' ⚠' : '');
    var tip = [['simple % A', av == null ? 'n/a' : av + '% (n=' + (r.a ? r.a.plays : 0) + ')'],
      ['simple % B', bv == null ? 'n/a' : bv + '% (n=' + (r.b ? r.b.plays : 0) + ')'],
      ['noop %', noopV + '%']];
    var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(r.name, tip) + '></div>';
    h += '<div class="ov-lbl">' + (warn ? '<b>' + chEsc(r.name) + ' ⚠</b>' : chEsc(r.name)) + '</div>' +
      '<div style="position:relative;height:18px;">' + inner + hit + '</div>' +
      '<div class="ov-val' + (regressed ? ' breach' : '') + '">' + valText + '</div>';
  });
  h += '</div>';
  return h;
}

// sequential brass->ink fill by normalized-time fraction (0=early turn 1,
// 1=skirmish end) — the SAME CHART.seq ramp mdLensFill uses for magnitude, here
// indexed by a [0,1] fraction instead of a value/max ratio.
function crdFireFill(frac) {
  return CHART.seq[Math.max(0, Math.min(CHART.seq.length - 1, Math.floor(frac * CHART.seq.length)))];
}

/* =================== Cards §3: when cards fire ===================
   One row per card: two stacked mini tracks (A above, B below) over
   normalized skirmish time [0%,100%] — a bar spans the middle-50% (q1..q3),
   fill by median (brass ramp = early→late), a 2px ink tick marks the median
   exactly, matching design 5a's "quartile bar + 3px ink median tick" idiom.
   Sorted earliest-median-first on B (a natural reading of "sorted by B" for
   a timing chart, mirroring §2's worst-first-on-B convention). */
function crdFireStrips(rows, fireA, fireB) {
  var live = rows.filter(function (r) { return fireA[r.id] || fireB[r.id]; });
  live = live.slice().sort(function (x, y) {
    var xm = fireB[x.id] ? fireB[x.id].median : (fireA[x.id] ? fireA[x.id].median : 1);
    var ym = fireB[y.id] ? fireB[y.id].median : (fireA[y.id] ? fireA[y.id].median : 1);
    return xm - ym;
  });
  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">When cards fire, A vs B ' +
    '<span class="small" style="font-style:italic;">(middle-50% of play turns + median tick, over normalized skirmish time — report-model.js cardPlayTurnQuartiles)</span></div>';
  if (!live.length) return h + '<p class="small">No card plays for either run yet.</p>';
  h += '<div class="ov-legend">' +
    '<span>' + crdSw('background:' + CHART.seq[1] + ';') + 'middle 50% of play turns (fill = median, brass ramp early→late)</span>' +
    '<span>' + crdSw('background:' + CHART.ink + ';width:2px;border-radius:0;') + 'median tick</span></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:9.5px;color:' + CHART.muted + ';margin:2px 0 3px;padding-left:150px;font-style:italic;">' +
    '<span>turn 1</span><span>skirmish end</span></div>';
  h += '<div class="ov-grid" style="grid-template-columns:148px 1fr 76px;row-gap:8px;">';
  live.forEach(function (r) {
    var qa = fireA[r.id] || null, qb = fireB[r.id] || null;
    var nA = r.a ? r.a.plays : 0, nB = r.b ? r.b.plays : 0;
    function barHtml(q, n, label) {
      if (!q) return '<div class="small" style="opacity:.55;padding:1px 0;">no ' + label + ' plays</div>';
      var small = WOA_REPORT.smallN(n, 'fleet');
      var lo = Math.max(0, Math.min(100, q.q1 * 100)), hi = Math.max(0, Math.min(100, q.q3 * 100));
      if (hi < lo) { var t = lo; lo = hi; hi = t; }
      var med = Math.max(0, Math.min(100, q.median * 100));
      return '<div style="position:relative;height:12px;margin-bottom:2px;' + (small ? 'opacity:.5;' : '') + '">' +
        '<div style="position:absolute;top:5px;left:0;right:0;height:2px;background:' + CHART.grid + ';"></div>' +
        '<div style="position:absolute;top:2px;left:' + lo.toFixed(1) + '%;width:' + Math.max(1, hi - lo).toFixed(1) +
          '%;height:8px;background:' + crdFireFill(q.median) + ';border-radius:2px;"></div>' +
        '<div style="position:absolute;top:0;left:calc(' + med.toFixed(1) + '% - 1px);width:2px;height:12px;background:' + CHART.ink + ';"></div></div>';
    }
    var valText = (qa ? Math.round(qa.median * 100) + '%' : '—') + ' → ' + (qb ? Math.round(qb.median * 100) + '%' : '—');
    var tip = [['median turn A', qa ? Math.round(qa.median * 100) + '% (n=' + nA + ')' : 'n/a'],
      ['median turn B', qb ? Math.round(qb.median * 100) + '% (n=' + nB + ')' : 'n/a'],
      ['middle-50% band A', qa ? Math.round(qa.q1 * 100) + '–' + Math.round(qa.q3 * 100) + '%' : 'n/a'],
      ['middle-50% band B', qb ? Math.round(qb.q1 * 100) + '–' + Math.round(qb.q3 * 100) + '%' : 'n/a']];
    var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(r.name, tip) + '></div>';
    h += '<div class="ov-lbl">' + chEsc(r.name) + '</div>' +
      '<div style="position:relative;">' + barHtml(qa, nA, 'A') + barHtml(qb, nB, 'B') + hit + '</div>' +
      '<div class="ov-val">' + valText + '</div>';
  });
  h += '</div>';
  return h;
}

/* Assembles the full Cards pane from two runs' already-fetched skirmish rows
   (the SAME rowsA/rowsB shape ovRenderBody/mdRenderBody consume). */
function crdRenderBody(el, rowsA, rowsB) {
  // All the pane's data-shaping is one pure call; this function only draws.
  var model = CHART_MODEL.buildCardsModel(rowsA, rowsB, E.CARDS);
  var rows = model.rows;

  var h = '<div class="crd-wrap">';
  h += '<div class="chcard"><h3>Which cards are on the overpowered watchlist?</h3>' +
    '<p class="small">' + rows.length + ' card(s) with plays in run A and/or B' +
    (model.omitted ? '; ' + model.omitted + ' never played in a non-simple HQ-capture ending (omitted here — the win-slice)' : '') +
    '. Bubble area = plays; A hollow ghost → B solid.</p>' +
    '<div class="chkey"><span>fill B = win % deviation from 50:</span>' +
    '<span>' + chSwatch(CHART.divBlue[2]) + 'under 50%</span>' +
    '<span>' + chSwatch(CHART.divMid) + '≈ 50%</span>' +
    '<span>' + chSwatch(CHART.divRed[2]) + 'over 50%</span></div>' +
    chartCardSightQuadrant(rows, model.maxPlays) + '</div>';
  h += '<div class="chcard">' + crdSimpleDumbbells(rows) + '</div>';
  h += '<div class="chcard">' + crdFireStrips(rows, model.fireA, model.fireB) + '</div>';
  h += '</div>';
  el.innerHTML = h;
  chBindHits(el);
}

/* Cards entry point (dashboard.js's renderDashPane calls this for the
   'cards' view once the shell's own file:///no-runs/no-A-B guards pass — the
   SAME guard Overview/Maps use). */
function renderCards(el) {
  var loaded = dashLoadSkirmishRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load skirmish rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    crdRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading skirmish rows for run A &amp; B&hellip;</p>';
}

dashPane({ id:'cards', label:'Cards', needsRuns:true, render: renderCards });
