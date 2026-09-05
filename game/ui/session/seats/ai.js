/* The AI seat: you against the enemy general.

   One side is yours and the other is driven by the planner, so the AI strength
   this browser picked is the enemy's name in a recorded run. */
'use strict';

uiSeat({
  mode: 'ai',
  live: function(v){ return v.current === APP.mySide; },
  viewSide: function(){ return APP.mySide; },
  drives: function(v, p){ return p === APP.mySide; },
  you: function(){ return APP.mySide; },
  aiSide: function(p){ return p !== APP.mySide; },
  waiting: function(v){ return '<b>' + capName(v.current) + '</b> (the enemy general) is thinking…'; },
  beginTurn: function(){ maybeAI(); },
  persists: true, wire: false, concedable: true, gatesHand: false,
  aiName: function(side){ return side === APP.mySide ? 'human' : (APP.diff || 'normal'); },
  runKind: 'human'
});
