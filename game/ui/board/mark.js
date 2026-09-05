/* The BOARD house's MARK base: every persistent mark on a hex board.

   A mark takes its geometry from a hex key, its ink from the BOARD palette and
   its scale from the caller, so the live board, the field manual's diagram and
   the map editor draw one implementation of each at three sizes. Restyle a side
   colour or the unit token here and every board in the game follows.

   Terrain marks are rooms of their own directory (board/terrain/), which loads
   after this file and uses its geometry. Transient marks — what just happened
   rather than what is there — are board/overlay.js. The map-library thumbnails
   keep their own emitter in board/thumbnail.js: they build an innerHTML string,
   not DOM.

   The geometry and svgEl are global on purpose: every board consumer reuses
   them. A colour the stylesheet also paints stays a CSS var here; the glyph
   inks the stylesheet never sees are named once in BOARD. */
'use strict';


/* =================== hex geometry (shared) =================== */
// S is the live board's hex size; every geometry helper takes an optional
// scale so a mini-board (manual.js at MP_S) shares ONE implementation.
var S = 44, SQ3 = Math.sqrt(3);
function hexXY(k, s){
  s = s || S;
  var qr = E.parseKey(k);
  return [ s*SQ3*(qr[0] + qr[1]/2), s*1.5*qr[1] ];
}
function cornerAngles(d){ // dir -> [a1,a2] degrees (y down)
  var ang = [0,-60,-120,180,120,60][d];
  return [ang-30, ang+30];
}
function cornerPt(cx, cy, angDeg, rad){
  var a = angDeg*Math.PI/180;
  return [cx + rad*Math.cos(a), cy + rad*Math.sin(a)];
}
function hexPoints(cx, cy, rad){
  var pts = [];
  for (var i=0;i<6;i++){
    var a = (60*i - 90)*Math.PI/180;
    pts.push((cx+rad*Math.cos(a)).toFixed(1)+','+(cy+rad*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}
function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function viewBoxFor(hexList, s){
  s = s || S;
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = hexXY(k, s);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = s*1.3;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}
// the two endpoints of an inset edge (terrain/trench/barrage all share this).
// s scales the hex centre so a mini-board (manual at MP_S) shares ONE impl.
function bpEdgePts(hexKey, dir, rad, s){
  var c = hexXY(hexKey, s), aa = cornerAngles(dir);
  return [ cornerPt(c[0], c[1], aa[0], rad), cornerPt(c[0], c[1], aa[1], rad) ];
}

/* =================== geometry + stroke tokens =================== */
// board glyph radii, as a fraction of the hex size S — the inset a mark sits at.
// (terrain insets are per type, declared with each mark in ui/board/terrain/)
var BOARD_R = { hqOuter:S*0.62, hqInner:S*0.5, unit:S*0.5 };
// line weights reused across marks/consumers (the twin of BOARD_R). A mark's own
// one-off default width stays inline at the mark; only shared widths live here.
var BOARD_SW = { unit:2.5 }; // unit-token outline — fx.js's fallen-unit ghost mirrors it

/* =================== palette =================== */
// The board palette: the twin of :root for the board's SVG. A colour the
// stylesheet also paints lives in :root once and is read here as var(--…)
// (resolves in an SVG attribute, same as the unit fills). The glyph inks the
// stylesheet never sees are named once here.
var BOARD = {
  // Terrain colours are not here — each type's mark owns its own stroke and
  // glyph ink (ui/board/terrain/).
  // side colours (units + HQ) from CSS
  red:'var(--red)', redDark:'var(--red-dark)', blue:'var(--blue)', blueDark:'var(--blue-dark)',
  brass:'var(--brass)',
  outline:'var(--ink-plate)',   // the near-black board ink (piece + pill strokes)
  chit:'#ece1c4',       // the unit chit
  star:'var(--star)',   // HQ star + pill text
  barrage:'var(--attack)',      // barrage action marks
  thumbTile:'var(--hex)', thumbTileStroke:'var(--hex-stroke)', // maps-screen preview tiles (own look, not the live .hex class)
  // attack-math pill fill by combat outcome (neutral = manual's "no clear side")
  hint:{ attacker:'rgba(58,99,48,.92)', tie:'rgba(138,108,60,.94)', defender:'rgba(111,29,25,.92)', neutral:'rgba(74,61,38,.92)' },
  // the editor/dig ghost-hex affordance (own board-only wash + gold hover)
  ghostFill:'rgba(255,255,255,.10)', ghostStroke:'rgba(74,61,38,.5)', ghostHover:'rgba(212,175,55,.28)',
  // fx.js transient support-ring accents (drawn on the live board, not marks)
  supportAlly:'var(--gold)',    // gold — an allied unit whose support counted
  supportEnemy:'var(--steel)'   // slate — a defender's support that counted
};
BOARD.side = function(owner){
  return owner==='red' ? { fill:BOARD.red, dark:BOARD.redDark } : { fill:BOARD.blue, dark:BOARD.blueDark };
};

/* =================== board setup =================== */
// clear the svg, size its viewBox to the hex geometry (kills empty gutters on
// tall maps), and lay down the five draw layers back-to-front. Returns the
// layer groups the caller draws into.
function bpBeginBoard(svg){
  svg.innerHTML = '';
  svg.setAttribute('viewBox', viewBoxFor(E.hexes()));
  var vb = svg.getAttribute('viewBox').split(' ');
  svg.style.setProperty('--board-ar', (parseFloat(vb[2]) / parseFloat(vb[3])).toFixed(4));
  var layers = { hex:svgEl('g',{}), ter:svgEl('g',{}), tr:svgEl('g',{}), pc:svgEl('g',{}), hl:svgEl('g',{}) };
  svg.appendChild(layers.hex); svg.appendChild(layers.ter); svg.appendChild(layers.tr);
  svg.appendChild(layers.pc); svg.appendChild(layers.hl);
  return layers;
}

/* =================== primitives =================== */
// the bare parchment hex-tile polygon (its look is the .hex / .hex.dark CSS
// class). Shared by every board renderer: the live board (bpHexTile adds the
// coord label + data-hex), the manual diagram, and the map editor.
function bpHexPoly(cx, cy, rad, dark){
  return svgEl('polygon', { points: hexPoints(cx, cy, rad), 'class': 'hex' + (dark ? ' dark' : '') });
}
// the grid coord label above a hex centre. ONE impl for every board (live board,
// manual, editor); s scales the offset, pe optionally makes it click-through.
function bpCoordLabel(g, cx, cy, text, s, pe){
  s = s || S;
  var lbl = svgEl('text', { x:cx, y:cy - s*0.58, 'text-anchor':'middle', 'class':'coordlbl' });
  if (pe) lbl.setAttribute('pointer-events', pe);
  lbl.textContent = text;
  g.appendChild(lbl);
  return lbl;
}
// one parchment hex + its coord label
function bpHexTile(g, key){
  var xy = hexXY(key), qr = E.parseKey(key);
  var p = bpHexPoly(xy[0], xy[1], S-1, ((qr[0]-qr[1])%2+2)%2);
  p.dataset.hex = key;
  g.appendChild(p);
  bpCoordLabel(g, xy[0], xy[1], E.hexLabel(key));
  return p;
}

// a headquarters marker at an explicit centre. ONE implementation shared by the
// live board, the manual diagram, and the map editor — sizes/stroke-widths are
// options (board defaults reproduce the live board), colours come from BOARD.
// o: { rOuter, rInner (false = no brass ring), outerSW, brassSW, starFS, starDY, pe }
function bpHQMarker(g, cx, cy, side, o){
  o = o || {};
  var col = BOARD.side(side).fill, pe = o.pe;
  var poly = svgEl('polygon',{ points: hexPoints(cx, cy, o.rOuter!=null?o.rOuter:BOARD_R.hqOuter),
    fill:col, stroke:BOARD.outline, 'stroke-width':o.outerSW!=null?o.outerSW:2, opacity:.92 });
  if (pe) poly.setAttribute('pointer-events', pe);
  g.appendChild(poly);
  var rInner = o.rInner!=null ? o.rInner : BOARD_R.hqInner;
  if (rInner !== false){
    var ring = svgEl('polygon',{ points: hexPoints(cx, cy, rInner), fill:'none', stroke:BOARD.brass, 'stroke-width':o.brassSW!=null?o.brassSW:1.6 });
    if (pe) ring.setAttribute('pointer-events', pe);
    g.appendChild(ring);
  }
  var star = svgEl('text',{ x:cx, y:cy+(o.starDY!=null?o.starDY:7), 'text-anchor':'middle', 'font-size':o.starFS!=null?o.starFS:20, fill:BOARD.star });
  if (pe) star.setAttribute('pointer-events', pe);
  star.textContent = '★';
  g.appendChild(star);
}
function bpHQ(g, hexKey, side){ var xy = hexXY(hexKey); bpHQMarker(g, xy[0], xy[1], side, {}); }

// a unit token (circle + chit + type glyph) drawn into a caller-owned group at
// an explicit centre. ONE implementation shared by the live board and the
// manual diagram; sizes are options (board defaults), colours from BOARD.
// o: { r, circSW, chitHW, chitHH, chitSW, glyphSW, artR }
function bpUnitToken(g, cx, cy, owner, type, o){
  o = o || {};
  var sc = BOARD.side(owner), col = sc.fill, colD = sc.dark;
  var r = o.r!=null?o.r:BOARD_R.unit, hw = o.chitHW!=null?o.chitHW:13, hh = o.chitHH!=null?o.chitHH:9, gsw = o.glyphSW!=null?o.glyphSW:2;
  g.appendChild(svgEl('circle',{ cx:cx, cy:cy, r:r, fill:col, stroke:colD, 'stroke-width':o.circSW!=null?o.circSW:BOARD_SW.unit }));
  g.appendChild(svgEl('rect',{ x:cx-hw, y:cy-hh, width:hw*2, height:hh*2, fill:BOARD.chit, stroke:colD, 'stroke-width':o.chitSW!=null?o.chitSW:1.4, rx:1.5 }));
  if (type==='infantry'){
    g.appendChild(svgEl('line',{ x1:cx-hw, y1:cy-hh, x2:cx+hw, y2:cy+hh, stroke:colD, 'stroke-width':gsw }));
    g.appendChild(svgEl('line',{ x1:cx-hw, y1:cy+hh, x2:cx+hw, y2:cy-hh, stroke:colD, 'stroke-width':gsw }));
  } else if (type==='cavalry'){
    g.appendChild(svgEl('line',{ x1:cx-hw, y1:cy+hh, x2:cx+hw, y2:cy-hh, stroke:colD, 'stroke-width':gsw }));
  } else {
    g.appendChild(svgEl('circle',{ cx:cx, cy:cy, r:o.artR!=null?o.artR:4.5, fill:colD }));
  }
}
// the live-board unit: own <g class="unit" data-hex> for the attack-math hover.
function bpUnit(g, hexKey, unit){
  var xy = hexXY(hexKey);
  var u = svgEl('g',{ 'class':'unit', 'data-hex':hexKey });
  bpUnitToken(u, xy[0], xy[1], unit.owner, unit.type, {});
  g.appendChild(u);
  return u;
}

// a standalone mini piece glyph (its own 20x20 <svg> string), echoing the board
// markings — infantry X, cavalry slash, artillery shot, trench arc. The mats
// twin of bpUnitToken; col/colD are the caller's side colours (the chit
// ink and trench colour stay BOARD, one edit for both). Returns a string for
// innerHTML, not a DOM append, because the slot spans are built by concat.
function bpPieceGlyph(type, col, colD){
  var pre = '<svg viewBox="0 0 20 20">';
  if (type==='trench')
    return pre+'<path d="M3 13 Q10 5 17 13" stroke="'+terrainMark('T').stroke+'" stroke-width="2.6" stroke-dasharray="3.4 2.4" fill="none" stroke-linecap="round"/></svg>';
  var s = pre+'<circle cx="10" cy="10" r="8.4" fill="'+col+'" stroke="'+colD+'" stroke-width="1.6"/>';
  if (type==='infantry') s += '<path d="M5.5 13.5 L14.5 6.5 M5.5 6.5 L14.5 13.5" stroke="'+BOARD.chit+'" stroke-width="2" stroke-linecap="round"/>';
  else if (type==='cavalry') s += '<path d="M5.5 14 L14.5 6" stroke="'+BOARD.chit+'" stroke-width="2.3" stroke-linecap="round"/>';
  else s += '<circle cx="10" cy="10" r="3.4" fill="'+BOARD.chit+'"/>';
  return s+'</svg>';
}
// a hex-fill highlight polygon (caller attaches the click handler)
function bpHighlight(g, key, cls){
  var xy = hexXY(key);
  var p = svgEl('polygon',{ points: hexPoints(xy[0], xy[1], S-3), 'class':'hl '+cls });
  g.appendChild(p);
  return p;
}

/* =================== map-editor marks =================== */
// an invisible edge-hit line (.edge-hit CSS makes it a fat transparent click
// target). Returns the line so the editor wires its own terrain-paint handler.
function bpEdgeHitLine(g, hexKey, dir, rad, s){
  var pt = bpEdgePts(hexKey, dir, rad, s);
  var hit = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1], 'class':'edge-hit' });
  g.appendChild(hit);
  return hit;
}
// a dashed ghost-hex outline — the editor's "add this hex" affordance. Returns
// the polygon so the editor wires its own hover/click (fill defined here).
function bpGhostHex(g, cx, cy, rad){
  var p = svgEl('polygon', { points: hexPoints(cx, cy, rad),
    fill:BOARD.ghostFill, stroke:BOARD.ghostStroke, 'stroke-width':1.4, 'stroke-dasharray':'6 5' });
  g.appendChild(p);
  return p;
}

