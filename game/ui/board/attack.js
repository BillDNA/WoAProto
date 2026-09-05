/* The BOARD house's ATTACK room: what an attack would do, before it is
   committed.

   One computation, two presentations — the hover pills on every hittable hex and
   the confirmation dialog both read E.computeAttack, so the numbers a player
   hovers can never disagree with the ones they are asked to approve, or with
   resolution. */
'use strict';

// The best attack this hex has against each target it can reach.
function attackPreviewsFor(st, fromHex){
  var v = E.view(st);
  var o = v.phase === 'step' ? E.stepOptions(st) : null;
  var list;
  if (o && o.type === 'attack') list = o.attacks.filter(function(a){ return a.from === fromHex; });
  else list = E.listAttacks(st, v.current).filter(function(a){ return a.from === fromHex; })
    .map(function(a){ return Object.assign({}, a, { preview: E.computeAttack(st, a) }); });
  return bestPerTarget(list);
}
// Several routes may reach one target; the strongest is the one to show.
function bestPerTarget(list){
  var best = {};
  list.forEach(function(a){
    var diff = a.preview.attackerPower - a.preview.defenderPower;
    if (!(a.to in best) || diff > best[a.to].diff) best[a.to] = { a: a, diff: diff };
  });
  return Object.keys(best).map(function(to){ return best[to].a; });
}

function showAttackHints(fromHex){
  hideAttackHints();
  var st = APP.st, v = E.view(st);
  if (!st || !inputLive()) return;
  if (v.phase === 'step'){
    var o = E.stepOptions(st);
    if (!o || o.type !== 'attack') return;
  } else if (v.phase !== 'choose-card') return;
  var u = v.units[fromHex];
  if (!u || u.owner !== v.current) return;
  var g = svgEl('g', { 'class':'atk-hints', 'pointer-events':'none' });
  attackPreviewsFor(st, fromHex).forEach(function(a){
    var pv = a.preview;
    bpDraw(g, 'pill', { hex: a.to, text: pv.attackerPower + ' vs ' + pv.defenderPower, tone: pv.outcome });
  });
  $('board').appendChild(g);
}
function hideAttackHints(){
  document.querySelectorAll('#board .atk-hints').forEach(function(el){ el.remove(); });
}
// Wire a hover preview onto any element that stands for a hex.
function attackHoverable(el, hex){
  el.addEventListener('mouseenter', function(){ showAttackHints(hex); });
  el.addEventListener('mouseleave', hideAttackHints);
  return el;
}

function confirmAttack(a){
  var st = APP.st, v = E.view(st);
  var pv = a.preview;
  var au = v.units[a.from];
  var tgt = pv.defenderIsHQ ? capName(E.other(v.current))+' Headquarters' : capName(E.other(v.current))+' '+E.UNITS[pv.defenderUnit].name;
  var outcomeTxt = { attacker: 'Attack succeeds — defender destroyed' + (pv.defenderIsHQ ? '. <b>HEADQUARTERS FALLS!</b>' : (a.noAdvance ? ', your unit holds its ground.' : ', your unit advances.')),
                     defender: '<b>Attack fails — your unit is destroyed.</b>',
                     tie: a.tieSpare ? 'Tie — defender destroyed, your unit withdraws safely.' + (pv.defenderIsHQ?' <b>HEADQUARTERS FALLS!</b>':'') : 'Tie — <b>both units destroyed.</b>' + (pv.defenderIsHQ?' <b>HEADQUARTERS FALLS!</b>':'') }[pv.outcome];
  confirmDialog({
    title: 'Order of Skirmish',
    body:
      '<p>'+capName(v.current)+' '+E.UNITS[au.type].name+' attacks '+tgt+(a.via?' <i>(through the HQ)</i>':'')+'</p>' +
      '<div class="skirmish-calc">' +
        '<div class="side"><h4 style="color:var(--'+v.current+'-dark)">Attacker</h4>'+pv.attackerParts.join('<br>')+'<div class="total">'+pv.attackerPower+'</div></div>' +
        '<div class="side"><h4 style="color:var(--'+E.other(v.current)+'-dark)">Defender</h4>'+pv.defenderParts.join('<br>')+'<div class="total">'+pv.defenderPower+'</div></div>' +
      '</div>' +
      '<p style="font-size:14.5px;">'+outcomeTxt+'</p>',
    yesLabel: 'Attack!', noLabel: 'Stand Down',
    onYes: function(){ APP.ui.sel = null; act({from:a.from, to:a.to, via:a.via}); }
  });
}
