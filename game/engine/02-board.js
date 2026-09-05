/* War of Attrition — engine part 02: board outline, shapes, current-board state.
   The hex vocabulary it is written in — keys, directions, distance, edge and
   side names — is the hex house (engine/board/hex/hex.js); this part answers the one
   question that needs an outline: which of a hex's six neighbours EXIST.
   Terrain is the terrain house's, sides and all (engine/board/terrain/).
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- board outline (shapes defined in maps.js) ---------- */

  // A shape def is { label, rows: [[r, qFrom, qTo], ...] } — contiguous spans —
  // OR { label, hexes: [[q, r], ...] } — an explicit hex set, the honest
  // representation for irregular outlines from the shape editor. From either we
  // build the hex list, a containment set, per-row grid labels (A1, B3, ...),
  // and — when the outline is point-symmetric — its 180-degree rotation centre.
  function buildShape(name, def) {
    var list = [], set = {}, rowsByR = {}, rs = [];
    var sumQ = 0, sumR = 0;
    function addHex(q, r) {
      var k = I.key(q, r);
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
        var p = I.parseKey(k);
        return set[I.key(cq - p[0], cr - p[1])];
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
  // Which row and column a hex is in on the current board — the half of a grid
  // reference that needs an outline. The NAME it turns into is I.gridName.
  // An off-board key has no row, so it falls back to raw coords.
  function hexLabel(k) {
    var s = SHAPES[CURRENT_SHAPE];
    var p = I.parseKey(k);
    var ri = s.rowRs.indexOf(p[1]);
    if (ri < 0 || !s.set[k]) return k;
    return I.gridName(ri, p[0] - s.rowQFrom[p[1]]);
  }
  function currentShape() { return CURRENT_SHAPE; }
  function hexes() { return HEXES; }
  function inBoard(q, r) { return !!SHAPES[CURRENT_SHAPE].set[I.key(q, r)]; }
  function rot180(shape, q, r) {
    var c = SHAPES[shape] && SHAPES[shape].centre;
    return c ? [c[0] - q, c[1] - r] : [-q, -r];
  }
  // Per-shape neighbour cache — the outline half of the hex vocabulary. Which
  // of a hex's six neighbours exist is a pure function of the immutable shape,
  // but the AI search re-derived it on every call and the Field Marshal asks
  // millions of times per skirmish. Build the table once per shape (lazily) and
  // read it instead. ensureMapShape rebuilds the shape object for shapeDef maps,
  // so the cache never goes stale. Held in a side WeakMap (not a property on the
  // shape) so a shape stays a pristine {list,set,…} for any enumerate/serialize path.
  // Contract: neighbors() hands back the CACHED array, not a copy — callers MUST
  // treat it read-only (all in-repo callers do; verified). Not Object.freeze'd on
  // purpose: freezing forces V8's slow frozen-elements read path on this
  // hottest-of-hot array and measured ~20% off throughput, which defeats the
  // point — the contract is the guard here, not the freeze.
  var GEO = new WeakMap();
  var LAST_SHAPE = null, LAST_GEO = null; // hot-path 1-entry cache (see geo())
  function buildGeo(s) {
    var nbr = {}, list = {}, L = s.list, i, d;
    for (i = 0; i < L.length; i++) {
      var k = L[i], row = new Array(6), lst = [];
      for (d = 0; d < 6; d++) {
        var nk = I.step(k, d);
        if (s.set[nk]) { row[d] = nk; lst.push(nk); } else row[d] = null;
      }
      nbr[k] = row; list[k] = lst;
    }
    return { nbr: nbr, list: list };
  }
  function geo() {
    // Hot path: geo() runs on every neighbor call (millions/skirmish), so keep a
    // 1-entry cache keyed on the shape OBJECT identity — a bare ref compare, no
    // per-call WeakMap probe. It auto-invalidates on any shape swap (setBoard) or
    // rebuild (ensureMapShape makes a fresh object), and the WeakMap still
    // memoizes per shape so alternating maps never re-derive a seen shape.
    var s = SHAPES[CURRENT_SHAPE] || SHAPES[DEFAULT_SHAPE];
    if (s === LAST_SHAPE) return LAST_GEO;
    var g = GEO.get(s);
    if (!g) { g = buildGeo(s); GEO.set(s, g); }
    LAST_SHAPE = s; LAST_GEO = g;
    return g;
  }
  // The neighbour in direction d that EXISTS on the current board, or null.
  // The step itself is the hex house's; the outline filter is this file's.
  function neighbor(k, d) {
    var row = geo().nbr[k];
    if (row) return row[d];
    var nk = I.step(k, d);                       // off-board key: no cached row
    return SHAPES[CURRENT_SHAPE].set[nk] ? nk : null;
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
  // The border between a hex and its on-board neighbour in direction d, or null.
  function edgeFrom(k, d) {
    var n = neighbor(k, d);
    return n ? I.edgeKey(k, n) : null;
  }

  /* shared-namespace exports */
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
  I.edgeFrom = edgeFrom;
})(typeof window !== 'undefined' ? window : globalThis);
