/* The HOTSEAT: two humans sharing one device.

   The only seat that gates the hand — the screen holds between turns so the
   next commander can take it without seeing the last one's cards. */
'use strict';

uiSeat({
  mode: 'hotseat',
  live: function(){ return true; },
  viewSide: function(v){ return v.current; },
  drives: function(v, p){ return p === v.current; },
  you: function(){ return null; },
  aiSide: function(){ return false; },
  waiting: function(v){ return 'Waiting for <b>' + capName(v.current) + '</b>…'; },
  beginTurn: function(){ showHandoff(); },
  persists: true, wire: false, concedable: true, gatesHand: true,
  aiName: function(){ return 'human'; }, runKind: 'human'
});

// Hold the screen until the next commander takes it.
function showHandoff(){
  if (E.view(APP.st).phase === 'skirmish-over') return;
  APP.ui.handoffPending = true;
  modalOpen('handoff', E.view(APP.st).current);
  renderHand();
}
