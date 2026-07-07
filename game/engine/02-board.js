/* War of Attrition — engine part 02: hex geometry, shapes, current-board state, terrain pieces.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- board geometry (pointy-top axial; shapes defined in maps.js) ---------- */
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]; // E NE NW W SW SE
  function key(q, r) { return q + ',' + r; }
  function parseKey(k) { var p = k.split(','); return [+p[0], +p[1]]; }

  // A shape def is { label, rows: [[r, qFrom, qTo], ...] } — contiguous spans —
  // OR { label, hexes: [[q, r], ...] } — an explicit hex set, the honest
  // representation for irregular outlines from the shape editor. From either we
  // build the hex list, a containment set, per-row grid labels (A1, B3, ...),
  // and — when the outline is point-symmetric — its 180-degree rotation centre.
  function buildShape(name, def) {
    var list = [], set = {}, rowsByR = {}, rs = [];
    var sumQ = 0, sumR = 0;
    function addHex(q, r) {
      var k = key(q, r);
      if (set[k]) throw new Error('shape "' + name + '": duplicate hex ' + k);
      set[k] = true; list.push(k);
      sumQ += q; sumR += r;
      // rowQFrom = the leftmost hex of the row; labels count columns from it,
      // so a hole in a row leaves a GAP in the numbering (C1 C2 C4) — a hex
      // keeps its label when its neighbours are carved away.
      if (rowsByR[r] === undefined || q < rowsByR[r]) rowsByR[r] = q;
    }
    if (def.hexes) {
      def.hexes.forEach(function (h) { addHex(h[0], h[1]); });
    } else {
      def.rows.forEach(function (row) {
        var r = row[0];
        if (rowsByR[r] !== undefined) throw new Error('shape "' + name + '": row r=' + r + ' listed twice');
        for (var q = row[1]; q <= row[2]; q++) addHex(q, r);
      });
    }
    if (!list.length) throw new Error('shape "' + name + '": no hexes');
    Object.keys(rowsByR).forEach(function (r) { rs.push(+r); });
    rs.sort(function (a, b) { return a - b; });
    // point-symmetry: a centre (cq,cr) with (cq-q, cr-r) on-board for every hex
    var cq = (2 * sumQ) / list.length, cr = (2 * sumR) / list.length;
    var symmetric = (cq === Math.round(cq)) && (cr === Math.round(cr)) &&
      list.every(function (k) {
        var p = parseKey(k);
        return set[key(cq - p[0], cr - p[1])];
      });
    return {
      label: def.label || name,
      list: list, set: set,
      rowRs: rs, rowQFrom: rowsByR,
      centre: symmetric ? [cq, cr] : null
    };
  }
  var SHAPES = {};
  Object.keys(I.BUILTIN.shapes).forEach(function (n) { SHAPES[n] = buildShape(n, I.BUILTIN.shapes[n]); });
  var DEFAULT_SHAPE = SHAPES.classic ? 'classic' : Object.keys(SHAPES)[0];

  function boardHexes(shape) {
    var s = SHAPES[shape] || SHAPES[DEFAULT_SHAPE];
    return s.list.slice();
  }
  var CURRENT_SHAPE = DEFAULT_SHAPE;
  var HEXES = boardHexes(CURRENT_SHAPE);
  function setBoard(shape) {
    shape = SHAPES[shape] ? shape : DEFAULT_SHAPE;
    if (shape === CURRENT_SHAPE) return;
    CURRENT_SHAPE = shape;
    HEXES = boardHexes(shape);
  }
  // A map may carry its own board outline inline (map.shapeDef, written by the
  // shape editor) — the def travels WITH the map (LAN/save-safe). Register it
  // under '@<map id>' and normalize map.shape to that name. Always rebuilt:
  // the editor may have changed the outline since the last registration.
  function ensureMapShape(map) {
    if (map && map.shapeDef) {
      var name = '@' + (map.id || map.name || 'custom');
      SHAPES[name] = buildShape(name, map.shapeDef);
      map.shape = name;
      if (name === CURRENT_SHAPE) HEXES = boardHexes(name);
      return name;
    }
    return (map && map.shape) || DEFAULT_SHAPE;
  }
  // Human grid reference on the current board: row letter (A = top) + position
  // in the row counted from the left, e.g. 'C4'. Falls back to raw coords.
  function hexLabel(k) {
    var s = SHAPES[CURRENT_SHAPE];
    var p = parseKey(k);
    var ri = s.rowRs.indexOf(p[1]);
    if (ri < 0 || !s.set[k]) return k;
    return String.fromCharCode(65 + ri) + (p[0] - s.rowQFrom[p[1]] + 1);
  }
  function currentShape() { return CURRENT_SHAPE; }
  function hexes() { return HEXES; }
  function inBoard(q, r) { return !!SHAPES[CURRENT_SHAPE].set[key(q, r)]; }
  function rot180(shape, q, r) {
    var c = SHAPES[shape] && SHAPES[shape].centre;
    return c ? [c[0] - q, c[1] - r] : [-q, -r];
  }
  function neighbor(k, d) {
    var qr = parseKey(k); var q = qr[0] + DIRS[d][0], r = qr[1] + DIRS[d][1];
    return inBoard(q, r) ? key(q, r) : null;
  }
  function neighbors(k) {
    var out = [];
    for (var d = 0; d < 6; d++) { var n = neighbor(k, d); if (n) out.push(n); }
    return out;
  }
  function dirBetween(a, b) { // a,b adjacent
    var pa = parseKey(a), pb = parseKey(b);
    for (var d = 0; d < 6; d++) if (pa[0] + DIRS[d][0] === pb[0] && pa[1] + DIRS[d][1] === pb[1]) return d;
    return -1;
  }
  function dist(a, b) {
    var pa = parseKey(a), pb = parseKey(b);
    var dq = pa[0] - pb[0], dr = pa[1] - pb[1];
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }
  function edgeKey(hexA, hexB) { return hexA < hexB ? hexA + '|' + hexB : hexB + '|' + hexA; }
  function edgeFrom(k, d) {
    var n = neighbor(k, d);
    return n ? edgeKey(k, n) : null;
  }
  // Terrain is hex-owned and directional (see design-docs HexClarificationDiagram):
  // a "side" is one hex's face of an edge. Key: 'q,r>d'.
  function sideKey(h, d) { return h + '>' + d; }


  // A terrain piece is physical: it sits INSIDE one hex and wraps adjacent
  // corners. Returns a problem string, or null if the piece is well-formed.
  function pieceProblem(p) {
    if (!p || (p.t !== 'F' && p.t !== 'M' && p.t !== 'R')) return 'piece type must be "F", "M" or "R"';
    if (!p.edges || !p.edges.length) return 'piece has no sides';
    var q0 = p.edges[0][0], r0 = p.edges[0][1], dirs = {};
    for (var i = 0; i < p.edges.length; i++) {
      var e = p.edges[i];
      if (e[0] !== q0 || e[1] !== r0)
        return 'piece spans hexes ' + key(q0, r0) + ' and ' + key(e[0], e[1]) + ' — every side of a piece must belong to ONE hex';
      if (e[2] < 0 || e[2] > 5) return 'bad direction ' + e[2];
      if (dirs[e[2]]) return 'side ' + e[2] + ' listed twice';
      dirs[e[2]] = true;
    }
    var n = p.edges.length;
    var contiguous = false;
    for (var s = 0; s < 6 && !contiguous; s++) {
      var run = true;
      for (var j = 0; j < n; j++) if (!dirs[(s + j) % 6]) { run = false; break; }
      contiguous = run;
    }
    if (!contiguous) return 'sides of a piece must be contiguous (wrap adjacent corners of the hex)';
    return null;
  }

  function buildTerrain(map) {
    // Each [q,r,d] in a piece is a SIDE owned by hex (q,r):
    //   forest in hex X: +1 attack when X's occupant attacks out across it;
    //   mountain in hex X: +1 defense when X is attacked across it;
    //   river on a border: DEPLOY-control doesn't extend across it (Round 3;
    //   support still crosses freely). The crossing check reads BOTH hexes'
    //   sides, so which hex owns it is moot.
    // returns { edges: {sideKey: 'F'|'M'|'R'}, pieces:[{id,t,edgeKeys:[sideKey...]}] }
    var edges = {}, pieces = [];
    map.pieces.forEach(function (p, i) {
      var prob = pieceProblem(p);
      if (prob) throw new Error('map "' + map.name + '" piece ' + (i + 1) + ': ' + prob);
      var eks = [];
      p.edges.forEach(function (e) {
        var k = key(e[0], e[1]);
        if (!inBoard(e[0], e[1]) || !neighbor(k, e[2])) throw new Error('map "' + map.name + '" side off board: ' + JSON.stringify(e));
        var sk = sideKey(k, e[2]);
        if (edges[sk]) throw new Error('map "' + map.name + '" duplicate side: ' + sk);
        edges[sk] = p.t;
        eks.push(sk);
      });
      pieces.push({ id: 'p' + i, t: p.t, edgeKeys: eks });
    });
    return { edges: edges, pieces: pieces };
  }

  /* shared-namespace exports */
  I.DIRS = DIRS;
  I.key = key;
  I.parseKey = parseKey;
  I.buildShape = buildShape;
  I.SHAPES = SHAPES;
  I.DEFAULT_SHAPE = DEFAULT_SHAPE;
  I.boardHexes = boardHexes;
  I.setBoard = setBoard;
  I.ensureMapShape = ensureMapShape;
  I.hexLabel = hexLabel;
  I.currentShape = currentShape;
  I.hexes = hexes;
  I.inBoard = inBoard;
  I.rot180 = rot180;
  I.neighbor = neighbor;
  I.neighbors = neighbors;
  I.dirBetween = dirBetween;
  I.dist = dist;
  I.edgeKey = edgeKey;
  I.edgeFrom = edgeFrom;
  I.sideKey = sideKey;
  I.pieceProblem = pieceProblem;
  I.buildTerrain = buildTerrain;
})(typeof window !== 'undefined' ? window : globalThis);
