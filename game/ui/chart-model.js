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

  return { buildMapDrillModel: buildMapDrillModel };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CHART_MODEL;
