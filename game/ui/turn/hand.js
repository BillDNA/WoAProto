/* The hand: the cards this turn may be spent on.

   A card's short form is the card's own business — `abbr` in content/cards/.
   Every shipped card declares one and no two collide (game/test/test.cards.js
   holds that); a card that arrives without one falls back to its initials. */
'use strict';

function cardAbbr(c){
  if (c.abbr) return c.abbr;
  var w = String(c.name || c.id || '?').trim().split(/\s+/);
  return (w.length > 1 ? w[0].charAt(0) + w[1].charAt(0) : w[0].slice(0, 2));
}

function renderHand(){
  var st = APP.st, v = E.view(st), el = $('hand');
  el.innerHTML = '';
  var side = viewSide();
  var hideCards = seatHidesHand();
  var hand = v.hand(side);
  var live = inputLive() && v.phase==='choose-card';
  // deal-in flourish only the first time this turn's hand is shown
  var dealKey = v.turnNumber + '|' + side + '|' + v.battle.skirmishIndex;
  var deal = APP.ui.dealtKey !== dealKey && v.phase==='choose-card';
  if (deal) APP.ui.dealtKey = dealKey;
  hand.forEach(function(cid, i){
    var c = cardDef(cid);
    var d = document.createElement('div');
    d.className = 'card' + (live ? '' : ' disabled') + (deal ? ' deal' : '');
    if (deal) d.style.animationDelay = (i*60)+'ms';
    var art = hideCards ? '' : artImg(cid, '');
    d.innerHTML = '<div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>' +
      (hideCards
        ? '<div class="body" style="display:flex;align-items:center;justify-content:center;font-size:34px;color:var(--brass-dark);">&#9881;</div>'
        : (art ? '<div class="art">'+art+'</div>' : '') +
          '<div class="banner">'+c.name+'</div><div class="body">'+c.text+'</div>');
    if (live) d.onclick = function(){ playCardUI(cid); };
    el.appendChild(d);
  });
  if (hand.length===0 && v.phase!=='skirmish-over'){
    el.innerHTML = '<div class="small" style="color:var(--parch);">'+(v.current===side ? '' : 'Waiting for '+capName(v.current)+'…')+'</div>';
  }
}
