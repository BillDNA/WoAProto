/* The SKIRMISH SCREEN: the place a battle is fought.

   The door. This file owns the screen's shape — the repaint, the win card and
   the controls that belong to no region — and nothing else. Which regions exist
   is each region's own room in regions/, in load order; who paints one is the
   household it names. The turn, the board and the session are houses of their
   own; the screen is where they are laid out. Prose: skirmish.md.

   The repaint is still a repaint of everything. The region list makes a
   narrower one possible; choosing one is a rules-of-redraw question with no
   test behind it yet, so it is not made here. */
'use strict';

function renderAll(){
  if (APP.st){
    // a resumed/joined skirmish on an edited outline must re-register its shape
    var v = E.view(APP.st);
    var mm = v.battle && v.battle.maps && v.battle.maps[v.mapIndex];
    if (mm && mm.shapeDef) E.ensureMapShape(mm);
    E.setBoard(v.boardShape);
  }
  ensureSnapshot();
  ensureCommanderRuntime(); // the panel derives from st.commanders every render — no seat is left un-synced
  commanderTurnSync();
  regionsPaint();
  regionsSync();
}

function showSkirmishOver(){
  var st = APP.st, v = E.view(st);
  modalOpen('skirmish', { st: st, v: v, m: v.battle });
}

// The screen's own controls: the debug snapshot, the topbar's Concede — whose
// action belongs to the turn — and leaving the screen. Each rail mirror wires
// its own floating button, in its room.
function initSkirmishScreen(){
  regionsInit();
  $('btnDebug').onclick = saveDebugSnapshot;
  $('btnConcede').onclick = concedeAsk;
  $('btnQuit').onclick = returnToMenu;
}
