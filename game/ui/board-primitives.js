/* War of Attrition — ui part: the shared BOARD primitives toolkit. The
   board-side twin of chart-primitives.js. Holds the one svgEl DOM builder, the
   board's framing (viewBoxFor), the BOARD palette, and a bp* primitive for
   every mark the game board draws — hex tiles, HQs, unit tokens, attack-math
   pills, the highlight polygon. board.js draws over this toolkit and builds
   nothing by hand: one implementation of each mark, restyled in one place,
   reflected everywhere the board draws it.

   WHERE a hex and its faces sit is not here: that is the hex house's screen
   dialect (ui/hex/hex-screen.js), which loads first and this file calls.
   Terrain marks are NOT here either: each type draws itself in ui/board/terrain/,
   which loads after this file and uses both.

   svgEl is GLOBAL on purpose — every board consumer reuses it, so this file
   loads before them in index.html's script chain. Every board consumer draws
   from ONE palette + shared builders: fx.js (live-board
   flourishes) takes its colours + unit radius from BOARD/BOARD_R; the manual
   diagram (manual.js, MP_S scale) and the map editor (map-editor.js) draw
   their hexes/terrain/HQ/units through hexXY(k,s) + bpUnitToken / bpHQMarker
   (sizes are options, colours from BOARD) and route every board colour through
   BOARD — so restyling a terrain glyph, a side colour, or the unit token is
   one edit reflected on every board in the game. The mini-boards keep their
   own scale-tuned line widths + editing/animation overlays; only the marks and
   the palette are shared. A colour the stylesheet also paints stays a CSS var
   here (terrain, sides, brass; the board ink + star + attack red read
   var(--ink-plate)/var(--star)/var(--attack)); the glyph inks the stylesheet
   never sees (the chit) — plus the ghost-hex wash — are named once in BOARD. */
'use strict';

/* =================== the svg builder + the board's frame =================== */
function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
// the viewBox that frames a list of hexes, at the hex house's positions.
function viewBoxFor(hexList, s){
  s = s || HEX_CONFIG.board.size;
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = hexXY(k, s);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = s*1.3;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}

/* =================== mark radii + stroke tokens =================== */
// board glyph radii, as a fraction of the live board's hex size.
// (terrain insets are per type, declared with each mark in ui/board/terrain/)
var BOARD_R = { hqOuter:HEX_CONFIG.board.size*0.62, hqInner:HEX_CONFIG.board.size*0.5, unit:HEX_CONFIG.board.size*0.5 };
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
  s = s || HEX_CONFIG.board.size;
  var lbl = svgEl('text', { x:cx, y:cy - s*0.58, 'text-anchor':'middle', 'class':'coordlbl' });
  if (pe) lbl.setAttribute('pointer-events', pe);
  lbl.textContent = text;
  g.appendChild(lbl);
  return lbl;
}
// one parchment hex + its coord label
function bpHexTile(g, key){
  var xy = hexXY(key), qr = E.parseKey(key);
  var p = bpHexPoly(xy[0], xy[1], HEX_CONFIG.board.tile, ((qr[0]-qr[1])%2+2)%2);
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
// the hover-only attack-math layer + one pill on it
function bpAttackLayer(){ return svgEl('g', { 'class':'atk-hints', 'pointer-events':'none' }); }
function bpAttackPill(g, hexKey, text, outcome){
  var xy = hexXY(hexKey);
  var fill = BOARD.hint[outcome] || BOARD.hint.defender; // matches the old else-branch (defender/red default)
  var w = text.length * 6.6 + 12;
  g.appendChild(svgEl('rect', { x: xy[0]-w/2, y: xy[1]+HEX_CONFIG.board.size*0.18, width: w, height: 17, rx: 8.5,
    fill: fill, stroke: BOARD.outline, 'stroke-width': 1 }));
  var t = svgEl('text', { x: xy[0], y: xy[1]+HEX_CONFIG.board.size*0.18+12.5, 'text-anchor': 'middle',
    'font-size': 11, 'font-weight': 'bold', fill: BOARD.star });
  t.textContent = text;
  g.appendChild(t);
}

// a hex-fill highlight polygon (caller attaches the click handler)
function bpHighlight(g, key, cls){
  var xy = hexXY(key);
  var p = svgEl('polygon',{ points: hexPoints(xy[0], xy[1], HEX_CONFIG.board.tile-2), 'class':'hl '+cls });
  g.appendChild(p);
  return p;
}

/* =================== map-editor marks =================== */
// an invisible edge-hit line (.edge-hit CSS makes it a fat transparent click
// target). Returns the line so the editor wires its own terrain-paint handler.
function bpEdgeHitLine(g, hexKey, dir, rad, s){
  var pt = hexEdgePts(hexKey, dir, rad, s);
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

/* =================== string thumbnail marks (maps-screen previews) ===================
   The one STRING board renderer: the map-library thumbnails go into innerHTML
   (var(--…) resolves in the DOM), so previewSVG builds an SVG string — the same
   geometry (the hex house's screen dialect) + BOARD palette as the live board, at
   its own tiny scale (hex-config's thumb row). The tile is deliberately its OWN look (BOARD.thumbTile,
   not the .hex CSS class), and the HQ is a plain side-coloured hex (no brass ring
   / star). Each thumbnail mark lives in one bpThumb* builder, so maps-screen.js
   builds nothing by hand. */
function bpThumbHex(cx, cy, rad){
  return '<polygon points="'+hexPoints(cx, cy, rad)+'" fill="'+BOARD.thumbTile+'" stroke="'+BOARD.thumbTileStroke+'" stroke-width="0.8"/>';
}
function bpThumbHQ(cx, cy, side, rad){
  return '<polygon points="'+hexPoints(cx, cy, rad)+'" fill="'+BOARD.side(side).fill+'" stroke="'+BOARD.outline+'" stroke-width="0.8"/>';
}
// self-contained map thumbnail (no global board state): tiles, terrain sides, HQs.
function previewSVG(def){
  var s = HEX_CONFIG.thumb.size;
  var hexList = E.boardHexes(E.ensureMapShape(def));
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  var body = '';
  hexList.forEach(function(k){
    var p = hexXY(k, s);
    minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]);
    body += bpThumbHex(p[0], p[1], HEX_CONFIG.thumb.tile);
  });
  (def.pieces||[]).forEach(function(pc){
    pc.edges.forEach(function(e){
      var c = hexXY(E.key(e[0],e[1]), s), aa = hexCornerAngles(e[2]);
      body += bpThumbTerrain(hexCornerPt(c[0],c[1],aa[0],s-2.4), hexCornerPt(c[0],c[1],aa[1],s-2.4), pc.t);
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
