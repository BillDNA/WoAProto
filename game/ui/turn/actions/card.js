/* Playing a card: the act that opens a turn.

   House rule — any card can instead be resolved as a basic attack or a basic
   reposition; the modal asks which and calls the action with the answer. The
   rejection is quiet because the modal has already shown what is legal. */
'use strict';

var resolveCard = uiAction({ id: 'card', quiet: true,
  run: function(c){ E.playCard(APP.st, c.cid, c.mode); } });

function playCardUI(cid){
  var st = APP.st, side = E.view(st).current;
  var rp = E.listRepositions(st, side);
  modalOpen('play', {
    cid: cid, card: cardDef(cid),
    canAtk: E.listAttacks(st, side).length > 0,
    canRp: rp.moves.length > 0 || rp.swaps.length > 0
  });
}
