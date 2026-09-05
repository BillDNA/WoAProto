/* The screen's DEBUG SNAPSHOT: this exact game state, written to logs/debug/ so
   a bug can be handed over without a screenshot.

   The bundle carries battle.maps — full board and terrain defs — so it is
   self-contained. Without the local server it downloads instead. */
'use strict';

function saveDebugSnapshot(){
  var st = APP.st, v = E.view(st);
  if (!st){ toast('No skirmish in progress to snapshot.', 2500); return; }
  var note = prompt('Save a debug snapshot of the current game.\nDescribe what looks wrong (optional):', '');
  if (note === null) return; // cancelled
  var bundle = {
    savedAt: new Date().toISOString(),
    rulesVersion: E.VERSION,
    saveV: STORE_SAVE.version,
    session: sessionIdentity(),
    note: note || '',
    turn: v.turnNumber, phase: v.phase, current: v.current,
    customBattalion: !!STORE_BATTALION.read() || !!window.WOA_CUSTOM_BATTALION,
    state: st
  };
  var json = JSON.stringify(bundle, null, 1);
  var slug = String(v.mapName || 'skirmish').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  var d = new Date(), p2 = function(x){ return (x<10?'0':'')+x; };
  var stamp = d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds());
  var fname = stamp+'-'+slug+'-T'+v.turnNumber+'-'+v.phase+'.json';
  api('savedebug', { filename: fname, content: json })
    .then(function(r){ toast('Debug snapshot saved &rarr; '+(r.path || 'logs/debug/'+fname), 4200); })
    .catch(function(){ downloadDebug(fname, json); });
}

function downloadDebug(fname, json){
  var blob = new Blob([json], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded '+fname+' &mdash; run <code>node game/server.js</code> to save straight into logs/debug/.', 5600);
}
