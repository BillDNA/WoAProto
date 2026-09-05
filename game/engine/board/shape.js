/* The BOARD house's SHAPE base: what outline is being played on.

   A shape is authored in one of several forms, and each form is a room of
   shapes/ answering one question — which hexes am I? Everything else a shape
   owes the game is written once here: the hex list and its containment set, the
   per-row grid labels players read (A1, C4), and whether the outline is
   point-symmetric, which is what makes a map fair to both sides.

   defineShapeForm({id, has, hexes}) declares a room. `has(def)` recognises the
   authored form; `hexes(def, add)` calls `add(q, r)` once per hex. A def that no
   room recognises is a load-time throw, because a board with no hexes is not a
   board.

   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE.
   Prose: board.md. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var SHAPE_FORMS = [];
  function defineShapeForm(spec) {
    ['id', 'has', 'hexes'].forEach(function (f) {
      if (!spec[f]) throw new Error('defineShapeForm(' + spec.id + '): missing ' + f);
    });
    if (SHAPE_FORMS.some(function (s) { return s.id === spec.id; }))
      throw new Error('defineShapeForm: duplicate ' + spec.id);
    SHAPE_FORMS.push(spec);
  }
  function shapeForms() { return SHAPE_FORMS.slice(); }

  // From any authored form: the hex list, the containment set, the row index the
  // grid labels count from, and the 180-degree rotation centre when there is one.
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
    var form = SHAPE_FORMS.filter(function (f) { return f.has(def); })[0];
    if (!form) throw new Error('shape "' + name + '": no authored outline (add a room in engine/board/shapes/)');
    form.hexes(def, addHex, name);
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
  var DEFAULT_SHAPE = null, CURRENT_SHAPE = null, HEXES = [];

  // Called once by the house door, after every form room has registered.
  function buildShapes() {
    Object.keys(I.BUILTIN.shapes).forEach(function (n) { SHAPES[n] = buildShape(n, I.BUILTIN.shapes[n]); });
    I.DEFAULT_SHAPE = DEFAULT_SHAPE = SHAPES.classic ? 'classic' : Object.keys(SHAPES)[0];
    CURRENT_SHAPE = DEFAULT_SHAPE;
    HEXES = boardHexes(CURRENT_SHAPE);
  }

  function boardHexes(shape) {
    var s = SHAPES[shape] || SHAPES[DEFAULT_SHAPE];
    return s.list.slice();
  }
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
    var p = I.parseKey(k);
    var ri = s.rowRs.indexOf(p[1]);
    if (ri < 0 || !s.set[k]) return k;
    return String.fromCharCode(65 + ri) + (p[0] - s.rowQFrom[p[1]] + 1);
  }
  // The rows of a shape, as the grid reads them: one { letter, hexes } per row,
  // top to bottom. The door for anything drawing a board by row (dev's text
  // board) — it is why nothing outside this file touches rowRs / rowQFrom.
  function boardRows(shape) {
    var s = SHAPES[shape] || SHAPES[DEFAULT_SHAPE];
    return s.rowRs.map(function (r, i) {
      return {
        letter: String.fromCharCode(65 + i),
        hexes: s.list.filter(function (k) { return I.parseKey(k)[1] === r; })
          .sort(function (a, b) { return I.parseKey(a)[0] - I.parseKey(b)[0]; })
      };
    });
  }
  function currentShape() { return CURRENT_SHAPE; }
  function hexes() { return HEXES; }
  function inBoard(q, r) { return !!SHAPES[CURRENT_SHAPE].set[I.key(q, r)]; }
  function rot180(shape, q, r) {
    var c = SHAPES[shape] && SHAPES[shape].centre;
    return c ? [c[0] - q, c[1] - r] : [-q, -r];
  }
  // Whether a map's outline can be played at all. The physical ceiling is a
  // board question, so it is answered here and not by whoever is validating.
  function boardShapeProblem(map) {
    var shape = (map && map.shape) || DEFAULT_SHAPE;
    if (!SHAPES[shape]) return 'unknown board shape "' + shape + '"';
    if (map && map.shapeDef && SHAPES[shape].list.length > I.CONFIG.mapHexCeiling)
      return SHAPES[shape].list.length + ' hexes exceeds the ' + I.CONFIG.mapHexCeiling +
        '-hex ceiling (laser-cutter max; big empty maps are not fun)';
    return null;
  }

  I.defineShapeForm = defineShapeForm;
  I.shapeForms = shapeForms;
  I.buildShape = buildShape;
  I.buildShapes = buildShapes;
  I.SHAPES = SHAPES;
  I.boardHexes = boardHexes;
  I.setBoard = setBoard;
  I.ensureMapShape = ensureMapShape;
  I.hexLabel = hexLabel;
  I.boardRows = boardRows;
  I.currentShape = currentShape;
  I.hexes = hexes;
  I.inBoard = inBoard;
  I.rot180 = rot180;
  I.boardShapeProblem = boardShapeProblem;
})(typeof window !== 'undefined' ? window : globalThis);
