/* The NONE seat: the menu, with no skirmish being played.

   Its only job is to answer every question without guessing, so a screen that
   paints before a seat is taken reads a seat rather than a null. */
'use strict';

uiSeat({
  mode: 'none',
  live: function(){ return false; },
  viewSide: function(v){ return v.current; },
  drives: function(){ return false; },
  you: function(){ return null; },
  aiSide: function(){ return false; },
  waiting: function(){ return ''; },
  beginTurn: function(){},
  persists: false, wire: false, concedable: false, gatesHand: false,
  aiName: function(){ return 'human'; }, runKind: 'human'
});
