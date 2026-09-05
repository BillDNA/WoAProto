/* Save and resume: the skirmish picked back up on a later visit.

   One room of the session house over STORE_SAVE — a seat that does not persist
   (LAN, whose truth is on the wire) writes nothing, and a save from an older
   record version is discarded by the store rather than crashing the resume. */
'use strict';

function saveLocal(){
  if (!APP.st || !seatPersists()) return;
  STORE_SAVE.write({ mode: APP.mode, mySide: APP.mySide, diff: APP.diff, st: APP.st });
}
function clearSave(){ STORE_SAVE.clear(); }

// The front door offers Resume only when there is a loadable save.
function checkResume(){
  var b = $('btnResume');
  if (b) b.style.display = STORE_SAVE.has() ? '' : 'none';
}

function resumeSaved(){
  var d = STORE_SAVE.read();
  if (!d){ clearSave(); checkResume(); return; }
  try {
    APP.mode = d.mode; APP.mySide = d.mySide; APP.diff = d.diff; APP.st = d.st;
    $('diffSel').value = d.diff || 'normal';
    APP.ui = { sel:null, stage:null, busy:false, handoffPending: seatGatesHand() };
    syncCommandersFromState(); // a resumed battle re-seeds the Commander panel from its saved state
    show('game'); renderAll();
    if (E.view(APP.st).phase === 'skirmish-over') showSkirmishOver();
    else seatBeginTurn();
  } catch(e){ clearSave(); checkResume(); }
}
