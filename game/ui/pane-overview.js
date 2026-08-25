/* War of Attrition — ui part: the Balance Dashboard's OVERVIEW pane (WOA-035,
   design 4a/1c/1f/1e). THE QUESTION: what regressed, run A -> run B? Reads BOTH
   runs' skirmish rows from GET /api/skirmishes?run=<id> (fetched once per A/B
   pair and cached — SKIRMISH_CACHE in ui/net.js, shared with the Maps
   drill-down so switching pills never refetches), folds them through
   WOA_REPORT.foldSkirmishes (report-model.js — the ONE DB-rows -> agg fold),
   then draws: a verdict banner, the triage band board (1c), the per-map
   balance-score dumbbells (1f), and two fleet-wide pacing minis (1e).

   Render-only: all shaping is CHART_MODEL.buildOverviewModel (ui/chart-model.js).
   Draws over the shared toolkit in ui/chart-primitives.js — the band-board row
   renderer (ovBandRect/ovDot/ovBandRowHtml, shared with the Maps pane), the
   settle-curve svg (chSettleSvg), and the .chtip/ch-hit hover layer (chBindHits)
   all live there. Plain divs by string concat, matching the design canvas's OWN
   technique for 1c/1f/4a (not SVG). */
'use strict';
/* Verdict banner: named links for every SCORED band row run B breaches at the
   selected temperature (small-n rows excluded, SPEC §8 — the breach set is
   computed in buildOverviewModel; this only draws it). Cheapest honest click
   target: scroll the matching band-board row into view and flash it. */
function ovVerdictBanner(verdict) {
  var breaches = verdict.breaches, temperature = verdict.temperature;
  var h = '<div class="ov-verdict">';
  if (!breaches.length) {
    h += '<b>Verdict: no breaches at ' + temperature + '.</b> Run B holds every scored band at this temperature.';
  } else {
    h += '<b>Verdict: ' + breaches.length + ' breach' + (breaches.length === 1 ? '' : 'es') + ' at ' + temperature + '.</b> ' +
      breaches.map(function (b) { return '<a class="ov-breach-link" data-key="' + b.key + '">' + chEsc(b.label) + ' ' + b.val + ' ↗</a>'; }).join(' &middot; ') +
      ' <span class="small" style="font-style:italic;">breaches link to the band-board row below</span>';
  }
  return h + '</div>';
}

/* Balance-score-by-map dumbbells (design 1f): one row per map, 0-20 display
   scale (clamped; the real score always prints regardless), sorted worst-first
   on B (the eye lands on the regression). The rows are the folded
   WOA_REPORT.mapScoreDumbbells output (via buildOverviewModel); this only
   draws. Row click sets DASH.mapFocus + switches to the Maps pill. */
function ovMapDumbbells(rows) {
  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:8px;">Balance score by map, A&rarr;B ' +
    '<span class="small" style="font-style:italic;">(0&ndash;20 scale, sorted worst-first on B)</span></div>';
  if (!rows.length) return h + '<p class="small">No per-map skirmish rows for either run yet.</p>';
  h += '<div class="ov-grid" style="grid-template-columns:92px 1fr 92px;">';
  rows.forEach(function (r) {
    var posA = r.scoreA == null ? null : Math.max(0, Math.min(100, r.scoreA / 20 * 100));
    var posB = r.scoreB == null ? null : Math.max(0, Math.min(100, r.scoreB / 20 * 100));
    var regressed = posA != null && posB != null && r.scoreB > r.scoreA;
    var improved = posA != null && posB != null && r.scoreB < r.scoreA;
    var connColor = regressed ? CHART.regress : (improved ? CHART.improve : '#d8caa2');
    var bFill = regressed ? CHART.breach : (improved ? CHART.improveDot : CHART.ink);
    var connLeft = 0, connWidth = 0;
    if (posA != null && posB != null) { connLeft = Math.min(posA, posB); connWidth = Math.abs(posB - posA); }
    var inner = '<div style="position:absolute;top:8px;left:0;right:0;height:2px;background:#d8caa2;"></div>' +
      (posA != null && posB != null ? '<div style="position:absolute;top:8px;height:2px;left:' + connLeft.toFixed(1) +
        '%;width:' + connWidth.toFixed(1) + '%;background:' + connColor + ';"></div>' : '') +
      (posA != null ? '<div style="position:absolute;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid ' +
        CHART.inkSoft + ';background:' + CHART.runADot + ';left:calc(' + posA.toFixed(1) + '% - 6px);"></div>' : '') +
      (posB != null ? '<div style="position:absolute;top:4px;width:11px;height:11px;border-radius:50%;background:' +
        bFill + ';left:calc(' + posB.toFixed(1) + '% - 5px);"></div>' : '');
    var valText = (r.scoreA == null ? '—' : WOA_REPORT.f1(r.scoreA)) + ' → ' + (r.scoreB == null ? '—' : WOA_REPORT.f1(r.scoreB));
    var tip = [['run A score', r.scoreA == null ? 'n/a' : WOA_REPORT.f1(r.scoreA) + ' (n=' + r.doneA + ')'],
      ['run B score', r.scoreB == null ? 'n/a' : WOA_REPORT.f1(r.scoreB) + ' (n=' + r.doneB + ')']];
    var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:pointer;"' + chTipAttrs(r.map, tip) + '></div>';
    var dm = ' data-map="' + chEsc(r.map) + '"';
    h += '<div' + dm + ' class="ov-lbl ov-map-row">' + chEsc(r.map) + '</div>' +
      '<div' + dm + ' class="ov-map-row" style="position:relative;height:18px;">' + inner + hit + '</div>' +
      '<div' + dm + ' class="ov-val ov-map-row" style="' + (regressed ? 'color:' + CHART.breach + ';' : '') + '">' + valText + '</div>';
  });
  h += '</div><p class="small" style="margin-top:8px;">Click a row to jump to that map on the Maps pill.</p>';
  return h;
}

/* Pacing minis (design 1e, simplified per the mockup 4a fidelity note): deploy
   interleave (6-bin histogram) and settle point (CDF). The folds live in
   buildOverviewModel (CHART_MODEL.ovPacing); this only draws pacing's numbers,
   run A hollow/dashed vs B solid. */
function ovPacingMinis(pacing) {
  var iv = pacing.interleave, st = pacing.settle;
  var NBINS = iv.nbins, nA = iv.nA, nB = iv.nB, maxShare = iv.maxShare;

  // ---- deploy interleave: 6-bin histogram over [0,1], A hollow / B solid ----
  var bars = '<div style="display:flex;gap:6px;align-items:flex-end;height:52px;border-bottom:1.5px solid #b9a878;padding:0 2px;">';
  for (var i = 0; i < NBINS; i++) {
    var haH = Math.max(1, Math.round(iv.shareA[i] / maxShare * 46)), hbH = Math.max(1, Math.round(iv.shareB[i] / maxShare * 46));
    bars += '<div style="flex:1;display:flex;gap:2px;align-items:flex-end;height:100%;">' +
      '<div style="flex:1;height:' + (nA ? haH : 0) + 'px;border:1.5px solid ' + CHART.inkSoft + ';box-sizing:border-box;"></div>' +
      '<div style="flex:1;height:' + (nB ? hbH : 0) + 'px;background:#77582e;"></div></div>';
  }
  bars += '</div><div style="display:flex;justify-content:space-between;font-size:10px;color:#75643f;margin-top:3px;font-style:italic;"><span>all up-front</span><span>all after contact</span></div>';
  var interMini = '<div class="ov-mini"><h4>deploy interleave <b>' + Math.round(iv.avgA * 100) + '%→' + Math.round(iv.avgB * 100) +
    '%</b></h4>' + bars + '<p class="small" style="margin:6px 0 0;">share of each skirmish&rsquo;s deploys landing before vs after first contact &mdash; A ' +
    nA + ' skirmishes (hollow), B ' + nB + ' (solid)</p></div>';

  // ---- settle curve: CDF of settlePoint, A dashed / B solid (WOA-040: the
  // svg-building moved to the shared chSettleSvg — same numbers, one impl) ----
  var W = 200, H = 64;
  var svg = chSettleSvg(st.settleA, st.settleB, W, H);
  var settleMini = '<div class="ov-mini"><h4>median settle <b>' + Math.round(st.medianA) + '%→' +
    Math.round(st.medianB) + '%</b></h4>' + svg +
    '<p class="small" style="margin:6px 0 0;">% of skirmishes whose field-score lead has stopped flipping, by % of skirmish length &mdash; A dashed, B solid</p></div>';

  return '<div style="font-size:13px;font-weight:bold;margin:16px 0 8px;">Pacing, fleet-wide <span class="small" style="font-style:italic;">(1e minis)</span></div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;">' + interMini + settleMini + '</div>';
}

/* Assembles the full Overview pane from two runs' already-fetched skirmish
   rows (rowsA/rowsB — GET /api/skirmishes?run=<id> arrays) and wires clicks. */
function ovRenderBody(el, rowsA, rowsB) {
  // All the pane's data-shaping is one pure call; this function only draws.
  var temp = DASH.temperature;
  var model = CHART_MODEL.buildOverviewModel(rowsA, rowsB, temp);
  var aggA = model.aggA, aggB = model.aggB, scoredRows = model.scoredRows, guardRows = model.guardRows;

  var h = '<div class="ov-wrap">' + ovVerdictBanner(model.verdict) + '<div class="ov-cols">';
  h += '<div class="ov-col-l">' +
    '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Scored metrics vs band ' +
    '<span class="small" style="font-style:italic;">(all maps folded &mdash; A n=' + aggA.done + ', B n=' + aggB.done + ')</span></div>' +
    '<p class="small" style="margin:2px 0 10px;">Shaded band = the active tier (' + temp + '); the temperature selector above widens or narrows it.</p>' +
    '<div class="ov-legend">' +
      '<span><span class="dot" style="width:10px;height:10px;border:2px solid ' + CHART.ink + ';background:' + CHART.runADot + ';box-sizing:border-box;"></span>run A</span>' +
      '<span><span class="dot" style="background:' + CHART.ink + ';"></span>run B in-band</span>' +
      '<span><span class="dot" style="background:' + CHART.breach + ';"></span>run B outside ' + temp + '</span>' +
    '</div>' +
    '<div class="ov-grid">' + scoredRows.map(function (row) { return ovBandRowHtml(row, aggA, aggB, temp); }).join('') + '</div>' +
    '<div style="font-size:11px;font-weight:bold;margin:14px 0 6px;color:#75643f;">Guards <span class="small" style="font-style:italic;">(shaded, not scored)</span></div>' +
    '<div class="ov-grid">' + guardRows.map(function (row) { return ovBandRowHtml(row, aggA, aggB, temp); }).join('') + '</div>' +
  '</div>';
  h += '<div class="ov-col-r">' + ovMapDumbbells(model.dumbbells) + ovPacingMinis(model.pacing) + '</div>';
  h += '</div></div>';
  el.innerHTML = h;

  el.querySelectorAll('.ov-breach-link').forEach(function (a) {
    a.onclick = function () {
      var rows = el.querySelectorAll('[data-rowkey="' + a.getAttribute('data-key') + '"]');
      if (!rows.length) return;
      rows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows.forEach(function (r) { r.classList.add('ov-flash'); });
      setTimeout(function () { rows.forEach(function (r) { r.classList.remove('ov-flash'); }); }, 1200);
    };
  });
  el.querySelectorAll('.ov-map-row').forEach(function (row) {
    row.addEventListener('click', function () {
      DASH.mapFocus = row.getAttribute('data-map');
      DASH.view = 'maps';
      renderDash();
    });
  });
  chBindHits(el);
}

/* Overview entry point (dashboard.js's renderDashPane calls this for the
   'overview' view once the shell's own file:///no-runs/no-A-B guards pass). */
function renderOverview(el) {
  var loaded = dashLoadSkirmishRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load skirmish rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    ovRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading skirmish rows for run A &amp; B&hellip;</p>';
}
