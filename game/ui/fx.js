/* War of Attrition — ui part: board effects (pure flourish, no rules) — timing
   over an element that is already there. What is DRAWN is never here: the
   transient marks are the board house's (bpPlay plays them for their own
   declared life), the token the unit house's; this file decides when.

   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). */
'use strict';

/* =================== board effects (pure flourish, no rules) =================== */
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
function ghostUnit(hex, unit){
  var svg = $('board');
  if (!svg.firstChild || !unit) return;
  var xy = hexXY(hex), sc = BOARD.side(unit.owner);
  var g = svgEl('g',{'class':'fx-ghost'});
  g.appendChild(svgEl('circle',{cx:xy[0], cy:xy[1], r:unitTokenR(), fill:sc.fill, stroke:sc.dark, 'stroke-width':UNIT_CONFIG.token.outlineSW}));
  svg.appendChild(g);
  setTimeout(function(){ if (g.parentNode) g.parentNode.removeChild(g); }, 750);
}
function ringAt(hex, color){
  if (hex) bpPlay($('board'), 'ring', { hex:hex, color:color });
}
function fxStrike(fromHex, toHex, viaHex, color){
  bpPlay($('board'), 'strike', { from:fromHex, to:toHex, via:viaHex, color:color });
}
function shakeBoard(){
  var w = $('boardwrap');
  w.classList.remove('fx-shake');
  void w.offsetWidth;
  w.classList.add('fx-shake');
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
  else if (pre.type==='barrage'){ ringAt(c.trenchHex || fxPieceHex(c.pieceId), BOARD_CONFIG.board.ink.barrage); }
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
    ringAt(c.to, BOARD_CONFIG.board.ink.barrage);
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
  return pc ? E.sideHex(pc.edgeKeys[0]) : null;
}
