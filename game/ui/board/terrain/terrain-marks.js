/* How terrain is DRAWN. The base; every other .js file here is one type's mark,
   the twin of its rules room in engine/board/terrain/.

   A mark declares a stroke colour, a glyph ink, how far inside the hex it sits,
   and — if it draws more than a bare line — a glyph function. Every board that
   shows terrain (the live board, the editor, the manual's mini-board, the map
   thumbnails) goes through bpTerrainEdge or bpTerrainStroke, so a type is drawn
   the same everywhere and no caller names one.

   Classic script, no wrapper. Loads after ui/hex/hex-screen.js, whose geometry
   (hexXY, hexEdgePts, hex-config's sizes) it draws with, and ui/board-primitives.js, whose svgEl
   and BOARD palette it uses. Prose: terrain.md */
'use strict';

var TERRAIN_MARK = {};

// spec: { letter, stroke, ink, inset, glyph? }
//   stroke  the side's line colour — a var(--…) so the stylesheet themes it
//   ink     the glyph's fill, which the stylesheet never sees
//   inset   fraction of the hex radius the mark sits at (its distance from the centre)
//   glyph   function(g, m, o) drawing the mark ON the line; m = {p1, p2, mx, my, c, ink}
function defineTerrainMark(spec){
  ['letter', 'stroke', 'ink', 'inset'].forEach(function(f){
    if (spec[f] == null) throw new Error('defineTerrainMark(' + spec.letter + '): missing ' + f);
  });
  if (TERRAIN_MARK[spec.letter]) throw new Error('defineTerrainMark: duplicate ' + spec.letter);
  TERRAIN_MARK[spec.letter] = spec;
}
function terrainMark(letter){ return TERRAIN_MARK[letter] || null; }
// The inset a mark sits at, in board units. Callers that draw ON a terrain side
// (a barrage target, a dig ghost) read it so their mark lands on the line.
function terrainInset(letter, s){
  var m = terrainMark(letter);
  return (m ? m.inset : 0.85) * (s || HEX_CONFIG.board.size);
}
// Called once at boot: a registered terrain type with no mark would draw nothing
// on the board, which is worse to debug than a load-time throw.
function terrainMarksCheck(){
  var missing = E.terrainTypes().filter(function(t){ return !TERRAIN_MARK[t.letter]; });
  if (missing.length) throw new Error('terrain types with no mark: ' +
    missing.map(function(t){ return t.name; }).join(', ') + ' (add a file in ui/board/terrain/)');
}

BOARD.terrainStroke = function(letter){
  var m = terrainMark(letter);
  return m ? m.stroke : BOARD.outline;
};

// The bare side line, no glyph — what the editor paints, and the base line under
// a full mark. Returns [p1, p2]; the editor reuses them for its click target.
// o: {s, rad, sw, pe, edgeData} — edgeData:false skips the hover attr.
function bpTerrainStroke(g, hexKey, dir, letter, o){
  o = o || {};
  var s = o.s || HEX_CONFIG.board.size, rad = o.rad != null ? o.rad : terrainInset(letter, s);
  var pt = hexEdgePts(hexKey, dir, rad, s), p1 = pt[0], p2 = pt[1];
  var attrs = { x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1], stroke: BOARD.terrainStroke(letter),
    'stroke-width': o.sw != null ? o.sw : 8, 'stroke-linecap':'round' };
  if (o.pe) attrs['pointer-events'] = o.pe;
  var line = svgEl('line', attrs);
  if (o.edgeData !== false) line.dataset.edge = E.sideKey(hexKey, dir);
  g.appendChild(line);
  return [p1, p2];
}

// One terrain side, drawn inside its owning hex: the line plus the type's glyph.
// Board defaults to the live size; a mini-board passes o = {s, sw, edgeData, …} plus any
// options the glyph reads, so the SAME mark renders at that scale.
function bpTerrainEdge(g, side, letter, o){
  o = o || {};
  var s = o.s || HEX_CONFIG.board.size, parts = E.parseSideKey(side), d = parts[1];
  var ep = bpTerrainStroke(g, parts[0], d, letter, { s:s, rad:o.rad, sw:o.sw, edgeData:o.edgeData });
  var mark = terrainMark(letter);
  if (!mark || !mark.glyph) return;
  var p1 = ep[0], p2 = ep[1];
  mark.glyph(g, { p1:p1, p2:p2, mx:(p1[0]+p2[0])/2, my:(p1[1]+p2[1])/2,
                  c:hexXY(parts[0], s), ink:mark.ink }, o);
}

// A barrage target highlight laid over a terrain side, at that type's own inset.
// Returns the line for the caller's hover/click.
function bpBarrageTerrain(g, hexKey, dir, letter){
  var pt = hexEdgePts(hexKey, dir, terrainInset(letter));
  var line = svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:BOARD.barrage, 'stroke-width':12, 'stroke-linecap':'round', opacity:.55, 'class':'hl' });
  g.appendChild(line);
  return line;
}

// The map-thumbnail form: a bare coloured side, as an SVG string at the
// thumbnail's own tiny scale (maps-screen builds its previews as markup).
function bpThumbTerrain(p1, p2, letter){
  return '<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+
    '" stroke="'+BOARD.terrainStroke(letter)+'" stroke-width="2.6" stroke-linecap="round"/>';
}
