/* A hex as a COORDINATE. Nothing here names a board, a map, a unit or a rule.

   Which of a hex's six neighbours EXIST needs an outline, so that filter is
   02-board.js's (I.neighbor/I.neighbors), written over step().

   Classic script (browser + node), shared namespace g.WOA_E. Prose: hex.md */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // An ORDER, not a set: d indexes both tables and is what a side key stores.
  // Rotating this list renumbers every map file.
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var DIR_NAMES = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];

  // Pointy-top axial, and the key IS the hex — 'q,r' is what state, map data and
  // log lines all store. Nothing anywhere holds a hex as a pair of numbers.
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
  // How a hex is NAMED for a human: letters down, numbers across, both 1-based
  // ('C4'). Which row and column a hex is in needs an outline, so the board
  // works those out (I.hexLabel) and asks here for the name.
  function gridName(row, col) { return String.fromCharCode(65 + row) + (col + 1); }

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
     Both hexes on a border own their own face of it, so a border has one edge
     name and two side names (docs/HexClarificationDiagram.png). */
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
  I.gridName = gridName;
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
