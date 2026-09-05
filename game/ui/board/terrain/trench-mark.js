/* Trench: a dashed earthwork, dug closer to the hex centre than map terrain so
   the two never sit on the same line.

   The only type the player places during a game, so it is the only one with dig
   affordances — a ghost of each offered orientation and the brass knob at the
   corner the pair shares — and the only one with a player-mat slot. Those live
   here because they are the trench's look, not the board's or the mat's. */
'use strict';

var TRENCH_MARK = {
  letter: 'T',
  stroke: 'var(--trench)',
  ink: 'var(--trench)',
  inset: 0.74,      // dug closer to the hex centre than map terrain, so the two never share a line
  dash: '7 4',      // the earthwork's broken line
  sw: 6.5           // thinner than a map side (TERRAIN_CONFIG.edge.sw)
};
defineTerrainMark(TRENCH_MARK);

// The mat slot's mini trench, in its own 20x20 viewBox — the player mat draws a
// slot per trench a side may still dig, beside its unit slots.
function bpTrenchMatGlyph(){
  return '<svg viewBox="0 0 20 20"><path d="M3 13 Q10 5 17 13" stroke="'+TRENCH_MARK.stroke+
    '" stroke-width="2.6" stroke-dasharray="3.4 2.4" fill="none" stroke-linecap="round"/></svg>';
}

// A dug trench on one edge. o = {s, rad, sw, dash} lets the manual's mini-board
// draw the same mark at its scale.
function bpTrenchLine(g, hexKey, dir, o){
  o = o || {};
  var s = o.s || HEX_CONFIG.board.size, rad = o.rad != null ? o.rad : terrainInset('T', s);
  var pt = hexEdgePts(hexKey, dir, rad, s);
  g.appendChild(svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:TRENCH_MARK.stroke, 'stroke-width':o.sw != null ? o.sw : TRENCH_MARK.sw,
    'stroke-linecap':'round', 'stroke-dasharray':o.dash || TRENCH_MARK.dash }));
}

// A faint preview of one offered orientation. Returns the line so the caller can
// solidify it when the knob is hovered.
function bpTrenchGhost(g, hexKey, dir){
  var pt = hexEdgePts(hexKey, dir, terrainInset('T'));
  var ln = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:TRENCH_MARK.stroke, 'stroke-width':TERRAIN_CONFIG.dig.ghostSW, 'stroke-linecap':'round',
    'stroke-dasharray':TRENCH_MARK.dash, opacity:TERRAIN_CONFIG.dig.ghostOpacity, 'pointer-events':'none' });
  g.appendChild(ln);
  return ln;
}

// The brass knob a player clicks to dig, at the corner where edge d meets d+1.
// Returns the circle for the caller's hover/click.
function bpTrenchKnob(g, hexKey, firstDir){
  var c = hexXY(hexKey), cp = hexCornerPt(c[0], c[1], hexCornerAngles(firstDir)[0], terrainInset('T'));
  var knob = svgEl('circle', { cx:cp[0], cy:cp[1], r:TERRAIN_CONFIG.dig.knobR, fill:BOARD.brass,
    stroke:TRENCH_MARK.stroke, 'stroke-width':TERRAIN_CONFIG.dig.knobSW, 'class':'hl' });
  g.appendChild(knob);
  return knob;
}
