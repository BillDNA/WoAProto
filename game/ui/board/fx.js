/* The BOARD house's REPLAY room: what one action changed, animated.

   Pure flourish — it never touches a rule — and it must survive a full board
   re-render, so it captures from/to information BEFORE the engine resolves and
   animates after the repaint. The marks it lays down are the house's transient
   marks (board/overlay.js); what is its own is the timing, the token slides,
   and reading the engine for who actually supported. */
'use strict';

function unitEl(hex){ return document.querySelector('#board g.unit[data-hex="'+hex+'"]'); }

function slideUnit(fromHex, toHex){
  var el = unitEl(toHex);
  if (!el) return;
  var a = hexXY(fromHex), b = hexXY(toHex);
  el.style.transition = 'none';
  el.style.transform = 'translate('+(a[0]-b[0])+'px,'+(a[1]-b[1])+'px)';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    el.style.transition = 'transform .3s ease';
    el.style.transform = 'translate(0,0)';
  }); });
}
function popUnit(hex){
  var el = unitEl(hex);
  if (el) el.classList.add('fx-pop');
}
function shakeBoard(){
  var w = $('boardwrap');
  w.classList.remove('fx-shake');
  void w.offsetWidth;
  w.classList.add('fx-shake');
}

// The transient marks, on the live board, at its own scale and lifetime.
function liveBoard(){ var svg = $('board'); return svg && svg.firstChild ? svg : null; }
function ghostUnit(hex, unit){
  var svg = liveBoard();
  if (svg && unit) bpOverlay(svg, 'fallen', { hex:hex, owner:unit.owner, cls:'fx-ghost', ttl:750 });
}
function ringAt(hex, color){
  var svg = liveBoard();
  if (svg && hex) bpOverlay(svg, 'ring', { hex:hex, color:color, cls:'fx-ring', ttl:600 });
}
function fxStrike(fromHex, toHex, viaHex, color){
  var svg = liveBoard();
  if (svg) bpOverlay(svg, 'strike', { from:fromHex, to:toHex, via:viaHex, color:color, cls:'fx-strike', ttl:900 });
}

// snapshot what is about to happen so we can animate the aftermath
function capturePre(st, choice){
  var v = E.view(st);
  if (!choice || choice.skip || v.phase!=='step') return null;
  var o = E.stepOptions(st);
  if (!o) return null;
  var pre = { type:o.type, choice:choice };
  if (o.type==='attack' && choice.to){
    pre.attacker = v.units[choice.from];
    pre.defender = v.units[choice.to] || null;
    pre.defenderHQ = E.isHQ(st, choice.to);
    // who actually contributes (engine truth incl. trench/river blocking) —
    // captured BEFORE resolution so the FX can point at them afterwards
    if (pre.attacker){
      pre.supporters = E.supportFor(st, pre.attacker.owner, choice.to, choice.from, true).hexes;
      pre.defSupporters = E.supportFor(st, E.other(pre.attacker.owner), choice.to, null, false).hexes;
    }
  }
  return pre;
}

function playFX(pre){
  if (!pre) return;
  var st = APP.st, v = E.view(st), c = pre.choice;
  if (pre.type==='deploy' && c.hex){ popUnit(c.hex); }
  else if (pre.type==='trench' && c.hex){ ringAt(c.hex, BOARD.terrainStroke('T')); }
  else if (pre.type==='barrage'){ ringAt(c.trenchHex || fxPieceHex(c.pieceId), BOARD.barrage); }
  else if (pre.type==='reposition'){
    if (c.swap){ slideUnit(c.b, c.a); slideUnit(c.a, c.b); }
    else slideUnit(c.from, c.to);
  }
  else if (pre.type==='attack' && c.to){
    // where the blow comes from — a strike line (bending through the HQ on a
    // via-attack) plus a ring on every unit whose support actually counted
    if (pre.attacker){
      fxStrike(c.from, c.to, c.via, BOARD.side(pre.attacker.owner).fill);
      (pre.supporters || []).forEach(function(h){ ringAt(h, BOARD.supportAlly); });
      (pre.defSupporters || []).forEach(function(h){ ringAt(h, BOARD.supportEnemy); });
    }
    ringAt(c.to, BOARD.barrage);
    var now = v.units[c.to];
    var advanced = now && pre.attacker && now.owner===pre.attacker.owner && !v.units[c.from];
    if (advanced) slideUnit(c.from, c.to);
    if (pre.defender && (!now || advanced)) ghostUnit(c.to, pre.defender);            // defender fell
    if (pre.attacker && !v.units[c.from] && !advanced) ghostUnit(c.from, pre.attacker); // attacker fell
    if (pre.defenderHQ && !E.isHQ(st, c.to)) shakeBoard();                            // HQ captured!
  }
}
function fxPieceHex(pieceId){
  var pc = (E.view(APP.st).terrainPieces||[]).filter(function(x){ return x.id===pieceId; })[0];
  return pc ? pc.edgeKeys[0].split('>')[0] : null;
}
