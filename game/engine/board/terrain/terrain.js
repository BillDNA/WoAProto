/* The terrain base. Every other .js file here is one terrain type; each calls
   defineTerrain() once, and this file holds everything they share.

   Terrain sits on a SIDE — one hex's face of a border, keyed sideKey(hex,dir).
   A type declares what its side does (see FIELDS below) and nothing more; the
   rules ask through terrainAt / sideEffect / supportBlocker / deployBlocked and
   never name a type.

   Map terrain is authored into st.board.terrainEdges (buildTerrain loads it),
   trenches are dug at runtime into st.pieces.trenches; a room says which it
   uses and terrainAt reads both, so nothing downstream cares.

   Classic script (browser + node), shared namespace g.WOA_E. Prose: terrain.md */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // Side lengths the physical pieces come in.
  var PIECE_LENGTHS = [2, 3];

  // What a room declares. Every field is required; anything else is rejected.
  var FIELDS = {
    letter:        'string',    // code stored in map data and st.board.terrainEdges
    name:          'string',    // game word — the vocabulary traits and queries use
    label:         'string',    // capitalised, for player-facing text
    storage:       'string',    // 'edges' = authored into the map | 'pieces' = dug at runtime
    attack:        'function',  // () -> power added attacking OUT across this side
    defense:       'function',  // () -> power added defending BEHIND this side
    blocksSupport: 'boolean',   // deny the attacker's support across this border
    blocksDeploy:  'boolean',   // deny deploy control across this border
    holdsOnTie:    'boolean',   // the defender behind this side survives a tied fight
    barrageable:   'boolean'    // the naval guns can remove it
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

  /* ---------- where the dug pieces are ----------
     st.pieces.trenches is hexKey -> [{dirs:[d,d+1], owner}]. The trench is the
     one terrain a player places during a game, so it is the one with storage;
     map terrain is authored into st.board.terrainEdges and never moves. */
  var Trenches = {
    all: function (st) { return st.pieces.trenches; },
    at: function (st, h) { return st.pieces.trenches[h]; }
  };

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

  /* ---------- what a side does to a fight ---------- */
  // What the terrain on one side of one hex contributes to a fight, as the
  // combat breakdown wants it: `when` is 'attack' (the attacker crossing OUT
  // across this side) or 'defense' (this hex attacked ACROSS it). Both sides of
  // computeAttack ask this same question.
  function sideEffect(st, hex, dir, when) {
    var t = terrainAt(st, hex, dir);
    var delta = t ? t[when]() : 0;
    return { delta: delta, part: delta ? t.label + ' +' + delta : null };
  }
  // The terrain on the defender's attacked side that lets it survive a tie, or
  // null. Read with the defender's own side toward the hex the attack crosses
  // from, so it is the same side `defense` keys on.
  function tieHolder(st, hex, dir) {
    var t = terrainAt(st, hex, dir);
    return t && t.holdsOnTie ? t : null;
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

  /* ---------- loading a map's terrain ---------- */
  // Every [q,r,d] a map authors is a SIDE owned by hex (q,r) — the 'edges'
  // storage above, read back by terrainAt. The board says whether a side is on
  // it; what the side then DOES is its type's room.
  // returns { edges: {sideKey: letter}, pieces: [{id, t, edgeKeys:[sideKey…]}] }
  function buildTerrain(map) {
    var edges = {}, pieces = [];
    map.pieces.forEach(function (p, i) {
      var prob = pieceProblem(p);
      if (prob) throw new Error('map "' + map.name + '" piece ' + (i + 1) + ': ' + prob);
      var eks = [];
      p.edges.forEach(function (e) {
        var k = I.key(e[0], e[1]);
        if (!I.inBoard(e[0], e[1]) || !I.neighbor(k, e[2]))
          throw new Error('map "' + map.name + '" side off board: ' + JSON.stringify(e));
        var sk = I.sideKey(k, e[2]);
        if (edges[sk]) throw new Error('map "' + map.name + '" duplicate side: ' + sk);
        edges[sk] = p.t;
        eks.push(sk);
      });
      pieces.push({ id: 'p' + i, t: p.t, edgeKeys: eks });
    });
    return { edges: edges, pieces: pieces };
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
  // How many pieces of this type and length the box holds; undefined when the
  // box has no piece that size.
  function stockCap(letter, length) {
    var t = byLetter[letter], row = t && I.CONFIG.terrain[t.name];
    return row && row.pieces ? row.pieces[length] : undefined;
  }

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
  I.Trenches = Trenches;
  I.defineTerrain = defineTerrain;
  I.terrainTypes = terrainTypes;
  I.terrainOf = terrainOf;
  I.terrainNamed = terrainNamed;
  I.mapTerrainTypes = mapTerrainTypes;
  I.terrainAt = terrainAt;
  I.sideEffect = sideEffect;
  I.tieHolder = tieHolder;
  I.supportBlocker = supportBlocker;
  I.deployBlocked = deployBlocked;
  I.buildTerrain = buildTerrain;
  I.pieceProblem = pieceProblem;
  I.stockCap = stockCap;
  I.splitPieceRun = splitPieceRun;
})(typeof window !== 'undefined' ? window : globalThis);
