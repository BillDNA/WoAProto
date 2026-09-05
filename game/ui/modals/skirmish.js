/* End of a skirmish: who took the field, the campaign score, and what happens
   next. Context is {st, v, m} — state, view, battle. */
'use strict';

uiModal({ id:'skirmish',
  title: function(c){ return capName(c.v.skirmishWinner) + ' takes the field!'; },
  tone:  function(c){ return c.v.skirmishWinner; },
  render: function(el, c){
    var st = c.st, v = c.v, m = c.m;
    var how = v.winType === 'hq' ? 'the enemy headquarters was captured.'
      : v.winType === 'concession' ? 'the enemy conceded the field.'
      : 'won by attrition, field score ' + E.fieldScore(st,'red') + ' to ' + E.fieldScore(st,'blue') + ' of surviving units.';
    el.innerHTML =
      '<p style="font-style:italic;">"' + v.mapName + '" — ' + how + '</p>' +
      '<p style="margin-top:10px;font-size:18px;">Campaign: <b style="color:var(--red-dark)">Red ' + m.wins.red + '</b> — <b style="color:var(--blue-dark)">Blue ' + m.wins.blue + '</b></p>' +
      (m.winner
        ? '<h2 class="' + m.winner + '" style="margin-top:14px;">' + capName(m.winner) + ' wins the war!</h2>'
        : '<p class="small">' + capName(m.lastLoser) + ' moves first in the next skirmish.</p>');
  },
  buttons: function(c){
    var st = c.st, v = c.v, m = c.m, btns = [];
    btns.push(m.winner
      ? { label:'New Campaign', onClick: function(){ startNewCampaign(m); } }
      : { label:'Next Skirmish', onClick: function(){ startNextSkirmish(m); } });
    if (APP.mode !== 'net') btns.push({ label:'Rematch this map', ghost:true,
      title:'Fresh skirmish, same map — for A/B testing a layout',
      onClick: function(){ startLocal(APP.mode, [m.maps[v.mapIndex]]); } });
    btns.push({ label:'Copy journal', ghost:true, keepOpen:true,
      title:'Copy the full campaign journal to the clipboard',
      onClick: function(el){ copyText(journalText(st), el); } });
    btns.push({ label:'Main Menu', ghost:true, onClick: returnToMenu });
    return btns;
  }
});
