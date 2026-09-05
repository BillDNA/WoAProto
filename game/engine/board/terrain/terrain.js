/* War of Attrition — the TERRAIN kind: the base every terrain type sits on.
   Classic script (browser + node). The shell lives with its instances — every
   other file in this directory is one terrain type.

   A terrain type is a hex-owned directional SIDE. Every type answers the same
   five questions about that side, and no type answers any other:

     attack        power added when this hex's occupant attacks OUT across it
     defense       power added when this hex is attacked ACROSS it
     blocksSupport does it deny ATTACKER support across the border
     blocksDeploy  does it deny deploy-control extension across the border
     barrageable   may the naval guns remove it

   Plus one physical model, shared: 2-3 contiguous sides inside a single hex, a
   per-length stock cap, a glyph and a colour. Only the answers are the room.

   Storage is deliberately NOT unified. Authored map terrain lives in
   st.board.terrainEdges keyed by sideKey; a trench is placed at runtime from a
   per-side reserve and lives in st.pieces.trenches. A room declares which it
   uses (`storage`) and the base dispatches — collapsing the two would break
   barrage and edgeFreeForTrench.

   defineTerrain({...}) registers a type and throws at load on a malformed one,
   so `ls` this directory to read the registry. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // The physical model, written once: a piece wraps this many adjacent corners.
  var PIECE_LENGTHS = [2, 3];

  var FIELDS = {
    letter:        'string',    // the one-character code carried in state + map data
    name:          'string',    // lowercase game word ('forest') — the trait/query vocabulary
    label:         'string',    // player-facing capitalised name
    storage:       'string',    // 'edges' (authored into the map) | 'pieces' (placed at runtime)
    attack:        'function',  // () -> power added attacking out across this side
    defense:       'function',  // () -> power added defending behind this side
    blocksSupport: 'boolean',
    blocksDeploy:  'boolean',
    barrageable:   'boolean',
    colour:        'string',    // side stroke, a CSS custom property the stylesheet themes
    glyphColour:   'string'     // the mark drawn on the side (not themed)
  };

  var all = [], byLetter = {}, byName = {};

  function bad(id, msg) { throw new Error('defineTerrain(' + JSON.stringify(id) + '): ' + msg); }

  function defineTerrain(spec) {
    var id = spec && spec.letter;
    if (typeof id !== 'string' || !/^[A-Z]$/.test(id)) bad(id, 'letter must be a single capital');
    if (byLetter[id]) bad(id, 'duplicate letter');
    Object.keys(FIELDS).forEach(function (f) {
      if (spec[f] == null) bad(id, 'missing ' + f + ' (' + FIELDS[f] + ')');
      if (typeof spec[f] !== FIELDS[f]) bad(id, f + ' must be ' + FIELDS[f]);
    });
    Object.keys(spec).forEach(function (f) {
      if (!FIELDS[f]) bad(id, 'unknown field ' + JSON.stringify(f));
    });
    if (spec.storage !== 'edges' && spec.storage !== 'pieces')
      bad(id, "storage must be 'edges' or 'pieces'");
    if (byName[spec.name]) bad(id, 'duplicate name ' + JSON.stringify(spec.name));
    all.push(spec); byLetter[id] = spec; byName[spec.name] = spec;
    return spec;
  }

  function terrainTypes() { return all; }
  function terrainOf(letter) { return byLetter[letter] || null; }
  function terrainNamed(name) { return byName[name] || null; }
  // The types authored into a map — the ones the editor paints and the stock caps.
  function mapTerrainTypes() {
    return all.filter(function (t) { return t.storage === 'edges'; });
  }

  /* ---------- what occupies a side ----------
     The one dispatch over storage: a side carries at most one terrain, whether
     it was authored into the map or dug during the game. Every rules question
     below asks this first, so a new type is legible to all of them at once. */
  function terrainAt(st, hex, dir) {
    var t = st.board.terrainEdges[I.sideKey(hex, dir)];
    if (t) return byLetter[t] || null;
    return I.trenchCovers(st, hex, dir) ? byName.trench : null;
  }
  // Every terrain on the border between two adjacent hexes — up to two, since
  // each hex owns its own facing side and the two may differ (a forest on one,
  // a dug trench on the other). A border question must ask BOTH: taking only
  // the first would let a type that answers "no" mask one that answers "yes".
  // Which hex owns a piece is otherwise irrelevant.
  function terrainsAcross(st, a, b) {
    var out = [];
    var here = terrainAt(st, a, I.dirBetween(a, b));
    var there = terrainAt(st, b, I.dirBetween(b, a));
    if (here) out.push(here);
    if (there) out.push(there);
    return out;
  }

  /* ---------- the five questions, asked of a side ---------- */
  // What the terrain on one side of one hex contributes to a fight, as the
  // combat breakdown wants it: `when` is 'attack' (the attacker crossing OUT
  // across this side) or 'defense' (this hex attacked ACROSS it). Both sides of
  // computeAttack ask this same question.
  function sideEffect(st, hex, dir, when) {
    var t = terrainAt(st, hex, dir);
    var delta = t ? t[when]() : 0;
    return { delta: delta, part: delta ? t.label + ' +' + delta : null };
  }
  // The terrain denying attacker support across this border, or null.
  function supportBlocker(st, from, to) {
    var on = terrainsAcross(st, from, to);
    for (var i = 0; i < on.length; i++) if (on[i].blocksSupport) return on[i];
    return null;
  }
  function deployBlocked(st, a, b) {
    return terrainsAcross(st, a, b).some(function (t) { return t.blocksDeploy; });
  }

  /* ---------- the physical model, written once ---------- */
  // A piece sits INSIDE one hex and wraps adjacent corners. Returns a problem
  // string, or null if the piece is well-formed.
  function pieceProblem(p) {
    if (!p || !byLetter[p.t] || byLetter[p.t].storage !== 'edges')
      return 'piece type must be ' + mapTerrainTypes().map(function (t) {
        return '"' + t.letter + '"';
      }).join(', ');
    if (!p.edges || !p.edges.length) return 'piece has no sides';
    var q0 = p.edges[0][0], r0 = p.edges[0][1], dirs = {};
    for (var i = 0; i < p.edges.length; i++) {
      var e = p.edges[i];
      if (e[0] !== q0 || e[1] !== r0)
        return 'piece spans hexes ' + I.key(q0, r0) + ' and ' + I.key(e[0], e[1]) +
          ' — every side of a piece must belong to ONE hex';
      if (e[2] < 0 || e[2] > 5) return 'bad direction ' + e[2];
      if (dirs[e[2]]) return 'side ' + e[2] + ' listed twice';
      dirs[e[2]] = true;
    }
    var n = p.edges.length, contiguous = false;
    for (var s = 0; s < 6 && !contiguous; s++) {
      var run = true;
      for (var j = 0; j < n; j++) if (!dirs[(s + j) % 6]) { run = false; break; }
      contiguous = run;
    }
    if (!contiguous) return 'sides of a piece must be contiguous (wrap adjacent corners of the hex)';
    return null;
  }
  // Physical stock: how many pieces of this type and length the box holds.
  // undefined = no physical piece of that size exists.
  function stockCap(letter, length) { return I.CONFIG.terrainStock[letter + length]; }

  // A painted run of contiguous sides longer than the biggest physical piece is
  // cut into pieces the box actually holds — never leaving a remainder below the
  // smallest (a full ring of 6 is 3+3, a run of 4 is 2+2). `dirs` is a set of
  // directions in one hex; returns arrays of directions, one per piece.
  function splitPieceRun(dirs) {
    var max = Math.max.apply(null, PIECE_LENGTHS), min = Math.min.apply(null, PIECE_LENGTHS);
    if (dirs.length <= max) return [dirs];
    var inSet = {};
    dirs.forEach(function (d) { inSet[d] = true; });
    // Order the contiguous arc: start where the previous direction is absent
    // (a full ring has no such gap — start anywhere).
    var start = dirs[0], d;
    for (d = 0; d < 6; d++) if (inSet[d] && !inSet[(d + 5) % 6]) { start = d; break; }
    var seq = [];
    for (var i = 0, cur = start; i < dirs.length; i++, cur = (cur + 1) % 6) {
      if (!inSet[cur]) return [dirs]; // not one arc — leave it untouched
      seq.push(cur);
    }
    var out = [];
    while (seq.length > max) {
      var take = (seq.length - max < min) ? min : max;
      out.push(seq.slice(0, take));
      seq = seq.slice(take);
    }
    out.push(seq);
    return out;
  }

  /* shared-namespace exports */
  I.PIECE_LENGTHS = PIECE_LENGTHS;
  I.defineTerrain = defineTerrain;
  I.terrainTypes = terrainTypes;
  I.terrainOf = terrainOf;
  I.terrainNamed = terrainNamed;
  I.mapTerrainTypes = mapTerrainTypes;
  I.terrainAt = terrainAt;
  I.sideEffect = sideEffect;
  I.supportBlocker = supportBlocker;
  I.deployBlocked = deployBlocked;
  I.pieceProblem = pieceProblem;
  I.stockCap = stockCap;
  I.splitPieceRun = splitPieceRun;
})(typeof window !== 'undefined' ? window : globalThis);
