/* War of Attrition — ui part: networking (LAN rooms) + whose-input-is-live.
   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). api()/canNet live in ui/app.js; the Host/Join button
   wiring lives in ui/boot.js. Extracted verbatim from index.html's inline
   app script. */
'use strict';

/* =================== networking (LAN) =================== */

function pushState(){
  if (APP.mode !== 'net') return;
  APP.net.seq++;
  var seq = APP.net.seq;
  api('push', { room: APP.net.room, seq: seq, state: APP.st }).then(function(d){
    if (d.conflict){ APP.net.seq = d.seq; APP.st = d.state; renderAll(); if(APP.st.phase==='battle-over') showBattleOver(); }
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
        if (APP.st.phase==='battle-over') showBattleOver();
      }).catch(function(){});
  }, 1000);
}

/* =================== whose input is live? =================== */
function inputLive(){
  if (!APP.st || APP.st.phase === 'battle-over' || APP.ui.busy) return false;
  if (APP.mode === 'watch') return false; // spectating
  if (APP.mode === 'ai') return APP.st.current === APP.mySide;
  if (APP.mode === 'net') return APP.st.current === APP.mySide;
  return true; // hotseat
}
function viewSide(){
  if (APP.mode === 'hotseat' || APP.mode === 'watch') return APP.st.current;
  return APP.mySide;
}
