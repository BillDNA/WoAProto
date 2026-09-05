/* The BOARD house's MAT room: the pieces a side is holding, beside the field.

   The wooden player mat's read, at a glance: one slot per physical piece —
   solid on the mat, dashed on the field, ✕ destroyed — drawn with the house's
   piece glyph, so restyling the board's unit token restyles the mat with it. */
'use strict';

function statTip(type){
  if (type==='trench') return 'Trench — enemy attacks across its two covered edges get no support';
  var u = E.UNITS[type];
  return u.name+' — attack '+u.atk+', defense '+u.def+', support '+u.sup+', worth '+u.worth+' field-score points to the enemy';
}

function renderMat(p){
  var st = APP.st, v = E.view(st);
  var el = p==='red' ? $('matRed') : $('matBlue');
  var r = v.reserves(p);
  var col = p==='red' ? 'var(--red)' : 'var(--blue)';
  var colD = p==='red' ? 'var(--red-dark)' : 'var(--blue-dark)';
  var totals = E.PIECE_TOTALS;
  var onField = { trench:0 };
  Object.keys(totals).forEach(function(t){ onField[t] = onField[t] || 0; });
  for (var h in v.units) if (v.units[h].owner===p) onField[v.units[h].type]++;
  for (var th in v.trenches) v.trenches[th].forEach(function(t){ if (t.owner===p) onField.trench++; });

  function row(label, type){
    var total = totals[type];
    var res = r[type==='trench'?'trench':type];
    var field = Math.min(onField[type], total - res);
    var boxes = '';
    for (var i=0;i<total;i++){
      if (i < res) boxes += '<span class="slot" title="'+label+' in reserve">'+bpPieceGlyph(type,col,colD)+'</span>';
      else if (i < res+field) boxes += '<span class="slot field" title="'+label+' on the field"></span>';
      else boxes += '<span class="slot lost" title="'+label+' destroyed">&#10006;</span>';
    }
    return '<div class="srow"><span class="slbl" title="'+statTip(type)+'">'+label+'</span><span class="sboxes">'+boxes+'</span></div>';
  }
  var rowsHtml = '';
  Object.keys(E.UNITS).forEach(function(t){ rowsHtml += row(E.UNITS[t].name, t); });
  rowsHtml += row('Trenches','trench');

  var spent = '';
  E.CARDS.forEach(function(c){
    var n = v.removed(p).filter(function(id){ return id===c.id; }).length;
    for (var i=0;i<c.count;i++){
      var gone = i < n;
      spent += '<span class="scard'+(gone?' gone':'')+'" title="'+c.name+(gone?' — spent, gone from the game':'')+'">'+cardAbbr(c)+'</span>';
    }
  });

  var you = seatYou() === p ? ' — you' : '';
  var gen = seatAiSide(p) ? '<span style="font-weight:normal;font-size:.72em;opacity:.72;"> &middot; '+aiDisplayName(APP.diff)+'</span>' : '';
  el.innerHTML =
    '<h3>'+capName(p)+you+gen+'</h3>' +
    renderCommanderPanel(p) +
    rowsHtml +
    '<div class="row" style="margin-top:2px;"><span>Orders left</span><b>'+E.cardsRemaining(st,p)+'</b></div>' +
    '<div class="spentlbl">orders spent &mdash; gone from the game</div>' +
    '<div class="spent" title="Click for the full card glossary">'+spent+'</div>' +
    '<div class="fs">'+E.fieldScore(st,p)+' pts</div>' +
    '<div class="small" style="text-align:center;">surviving units on the field</div>';
  el.querySelector('.spent').onclick = showCards;
  bindCommanderPanel(p);
}
