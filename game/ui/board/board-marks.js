/* How a board is DRAWN. The base; every other *-mark.js file here is one mark.

   A mark is anything drawn on a hex board. It takes its geometry from the hex
   house, its ink from board-config.js, and its SCALE FROM THE CALLER — every
   board in the game (the live one, the Field Manual's diagram, the map editor,
   the library thumbnails, the dashboard's lenses) draws the same marks at its
   own size, so a mark is never respelt for a smaller board.

   A mark declares its LIFETIME, because what is ON the board and what JUST
   HAPPENED on it are different acts:

     standing   part of the board's state — drawn when the board is drawn, and
                gone when it is drawn again (tiles, HQs, highlights).
     transient  a moment over an already-drawn board — bpPlay puts it on and
                takes it away again after the mark's own ms (the strike, the
                support ring). Drawing one with bpMark instead freezes it, which
                is what the Field Manual's diagram frames do.

   The seat's colours are NOT this house's: a mark asks BOARD.side(owner) what
   red and blue are and paints whatever comes back. The unit token is the unit
   house's, the terrain glyphs the terrain house's; both draw into layers this
   file lays down.

   Classic script, no wrapper. Loads after ui/board/hex/hex-screen.js, whose
   geometry every mark draws with, and ui/kit/svg.js. Prose: engine/board/board.md */
'use strict';

var BOARD_MARK = {};

// spec: { mark, lifetime, draw }
//   draw  function(g, o) appending the mark to g; o carries the caller's
//         options plus the resolved s (hex size), d (this mark's dials on this
//         surface) and ink (the board palette).
function defineBoardMark(spec){
  ['mark', 'lifetime', 'draw'].forEach(function(f){
    if (spec[f] == null) throw new Error('defineBoardMark(' + spec.mark + '): missing ' + f);
  });
  if (spec.lifetime !== 'standing' && spec.lifetime !== 'transient')
    throw new Error('defineBoardMark(' + spec.mark + '): lifetime is standing or transient, not "' + spec.lifetime + '"');
  if (BOARD_MARK[spec.mark]) throw new Error('defineBoardMark: duplicate ' + spec.mark);
  BOARD_MARK[spec.mark] = spec;
}
function boardMark(name){ return BOARD_MARK[name] || null; }
// A mark's dials on one surface: the surface's row read over the live board's.
// Deep, because a dial may be a group of its own (struck's radii, glow's two
// flavours) and a row naming one of them must not drop its siblings.
function boardDial(name, on){
  var row = (on && on !== 'board' && BOARD_CONFIG[on] && BOARD_CONFIG[on][name]) || {};
  return boardDialMerge(BOARD_CONFIG.board[name] || {}, row);
}
function boardDialMerge(base, row){
  var out = {}, k;
  for (k in base) out[k] = base[k];
  for (k in row){
    out[k] = (isDialGroup(base[k]) && isDialGroup(row[k])) ? boardDialMerge(base[k], row[k]) : row[k];
  }
  return out;
}
function isDialGroup(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
// Draw a mark into a caller-owned group. o.on names the surface (a row in
// board-config.js AND in hex-config.js, so the scale follows the dials);
// o.s overrides the size outright.
function bpMark(name, g, o){
  var m = BOARD_MARK[name];
  if (!m) throw new Error('bpMark: no such mark "' + name + '" (add a file in ui/board/)');
  var on = o && o.on || 'board', r = {}, k;
  for (k in o) r[k] = o[k];
  r.on = on;
  r.s = (o && o.s) || HEX_CONFIG[on].size;
  r.d = boardDial(name, on);
  r.ink = BOARD_CONFIG.board.ink;
  return m.draw(g, r);
}
// The same marks as an SVG string, for the two surfaces that go into innerHTML
// (the map thumbnails, the dashboard's lenses). draw(g) uses bpMark as usual.
function bpMarkup(draw){
  var g = svgEl('g', {});
  draw(g);
  return g.innerHTML;
}
// A transient mark: on the board, then gone after its own declared life.
function bpPlay(svg, name, o){
  var m = BOARD_MARK[name];
  if (!m) throw new Error('bpPlay: no such mark "' + name + '"');
  if (m.lifetime !== 'transient') throw new Error('bpPlay: "' + name + '" is a standing mark');
  if (!svg || !svg.firstChild) return null;
  var el = bpMark(name, svg, o);
  var ms = boardDial(name, o && o.on).ms;
  setTimeout(function(){ if (el && el.parentNode) el.parentNode.removeChild(el); }, ms);
  return el;
}
/* =================== the board's frame =================== */
// the viewBox that frames a list of hexes, at the hex house's positions.
function viewBoxFor(hexList, s, on){
  on = on || 'board';
  s = s || HEX_CONFIG[on].size;
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = hexXY(k, s);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = s * boardDial('frame', on).gutter;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}
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
// the hover-only attack-math layer the pills go on
function bpAttackLayer(){ return svgEl('g', { 'class':'atk-hints', 'pointer-events':'none' }); }
