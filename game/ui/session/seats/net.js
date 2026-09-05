/* The NET seat: two humans, two devices, one LAN room.

   The only seat whose changes go over the wire, and the only one that writes no
   save — the room holds the truth, so a stale local copy would fight it. Its
   turn opens on the peer's move arriving, not here. The room itself (hosting,
   joining, push and poll) is ui/session/net.js. */
'use strict';

uiSeat({
  mode: 'net',
  live: function(v){ return v.current === APP.mySide; },
  viewSide: function(){ return APP.mySide; },
  drives: function(v, p){ return p === APP.mySide; },
  you: function(){ return APP.mySide; },
  aiSide: function(){ return false; },
  waiting: function(v){ return 'Waiting for <b>' + capName(v.current) + '</b>…'; },
  beginTurn: function(){},
  persists: false, wire: true, concedable: true, gatesHand: false,
  aiName: function(){ return 'human'; }, runKind: 'human'
});
