/* The board as an OUTLINE: which hexes are in play, and everything that answer
   alone decides — containment, the grid reference a player reads, whether the
   outline turns onto itself, which of a hex's six neighbours exist, and where a
   map's authored outline lands.

   How an outline is AUTHORED is a room: every other .js file here is one form,
   registering with defineOutlineForm. The base never branches on a def's shape.

   The hex vocabulary this is written in — keys, directions, distance, edge and
   side names — is the hex house (board/hex/). Terrain is board/terrain/, the
   pieces standing on it board/unit/.

   Nothing outside reads a shape's innards: an outline handle is opaque and
   every question about it is a door below (outlineHexes, outlineLabel,
   outlineRows, outlineSymmetric).

   Classic script (browser + node), shared namespace g.WOA_E. Prose: board.md */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- authored forms ---------- */
  // spec: { form, has(def) -> is this def written in this form?,
  //         hexes(def, name) -> [[q, r], ...] }
  var FORMS = [];
  function defineOutlineForm(spec) {
    ['form', 'has', 'hexes'].forEach(function (f) {
      if (spec[f] == null) throw new Error('defineOutlineForm(' + spec.form + '): missing ' + f);
    });
    if (FORMS.some(function (f) { return f.form === spec.form; }))
      throw new Error('defineOutlineForm: duplicate ' + spec.form);
    FORMS.push(spec);
  }
  function formFor(name, def) {
    for (var i = 0; i < FORMS.length; i++) if (FORMS[i].has(def)) return FORMS[i];
    throw new Error('shape "' + name + '": no outline form recognises this def');
  }

  /* ---------- building an outline ---------- */
  // From a form's hex list we build the hex keys, a containment set, per-row
  // grid columns, and — when the outline is point-symmetric — its 180-degree
  // rotation centre.
  function buildShape(name, def) {
    var list = [], set = {}, rowsByR = {}, rs = [];
    var sumQ = 0, sumR = 0;
    formFor(name, def).hexes(def, name).forEach(function (h) {
      var q = h[0], r = h[1], k = I.key(q, r);
      if (set[k]) throw new Error('shape "' + name + '": duplicate hex ' + k);
      set[k] = true; list.push(k);
      sumQ += q; sumR += r;
      // rowQFrom = the leftmost hex of the row; labels count columns from it,
      // so a hole in a row leaves a GAP in the numbering (C1 C2 C4) — a hex
      // keeps its label when its neighbours are carved away.
      if (rowsByR[r] === undefined || q < rowsByR[r]) rowsByR[r] = q;
    });
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
      name: name, label: def.label || name,
      list: list, set: set,
      rowRs: rs, rowQFrom: rowsByR,
      centre: symmetric ? [cq, cr] : null
    };
  }

  /* ---------- the registry ----------
     Built lazily: the authored forms are rooms, and a room registers when its
     own file loads, which is after this one. */
  var SHAPES = {};
  function builtinNames() { return Object.keys(I.BUILTIN.shapes); }
  function shape(name) {
    if (SHAPES[name]) return SHAPES[name];
    var def = I.BUILTIN.shapes[name];
    return def ? (SHAPES[name] = buildShape(name, def)) : null;
  }
  function defaultShape() { return I.BUILTIN.shapes.classic ? 'classic' : builtinNames()[0]; }
  function hasShape(name) { return !!(SHAPES[name] || (I.BUILTIN.shapes && I.BUILTIN.shapes[name])); }

  /* ---------- the current board ---------- */
  var CURRENT_SHAPE = defaultShape();
  function boardHexes(name) {
    var s = shape(name) || shape(defaultShape());
    return s.list.slice();
  }
  // Built on first use, not at load: the authored forms are rooms and register
  // after this file.
  var HEXES = null;
  function setBoard(name) {
    name = hasShape(name) ? name : defaultShape();
    if (name === CURRENT_SHAPE) return;
    CURRENT_SHAPE = name;
    HEXES = null;
  }
  function currentShape() { return CURRENT_SHAPE; }
  function hexes() { return HEXES || (HEXES = boardHexes(CURRENT_SHAPE)); }
  function inBoard(q, r) { return !!shape(CURRENT_SHAPE).set[I.key(q, r)]; }

  // A map may carry its own board outline inline (map.shapeDef, written by the
  // shape editor) — the def travels WITH the map (LAN/save-safe). Register it
  // under '@<map id>' and normalize map.shape to that name. Always rebuilt:
  // the editor may have changed the outline since the last registration.
  function ensureMapShape(map) {
    if (map && map.shapeDef) {
      var name = '@' + (map.id || map.name || 'custom');
      SHAPES[name] = buildShape(name, map.shapeDef);
      map.shape = name;
      if (name === CURRENT_SHAPE) HEXES = null;
      return name;
    }
    return (map && map.shape) || defaultShape();
  }

  /* ---------- the door ----------
     An outline handle answers every question about a board that is not the
     current one — the dashboard's lenses, a thumbnail, a map being validated —
     without switching the live board out from under a paused game. */
  // The outline a name or a map plays on. Pure for a map: a shapeDef builds a
  // throwaway, nothing is registered and the live board does not move.
  function outline(nameOrMap) {
    if (nameOrMap && typeof nameOrMap === 'object') {
      if (nameOrMap.shapeDef) return buildShape('@' + (nameOrMap.id || nameOrMap.name || 'custom'), nameOrMap.shapeDef);
      return shape(nameOrMap.shape) || shape(defaultShape());
    }
    return shape(nameOrMap) || shape(defaultShape());
  }
  function outlineHexes(o) { return o.list.slice(); }
  function outlineName(o) { return o.name; }
  function outlineTitle(o) { return o.label; }
  function outlineSymmetric(o) { return o.centre !== null; }
  // Its hexes row by row, top row first and each row left to right — what a text
  // or ASCII board prints. The order is the grid's, not the order the outline
  // happened to be authored in.
  function outlineRows(o) {
    return o.rowRs.map(function (r) {
      return o.list.filter(function (k) { return I.parseKey(k)[1] === r; })
        .sort(function (a, b) { return I.parseKey(a)[0] - I.parseKey(b)[0]; });
    });
  }
  // Which row and column a hex is in on THIS outline, turned into the name the
  // hex house gives that pair. An off-board key has no row, so it falls back to
  // raw coords.
  function outlineLabel(o, k) {
    var p = I.parseKey(k);
    var ri = o.rowRs.indexOf(p[1]);
    if (ri < 0 || !o.set[k]) return k;
    return I.gridName(ri, p[0] - o.rowQFrom[p[1]]);
  }
  // The names an author may pick from — the shape library, without the per-map
  // outlines registered under '@'.
  function shapeNames() { return builtinNames(); }
  function shapeLabel(name) { var s = shape(name); return s ? s.label : name; }

  function hexLabel(k) { return outlineLabel(shape(CURRENT_SHAPE), k); }
  function rot180(name, q, r) {
    var s = shape(name);
    var c = s && s.centre;
    return c ? [c[0] - q, c[1] - r] : [-q, -r];
  }

  /* ---------- the on-board neighbour filter ----------
     Which of a hex's six neighbours exist is a pure function of the immutable
     outline, but the AI search re-derived it on every call and the Field Marshal
     asks millions of times per skirmish. Build the table once per outline
     (lazily) and read it instead. ensureMapShape rebuilds the shape object for
     shapeDef maps, so the cache never goes stale. Held in a side WeakMap (not a
     property on the shape) so a shape stays a pristine {list,set,…} for any
     enumerate/serialize path.
     Contract: neighbors() hands back the CACHED array, not a copy — callers MUST
     treat it read-only (all in-repo callers do; verified). Not Object.freeze'd on
     purpose: freezing forces V8's slow frozen-elements read path on this
     hottest-of-hot array and measured ~20% off throughput, which defeats the
     point — the contract is the guard here, not the freeze. */
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
    var s = shape(CURRENT_SHAPE) || shape(defaultShape());
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
    return shape(CURRENT_SHAPE).set[nk] ? nk : null;
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
  I.defineOutlineForm = defineOutlineForm;
  I.buildShape = buildShape;
  I.shapeNames = shapeNames;
  I.shapeLabel = shapeLabel;
  I.hasShape = hasShape;
  I.outline = outline;
  I.outlineHexes = outlineHexes;
  I.outlineName = outlineName;
  I.outlineTitle = outlineTitle;
  I.outlineSymmetric = outlineSymmetric;
  I.outlineRows = outlineRows;
  I.outlineLabel = outlineLabel;
  I.boardHexes = boardHexes;
  I.setBoard = setBoard;
  I.ensureMapShape = ensureMapShape;
  I.hexLabel = hexLabel;
  I.currentShape = currentShape;
  I.DEFAULT_SHAPE = defaultShape();
  I.hexes = hexes;
  I.inBoard = inBoard;
  I.rot180 = rot180;
  I.neighbor = neighbor;
  I.neighbors = neighbors;
  I.edgeFrom = edgeFrom;
})(typeof window !== 'undefined' ? window : globalThis);
