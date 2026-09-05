/* How a unit is DRAWN. The base; every other .js file here is one type's mark,
   the twin of its rules room in engine/unit/.

   A mark declares its board glyph, its mat glyph and its identity colour on the
   dashboard. Everything a unit shares — the side-coloured disc, the chit it is
   printed on, the mat slot's mini token — is here, so a type declares only what
   makes it that type. Every surface that shows a unit (the live board, the map
   editor, the manual's mini-board, the player mat, the units pane) goes through
   bpUnitToken / bpUnitGlyph / unitChartColor, so no caller names a type.

   Classic script, no wrapper. Loads after ui/board/hex/hex-screen.js, whose
   geometry it draws with, and ui/board-primitives.js, whose svgEl and side
   colours it uses. Prose: unit.md */
'use strict';

var UNIT_MARK = {};

// spec: { type, board, mat, chart }
//   board  function(g, m, o) drawing the glyph on the board token;
//          m = {cx, cy, hw, hh, ink, sw} — the chit's box, its stroke and weight
//   mat    function(m) returning SVG markup for the mat slot's 20x20 box;
//          m = {ink} — the chit ink the glyph is cut out of
//   chart  function() -> the type's identity colour on the dashboard. A
//          function, so it reads the CHART palette, which loads later.
function defineUnitMark(spec){
  ['type', 'board', 'mat', 'chart'].forEach(function(f){
    if (spec[f] == null) throw new Error('defineUnitMark(' + spec.type + '): missing ' + f);
  });
  if (UNIT_MARK[spec.type]) throw new Error('defineUnitMark: duplicate ' + spec.type);
  UNIT_MARK[spec.type] = spec;
}
function unitMark(type){ return UNIT_MARK[type] || null; }
// The token's radius on a board of hex size s — what fx.js's fallen-unit ghost
// and any mini-board scale from.
function unitTokenR(s){ return (s || HEX_CONFIG.board.size) * UNIT_CONFIG.token.r; }
// The type's colour wherever the dashboard identifies it; null when the pane
// should fall back to a sequential ramp.
function unitChartColor(type){
  var m = unitMark(type);
  return m ? m.chart() : null;
}
// Called once at boot: a registered unit type with no mark would draw an empty
// disc on the board, which is worse to debug than a load-time throw.
function unitMarksCheck(){
  var missing = E.unitTypes().filter(function(t){ return !UNIT_MARK[t]; });
  if (missing.length) throw new Error('unit types with no mark: ' + missing.join(', ') +
    ' (add a file in ui/unit/)');
}

// a unit token (disc + chit + type glyph) drawn into a caller-owned group at an
// explicit centre. ONE implementation shared by the live board, the editor and
// the manual diagram; sizes are options (board defaults), colours from BOARD.
// o: { r, circSW, chitHW, chitHH, chitSW, glyphSW, + whatever the glyph reads }
function bpUnitToken(g, cx, cy, owner, type, o){
  o = o || {};
  var tk = UNIT_CONFIG.token, sc = BOARD.side(owner), col = sc.fill, colD = sc.dark;
  var r = o.r != null ? o.r : unitTokenR();
  var hw = o.chitHW != null ? o.chitHW : tk.chitHW, hh = o.chitHH != null ? o.chitHH : tk.chitHH;
  g.appendChild(svgEl('circle',{ cx:cx, cy:cy, r:r, fill:col, stroke:colD,
    'stroke-width':o.circSW != null ? o.circSW : tk.outlineSW }));
  g.appendChild(svgEl('rect',{ x:cx-hw, y:cy-hh, width:hw*2, height:hh*2, fill:UNIT_CONFIG.ink.chit,
    stroke:colD, 'stroke-width':o.chitSW != null ? o.chitSW : tk.chitSW, rx:1.5 }));
  var mark = unitMark(type);
  if (!mark) return;
  mark.board(g, { cx:cx, cy:cy, hw:hw, hh:hh, ink:colD,
                  sw:o.glyphSW != null ? o.glyphSW : tk.glyphSW }, o);
}

// the live-board unit: own <g class="unit" data-hex> for the attack-math hover.
function bpUnit(g, hexKey, unit){
  var xy = hexXY(hexKey);
  var u = svgEl('g',{ 'class':'unit', 'data-hex':hexKey });
  bpUnitToken(u, xy[0], xy[1], unit.owner, unit.type, {});
  g.appendChild(u);
  return u;
}

// the mat slot's mini token (its own 20x20 <svg> string), echoing the board
// markings. col/colD are the caller's side colours. Returns a string for
// innerHTML, not a DOM append, because the slot spans are built by concat.
function bpUnitGlyph(type, col, colD){
  var mark = unitMark(type), m = UNIT_CONFIG.mat;
  return '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="' + m.r + '" fill="' + col +
    '" stroke="' + colD + '" stroke-width="' + m.sw + '"/>' +
    (mark ? mark.mat({ ink: UNIT_CONFIG.ink.chit }) : '') + '</svg>';
}
