/* The TURN house: one turn being taken.

   The door, and the base every room sits on — the ACTION. Four things advance a
   turn: play a card, resolve a step, concede, let the AI move. Each is a room of
   actions/ declaring its engine call and how far the follow-through goes; the
   base owns the rest — catch a rejection, drop the selection, repaint, persist,
   push over the wire, and hand the next turn to the seat. Nothing outside
   actions/ calls E.applyStep, E.playCard or E.concede.

   uiAction({id, run, fx, quiet, settle, overDelay}) -> a function to hand to a
   button. `run(arg)` is the engine call and nothing else. `fx(arg)` captures
   what to animate BEFORE that call and is played after the repaint. `quiet`
   drops the rejection toast; `onReject` is the room's own answer to a refusal,
   run after the repaint; `settle:false` repaints without ending the turn, for a
   room walking several steps of its own; `overDelay` holds the win card
   back so an animation can finish. A rejected action always repaints — the
   screen may be showing a selection the engine just refused.

   Prose: turn.md. */
'use strict';

/* The turn in progress, as the screen holds it: what is selected, how far into a
   multi-part choice, whether the AI has the controls, and whether the hand is
   still face-down waiting for a hand-off. Re-made whole whenever a turn starts. */
APP.ui = { sel: null, stage: null, busy: false, handoffPending: false };

var UI_ACTIONS = {};

function uiAction(spec){
  if (UI_ACTIONS[spec.id]) throw new Error('uiAction: duplicate id ' + JSON.stringify(spec.id));
  var act = function(arg){
    var pre = spec.fx ? spec.fx(arg) : null;
    try { spec.run(arg); }
    catch(e){
      if (!spec.quiet) toast('Invalid move.', 1800);
      renderAll();
      if (spec.onReject) spec.onReject(arg, e); // after the repaint, so a room's own message survives it
      return false;
    }
    APP.ui.sel = null;
    if (spec.settle === false) renderAll();
    else turnSettle(spec.overDelay);
    if (pre) playFX(pre);
    return true;
  };
  act.id = spec.id;
  UI_ACTIONS[spec.id] = act;
  return act;
}

/* The screen redrawn, the session kept, the peer told — what any change to the
   state leaves behind, whether or not it ends the turn. */
function turnKept(){
  renderAll(); saveLocal();
  if (seatWire()) pushState();
}

/* What every action leaves behind: the above, and whoever is up next given the
   turn. */
function turnSettle(overDelay){
  var v = E.view(APP.st);
  turnKept();
  if (v.phase === 'skirmish-over'){
    if (v.battle.winner) clearSave();
    if (overDelay) setTimeout(showSkirmishOver, overDelay);
    else showSkirmishOver();
    return;
  }
  if (v.phase === 'choose-card') seatBeginTurn();
}

// The turn's own controls: the card glossary, reachable from the mat and the menu.
function initTurn(){
  $('btnCards').onclick = showCards;
  $('btnCardsMenu').onclick = showCards;
}
