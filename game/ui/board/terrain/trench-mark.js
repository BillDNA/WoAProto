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
  inset: 0.74       // dug closer to the hex centre than map terrain, so the two never share a line
};                  // its line's weight and dash are the `trench` section of terrain-config.js
defineTerrainMark(TRENCH_MARK);

// The mat slot's mini trench, in its own 20x20 viewBox — the player mat draws a
// slot per trench a side may still dig, beside its unit slots.
function bpTrenchMatGlyph(){
  var m = TERRAIN_CONFIG.mat.trench;
  return '<svg viewBox="0 0 '+m.box+' '+m.box+'"><path d="'+m.path+'" stroke="'+TRENCH_MARK.stroke+
    '" stroke-width="'+m.sw+'" stroke-dasharray="'+m.dash+'" fill="none" stroke-linecap="round"/></svg>';
}

// A dug trench on one edge. o = {on} names the board; every weight is that row's.
function bpTrenchLine(g, hexKey, dir, o){
  o = o || {};
  var on = (o && o.on) || 'board', s = HEX_CONFIG[terrainHexRow(on)].size, d = terrainDial('trench', on);
  var pt = hexEdgePts(hexKey, dir, terrainInset('T', s, on), s);
  g.appendChild(svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:TRENCH_MARK.stroke, 'stroke-width':d.sw,
    'stroke-linecap':'round', 'stroke-dasharray':d.dash }));
}

// A faint preview of one offered orientation. Returns the line so the caller can
// solidify it when the knob is hovered.
function bpTrenchGhost(g, hexKey, dir){
  var pt = hexEdgePts(hexKey, dir, terrainInset('T'));
  var ln = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:TRENCH_MARK.stroke, 'stroke-width':TERRAIN_CONFIG.board.dig.ghostSW, 'stroke-linecap':'round',
    'stroke-dasharray':TERRAIN_CONFIG.board.trench.dash, opacity:TERRAIN_CONFIG.board.dig.ghostOpacity, 'pointer-events':'none' });
  g.appendChild(ln);
  return ln;
}

// The brass knob a player clicks to dig, at the corner where edge d meets d+1.
// Returns the circle for the caller's hover/click.
function bpTrenchKnob(g, hexKey, firstDir){
  var c = hexXY(hexKey), cp = hexCornerPt(c[0], c[1], hexCornerAngles(firstDir)[0], terrainInset('T'));
  var knob = svgEl('circle', { cx:cp[0], cy:cp[1], r:TERRAIN_CONFIG.board.dig.knobR, fill:BOARD_CONFIG.board.ink.brass,
    stroke:TRENCH_MARK.stroke, 'stroke-width':TERRAIN_CONFIG.board.dig.knobSW, 'class':'hl' });
  g.appendChild(knob);
  return knob;
}
