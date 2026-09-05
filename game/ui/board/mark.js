/* The BOARD house's MARK base: everything drawn on a hex board.

   A mark takes its geometry from a hex key, its ink from board-config.js and
   its scale from the caller, so the live board, the field manual's diagram, the
   map editor and the library thumbnails draw one implementation of each at
   four sizes. Every mark is a room of marks/ — one file, one mark — and a new
   one is a new file, registered nowhere else.

   bpMark({id, lifetime, draw}) declares one; bpDraw(into, id, o) draws it
   and returns the element. `o.s` is the hex size (the live board's S by
   default) and every size in a room derives from it; `o.cls` adds a class the
   stylesheet can reach.

   LIFETIME is the room's own answer, and the two are not the same act:

     'kept'       what is on the board — a tile, a unit, an HQ, a highlight.
                  It draws its own element straight into the caller's layer and
                  hands it back, because the caller wires the clicks and the
                  next full repaint is what clears it.
     'transient'  what just happened on it — a strike, a support ring, a number
                  pill, a fallen unit. The base wraps it in its own group, marks
                  it click-through, and `o.ttl` takes it away again.

   Terrain marks are a house within the house (marks are per type, twinned with
   the engine's terrain rooms); they sit in board/terrain/ on their own base and
   use this file's geometry. The marks that emit an SVG *string* rather than DOM
   — the mat's piece glyph, the library thumbnail — stay with the room that
   needs them; a string is not an element and pretending otherwise buys nothing. */
'use strict';

var BOARD_MARKS = {};
var MARK_LIFETIMES = { kept:1, transient:1 };

function bpMark(spec){
  if (BOARD_MARKS[spec.id]) throw new Error('bpMark: duplicate id ' + JSON.stringify(spec.id));
  if (!MARK_LIFETIMES[spec.lifetime]) throw new Error('bpMark(' + spec.id + '): lifetime must be kept or transient');
  if (typeof spec.draw !== 'function') throw new Error('bpMark(' + spec.id + '): missing draw');
  BOARD_MARKS[spec.id] = spec;
  return spec;
}

function bpDraw(into, id, o){
  var spec = BOARD_MARKS[id];
  if (!spec) throw new Error('bpDraw: no mark ' + JSON.stringify(id));
  o = o || {};
  var s = o.s || S;
  if (spec.lifetime === 'kept') return spec.draw(into, o, s);
  var g = svgEl('g', { 'class': 'bpm bpm-' + id + (o.cls ? ' ' + o.cls : ''), 'pointer-events': 'none' });
  spec.draw(g, o, s);
  into.appendChild(g);
  if (o.ttl) setTimeout(function(){ if (g.parentNode) g.parentNode.removeChild(g); }, o.ttl);
  return g;
}
