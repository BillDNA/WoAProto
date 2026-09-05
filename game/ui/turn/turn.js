/* The TURN house: one turn being taken.

   The door, and the base every room sits on — the ACTION. Four things advance a
   turn: play a card, resolve a step, concede, let the AI move. Each declares its
   engine call; the base owns everything that follows — catch a rejection, drop
   the selection, repaint, persist, push over the wire, and hand the next turn to
   the seat. Nothing else in the UI calls E.applyStep, E.playCard or E.concede.

   uiAction({id, run, fx, quiet, overDelay}) -> a function to hand to a button.
   `run(arg)` is the engine call and nothing else. `fx(arg)` captures what to
   animate BEFORE that call and is played after the repaint. `quiet` drops the
   rejection toast; `overDelay` holds the win card back so an animation can
   finish. A rejected action always repaints — the screen may be showing a
   selection the engine just refused.

   Prose: turn.md. */
'use strict';

var UI_ACTIONS = {};

function uiAction(spec){
  if (UI_ACTIONS[spec.id]) throw new Error('uiAction: duplicate id ' + JSON.stringify(spec.id));
  var act = function(arg){
    var pre = spec.fx ? spec.fx(arg) : null;
    try { spec.run(arg); }
    catch(e){
      if (!spec.quiet) toast('Invalid move.', 1800);
      renderAll();
      return false;
    }
    APP.ui.sel = null;
    turnSettle(spec.overDelay);
    if (pre) playFX(pre);
    return true;
  };
  act.id = spec.id;
  UI_ACTIONS[spec.id] = act;
  return act;
}

/* What every action leaves behind: the screen redrawn, the session kept, the
   peer told, and whoever is up next given the turn. */
function turnSettle(overDelay){
  var v = E.view(APP.st);
  renderAll(); saveLocal();
  if (seatWire()) pushState();
  if (v.phase === 'skirmish-over'){
    if (v.battle.winner) clearSave();
    if (overDelay) setTimeout(showSkirmishOver, overDelay);
    else showSkirmishOver();
    return;
  }
  if (v.phase === 'choose-card') seatBeginTurn();
}

/* ---- the actions ---- */
// House rule: any card can instead be resolved as a basic attack or a basic
// reposition; the modal asks which and calls resolveCard with the answer.
function playCardUI(cid){
  var st = APP.st, side = E.view(st).current;
  var rp = E.listRepositions(st, side);
  modalOpen('play', {
    cid: cid, card: cardDef(cid),
    canAtk: E.listAttacks(st, side).length > 0,
    canRp: rp.moves.length > 0 || rp.swaps.length > 0
  });
}

var resolveCard = uiAction({ id: 'card', quiet: true,
  run: function(c){ E.playCard(APP.st, c.cid, c.mode); } });

// The one path every player move takes. The win card waits ~.9s so the closing
// strike arrow and death animation finish first.
var act = uiAction({ id: 'step', overDelay: 900,
  run: function(choice){ E.applyStep(APP.st, choice); },
  fx: function(choice){ return capturePre(APP.st, choice); } });

var concedeTurn = uiAction({ id: 'concede',
  run: function(side){ E.concede(APP.st, side); } });

// Conceding is a turn's last act: only at the start of your own, and only from
// a seat that has a side to give up.
function concedeAsk(){
  var st = APP.st, v = E.view(st);
  if (!st || v.phase === 'skirmish-over' || !seatConcedable()) return;
  if (!inputLive() || v.phase !== 'choose-card'){ toast('You can concede at the start of your own turn.'); return; }
  var p = viewSide();
  confirmDialog({
    title: 'Concede the field?', titleClass: p,
    body: '<p>'+capName(E.other(p))+' takes this skirmish. Losing one skirmish does not lose the war — the campaign moves on.</p>',
    yesLabel: 'Concede', noLabel: 'Fight on',
    onYes: function(){ concedeTurn(p); }
  });
}

// The turn's own controls: the card glossary, reachable from the mat and the menu.
function initTurn(){
  $('btnCards').onclick = showCards;
  $('btnCardsMenu').onclick = showCards;
}
