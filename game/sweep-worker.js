/* War of Attrition — Balance Dashboard sweep worker.

   Runs one map's AI-vs-AI skirmishes off the main thread and streams each
   finished engine state back. The dashboard (ui/boot.js) folds + persists on the
   MAIN thread through the SAME WOA_SIM code path as the serial sweep — so
   aggregates stay byte-identical and there is one persistence implementation.
   This file is a thin engine runner: the heavy work (playToEnd + AI planning)
   is what moves off the UI thread.

   Classic worker (importScripts, no modules) — the game/ no-bundler constraint.
   Content loads via WOA_CONTENT_MANIFEST: content/manifest.js sets that global
   for every environment but only document.write()s the <script> tags on a page
   (a worker has no document), so here we importScripts the listed files. The
   active-battalion override lives in the page's localStorage, which a worker
   cannot read — the page resolves it and passes the card list in `init`. */
'use strict';

var READY = false;

// The page's chain, minus what a worker has no use for (no DOM, no UI). The
// engine parts come from load-order.js, so this cannot drift out of step with
// the page's engine.
function loadEngine(appliedBattalion) {
  importScripts('load-order.js');           // sets self.WOA_LOAD_ORDER (no document.write here)
  importScripts('maps.js');                 // WOA_BUILTIN (units / shapes / stock / ai rows)
  importScripts('content/manifest.js');     // sets self.WOA_CONTENT_MANIFEST (no document.write here)
  importScripts('applied-battalion.js');    // WOA_APPLY_BATTALION (resolution is page-only)
  var files = self.WOA_CONTENT_MANIFEST || {};
  // Load every kind the manifest lists (kinds.js is its source of truth), so a
  // new content kind never leaves a stale hardcoded list behind here.
  Object.keys(files).forEach(function (kind) {
    (files[kind] || []).forEach(function (f) { importScripts('content/' + kind + '/' + f); });
  });
  // A worker cannot read the page's localStorage, so the page resolves the
  // override and hands the winner over; the rule itself lives in one place.
  self.WOA_APPLY_BATTALION(appliedBattalion);
  self.WOA_LOAD_ORDER.ENGINE.forEach(function (src) { importScripts(src); });
  importScripts('sim.js');                  // WOA_SIM (folds on the main thread; here just simSkirmish)
  READY = true;
}

onmessage = function (e) {
  var msg = e.data || {};

  if (msg.type === 'init') {
    try { loadEngine(msg.appliedBattalion); postMessage({ type: 'ready' }); }
    catch (err) { postMessage({ type: 'error', error: String((err && err.message) || err) }); }
    return;
  }

  if (msg.type === 'run') {
    // One task = one map's whole n-skirmish sweep, in seed order 0..n-1 (the
    // same order the serial loop folds), so the main thread's per-map fold is
    // byte-identical. seedBase is the per-map (mapIndex+1)*7919 the page passes.
    var t = msg.task;
    try {
      for (var g = 0; g < t.n; g++) {
        var fp = WOA_SIM.balanceFP(g);
        var st = WOA_SIM.simSkirmish(t.map, WOA_SIM.balanceSeed(t.seedBase, g), fp, t.dr, t.db);
        // battle is the identity handle (a structured-clone cycle the page does
        // not need); view()/persistence read st.seed + st.flow, never st.battle.
        st.battle = null;
        postMessage({ type: 'skirmish', mapIndex: t.mapIndex, g: g, fp: fp, st: st });
      }
      postMessage({ type: 'done', mapIndex: t.mapIndex });
    } catch (err) {
      postMessage({ type: 'error', mapIndex: t.mapIndex, error: String((err && err.message) || err) });
    }
    return;
  }
};
