/* The hex house — the engine's dialect: a hex as a COORDINATE.

   Bottom of the vocabulary. Nothing here names a board, a map, a unit or a
   rule; everything above names a hex. A hex IS its key, the string 'q,r' —
   state keys, map data and log lines all spell it that way, and this file is
   the only place that spelling is written.

   Pointy-top axial. What is written once: the identity (key/parseKey), the six
   directions and their names, the step to a neighbouring coordinate, the
   distance between two, and the names of a border (edgeKey) and of one hex's
   face of a border (sideKey).

   The abstract hex always has six neighbours. WHICH of them exist is the
   board's outline question, so the on-board filter and the per-shape neighbour
   cache are 02-board.js's (I.neighbor/I.neighbors), written over step().

   The screen's dialect — where a hex sits in pixels — is game/ui/hex/hex-screen.js.

   Classic script (browser + node), shared namespace g.WOA_E. Prose: hex.md */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // Directions are an ORDER, not a set: d is an index into both tables, and a
  // side key stores that index. Rotating this list renumbers every map file.
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var DIR_NAMES = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];

  function key(q, r) { return q + ',' + r; }
  // Memoized: a run parses the same few dozen keys millions of times (the AI
  // search asks for a distance or a direction on every node it visits), and the
  // split+coerce was the cost. Contract: the returned pair is SHARED — callers
  // treat it read-only, as every caller in the repo does.
  var COORDS = {};
  function parseKey(k) {
    var c = COORDS[k];
    if (c) return c;
    var p = k.split(',');
    return (COORDS[k] = [+p[0], +p[1]]);
  }
  function dirName(d) { return DIR_NAMES[d]; }
  // The way back across the same border.
  function oppositeDir(d) { return (d + 3) % 6; }

  // The coordinate one step from k in direction d, on-board or not.
  function step(k, d) {
    var p = parseKey(k);
    return key(p[0] + DIRS[d][0], p[1] + DIRS[d][1]);
  }
  // The direction from a to b, or -1 when they are not adjacent.
  function dirBetween(a, b) {
    var pa = parseKey(a), pb = parseKey(b);
    var dq = pb[0] - pa[0], dr = pb[1] - pa[1];
    for (var d = 0; d < 6; d++) if (DIRS[d][0] === dq && DIRS[d][1] === dr) return d;
    return -1;
  }
  function dist(a, b) {
    var pa = parseKey(a), pb = parseKey(b);
    var dq = pa[0] - pb[0], dr = pa[1] - pb[1];
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  /* ---------- borders ----------
     An EDGE is the border between two hexes, named the same from either end.
     A SIDE is one hex's face of that border (see docs/HexClarificationDiagram.png):
     the two hexes on a border own their faces separately, so anything that
     sits on a border is stored per side. */
  function edgeKey(hexA, hexB) { return hexA < hexB ? hexA + '|' + hexB : hexB + '|' + hexA; }
  function sideKey(h, d) { return h + '>' + d; }
  function parseSideKey(sk) {
    var i = sk.indexOf('>');
    return [sk.slice(0, i), +sk.slice(i + 1)];
  }
  function sideHex(sk) { return sk.slice(0, sk.indexOf('>')); }
  function sideDir(sk) { return +sk.slice(sk.indexOf('>') + 1); }
  // The other hex's face of the same border.
  function facingSide(h, d) { return sideKey(step(h, d), oppositeDir(d)); }

  /* shared-namespace exports */
  I.DIRS = DIRS;
  I.DIR_NAMES = DIR_NAMES;
  I.dirName = dirName;
  I.oppositeDir = oppositeDir;
  I.key = key;
  I.parseKey = parseKey;
  I.step = step;
  I.dirBetween = dirBetween;
  I.dist = dist;
  I.edgeKey = edgeKey;
  I.sideKey = sideKey;
  I.parseSideKey = parseSideKey;
  I.sideHex = sideHex;
  I.sideDir = sideDir;
  I.facingSide = facingSide;
})(typeof window !== 'undefined' ? window : globalThis);
