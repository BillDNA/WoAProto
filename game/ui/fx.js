/* War of Attrition — ui part: what a resolved order LOOKS like happening. This
   file owns the WHEN and nothing else — which flourishes an order earns, and in
   what order they fire.

   Nothing is drawn here. Every mark belongs to the house of the thing it is
   about: the ring, the strike and the board's recoil are the board's
   (ui/board/), the token's pop, slide and ghost are the unit's
   (ui/board/unit/). A flourish this file cannot name in one of those houses is
   a mark that has no home yet, not a reason to draw one here.

   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). */
'use strict';
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
// a ring on a hex that may not exist (a barrage target is looked up, not given)
function fxRing(hex, color){ if (hex) bpPlay($('board'), 'ring', { hex:hex, color:color }); }

function playFX(pre){
  if (!pre) return;
  var st = APP.st, v = E.view(st), c = pre.choice;
  if (pre.type==='deploy' && c.hex){ bpUnitPop(c.hex); }
  else if (pre.type==='trench' && c.hex){ bpPlay($('board'), 'ring', { hex:c.hex, color:BOARD.terrainStroke('T') }); }
  else if (pre.type==='barrage'){ fxRing(c.trenchHex || fxPieceHex(c.pieceId), BOARD_CONFIG.board.ink.barrage); }
  else if (pre.type==='reposition'){
    if (c.swap){ bpUnitSlide(c.b, c.a); bpUnitSlide(c.a, c.b); }
    else bpUnitSlide(c.from, c.to);
  }
  else if (pre.type==='attack' && c.to){
    // where the blow comes from — a strike line (bending through the HQ on a
    // via-attack) plus a ring on every unit whose support actually counted
    if (pre.attacker){
      bpPlay($('board'), 'strike', { from:c.from, to:c.to, via:c.via, color:BOARD.side(pre.attacker.owner).fill });
      (pre.supporters || []).forEach(function(h){ fxRing(h, BOARD.supportAlly); });
      (pre.defSupporters || []).forEach(function(h){ fxRing(h, BOARD.supportEnemy); });
    }
    fxRing(c.to, BOARD_CONFIG.board.ink.barrage);
    var now = v.units[c.to];
    var advanced = now && pre.attacker && now.owner===pre.attacker.owner && !v.units[c.from];
    if (advanced) bpUnitSlide(c.from, c.to);
    if (pre.defender && (!now || advanced)) bpUnitGhost($('board'), c.to, pre.defender);            // defender fell
    if (pre.attacker && !v.units[c.from] && !advanced) bpUnitGhost($('board'), c.from, pre.attacker); // attacker fell
    if (pre.defenderHQ && !E.isHQ(st, c.to)) bpBoardShake();                                       // HQ captured!
  }
}
function fxPieceHex(pieceId){
  var pc = (E.view(APP.st).terrainPieces||[]).filter(function(x){ return x.id===pieceId; })[0];
  return pc ? E.sideHex(pc.edgeKeys[0]) : null;
}
