/* The WATCH seat: two AIs playing, nobody at the controls.

   Both sides are the planner's, so no side is "you" and there is nothing to
   concede. The run it records is a watch, not a human game. */
'use strict';

uiSeat({
  mode: 'watch',
  live: function(){ return false; },
  viewSide: function(v){ return v.current; },
  drives: function(){ return false; },
  you: function(){ return null; },
  aiSide: function(){ return true; },
  waiting: function(v){ return 'General <b>' + capName(v.current) + '</b> surveys the field… ' +
    '<span class="small" style="color:var(--note);">(you are spectating)</span>'; },
  beginTurn: function(){ maybeAI(); },
  persists: true, wire: false, concedable: false, gatesHand: false,
  aiName: function(){ return APP.diff || 'normal'; }, runKind: 'watch'
});
