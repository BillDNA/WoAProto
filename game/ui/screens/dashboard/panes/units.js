/* War of Attrition — ui part: the Balance Dashboard's UNITS pane.
   THE QUESTION: is each unit doing its job? SAME two runs' skirmish
   rows as Overview/Maps/Cards (dashLoadSkirmishRows/SKIRMISH_CACHE in ui/net.js),
   folded per-unit-type via report-model.js's unitsAggFromRows — one fold, four
   panels: role map, breakthrough gauge, lifespan bars, exchange. A ghost
   -> B solid throughout; this tab follows the header run-A/B pickers, not the
   map drill-down's A|B|A/B toggle.

   Render-only: all shaping is CHART_MODEL.buildUnitsModel (ui/chart-model.js),
   and each type's identity colour — one across all four panels, a CHART pole
   reused with no good/bad verdict — is declared on its own mark in ui/unit/ and
   read here through unitChartColor. This file owns the draw, over the shared
   toolkit (ui/chart-primitives.js): chMakePlacer, chLine/chText/chTipAttrs, and the .chtip/ch-hit hover layer
   (chBindHits). Small-n: ONE n per unit type per run
   (skirmishesFielded) governs every mark; WOA_REPORT.smallN(n, 'fleet') greys
   the mark + appends "(n=N)" to its tooltip, same as Cards. */
'use strict';
function unColor(t, i) { return unitChartColor(t) || CHART.seq[i % CHART.seq.length]; }

// The pane's data-shaping lives in CHART_MODEL.buildUnitsModel (ui/chart-model.js):
// the per-type rows fold (WOA_REPORT.unitsAggFromRows) + linear-domain positioning
// (unLinearDomain / unPos). This file only draws over what it returns.

/* One dumbbell row on a linear track — used by both Breakthrough (midline
   null) and Exchange (midline 1.0, "trades even"). A hollow ring / B solid
   dot, both in the type's OWN colour (see file-header comment: no regressed/
   improved judgement here). Greys per-mark on WOA_REPORT.smallN, same rule
   as every other track on this tab. */
function unTrackRow(name, color, domain, va, vb, na, nb, fmtFn, midlineVal) {
  var posA = CHART_MODEL.unPos(domain, va), posB = CHART_MODEL.unPos(domain, vb);
  var smallA = WOA_REPORT.smallN(na, 'fleet'), smallB = WOA_REPORT.smallN(nb, 'fleet');
  var midPos = midlineVal != null ? CHART_MODEL.unPos(domain, midlineVal) : null;
  var inner = '<div style="position:absolute;top:6px;left:0;right:0;height:2px;background:' + CHART.grid + ';"></div>' +
    (midPos != null ? '<div style="position:absolute;top:0;bottom:0;left:' + midPos.toFixed(1) + '%;width:1px;background:' + CHART.axis + ';"></div>' : '') +
    (posA != null && posB != null ? '<div style="position:absolute;top:6px;height:2px;left:' + Math.min(posA, posB).toFixed(1) +
      '%;width:' + Math.abs(posB - posA).toFixed(1) + '%;background:' + color + ';opacity:.55;"></div>' : '') +
    (posA != null ? '<div style="position:absolute;top:1px;width:11px;height:11px;border-radius:50%;border:2px solid ' + color +
      ';background:' + CHART.runADot + ';left:calc(' + posA.toFixed(1) + '% - 6px);' + (smallA ? 'opacity:.5;' : '') + '"></div>' : '') +
    (posB != null ? '<div style="position:absolute;top:2.5px;width:9px;height:9px;border-radius:50%;background:' + color +
      ';left:calc(' + posB.toFixed(1) + '% - 4.5px);' + (smallB ? 'opacity:.5;' : '') + '"></div>' : '');
  var valText = (va == null ? '—' : fmtFn(va) + (smallA ? ' (n=' + na + ')' : '')) + ' → ' +
    (vb == null ? '—' : fmtFn(vb) + (smallB ? ' (n=' + nb + ')' : ''));
  var tip = [['run A', va == null ? 'n/a' : fmtFn(va) + ' (n=' + na + ')'], ['run B', vb == null ? 'n/a' : fmtFn(vb) + ' (n=' + nb + ')']];
  var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(name, tip) + '></div>';
  return '<div class="ov-lbl">' + chEsc(name) + '</div>' +
    '<div style="position:relative;height:14px;">' + inner + hit + '</div>' +
    '<div class="ov-val">' + valText + '</div>';
}

/* Lifespan row: ACTUAL bars (design 5a/5b wording, not a dumbbell) — A above,
   B below, the SAME stacked-mini-track idiom crdFireStrips uses for "when
   cards fire". Bar width = value / domain.hi; domain sized off both runs'
   real values (unLinearDomain). */
function unLifespanRow(name, color, domain, va, vb, na, nb) {
  function bar(v, n) {
    if (v == null) return '<div class="small" style="opacity:.55;padding:1px 0;">no data</div>';
    var small = WOA_REPORT.smallN(n, 'fleet');
    var w = Math.max(1, Math.min(100, (v - domain.lo) / (domain.hi - domain.lo) * 100));
    return '<div style="position:relative;height:9px;margin-bottom:2px;' + (small ? 'opacity:.5;' : '') + '">' +
      '<div style="position:absolute;top:0;left:0;right:0;height:9px;background:' + CHART.bandT2 + ';border-radius:2px;"></div>' +
      '<div style="position:absolute;top:0;left:0;height:9px;width:' + w.toFixed(1) + '%;background:' + color + ';border-radius:2px;"></div></div>';
  }
  var smallA = WOA_REPORT.smallN(na, 'fleet'), smallB = WOA_REPORT.smallN(nb, 'fleet');
  var valText = (va == null ? '—' : WOA_REPORT.f1(va) + 't' + (smallA ? ' (n=' + na + ')' : '')) + ' → ' +
    (vb == null ? '—' : WOA_REPORT.f1(vb) + 't' + (smallB ? ' (n=' + nb + ')' : ''));
  var tip = [['median lifespan A', va == null ? 'n/a' : WOA_REPORT.f1(va) + ' turns (n=' + na + ')'],
    ['median lifespan B', vb == null ? 'n/a' : WOA_REPORT.f1(vb) + ' turns (n=' + nb + ')']];
  var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(name, tip) + '></div>';
  return '<div class="ov-lbl">' + chEsc(name) + '</div>' +
    '<div style="position:relative;">' + bar(va, na) + bar(vb, nb) + hit + '</div>' +
    '<div class="ov-val">' + valText + '</div>';
}

/* =================== Units §1: role map ===================
   x = median deploy timing, normalized to skirmish length (0-100%) — the SAME
   normalization idiom deployInterleave/settlePoint/cardPlayTurnQuartiles
   already use in report-model.js, so a unit's x position is comparable
   across skirmishes of different length (raw turn numbers wouldn't be). y =
   attacks made vs absorbed balance (roleY = 100*atk/(atk+abs); top = "leading
   the charge", bottom = "supporting role"). Dot size = skirmishes fielded (max
   of A/B, same sqrt-area scale chartCardSightQuadrant uses). A = hollow ring,
   DASHED (the design's own "ghost" idiom for this chart specifically — 2c/5b
   both draw the ghost as a dashed ring, unlike Cards' plain hollow ring) with
   a dashed connector standing in for the "ghost arrow" (a real SVG
   arrowhead-marker convention was explicitly rejected for the Cards
   quadrant; this reuses that same connector-not-marker call). */
function chartUnitsRoleMap(rows) {
  var W = 520, H = 300, L = 22, R = 22, T = 34, B = 34;
  var pw = W - L - R, ph = H - T - B;
  function sx(v) { return L + v / 100 * pw; }
  function sy(v) { return T + (100 - v) / 100 * ph; }
  var s = chSvgOpen({ id: 'chUnitsRole', vb: '0 0 ' + W + ' ' + H, role: 'img', aria: 'Unit role map' });
  s += chRect(0, 0, W, H, { fill: CHART.surface, rx: 6 });
  s += chLine(L, sy(50), L + pw, sy(50), CHART.axis, 1.4);
  var chrome = '';
  chrome += chText(L + pw / 2, T - 16, 'LEADING THE CHARGE', { fs: 10, anchor: 'middle', fill: CHART.muted, italic: true });
  chrome += chText(L + pw / 2, T + ph + 20, 'SUPPORTING ROLE', { fs: 10, anchor: 'middle', fill: CHART.muted, italic: true });
  chrome += chText(L, H - 4, '← deploys early', { fs: 10, fill: CHART.muted, italic: true });
  chrome += chText(L + pw, H - 4, 'deploys late →', { fs: 10, fill: CHART.muted, italic: true, anchor: 'end' });

  var maxN = 1;
  rows.forEach(function (r) { var n = Math.max(r.a ? r.a.n : 0, r.b ? r.b.n : 0); if (n > maxN) maxN = n; });
  function rad(n) { return Math.max(6, 22 * Math.sqrt(n / maxN)); }

  var pts = rows.map(function (r) {
    var pr = rad(Math.max(r.a ? r.a.n : 0, r.b ? r.b.n : 0));
    var a = (r.a && r.a.depMedian != null && r.a.roleY != null) ? { x: sx(r.a.depMedian * 100), y: sy(r.a.roleY), small: WOA_REPORT.smallN(r.a.n, 'fleet') } : null;
    var b = (r.b && r.b.depMedian != null && r.b.roleY != null) ? { x: sx(r.b.depMedian * 100), y: sy(r.b.roleY), small: WOA_REPORT.smallN(r.b.n, 'fleet') } : null;
    return { r: r, a: a, b: b, rad: pr };
  }).filter(function (p) { return p.a || p.b; })
    .sort(function (x, y) { return y.rad - x.rad; }); // big dots block space first, same convention as chartCardSightQuadrant (panes/cards.js)

  var placer = chMakePlacer(W, H);
  pts.forEach(function (p) {
    if (p.a) placer.block(p.a.x - p.rad, p.a.y - p.rad, p.rad * 2, p.rad * 2);
    if (p.b) placer.block(p.b.x - p.rad, p.b.y - p.rad, p.rad * 2, p.rad * 2);
  });

  var marks = '', labels = '', hits = '';
  pts.forEach(function (p, i) {
    var r = p.r, idA = 'chUr' + i + 'a', idB = 'chUr' + i + 'b', markIds = [];
    if (p.a && p.b) {
      marks += chLine(p.a.x.toFixed(1), p.a.y.toFixed(1), p.b.x.toFixed(1), p.b.y.toFixed(1),
        r.color, 1.6, '4 2', (p.a.small || p.b.small) ? '0.5' : null);
    }
    if (p.a) {
      markIds.push(idA);
      marks += chCircle({ id: idA, cx: p.a.x.toFixed(1), cy: p.a.y.toFixed(1), r: p.rad.toFixed(1),
        fill: CHART.runADot, stroke: r.color, sw: 2, dash: '3 2', opacity: p.a.small ? '0.5' : null, ring: r.color });
    }
    if (p.b) {
      markIds.push(idB);
      var bRad = Math.max(5, p.rad - 1.5);
      marks += chCircle({ id: idB, cx: p.b.x.toFixed(1), cy: p.b.y.toFixed(1), r: bRad.toFixed(1),
        fill: r.color, stroke: CHART.surface, sw: 2, opacity: p.b.small ? '0.5' : null, ring: CHART.surface });
    }
    var anchor = p.b || p.a;
    var pl = placer.place(anchor.x, anchor.y, p.rad, r.name, 11) || { x: anchor.x + p.rad + 4, y: anchor.y + 4 };
    labels += chText(pl.x, pl.y, r.name, { fs: 11, fill: CHART.ink, bold: true });
    hits += chCircle({ cls: 'ch-hit', cx: anchor.x.toFixed(1), cy: anchor.y.toFixed(1), r: Math.max(p.rad + 6, 14),
      fill: 'transparent', extra: chTipAttrs(r.name, [
        ['deploy timing A → B', (p.a ? Math.round(r.a.depMedian * 100) + '%' : '—') + ' → ' + (p.b ? Math.round(r.b.depMedian * 100) + '%' : '—')],
        ['made vs absorbed A → B', (p.a ? Math.round(r.a.roleY) + '%' : '—') + ' → ' + (p.b ? Math.round(r.b.roleY) + '%' : '—')],
        ['skirmishes fielded A → B', (r.a ? r.a.n : 0) + ' → ' + (r.b ? r.b.n : 0)]
      ], markIds.join(',')) });
  });
  s += marks + chrome + labels + hits + '</svg>';
  return s;
}

/* =================== Units §2/3/4: breakthrough / lifespan / exchange === */
function unBreakthroughSection(rows) {
  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Breakthrough point ' +
    '<span class="small" style="font-style:italic;">(attacks absorbed / skirmish fielded, A&rarr;B — who gets attacked)</span></div>';
  var live = rows.filter(function (r) { return (r.a && r.a.breakthrough != null) || (r.b && r.b.breakthrough != null); });
  if (!live.length) return h + '<p class="small">No skirmishes fielding a unit for either run yet.</p>';
  var vals = [];
  live.forEach(function (r) { if (r.a) vals.push(r.a.breakthrough); if (r.b) vals.push(r.b.breakthrough); });
  var domain = CHART_MODEL.unLinearDomain(vals);
  h += '<div class="ov-grid">' + live.map(function (r) {
    return unTrackRow(r.name, r.color, domain, r.a ? r.a.breakthrough : null, r.b ? r.b.breakthrough : null,
      r.a ? r.a.n : 0, r.b ? r.b.n : 0, function (v) { return WOA_REPORT.f1(v); }, null);
  }).join('') + '</div>';
  return h;
}
// lifespan needs dieT (per-death turn): a run recorded before dieT capture
// has no dieT array on ANY type (report-model.js's
// unitsAggFromEnvelopes.hasDieT distinguishes that from "no deaths this run").
// Such rows grey the WHOLE section with a note, the same convention as
// fsDiffTrack, rather than drawing a fabricated zero.
function unLifespanSection(rows, hasDieT) {
  var h = '<div style="font-size:13px;font-weight:bold;margin:16px 0 2px;">Lifespan ' +
    '<span class="small" style="font-style:italic;">(median turns alive after deploy — A above, B below)</span></div>';
  if (!hasDieT) {
    return h + '<p class="small" style="opacity:.6;">predates capture — neither run has per-unit death-turn data. Record a fresh run to see lifespan bars.</p>';
  }
  var live = rows.filter(function (r) { return (r.a && r.a.lifespan != null) || (r.b && r.b.lifespan != null); });
  if (!live.length) return h + '<p class="small">No unit deploys recorded for either run yet.</p>';
  var vals = [];
  live.forEach(function (r) { if (r.a && r.a.lifespan != null) vals.push(r.a.lifespan); if (r.b && r.b.lifespan != null) vals.push(r.b.lifespan); });
  var domain = CHART_MODEL.unLinearDomain(vals);
  h += '<div class="ov-grid">' + live.map(function (r) {
    return unLifespanRow(r.name, r.color, domain, r.a ? r.a.lifespan : null, r.b ? r.b.lifespan : null,
      r.a ? r.a.n : 0, r.b ? r.b.n : 0);
  }).join('') + '</div>';
  return h;
}
function unExchangeSection(rows) {
  var h = '<div style="font-size:13px;font-weight:bold;margin:16px 0 2px;">Exchange ' +
    '<span class="small" style="font-style:italic;">(kills per death, 1.0 = trades even)</span></div>';
  var live = rows.filter(function (r) { return (r.a && r.a.exchange != null) || (r.b && r.b.exchange != null); });
  if (!live.length) return h + '<p class="small">No unit deaths recorded for either run yet.</p>';
  var vals = [1];
  live.forEach(function (r) { if (r.a && r.a.exchange != null) vals.push(r.a.exchange); if (r.b && r.b.exchange != null) vals.push(r.b.exchange); });
  var domain = CHART_MODEL.unLinearDomain(vals);
  h += '<div class="ov-grid">' + live.map(function (r) {
    return unTrackRow(r.name, r.color, domain, r.a ? r.a.exchange : null, r.b ? r.b.exchange : null,
      r.a ? r.a.n : 0, r.b ? r.b.n : 0, function (v) { return WOA_REPORT.f1(v); }, 1.0);
  }).join('') + '</div>';
  return h;
}

/* Assembles the full Units pane from two runs' already-fetched skirmish rows
   (the SAME rowsA/rowsB shape ovRenderBody/crdRenderBody consume). */
function unRenderBody(el, rowsA, rowsB) {
  // All the pane's data-shaping is one pure call; this function only draws.
  var model = CHART_MODEL.buildUnitsModel(rowsA, rowsB);
  var rows = model.rows, hasDieT = model.hasDieT;
  rows.forEach(function (r) { r.color = unColor(r.type, r.idx); }); // theme (each type's colour is on its mark)

  var h = '<div class="un-wrap"><div class="un-grid">';
  h += '<div class="chcard"><h3>Role map</h3>' +
    '<p class="small">x = median deploy timing (normalized skirmish time) &middot; y = attacks made vs absorbed ' +
    '(top = initiates, bottom = soaks). Dot size = skirmishes fielded; A hollow dashed ghost &rarr; B solid, one colour per unit.</p>' +
    (rows.length ? chartUnitsRoleMap(rows) : '<p class="small">No unit deploys recorded for either run yet.</p>') +
    '</div>';
  h += '<div class="chcard">' + unBreakthroughSection(rows) + unLifespanSection(rows, hasDieT) + unExchangeSection(rows) + '</div>';
  h += '</div></div>';
  el.innerHTML = h;
  chBindHits(el);
}

/* Units entry point (dashboard.js's renderDashPane calls this for the
   'units' view once the shell's own file:///no-runs/no-A-B guards pass — the
   SAME guard Overview/Maps/Cards use). */
function renderUnits(el) {
  var loaded = dashLoadSkirmishRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load skirmish rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    unRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading skirmish rows for run A &amp; B&hellip;</p>';
}

dashPane({ id:'units', label:'Units', needsRuns:true, render: renderUnits });
