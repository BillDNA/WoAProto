/* War of Attrition — ui part: networking (LAN rooms) + whose-input-is-live.
   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). api() lives in ui/app.js; the Host/Join button
   wiring lives in ui/boot.js. Extracted verbatim from index.html's inline
   app script. */
'use strict';

/* =================== networking (LAN) =================== */

function pushState(){
  if (APP.mode !== 'net') return;
  APP.net.seq++;
  var seq = APP.net.seq;
  api('push', { room: APP.net.room, seq: seq, state: APP.st }).then(function(d){
    if (d.conflict){ APP.net.seq = d.seq; APP.st = d.state; renderAll(); if(E.view(APP.st).phase==='skirmish-over') showSkirmishOver(); }
  }).catch(function(){ APP.net.seq = seq-1; toast('Connection hiccup — retrying on next move.', 2500); });
}
function startPolling(){
  if (APP.net.poller) clearInterval(APP.net.poller);
  APP.net.poller = setInterval(function(){
    if (APP.mode !== 'net') return;
    fetch('/api/poll?room='+APP.net.room+'&seq='+APP.net.seq)
      .then(function(r){ return r.status===200 ? r.json() : null; })
      .then(function(d){
        if (!d) return;
        APP.net.seq = d.seq; APP.st = d.state;
        APP.ui = { sel:null, stage:null, busy:false };
        renderAll();
        if (E.view(APP.st).phase==='skirmish-over') showSkirmishOver();
      }).catch(function(){});
  }, 1000);
}

/* =================== whose input is live? =================== */
function inputLive(){
  if (!APP.st || E.view(APP.st).phase === 'skirmish-over' || APP.ui.busy) return false;
  if (APP.mode === 'watch') return false; // spectating
  if (APP.mode === 'ai') return E.view(APP.st).current === APP.mySide;
  if (APP.mode === 'net') return E.view(APP.st).current === APP.mySide;
  return true; // hotseat
}
function viewSide(){
  if (APP.mode === 'hotseat' || APP.mode === 'watch') return E.view(APP.st).current;
  return APP.mySide;
}

/* =================== dashboard: shared A/B skirmish-row fetch =================== */
// Every A/B-comparing pane (Overview / Maps / Cards / Units) reads the SAME two
// runs' full skirmish sets (GET /api/skirmishes?run=<id> has no map param), so
// ONE cache/fetch serves them all, keyed "runA|runB". Switching pills,
// retempering, or flipping the A|B|A/B toggle never refetches.
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
