/* Playing a card: its own action, or the house-rule basic attack / reposition.
   Context is {cid, card, canAtk, canRp}. */
'use strict';

uiModal({ id:'play', buttonsClass:'menu-btns',
  title: function(c){ return c.card.name; },
  render: function(el, c){
    el.innerHTML = artImg(c.cid, 'bigart') +
      '<p class="small" style="margin-bottom:10px;">' + c.card.text + '</p>' +
      '<p class="small">However it is resolved, the card is removed from the game.</p>';
  },
  buttons: function(c){
    var repos = c.canRp && !c.canAtk;
    return [
      { label:'Play the card action', onClick: function(){ resolveCard(c.cid, 'normal'); } },
      { label:'Resolve as a basic Attack' + (c.canAtk ? '' : ' (no targets)'),
        disabled: !c.canAtk, onClick: function(){ resolveCard(c.cid, 'attack'); } },
      { label:'Resolve as a basic Reposition' + (!c.canRp ? ' (no moves)' : c.canAtk ? ' (attack available)' : ''),
        disabled: !repos, onClick: function(){ resolveCard(c.cid, 'reposition'); } },
      { label:'Keep it in hand', ghost:true }
    ];
  }
});
