/* How a unit is DRAWN. The base; every other .js file here is one type's mark,
   the twin of its rules room in engine/board/unit/.

   A type declares its glyph ONCE. The board token and the player mat's slot are
   the same three shapes at two scales — a side-coloured disc, the chit, the
   type's glyph on top — so both go through bpUnitToken and differ only by the
   sizes in unit-config.js. A mark also names the type's identity colour on the
   dashboard. Everything else a unit looks like is here, not in the rooms.

   Every surface that shows a unit (the live board, the map editor, the manual's
   mini-board, the player mat, the units pane) goes through bpUnitToken /
   bpUnitSlot / unitChartColor, so no caller names a type.

   The seat's colours are NOT this house's: a token asks BOARD.side(owner) what
   red and blue are and paints whatever comes back.

   Classic script, no wrapper. Loads after ui/board/hex/hex-screen.js, whose
   geometry it draws with, and ui/board-primitives.js, whose svgEl and side
   colours it uses. Prose: engine/board/unit/unit.md */
'use strict';

var UNIT_MARK = {};

// spec: { type, glyph, chart }
//   glyph  function(g, m) drawing the type's mark on the chit;
//          m = {cx, cy, hw, hh, ink, sw, dotR} — the chit's box and its ink
//   chart  function() -> the type's identity colour on the dashboard. A
//          function, so it reads the CHART palette, which loads later.
function defineUnitMark(spec){
  ['type', 'glyph', 'chart'].forEach(function(f){
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
// Called once at boot: a registered unit type with no mark would draw a blank
// chit, which is worse to debug than a load-time throw.
function unitMarksCheck(){
  var missing = E.unitTypes().filter(function(t){ return !UNIT_MARK[t]; });
  if (missing.length) throw new Error('unit types with no mark: ' + missing.join(', ') +
    ' (add a file in ui/board/unit/)');
}

// a unit token (disc + chit + type glyph) drawn into a caller-owned group at an
// explicit centre. ONE implementation shared by the live board, the editor, the
// manual diagram and the mat slot; every size is an option over the config
// defaults, and the colours are the caller's seat.
// o: { r, circSW, chitHW, chitHH, chitSW, glyphSW, dotR }
function bpUnitToken(g, cx, cy, owner, type, o){
  o = o || {};
  var sc = BOARD.side(owner);
  // token.r is a FRACTION of the hex, resolved here; every other size is absolute
  bpUnitShape(g, cx, cy, type, sc.fill, sc.dark,
    { r: o.r != null ? o.r : unitTokenR(), circSW:o.circSW, chitHW:o.chitHW, chitHH:o.chitHH,
      chitSW:o.chitSW, glyphSW:o.glyphSW, dotR:o.dotR }, UNIT_CONFIG.token);
}

// The same token from explicit colours rather than a seat — what the mat draws,
// since its slots are built from the mat's own red/blue.
function bpUnitShape(g, cx, cy, type, col, colD, o, tk){
  var r = o.r != null ? o.r : tk.r;
  var hw = o.chitHW != null ? o.chitHW : tk.chitHW, hh = o.chitHH != null ? o.chitHH : tk.chitHH;
  g.appendChild(svgEl('circle',{ cx:cx, cy:cy, r:r, fill:col, stroke:colD,
    'stroke-width':o.circSW != null ? o.circSW : tk.outlineSW }));
  if (tk.chitSW) g.appendChild(svgEl('rect',{ x:cx-hw, y:cy-hh, width:hw*2, height:hh*2,
    fill:UNIT_CONFIG.ink.chit, stroke:colD, 'stroke-width':o.chitSW != null ? o.chitSW : tk.chitSW, rx:1.5 }));
  var mark = unitMark(type);
  if (!mark) return;
  mark.glyph(g, { cx:cx, cy:cy, hw:hw, hh:hh,
                  ink: tk.chitSW ? colD : UNIT_CONFIG.ink.chit,
                  sw: o.glyphSW != null ? o.glyphSW : tk.glyphSW,
                  dotR: o.dotR != null ? o.dotR : tk.dotR });
}

// the live-board unit: own <g class="unit" data-hex> for the attack-math hover.
function bpUnit(g, hexKey, unit){
  var xy = hexXY(hexKey);
  var u = svgEl('g',{ 'class':'unit', 'data-hex':hexKey });
  bpUnitToken(u, xy[0], xy[1], unit.owner, unit.type, {});
  g.appendChild(u);
  return u;
}

// the mat slot's mini token, in its own square viewBox. Same shapes, same glyph,
// UNIT_CONFIG.mat sizes; no chit, because at 16px the glyph reads better cut
// straight out of the disc. Returns markup, not a node, because the slot spans
// are built by concat.
function bpUnitSlot(type, col, colD){
  var m = UNIT_CONFIG.mat;
  var svg = svgEl('svg', { viewBox: '0 0 ' + m.box + ' ' + m.box });
  bpUnitShape(svg, m.box / 2, m.box / 2, type, col, colD, {}, m);
  return svg.outerHTML;
}
