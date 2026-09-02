/* War of Attrition — ui part: the shared BOARD primitives toolkit. The
   board-side twin of chart-primitives.js. Holds the hex geometry (S/hexXY/
   corner math/hexPoints/viewBoxFor), the one svgEl DOM builder, the BOARD
   palette, and a bp* primitive for every mark the game board draws — hex
   tiles, terrain glyphs, trenches, HQs, unit tokens, attack-math pills, the
   highlight polygon, and the trench/barrage action marks. board.js draws over
   this toolkit and builds nothing by hand: one implementation of each mark,
   restyled in one place, reflected everywhere the game board draws it.

   The geometry + svgEl are GLOBAL on purpose — every board consumer reuses
   them, so this file loads before them in index.html's script chain. Every
   board consumer draws from ONE palette + shared builders: fx.js (live-board
   flourishes) takes its colours + unit radius from BOARD/BOARD_R; the manual
   diagram (manual.js, MP_S scale) and the map editor (map-editor.js) draw
   their hexes/terrain/HQ/units through hexXY(k,s) + bpUnitToken / bpHQMarker
   (sizes are options, colours from BOARD) and route every board colour through
   BOARD — so restyling a terrain glyph, a side colour, or the unit token is
   one edit reflected on every board in the game. The mini-boards keep their
   own scale-tuned line widths + editing/animation overlays; only the marks and
   the palette are shared. Colours
   that live in CSS stay CSS vars here (var(--forest) etc.); the inline glyph
   hexes the stylesheet never sees (river current, forest dots, mountain peak,
   trench, barrage, chit/star/outline ink) are named once in BOARD. */
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
  thumbTile:'#d9cca8', thumbTileStroke:'#4a3d26', // maps-screen preview tiles (own look, not the live .hex class)
  // attack-math pill fill by combat outcome (neutral = manual's "no clear side")
  hint:{ attacker:'rgba(58,99,48,.92)', tie:'rgba(138,108,60,.94)', defender:'rgba(111,29,25,.92)', neutral:'rgba(74,61,38,.92)' },
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

// the bare terrain edge stroke (no glyph) — the coloured line the editor paints
// on its own, and the base line of the full glyphed side below. Returns [p1,p2]
// (the editor reuses them for its edge-hit line). o: {s, rad, sw, pe, edgeData}
// — edgeData:false skips the data-edge hover attr (mini-boards / editor).
function bpTerrainStroke(g, hexKey, dir, type, o){
  o = o || {};
  var s = o.s || S, rad = o.rad != null ? o.rad : s*0.85;
  var pt = bpEdgePts(hexKey, dir, rad, s), p1 = pt[0], p2 = pt[1];
  var attrs = { x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1], stroke: BOARD.terrainStroke(type),
    'stroke-width': o.sw != null ? o.sw : 8, 'stroke-linecap':'round' };
  if (o.pe) attrs['pointer-events'] = o.pe;
  var line = svgEl('line', attrs);
  if (o.edgeData !== false) line.dataset.edge = hexKey + '>' + dir;
  g.appendChild(line);
  return [p1, p2];
}
// a hex-owned terrain side, drawn inset inside the owning hex, with its glyph.
// Board defaults (S scale); a mini-board passes o = {s, sw, riverSW, riverDash,
// forestR, forestR2, edgeData} so the SAME mark renders at its scale.
function bpTerrainEdge(g, edgeKey, type, o){
  o = o || {};
  var s = o.s || S, parts = edgeKey.split('>'), d = +parts[1];
  var ep = bpTerrainStroke(g, parts[0], d, type, { s:s, rad:o.rad, sw:o.sw, edgeData:o.edgeData });
  var p1 = ep[0], p2 = ep[1];
  var mx=(p1[0]+p2[0])/2, my=(p1[1]+p2[1])/2, c = hexXY(parts[0], s);
  if (type==='R'){
    g.appendChild(svgEl('line',{ x1:(p1[0]*0.7+mx*0.3), y1:(p1[1]*0.7+my*0.3), x2:(p2[0]*0.7+mx*0.3), y2:(p2[1]*0.7+my*0.3),
      stroke:BOARD.riverCurrent, 'stroke-width':o.riverSW!=null?o.riverSW:2.2, 'stroke-linecap':'round', 'stroke-dasharray':o.riverDash||'6 5' }));
  } else if (type==='F'){
    var fr = o.forestR!=null?o.forestR:4.4, fr2 = o.forestR2!=null?o.forestR2:3.4;
    g.appendChild(svgEl('circle',{ cx:mx, cy:my, r:fr, fill:BOARD.forestGlyph }));
    g.appendChild(svgEl('circle',{ cx:(p1[0]+mx)/2, cy:(p1[1]+my)/2, r:fr2, fill:BOARD.forestGlyph }));
    g.appendChild(svgEl('circle',{ cx:(p2[0]+mx)/2, cy:(p2[1]+my)/2, r:fr2, fill:BOARD.forestGlyph }));
  } else {
    var ex = (p2[0]-p1[0]), eyy = (p2[1]-p1[1]);
    var tri = [ [mx-ex*0.14, my-eyy*0.14], [mx+ex*0.14, my+eyy*0.14], [mx-(my-c[1])*0.18, my+(mx-c[0])*0.18] ];
    g.appendChild(svgEl('polygon',{ points: tri.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' '), fill:BOARD.mountainPeak }));
  }
}

// a dug trench segment on one edge of a hex. o = {s, rad, sw, dash} lets a
// mini-board (manual at MP_S) draw the SAME mark at its scale.
function bpTrenchLine(g, hexKey, dir, o){
  o = o || {};
  var s = o.s || S, rad = o.rad != null ? o.rad : s*0.74;
  var pt = bpEdgePts(hexKey, dir, rad, s);
  g.appendChild(svgEl('line',{ x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:BOARD.trench, 'stroke-width':o.sw!=null?o.sw:6.5, 'stroke-linecap':'round', 'stroke-dasharray':o.dash||'7 4' }));
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
  g.appendChild(svgEl('circle',{ cx:cx, cy:cy, r:r, fill:col, stroke:colD, 'stroke-width':o.circSW!=null?o.circSW:2.5 }));
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
    fill:'rgba(255,255,255,.10)', stroke:'rgba(74,61,38,.5)', 'stroke-width':1.4, 'stroke-dasharray':'6 5' });
  g.appendChild(p);
  return p;
}

/* =================== string thumbnail marks (maps-screen previews) ===================
   The one STRING board renderer: the map-library thumbnails go into innerHTML
   (var(--…) resolves in the DOM), so previewSVG builds an SVG string — the same
   geometry (hexXY/hexPoints/corner math) + BOARD palette as the live board, at
   its own tiny s=11 scale. The tile is deliberately its OWN look (BOARD.thumbTile,
   not the .hex CSS class), and the HQ is a plain side-coloured hex (no brass ring
   / star). Each thumbnail mark lives in one bpThumb* builder, so maps-screen.js
   builds nothing by hand. */
function bpThumbHex(cx, cy, rad){
  return '<polygon points="'+hexPoints(cx, cy, rad)+'" fill="'+BOARD.thumbTile+'" stroke="'+BOARD.thumbTileStroke+'" stroke-width="0.8"/>';
}
function bpThumbTerrain(p1, p2, type){
  return '<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+
    '" stroke="'+BOARD.terrainStroke(type)+'" stroke-width="2.6" stroke-linecap="round"/>';
}
function bpThumbHQ(cx, cy, side, rad){
  return '<polygon points="'+hexPoints(cx, cy, rad)+'" fill="'+BOARD.side(side).fill+'" stroke="'+BOARD.outline+'" stroke-width="0.8"/>';
}
// self-contained map thumbnail (no global board state): tiles, terrain sides, HQs.
function previewSVG(def){
  var s = 11;
  var hexList = E.boardHexes(E.ensureMapShape(def));
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  var body = '';
  hexList.forEach(function(k){
    var p = hexXY(k, s);
    minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]);
    body += bpThumbHex(p[0], p[1], s-0.6);
  });
  (def.pieces||[]).forEach(function(pc){
    pc.edges.forEach(function(e){
      var c = hexXY(E.key(e[0],e[1]), s), aa = cornerAngles(e[2]);
      body += bpThumbTerrain(cornerPt(c[0],c[1],aa[0],s-2.4), cornerPt(c[0],c[1],aa[1],s-2.4), pc.t);
    });
  });
  ['red','blue'].forEach(function(side){
    var hq = def[side+'HQ'];
    if (!hq) return;
    var p = hexXY(E.key(hq[0],hq[1]), s);
    body += bpThumbHQ(p[0], p[1], side, s*0.62);
  });
  var m = s*1.4;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0)+'">'+body+'</svg>';
}
