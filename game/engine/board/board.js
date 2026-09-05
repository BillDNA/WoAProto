/* The BOARD house's door, engine half: the grid a skirmish is fought on.

   Where a hex is, who its neighbours are, how far apart two are, and what a
   side of one is called. The outline being played is shape.js and its form
   rooms; what a side DOES to a fight is terrain/ and its type rooms; this file
   is the grid all three stand on, and it opens the house by building the
   authored shapes once every form room has registered.

   Its twin on the other street is ui/board/, which draws what this describes.
   Prose: board.md.

   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- the grid (pointy-top axial) ---------- */
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]; // E NE NW W SW SE
  function key(q, r) { return q + ',' + r; }
  function parseKey(k) { var p = k.split(','); return [+p[0], +p[1]]; }

  I.DIRS = DIRS;
  I.key = key;
  I.parseKey = parseKey;

  // Per-shape geometry cache. Board topology (parsed coords + the six neighbor
  // keys of each hex) is a pure function of the immutable shape outline, but the
  // AI search re-derived it from scratch every call — parseKey split a "q,r"
  // string and key() re-concatenated one on every neighbor/dist/dirBetween, and
  // the Field Marshal search calls those millions of times per skirmish. Build
  // the tables once per shape (lazily) and read them instead: same values, no
  // per-call string churn. ensureMapShape rebuilds the shape object for shapeDef
  // maps, so the cache never goes stale. Held in a side WeakMap (not a property
  // on the shape) so a shape stays a pristine {list,set,…} for any enumerate /
  // serialize path.
  // Contract: neighbors()/coordOf() hand back the CACHED arrays, not copies —
  // callers MUST treat them read-only (all in-repo callers do; verified). Not
  // Object.freeze'd on purpose: freezing forces V8's slow frozen-elements read
  // path on these hottest-of-hot arrays and measured ~20% off throughput, which
  // defeats the point — the contract is the guard here, not the freeze.
  var GEO = new WeakMap();
  var LAST_SHAPE = null, LAST_GEO = null; // hot-path 1-entry cache (see geo())
  function buildGeo(s) {
    var coord = {}, nbr = {}, list = {}, L = s.list, i, d;
    for (i = 0; i < L.length; i++) coord[L[i]] = parseKey(L[i]);
    for (i = 0; i < L.length; i++) {
      var k = L[i], c = coord[k], row = new Array(6), lst = [];
      for (d = 0; d < 6; d++) {
        var nk = key(c[0] + DIRS[d][0], c[1] + DIRS[d][1]);
        if (s.set[nk]) { row[d] = nk; lst.push(nk); } else row[d] = null;
      }
      nbr[k] = row; list[k] = lst;
    }
    return { coord: coord, nbr: nbr, list: list };
  }
  function geo() {
    // Hot path: geo() runs on every neighbor/dist/coordOf call (millions/skirmish),
    // so keep a 1-entry cache keyed on the shape OBJECT identity — a bare ref
    // compare, no per-call WeakMap probe. It auto-invalidates on any shape swap
    // (setBoard) or rebuild (ensureMapShape makes a fresh object), and the WeakMap
    // still memoizes per shape so alternating maps never re-derive a seen shape.
    var s = I.SHAPES[I.currentShape()] || I.SHAPES[I.DEFAULT_SHAPE];
    if (s === LAST_SHAPE) return LAST_GEO;
    var g = GEO.get(s);
    if (!g) { g = buildGeo(s); GEO.set(s, g); }
    LAST_SHAPE = s; LAST_GEO = g;
    return g;
  }
  // Parsed [q,r] for a hex on the current board, from the cache; falls back to
  // parseKey for an off-board / unknown key. One home for the cache/parse rule.
  function coordOf(k) { return geo().coord[k] || parseKey(k); }

  function neighbor(k, d) {
    var row = geo().nbr[k];
    if (row) return row[d];
    var qr = parseKey(k); var q = qr[0] + DIRS[d][0], r = qr[1] + DIRS[d][1]; // off-board key: original math
    return I.inBoard(q, r) ? key(q, r) : null;
  }
  function neighbors(k) {
    // Returns the shape's cached neighbor list (read-only by contract, see the
    // cache note above) — sharing it skips a 6-way alloc on the search hot path.
    var lst = geo().list[k];
    if (lst) return lst;
    var out = [];
    for (var d = 0; d < 6; d++) { var n = neighbor(k, d); if (n) out.push(n); }
    return out;
  }
  function dirBetween(a, b) { // a,b adjacent
    var pa = coordOf(a), pb = coordOf(b);
    for (var d = 0; d < 6; d++) if (pa[0] + DIRS[d][0] === pb[0] && pa[1] + DIRS[d][1] === pb[1]) return d;
    return -1;
  }
  function dist(a, b) {
    var pa = coordOf(a), pb = coordOf(b);
    var dq = pa[0] - pb[0], dr = pa[1] - pb[1];
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }
  function edgeKey(hexA, hexB) { return hexA < hexB ? hexA + '|' + hexB : hexB + '|' + hexA; }
  function edgeFrom(k, d) {
    var n = neighbor(k, d);
    return n ? edgeKey(k, n) : null;
  }
  // Terrain is hex-owned and directional (see docs/HexClarificationDiagram.png):
  // a "side" is one hex's face of an edge. Key: 'q,r>d'.
  function sideKey(h, d) { return h + '>' + d; }

  // Where a map's authored terrain lands on the grid. What each side then DOES
  // is its type's room in board/terrain/; this only validates the placement.
  // returns { edges: {sideKey: terrain letter}, pieces:[{id,t,edgeKeys:[sideKey...]}] }
  function buildTerrain(map) {
    var edges = {}, pieces = [];
    map.pieces.forEach(function (p, i) {
      var prob = I.pieceProblem(p);
      if (prob) throw new Error('map "' + map.name + '" piece ' + (i + 1) + ': ' + prob);
      var eks = [];
      p.edges.forEach(function (e) {
        var k = key(e[0], e[1]);
        if (!I.inBoard(e[0], e[1]) || !neighbor(k, e[2])) throw new Error('map "' + map.name + '" side off board: ' + JSON.stringify(e));
        var sk = sideKey(k, e[2]);
        if (edges[sk]) throw new Error('map "' + map.name + '" duplicate side: ' + sk);
        edges[sk] = p.t;
        eks.push(sk);
      });
      pieces.push({ id: 'p' + i, t: p.t, edgeKeys: eks });
    });
    return { edges: edges, pieces: pieces };
  }

  I.neighbor = neighbor;
  I.neighbors = neighbors;
  I.dirBetween = dirBetween;
  I.dist = dist;
  I.edgeKey = edgeKey;
  I.edgeFrom = edgeFrom;
  I.sideKey = sideKey;
  I.buildTerrain = buildTerrain;

  // The house is open: every form room has registered, so the authored outlines
  // can be built.
  I.buildShapes();
})(typeof window !== 'undefined' ? window : globalThis);
