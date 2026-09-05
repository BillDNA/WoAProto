/* Conceding: a turn's last act.

   Only at the start of your own turn, and only from a seat that has a side to
   give up. The win card shows at once — there is no animation to wait on. */
'use strict';

var concedeTurn = uiAction({ id: 'concede',
  run: function(side){ E.concede(APP.st, side); } });

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
