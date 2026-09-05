/* The dashboard's SKIRMISH-ROW CACHE: the two runs every A/B pane compares.

   Every A/B-comparing pane (Overview / Maps / Cards / Units) reads the SAME two
   runs' full skirmish sets, so ONE fetch serves them all, keyed "runA|runB".
   Switching pills, retempering, or flipping the A|B|A/B toggle never refetches. */
'use strict';

var SKIRMISH_CACHE = { key: null, rowsA: null, rowsB: null };
// Cache hit -> onReady(rowsA, rowsB) synchronously, returns true (caller skips
// its own loading paint). Miss -> fetches both runs, returns false (caller
// paints its own "Loading..."), then onReady once both resolve; a key re-check
// guards a race where DASH.runA/runB changed mid-flight. onReady(null, null) on
// a fetch failure (no server or a network hiccup).
function dashLoadSkirmishRows(onReady) {
  var key = DASH.runA + '|' + DASH.runB;
  if (SKIRMISH_CACHE.key === key) { onReady(SKIRMISH_CACHE.rowsA, SKIRMISH_CACHE.rowsB); return true; }
  Promise.all([
    fetch('/api/skirmishes?run=' + DASH.runA).then(function (r) { return r.ok ? r.json() : []; }),
    fetch('/api/skirmishes?run=' + DASH.runB).then(function (r) { return r.ok ? r.json() : []; })
  ]).then(function (res) {
    SKIRMISH_CACHE = { key: key, rowsA: res[0] || [], rowsB: res[1] || [] };
    if (DASH.runA + '|' + DASH.runB === key) onReady(SKIRMISH_CACHE.rowsA, SKIRMISH_CACHE.rowsB);
  }).catch(function () { onReady(null, null); });
  return false;
}
