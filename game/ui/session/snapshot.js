/* The turn snapshot: the state kept so a player can take the current turn back.

   The session's other kept copy — in memory rather than in the store, because
   it lives for one turn. House rule: reset to the start of your turn mid-card. */
'use strict';

function ensureSnapshot(){
  var st = APP.st, v = E.view(st);
  if (!st || v.phase !== 'choose-card') return;
  if (APP.snap && APP.snap.turn === v.turnNumber) return;
  APP.snap = { turn: v.turnNumber, data: JSON.stringify(st) };
}
function canReset(){
  var st = APP.st, v = E.view(st);
  return st && v.phase === 'step' && APP.snap && APP.snap.turn === v.turnNumber && inputLive();
}
function resetTurn(){
  if (!canReset()) return;
  APP.st = JSON.parse(APP.snap.data);
  APP.ui.sel = null; APP.ui.stage = null;
  renderAll(); saveLocal();
  if (seatWire()) pushState();
  toast('Turn reset — choose a card.', 1800);
}
