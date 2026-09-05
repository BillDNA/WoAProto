/* The SESSION house's SEAT base: who is at the controls, and what that implies.

   Four modes seat a skirmish — one human against an AI, two humans on one
   device, two humans over a wire, and two AIs with nobody playing — plus `none`
   for a menu with no skirmish at all. Every screen asks the same questions of
   them, so each mode answers them once in its own room of seats/ and nothing
   else in the UI switches on APP.mode.

   A seat answers: is my input live, whose hand do I see, which side do I drive,
   which side is "you", which side is an AI, what the screen says while I wait,
   what happens when a turn begins, whether a save is written, whether a change
   goes over the wire, whether this seat may concede, whether the hand is gated
   behind a hand-off, and what a finished skirmish records for a side — its AI
   name and its run kind.

   Every answer is required: a room that forgets one fails at load rather than
   silently taking another seat's. */
'use strict';

var UI_SEATS = {};
var SEAT_ANSWERS = ['live', 'viewSide', 'drives', 'you', 'aiSide', 'waiting', 'beginTurn',
  'persists', 'wire', 'concedable', 'gatesHand', 'aiName', 'runKind'];

function uiSeat(spec){
  if (UI_SEATS[spec.mode]) throw new Error('uiSeat: duplicate mode ' + JSON.stringify(spec.mode));
  SEAT_ANSWERS.forEach(function(f){
    if (spec[f] == null) throw new Error('uiSeat(' + spec.mode + '): missing ' + f);
  });
  UI_SEATS[spec.mode] = spec;
  return spec;
}

// The seat this browser is sitting in. Nothing seated is itself a seat, so no
// question below has to guess.
function seat(){ return UI_SEATS[APP.mode] || UI_SEATS.none; }

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
