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
  // The engine (for its UNITS table — the Units pane's type list + names).
  var ENG = (typeof window !== 'undefined' && window.Engine) ? window.Engine
    : (typeof require !== 'undefined' ? require('../engine.js') : null);

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

  /* Assemble the Cards pane's pure display model from two runs' skirmish rows
     (the SAME rowsA/rowsB shape the panes fetch). `cards` is the engine card
     list (E.CARDS) — passed in so this stays engine-global-free. Returns the
     merged per-card rows (each with a/b sub-views + name), the SPEC §2 Win%
     slice folded into those rows, the fire-time strips input (fireA/fireB), and
     the quadrant's plays->radius scaling input (maxPlays). Only cards with
     plays in A and/or B are kept; quadEligible/omitted count the SPEC §2 slice's
     coverage for the caption. */
  function buildCardsModel(rowsA, rowsB, cards) {
    var A = R.cardRunView(rowsA, cards), B = R.cardRunView(rowsB, cards);
    var rows = Object.keys(cards.reduce(function (m, c) { m[c.id] = 1; return m; }, {})).map(function (id) {
      return { id: id, name: (A.byId[id] || B.byId[id]).name, a: A.byId[id] || null, b: B.byId[id] || null };
    }).filter(function (r) { return (r.a && r.a.plays) || (r.b && r.b.plays); });
    var quadEligible = rows.filter(function (r) { return (r.a && r.a.winHq != null) || (r.b && r.b.winHq != null); }).length;
    var omitted = rows.length - quadEligible;
    var maxPlays = 1;
    rows.forEach(function (r) { var p = Math.max(r.a ? r.a.plays : 0, r.b ? r.b.plays : 0); if (p > maxPlays) maxPlays = p; });
    return {
      rows: rows, quadEligible: quadEligible, omitted: omitted, maxPlays: maxPlays,
      fireA: R.cardFleetFireTimes(A.envs), fireB: R.cardFleetFireTimes(B.envs)
    };
  }

  /* ===== Units pane ===== */

  // Fixed [0, niceMax] domain for a linear (non-percentage) track — breakthrough
  // (attacks/skirmish) and exchange (kill/death ratio) are open-ended small
  // numbers, not 0-100%, so this is "whatever the real A/B values need, +15%
  // headroom". Positioning math, so it lives here beside the model builder.
  function unLinearDomain(vals) {
    var hi = 1;
    vals.forEach(function (v) { if (v != null && v > hi) hi = v; });
    return { lo: 0, hi: hi * 1.15 };
  }
  function unPos(domain, v) { return v == null ? null : Math.max(0, Math.min(100, (v - domain.lo) / (domain.hi - domain.lo) * 100)); }

  /* Assemble the Units pane's per-type rows from two runs' skirmish rows (the
     SAME rowsA/rowsB shape the panes fetch). One row per unit type that either
     run actually fielded, in ENG.UNITS order, carrying each run's per-type fold
     (n/depMedian/roleY/breakthrough/exchange/lifespan). idx is the type's index
     in the full ENG.UNITS list, so the renderer can theme it (colour is a
     palette concern, kept in charts.js). hasDieT is the fleet-wide lifespan
     gate. Pure — no document, no CHART. */
  function buildUnitsModel(rowsA, rowsB) {
    var A = R.unitsAggFromRows(rowsA), B = R.unitsAggFromRows(rowsB);
    var typeKeys = Object.keys(ENG.UNITS);
    var rows = typeKeys.map(function (t, i) {
      return { type: t, idx: i, name: ENG.UNITS[t].name, a: A.types[t] || null, b: B.types[t] || null };
    }).filter(function (r) { return (r.a && r.a.n) || (r.b && r.b.n); });
    return { rows: rows, hasDieT: !!(A.hasDieT || B.hasDieT) };
  }

  return { buildMapDrillModel: buildMapDrillModel, buildCardsModel: buildCardsModel,
    buildUnitsModel: buildUnitsModel, unLinearDomain: unLinearDomain, unPos: unPos };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CHART_MODEL;
