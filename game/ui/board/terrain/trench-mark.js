/* Trench: a dashed earthwork, dug closer to the hex centre than map terrain so
   the two never sit on the same line.

   The only type the player places during a game, so it is the only one with dig
   affordances — a ghost of each offered orientation and the brass knob at the
   corner the pair shares. Those live here because they are the trench's look,
   not the board's. */
'use strict';

var TRENCH_MARK = {
  letter: 'T',
  stroke: '#5a4326',
  ink: '#5a4326',
  inset: 0.74,
  dash: '7 4'
};
defineTerrainMark(TRENCH_MARK);

// A dug trench on one edge. o = {s, rad, sw, dash} lets the manual's mini-board
// draw the same mark at its scale.
function bpTrenchLine(g, hexKey, dir, o){
  o = o || {};
  var s = o.s || S, rad = o.rad != null ? o.rad : terrainInset('T', s);
  var pt = bpEdgePts(hexKey, dir, rad, s);
  g.appendChild(svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:TRENCH_MARK.stroke, 'stroke-width':o.sw != null ? o.sw : 6.5,
    'stroke-linecap':'round', 'stroke-dasharray':o.dash || TRENCH_MARK.dash }));
}

// A faint preview of one offered orientation. Returns the line so the caller can
// solidify it when the knob is hovered.
function bpTrenchGhost(g, hexKey, dir){
  var pt = bpEdgePts(hexKey, dir, terrainInset('T'));
  var ln = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:TRENCH_MARK.stroke, 'stroke-width':8, 'stroke-linecap':'round',
    'stroke-dasharray':TRENCH_MARK.dash, opacity:.35, 'pointer-events':'none' });
  g.appendChild(ln);
  return ln;
}

// The brass knob a player clicks to dig, at the corner where edge d meets d+1.
// Returns the circle for the caller's hover/click.
function bpTrenchKnob(g, hexKey, firstDir){
  var c = hexXY(hexKey), cp = cornerPt(c[0], c[1], cornerAngles(firstDir)[0], terrainInset('T'));
  var knob = svgEl('circle', { cx:cp[0], cy:cp[1], r:8, fill:BOARD.brass,
    stroke:TRENCH_MARK.stroke, 'stroke-width':2.5, 'class':'hl' });
  g.appendChild(knob);
  return knob;
}
