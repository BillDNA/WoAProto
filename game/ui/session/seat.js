/* The SEAT: who is at the controls, and what that implies.

   Four modes seat a skirmish — one human against an AI, two humans on one
   device, two humans over a wire, and nobody at all. Every screen asks the same
   questions of them, so each mode answers them once here and nothing else
   switches on APP.mode.

   A seat answers: is my input live, whose hand do I see, which side is "you",
   which side is an AI, what does the screen say while I wait, what happens when
   which side a local human drives, what the screen says while I wait, what
   happens when a turn begins, does a save get written, does a change go over the
   wire, may this seat concede, whether the hand is gated behind a hand-off, and
   what a finished skirmish records for a side — its AI name and its run kind. */
'use strict';

var UI_SEATS = {};

function uiSeat(spec){
  if (UI_SEATS[spec.mode]) throw new Error('uiSeat: duplicate mode ' + JSON.stringify(spec.mode));
  ['live', 'viewSide', 'drives', 'you', 'aiSide', 'waiting', 'beginTurn', 'persists', 'wire',
   'concedable', 'gatesHand', 'aiName', 'runKind']
    .forEach(function(f){ if (spec[f] == null) throw new Error('uiSeat(' + spec.mode + '): missing ' + f); });
  UI_SEATS[spec.mode] = spec;
  return spec;
}

// The seat this browser is sitting in. No skirmish in progress = no seat, and
// every question below then answers the way an empty screen needs.
function seat(){ return UI_SEATS[APP.mode] || UI_SEATS.hotseat; }

/* ---- the questions, asked of the live seat ---- */
// Input is dead while the engine is mid-AI-turn or the skirmish is decided,
// whatever the seat says.
function inputLive(){
  if (!APP.st || E.view(APP.st).phase === 'skirmish-over' || APP.ui.busy) return false;
  return seat().live(E.view(APP.st));
}
function viewSide(){ return seat().viewSide(E.view(APP.st)); }
// Does the local human work this side's own controls (its Commander, its cards)?
function seatDrives(p){ return APP.st ? seat().drives(E.view(APP.st), p) : false; }
function seatYou(){ return seat().you(); }                       // the side labelled "you", or null
function seatAiSide(p){ return seat().aiSide(p); }               // is side p driven by an AI
function seatWaiting(v){ return seat().waiting(v); }             // prompt text while input is dead
function seatBeginTurn(){ return seat().beginTurn(); }           // a fresh turn is up
function seatPersists(){ return seat().persists; }
function seatWire(){ return seat().wire; }
function seatConcedable(){ return seat().concedable; }
// The hand is face-down until the seated player takes command (hotseat only).
function seatHidesHand(){ return seat().gatesHand && APP.ui.handoffPending; }
function seatGatesHand(){ return seat().gatesHand; }
function seatAiName(side){ return seat().aiName(side); }
function seatRunKind(){ return seat().runKind; }

/* ---- the four seats ---- */
uiSeat({
  mode: 'ai',                                   // you against the enemy general
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

uiSeat({
  mode: 'hotseat',                              // two humans, one device
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

uiSeat({
  mode: 'net',                                  // two humans, two devices
  live: function(v){ return v.current === APP.mySide; },
  viewSide: function(){ return APP.mySide; },
  drives: function(v, p){ return p === APP.mySide; },
  you: function(){ return APP.mySide; },
  aiSide: function(){ return false; },
  waiting: function(v){ return 'Waiting for <b>' + capName(v.current) + '</b>…'; },
  beginTurn: function(){},                      // the peer moves; the poller brings it back
  persists: false, wire: true, concedable: true, gatesHand: false,
  aiName: function(){ return 'human'; }, runKind: 'human'
});

uiSeat({
  mode: 'watch',                                // nobody is playing; two AIs are
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

/* ---- hotseat's own room: hold the screen until the next commander takes it ---- */
function showHandoff(){
  if (E.view(APP.st).phase === 'skirmish-over') return;
  APP.ui.handoffPending = true;
  modalOpen('handoff', E.view(APP.st).current);
  renderHand();
}
