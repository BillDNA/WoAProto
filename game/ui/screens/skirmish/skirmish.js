/* The SKIRMISH SCREEN: the place a battle is fought.

   The door. This file owns the screen's shape — which regions it has, which
   household paints each one, and the order they repaint in — and nothing else.
   The turn, the board and the session are houses of their own; the screen is
   where they are laid out. Prose: skirmish.md.

   The repaint is still a repaint of everything. The region list makes a
   narrower one possible; choosing one is a rules-of-redraw question with no
   test behind it yet, so it is not made here. */
'use strict';

uiRegion({ id:'topbar',  el:'topbar',    paint: function(){ renderTop(); } });
uiRegion({ id:'mats',    el:'leftcol',   paint: function(){ renderMat('red'); renderMat('blue'); },
  mirror: { modal:'mats', body:'matsOvrBody', wire: function(body){
    // the mirrored spent-track is CSS-hidden on small screens; that's fine — the
    // Cards glossary carries the full read
    var sp = body.querySelector('.spent'); if (sp) sp.onclick = showCards;
  } } });
uiRegion({ id:'board',   el:'boardwrap', paint: function(){ renderBoard(); } });
uiRegion({ id:'hand',    el:'hand',      paint: function(){ renderHand(); } });
uiRegion({ id:'prompt',  el:'promptbar', paint: function(){ renderPrompt(); } });
uiRegion({ id:'journal', el:'log',       paint: function(){ renderLog(); },
  mirror: { modal:'journal', body:'journalOvrBody',
    strip: '.jhead',                       // the modal already carries a header plate
    wire: function(body){
      body.scrollTop = body.scrollHeight;  // newest entry in view
      body.onclick = function(ev){
        var t = ev.target;
        while (t && t !== body && !(t.classList && t.classList.contains('jturn'))) t = t.parentNode;
        if (t && t.classList && t.classList.contains('jturn') && t.classList.contains('toggler')) t.classList.toggle('open');
      };
    } } });

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

// The screen's own controls: the two rail mirrors, the debug snapshot, and the
// topbar's Concede — whose action belongs to the turn.
function initSkirmishScreen(){
  $('fabJournal').onclick = function(){ modalOpen('journal'); };
  $('fabRosters').onclick = function(){ modalOpen('mats'); };
  $('btnDebug').onclick = saveDebugSnapshot;
  $('btnConcede').onclick = concedeAsk;
  $('btnQuit').onclick = returnToMenu;
}
