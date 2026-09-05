/* The prompt: what the current step wants, and the buttons that answer it. */
'use strict';

function renderPrompt(){
  var st = APP.st, v = E.view(st), el = $('promptbar');
  el.innerHTML = '';
  if (v.phase === 'skirmish-over') return;
  var who = capName(v.current);
  if (!inputLive()){ el.innerHTML = seatWaiting(v); return; }
  if (v.phase === 'choose-card'){
    var adv = E.concedeAdvised(st, v.current);
    el.innerHTML = '<b>'+who+'</b>: choose a card to play. <span class="small" style="color:var(--note);">(played cards are gone for good)</span>' +
      (adv && seatConcedable() ? ' <span class="small" style="color:var(--amber);">The cause looks lost — <b>Concede</b> (top right) keeps the campaign moving.</span>' : '');
    return;
  }
  var o = E.stepOptions(st);
  if (!o) return;
  var canSkip = !E.mustPlayStep(st); // an order must resolve at least one action if it can
  var stepTag = o.stepCount>1 ? ' <span class="small" style="color:var(--note);">(step '+(o.stepIndex+1)+'/'+o.stepCount+')</span>' : '';
  var msg = '';
  if (o.type==='deploy') msg = 'Place your <b>'+E.UNITS[o.unit].name+'</b>';
  else if (o.type==='trench') msg = APP.ui.sel ? 'Click a <b>brass knob</b> to dig the trench across its two edges' : 'Choose a hex to <b>entrench</b>';
  else if (o.type==='attack') msg = APP.ui.sel ? 'Choose a target' : 'Choose an attacker' + (o.mod ? ' <b>('+(o.mod>0?'+':'')+o.mod+' support)</b>':'') + (o.tieSpare?' <b>(tie spares your unit)</b>':'');
  else if (o.type==='reposition') msg = APP.ui.sel ? 'Move to a gold hex, or swap with a violet unit' : 'Choose a unit to <b>reposition</b>';
  else if (o.type==='barrage') msg = 'Barrage: click <b>any trench</b> or <b>forest</b> on the board to destroy' + (canSkip ? ' — or skip straight to the attack' : '');
  el.innerHTML = '<b>'+cardDef(v.pending.cardId).name+'</b>: '+msg+stepTag +
    (canSkip ? '' : ' <span class="small" style="color:var(--amber);">(this order must accomplish at least one action)</span>');

  function btn(label, cls, fn){
    var b = document.createElement('button');
    b.textContent = label; b.className = cls; b.onclick = fn;
    el.appendChild(b);
  }
  if (canSkip) btn('Skip step', 'btn-sm', function(){ APP.ui.sel = null; act({skip:true}); });
  if (canReset()) btn('Reset turn', 'ghost btn-sm', resetTurn);
  if (APP.ui.sel) btn('Back', 'ghost btn-sm', function(){ APP.ui.sel = null; renderAll(); });
}
