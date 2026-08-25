/* War of Attrition — ui part: pure display-model builders for the dashboard
   drill-down panes. Data in (already-fetched skirmish rows), plain display
   model out — NO document, NO fetch, NO APP/DASH. charts.js renders whatever
   this returns; node tests require() it directly (game/test.js). Dual-export
   (browser global + module.exports), the SAME pattern as report-model.js. */
'use strict';

var CHART_MODEL = (function () {
  // Resolve the report model the dual way report-model.js resolves the engine.
  var R = (typeof window !== 'undefined' && window.WOA_REPORT) ? window.WOA_REPORT
    : (typeof require !== 'undefined' ? require('../report-model.js') : null);

  /* Assemble the Map drill-down's pure display model from two runs' skirmish
     rows (the SAME rowsA/rowsB shape the panes fetch). focusMap is the caller's
     current focus and MAY be null or stale; the resolved map comes back as
     .mapName so the caller can persist it — this builder never touches DASH.
     abMode is the A|B|A/B toggle: 'A' run A solid, 'B' (default) run B solid,
     'AB' run B solid with run A as a ghost. Returns null when neither run has
     any rows (caller renders "no rows"). */
  function buildMapDrillModel(rowsA, rowsB, focusMap, abMode) {
    rowsA = rowsA || []; rowsB = rowsB || [];
    var names = {};
    rowsA.forEach(function (r) { names[r.map] = 1; });
    rowsB.forEach(function (r) { names[r.map] = 1; });
    var mapList = Object.keys(names).sort();
    if (!mapList.length) return null;
    var mapName = (focusMap && mapList.indexOf(focusMap) >= 0) ? focusMap : mapList[0];
    var idx = mapList.indexOf(mapName);

    var mapRowsA = rowsA.filter(function (r) { return r.map === mapName; });
    var mapRowsB = rowsB.filter(function (r) { return r.map === mapName; });
    var aggA = R.foldSkirmishes(mapRowsA), aggB = R.foldSkirmishes(mapRowsB);
    var scoreA = mapRowsA.length ? R.balanceScore(aggA.agg, aggA.done) : null;
    var scoreB = mapRowsB.length ? R.balanceScore(aggB.agg, aggB.done) : null;
    var regressed = scoreA != null && scoreB != null && scoreB > scoreA;

    var envA = R.envelopesForMap(rowsA, mapName), envB = R.envelopesForMap(rowsB, mapName);

    // Resolve the A|B|A/B toggle once, here — render draws whatever solid/ghost
    // say. The tempo lanes + |VP-diff| track follow the toggle.
    var solidEnv = abMode === 'A' ? envA : envB, solidLabel = abMode === 'A' ? 'A' : 'B';
    var ghostEnv = abMode === 'AB' ? envA : null;
    var tempo = {
      solidEnv: solidEnv, ghostEnv: ghostEnv, solidLabel: solidLabel,
      laneSolid: R.laneAvg(solidEnv), laneGhost: ghostEnv ? R.laneAvg(ghostEnv) : null,
      vdSolid: R.vpDiffAvg(solidEnv), vdGhost: ghostEnv ? R.vpDiffAvg(ghostEnv) : null
    };

    // Hex lenses follow the toggle too, but the hover always shows A→B, so keep
    // both runs' folds alongside the toggle-resolved solid/ghost pair.
    var foldA = R.foldHexLenses(envA), foldB = R.foldHexLenses(envB);
    var hex = {
      foldA: foldA, foldB: foldB,
      solid: abMode === 'A' ? foldA : foldB,
      ghost: abMode === 'AB' ? foldA : null,
      solidLabel: solidLabel
    };

    return {
      mapList: mapList, idx: idx, mapName: mapName,
      aggA: aggA, aggB: aggB, scoreA: scoreA, scoreB: scoreB, regressed: regressed,
      envA: envA, envB: envB, tempo: tempo, hex: hex
    };
  }

  /* ===== Overview pane (WOA-035) shape-model =====
     THE QUESTION: what regressed, run A -> run B? This assembles the whole
     Overview display model from two runs' skirmish rows; charts.js only draws
     it. Pure — no document/fetch/DASH. */

  // metrics whose val() returns a 0-100 percentage (drag/swings are raw counts).
  // WOA-039: attackShare/swapShare are % of all actions taken.
  var OV_PERCENT_KEYS = { red: 1, first: 1, hq: 1, zeroKill: 1, tie: 1, control: 1, firstBlood: 1, attackShare: 1, swapShare: 1 };

  function ovFmt(key, v) {
    if (v == null) return 'n/a';
    return OV_PERCENT_KEYS[key] ? Math.round(v) + '%' : R.f1(v);
  }

  /* Fixed display domain for a band row's track — sized off the WIDEST (T2)
     band plus 25% padding, extended further if a real A/B value falls outside
     it, so the dots are never clipped. Domain stays the SAME across a
     temperature-selector re-render (only which tiers get DRAWN changes) so a
     dot's x position never jumps when you retemper. */
  function ovTrackDomain(row, valA, valB) {
    var b2 = R.bands(row.key, 'T2');
    var vals = [];
    if (valA != null) vals.push(valA);
    if (valB != null) vals.push(valB);
    var lo = b2.lo, hi = b2.hi;
    if (lo == null) lo = vals.length ? Math.min.apply(null, vals) : (hi != null ? hi - 1 : 0);
    if (hi == null) hi = vals.length ? Math.max.apply(null, vals) : lo + 1;
    vals.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    if (hi <= lo) hi = lo + 1;
    var pad = (hi - lo) * 0.25;
    var dLo = lo - pad, dHi = hi + pad;
    if (OV_PERCENT_KEYS[row.key]) { dLo = Math.max(0, dLo); dHi = Math.min(100, dHi); if (dHi <= dLo) dHi = dLo + 1; }
    else dLo = Math.max(0, dLo);
    return { lo: dLo, hi: dHi };
  }
  function ovPos(domain, v) {
    if (v == null) return null;
    return Math.max(0, Math.min(100, (v - domain.lo) / (domain.hi - domain.lo) * 100));
  }

  // A 6-bin histogram over [0,1] of one run's deploy-interleave values.
  function ovHist(vals, nbins) {
    var h = [];
    for (var i = 0; i < nbins; i++) h.push(0);
    vals.forEach(function (v) { h[Math.min(nbins - 1, Math.max(0, Math.floor(v * nbins)))]++; });
    return h;
  }
  function ovAvg(arr) { return arr.length ? arr.reduce(function (s, v) { return s + v; }, 0) / arr.length : 0; }

  /* Fleet-wide pacing fold (1e minis): deploy interleave (6-bin histogram,
     A vs B, sharing one max-share axis) and settle point (sorted CDF inputs +
     medians). Both fold WOA_REPORT per-skirmish envelope folds across every
     skirmish; the drawing (bars/svg/colors) stays in charts.js. */
  function ovPacing(rowsA, rowsB) {
    var envA = (rowsA || []).map(R.envelopeFromRow).filter(function (e) { return !!e; });
    var envB = (rowsB || []).map(R.envelopeFromRow).filter(function (e) { return !!e; });
    var interA = envA.map(R.deployInterleave), interB = envB.map(R.deployInterleave);
    var settleA = envA.map(R.settlePoint).sort(function (a, b) { return a - b; });
    var settleB = envB.map(R.settlePoint).sort(function (a, b) { return a - b; });
    var NBINS = 6, hA = ovHist(interA, NBINS), hB = ovHist(interB, NBINS);
    // Per-bin shares (0 when a run has no skirmishes) — the draw reads these; the
    // formula (count / run total) lives ONLY here so the two can't drift.
    var shareA = [], shareB = [], maxShare = 0.0001;
    for (var i = 0; i < NBINS; i++) {
      var sa = interA.length ? hA[i] / interA.length : 0, sb = interB.length ? hB[i] / interB.length : 0;
      shareA.push(sa); shareB.push(sb);
      if (sa > maxShare) maxShare = sa; if (sb > maxShare) maxShare = sb;
    }
    return {
      interleave: { nbins: NBINS, hA: hA, hB: hB, shareA: shareA, shareB: shareB, nA: interA.length, nB: interB.length, avgA: ovAvg(interA), avgB: ovAvg(interB), maxShare: maxShare },
      settle: { settleA: settleA, settleB: settleB, medianA: R.quantile(settleA, 0.5), medianB: R.quantile(settleB, 0.5) }
    };
  }

  /* Assemble the Overview pane's display model from two runs' skirmish rows.
     aggA/aggB are the fleet-wide DB-rows folds; scoredRows/guardRows are the
     BANDS slices the board draws; verdict.breaches are the scored rows run B
     breaches at the selected temperature (small-n excluded, SPEC §8);
     dumbbells is the per-map balance-score fold; pacing is the 1e minis fold.
     Pure — the caller (charts.js) draws band rows through the shared
     ovBandRowHtml, which reads ovTrackDomain/ovPos from here. */
  function buildOverviewModel(rowsA, rowsB, temperature) {
    var aggA = R.foldSkirmishes(rowsA), aggB = R.foldSkirmishes(rowsB);
    var scoredRows = R.BANDS.filter(function (b) { return b.feedsScore; });
    var guardRows = R.BANDS.filter(function (b) { return !b.feedsScore; });
    var breaches = [];
    scoredRows.forEach(function (row) {
      var valB = row.val(aggB.agg, aggB.done);
      if (valB == null) return;
      var n = Math.min(R.bandN(row, aggA.agg, aggA.done), R.bandN(row, aggB.agg, aggB.done));
      if (R.smallN(n, 'fleet')) return;
      var sel = R.bands(row.key, temperature);
      if ((sel.lo != null && valB < sel.lo) || (sel.hi != null && valB > sel.hi))
        breaches.push({ key: row.key, label: row.label, val: ovFmt(row.key, valB) });
    });
    return {
      aggA: aggA, aggB: aggB, scoredRows: scoredRows, guardRows: guardRows, temperature: temperature,
      verdict: { breaches: breaches, temperature: temperature },
      dumbbells: R.mapScoreDumbbells(rowsA, rowsB),
      pacing: ovPacing(rowsA, rowsB)
    };
  }

  return { buildMapDrillModel: buildMapDrillModel, buildOverviewModel: buildOverviewModel,
    ovFmt: ovFmt, ovTrackDomain: ovTrackDomain, ovPos: ovPos, OV_PERCENT_KEYS: OV_PERCENT_KEYS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CHART_MODEL;
