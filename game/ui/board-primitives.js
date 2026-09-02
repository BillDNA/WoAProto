/* War of Attrition — ui part: the shared BOARD primitives toolkit. The
   board-side twin of chart-primitives.js. Holds the hex geometry (S/hexXY/
   corner math/hexPoints/viewBoxFor), the one svgEl DOM builder, the BOARD
   palette, and a bp* primitive for every mark the game board draws — hex
   tiles, terrain glyphs, trenches, HQs, unit tokens, attack-math pills, the
   highlight polygon, and the trench/barrage action marks. board.js draws over
   this toolkit and builds nothing by hand: one implementation of each mark,
   restyled in one place, reflected everywhere the game board draws it.

   The geometry + svgEl are GLOBAL on purpose — every board consumer reuses
   them, so this file loads before them in index.html's script chain. fx.js
   draws transient flourishes on the SAME live #board and sources its colours +
   unit radius from here (BOARD/BOARD_R). The true mini-board renderers
   (map-editor.js, manual.js) still hand-draw their own miniatures at their own
   scale (own hexes/terrain/HQ/unit); parametrising the bp* marks by size so
   those two can call them is future work, not part of #223. Colours
   that live in CSS stay CSS vars here (var(--forest) etc.); the inline glyph
   hexes the stylesheet never sees (river current, forest dots, mountain peak,
   trench, barrage, chit/star/outline ink) are named once in BOARD. */
'use strict';

/* =================== hex geometry (shared) =================== */
var S = 44, SQ3 = Math.sqrt(3);
function hexXY(k){
  var qr = E.parseKey(k);
  return [ S*SQ3*(qr[0] + qr[1]/2), S*1.5*qr[1] ];
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
function viewBoxFor(hexList){
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = hexXY(k);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = S*1.3;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}
// the two endpoints of an inset edge (terrain/trench/barrage all share this)
function bpEdgePts(hexKey, dir, rad){
  var c = hexXY(hexKey), aa = cornerAngles(dir);
  return [ cornerPt(c[0], c[1], aa[0], rad), cornerPt(c[0], c[1], aa[1], rad) ];
}

/* =================== palette =================== */
// board glyph radii, as a fraction of the hex size S — the inset a mark sits at.
var BOARD_R = { terrain:S*0.85, trench:S*0.74, hqOuter:S*0.62, hqInner:S*0.5, unit:S*0.5 };
var BOARD = {
  // terrain strokes live in CSS (the stylesheet themes them); glyph fills don't
  forest:'var(--forest)', river:'var(--river)', mountain:'var(--mountain)',
  forestGlyph:'#3a6330', riverCurrent:'#a9c6dd', mountainPeak:'#5d5a52',
  // side colours (units + HQ) also from CSS
  red:'var(--red)', redDark:'var(--red-dark)', blue:'var(--blue)', blueDark:'var(--blue-dark)',
  brass:'var(--brass)',
  outline:'#2b2113',    // the near-black board ink (piece + pill strokes)
  chit:'#ece1c4',       // the unit chit
  star:'#f0e6cc',       // HQ star + pill text
  trench:'#5a4326',     // dug-in earthwork
  barrage:'#c0392b',    // barrage action marks
  // attack-math pill fill by combat outcome
  hint:{ attacker:'rgba(58,99,48,.92)', tie:'rgba(138,108,60,.94)', defender:'rgba(111,29,25,.92)' },
  // fx.js transient support-ring accents (drawn on the live board, not marks)
  supportAlly:'#d4af37',   // gold — an allied unit whose support counted
  supportEnemy:'#8ea8be'   // slate — a defender's support that counted
};
BOARD.side = function(owner){
  return owner==='red' ? { fill:BOARD.red, dark:BOARD.redDark } : { fill:BOARD.blue, dark:BOARD.blueDark };
};
BOARD.terrainStroke = function(t){ return t==='F' ? BOARD.forest : t==='R' ? BOARD.river : BOARD.mountain; };

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
// one parchment hex + its coord label
function bpHexTile(g, key){
  var xy = hexXY(key), qr = E.parseKey(key);
  var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], S-1), 'class':'hex'+(((qr[0]-qr[1])%2+2)%2 ? ' dark':'') });
  p.dataset.hex = key;
  g.appendChild(p);
  var lbl = svgEl('text', { x: xy[0], y: xy[1]-S*0.58, 'text-anchor':'middle', 'class':'coordlbl' });
  lbl.textContent = E.hexLabel(key);
  g.appendChild(lbl);
  return p;
}

// a hex-owned terrain side, drawn inset inside the owning hex, with its glyph
function bpTerrainEdge(g, edgeKey, type){
  var parts = edgeKey.split('>'), d = +parts[1];
  var pt = bpEdgePts(parts[0], d, BOARD_R.terrain), p1 = pt[0], p2 = pt[1];
  var line = svgEl('line', { x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1],
    stroke: BOARD.terrainStroke(type), 'stroke-width': 8, 'stroke-linecap':'round' });
  line.dataset.edge = edgeKey;
  g.appendChild(line);
  var mx=(p1[0]+p2[0])/2, my=(p1[1]+p2[1])/2, c = hexXY(parts[0]);
  if (type==='R'){
    g.appendChild(svgEl('line',{ x1:(p1[0]*0.7+mx*0.3), y1:(p1[1]*0.7+my*0.3), x2:(p2[0]*0.7+mx*0.3), y2:(p2[1]*0.7+my*0.3),
      stroke:BOARD.riverCurrent, 'stroke-width':2.2, 'stroke-linecap':'round', 'stroke-dasharray':'6 5' }));
  } else if (type==='F'){
    g.appendChild(svgEl('circle',{ cx:mx, cy:my, r:4.4, fill:BOARD.forestGlyph }));
    g.appendChild(svgEl('circle',{ cx:(p1[0]+mx)/2, cy:(p1[1]+my)/2, r:3.4, fill:BOARD.forestGlyph }));
    g.appendChild(svgEl('circle',{ cx:(p2[0]+mx)/2, cy:(p2[1]+my)/2, r:3.4, fill:BOARD.forestGlyph }));
  } else {
    var ex = (p2[0]-p1[0]), eyy = (p2[1]-p1[1]);
    var tri = [ [mx-ex*0.14, my-eyy*0.14], [mx+ex*0.14, my+eyy*0.14], [mx-(my-c[1])*0.18, my+(mx-c[0])*0.18] ];
    g.appendChild(svgEl('polygon',{ points: tri.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' '), fill:BOARD.mountainPeak }));
  }
}

// a dug trench segment on one edge of a hex
function bpTrenchLine(g, hexKey, dir){
  var pt = bpEdgePts(hexKey, dir, BOARD_R.trench);
  g.appendChild(svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:BOARD.trench, 'stroke-width':6.5, 'stroke-linecap':'round', 'stroke-dasharray':'7 4' }));
}

// a headquarters marker
function bpHQ(g, hexKey, side){
  var xy = hexXY(hexKey), col = BOARD.side(side).fill;
  g.appendChild(svgEl('polygon',{ points: hexPoints(xy[0], xy[1], BOARD_R.hqOuter), fill:col, stroke:BOARD.outline, 'stroke-width':2, opacity:.92 }));
  g.appendChild(svgEl('polygon',{ points: hexPoints(xy[0], xy[1], BOARD_R.hqInner), fill:'none', stroke:BOARD.brass, 'stroke-width':1.6 }));
  var star = svgEl('text',{ x:xy[0], y:xy[1]+7, 'text-anchor':'middle', 'font-size':20, fill:BOARD.star });
  star.textContent = '★';
  g.appendChild(star);
}

// a unit token (circle + chit + type glyph). Returns the <g> so the caller can
// wire the attack-math hover on it.
function bpUnit(g, hexKey, unit){
  var xy = hexXY(hexKey), sc = BOARD.side(unit.owner), col = sc.fill, colD = sc.dark;
  var u = svgEl('g',{ 'class':'unit', 'data-hex':hexKey });
  u.appendChild(svgEl('circle',{ cx:xy[0], cy:xy[1], r:BOARD_R.unit, fill:col, stroke:colD, 'stroke-width':2.5 }));
  u.appendChild(svgEl('rect',{ x:xy[0]-13, y:xy[1]-9, width:26, height:18, fill:BOARD.chit, stroke:colD, 'stroke-width':1.4, rx:1.5 }));
  if (unit.type==='infantry'){
    u.appendChild(svgEl('line',{ x1:xy[0]-13, y1:xy[1]-9, x2:xy[0]+13, y2:xy[1]+9, stroke:colD, 'stroke-width':2 }));
    u.appendChild(svgEl('line',{ x1:xy[0]-13, y1:xy[1]+9, x2:xy[0]+13, y2:xy[1]-9, stroke:colD, 'stroke-width':2 }));
  } else if (unit.type==='cavalry'){
    u.appendChild(svgEl('line',{ x1:xy[0]-13, y1:xy[1]+9, x2:xy[0]+13, y2:xy[1]-9, stroke:colD, 'stroke-width':2 }));
  } else {
    u.appendChild(svgEl('circle',{ cx:xy[0], cy:xy[1], r:4.5, fill:colD }));
  }
  g.appendChild(u);
  return u;
}

// the hover-only attack-math layer + one pill on it
function bpAttackLayer(){ return svgEl('g', { 'class':'atk-hints', 'pointer-events':'none' }); }
function bpAttackPill(g, hexKey, text, outcome){
  var xy = hexXY(hexKey);
  var fill = BOARD.hint[outcome] || BOARD.hint.defender; // matches the old else-branch (defender/red default)
  var w = text.length * 6.6 + 12;
  g.appendChild(svgEl('rect', { x: xy[0]-w/2, y: xy[1]+S*0.18, width: w, height: 17, rx: 8.5,
    fill: fill, stroke: BOARD.outline, 'stroke-width': 1 }));
  var t = svgEl('text', { x: xy[0], y: xy[1]+S*0.18+12.5, 'text-anchor': 'middle',
    'font-size': 11, 'font-weight': 'bold', fill: BOARD.star });
  t.textContent = text;
  g.appendChild(t);
}

// a hex-fill highlight polygon (caller attaches the click handler)
function bpHighlight(g, key, cls){
  var xy = hexXY(key);
  var p = svgEl('polygon',{ points: hexPoints(xy[0], xy[1], S-3), 'class':'hl '+cls });
  g.appendChild(p);
  return p;
}

// a dashed trench-orientation ghost (dig preview). Returns the line so the
// caller can toggle it solid on knob hover.
function bpTrenchGhost(g, hexKey, dir){
  var pt = bpEdgePts(hexKey, dir, BOARD_R.trench);
  var ln = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:BOARD.trench, 'stroke-width':8, 'stroke-linecap':'round', 'stroke-dasharray':'7 4', opacity:.35, 'pointer-events':'none' });
  g.appendChild(ln);
  return ln;
}
// the brass knob at a trench pair's shared corner (edge d ends where d+1 begins).
// Returns the circle so the caller can pulse/hover/click it.
function bpTrenchKnob(g, hexKey, firstDir){
  var c = hexXY(hexKey), cp = cornerPt(c[0], c[1], cornerAngles(firstDir)[0], BOARD_R.trench);
  var knob = svgEl('circle', { cx:cp[0], cy:cp[1], r:8, fill:BOARD.brass, stroke:BOARD.trench, 'stroke-width':2.5, 'class':'hl' });
  g.appendChild(knob);
  return knob;
}

// a barrage target mark on a trench edge (returns the line for hover/click)
function bpBarrageTrench(g, hexKey, dir){
  var pt = bpEdgePts(hexKey, dir, BOARD_R.trench);
  var seg = svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:BOARD.barrage, 'stroke-width':11, 'stroke-linecap':'round', opacity:.55, 'class':'hl' });
  g.appendChild(seg);
  return seg;
}
// a barrage target mark on a forest-piece edge (returns the line for hover/click)
function bpBarrageForestEdge(g, hexKey, dir){
  var pt = bpEdgePts(hexKey, dir, BOARD_R.terrain);
  var line = svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:BOARD.barrage, 'stroke-width':12, 'stroke-linecap':'round', opacity:.55, 'class':'hl' });
  g.appendChild(line);
  return line;
}
