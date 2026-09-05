/* The card glossary: every card, its count, and — mid-skirmish — what each side
   has spent of it. Shown in the `cards` modal. */
'use strict';

function showCards(){ modalOpen('cards'); }

function cardsGlossaryHtml(){
  var inGame = inSkirmish();
  var youSide = inGame ? seatYou() : null;
  var rows = '<table><tr><th style="text-align:left;">Card</th><th>#</th><th style="text-align:left;">Action</th>' +
    (inGame ? '<th style="color:var(--red-dark);">Red'+(youSide==='red'?' (you)':'')+'</th>' +
              '<th style="color:var(--blue-dark);">Blue'+(youSide==='blue'?' (you)':'')+'</th>' : '') + '</tr>';
  function spentCell(n, total, color){
    var marks = '';
    for (var i = 0; i < total; i++) marks += (i < n ? '&#10006;' : '&#9675;') + (i < total-1 ? ' ' : '');
    return '<td style="white-space:nowrap; font-size:14px;'+(n===total ? 'background:'+color+';' : '')+'">'+marks+'</td>';
  }
  E.CARDS.forEach(function(c){
    var cells = '<td style="text-align:left;"><b>'+c.name+'</b>'+(c.starting?' <span class="small">(starting card)</span>':'')+'</td>' +
      '<td>'+c.count+'</td><td style="text-align:left;">'+c.text+'</td>';
    if (inGame){
      var rN = E.view(APP.st).removed('red').filter(function(id){ return id===c.id; }).length;
      var bN = E.view(APP.st).removed('blue').filter(function(id){ return id===c.id; }).length;
      cells += spentCell(rN, c.count, 'rgba(var(--red-rgb),.18)') + spentCell(bN, c.count, 'rgba(var(--blue-rgb),.18)');
    }
    rows += '<tr>'+cells+'</tr>';
  });
  rows += '</table>';
  if (inGame) rows += '<p class="small" style="margin-top:8px;">&#10006; = that copy has been resolved this skirmish and is gone from the game; &#9675; = still in draw pile, hand, or discard. Shaded cell = every copy spent.</p>';
  return rows;
}
