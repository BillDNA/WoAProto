/* War of Attrition — game engine (browser + node) */
(function (global) {
  'use strict';

  // Boards and maps are data: maps.js must load first (browser) / sit next to
  // this file (node). Its whole payload is hand-editable JSON.
  var BUILTIN = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('./maps.js') : null);
  if (!BUILTIN || !BUILTIN.shapes || !BUILTIN.maps)
    throw new Error('War of Attrition: maps.js missing or malformed (must define WOA_BUILTIN with shapes + maps)');

  /* ---------- board geometry (pointy-top axial; shapes defined in maps.js) ---------- */
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]; // E NE NW W SW SE
  function key(q, r) { return q + ',' + r; }
  function parseKey(k) { var p = k.split(','); return [+p[0], +p[1]]; }

  // A shape def is { label, rows: [[r, qFrom, qTo], ...] }. From that we build
  // the hex list, a containment set, per-row grid labels (A1, B3, ...), and —
  // when the outline is point-symmetric — its 180-degree rotation constants.
  function buildShape(name, def) {
    var list = [], set = {}, rowsByR = {}, rs = [];
    var sumQ = 0, sumR = 0;
    def.rows.forEach(function (row) {
      var r = row[0];
      if (rowsByR[r] !== undefined) throw new Error('shape "' + name + '": row r=' + r + ' listed twice');
      rowsByR[r] = row[1];
      rs.push(r);
      for (var q = row[1]; q <= row[2]; q++) {
        var k = key(q, r);
        if (set[k]) throw new Error('shape "' + name + '": duplicate hex ' + k);
        set[k] = true; list.push(k);
        sumQ += q; sumR += r;
      }
    });
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
  Object.keys(BUILTIN.shapes).forEach(function (n) { SHAPES[n] = buildShape(n, BUILTIN.shapes[n]); });
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

  /* ---------- rng (deterministic, seed stored in state) ---------- */
  function rnd(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    var t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(s, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd(s) * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ---------- static data (all tunable in maps.js) ---------- */
  var UNITS = BUILTIN.units;
  var TRENCH_COUNT = BUILTIN.trenchCount || 3;
  var TERRAIN_STOCK = BUILTIN.terrainStock || { F3: 2, F2: 4, M3: 2, M2: 4 };
  var CARDS = BUILTIN.cards;
  if (!UNITS || !CARDS) throw new Error('War of Attrition: maps.js must define units and cards');
  var CARD_BY_ID = {};
  CARDS.forEach(function (c) { CARD_BY_ID[c.id] = c; });
  var STARTING_CARD = (CARDS.filter(function (c) { return c.starting; })[0] || CARDS[0]).id;
  // one slot per physical piece on the player mat
  var PIECE_TOTALS = { trench: TRENCH_COUNT };
  Object.keys(UNITS).forEach(function (t) { PIECE_TOTALS[t] = UNITS[t].count || 0; });

  /* ---------- maps (data lives in maps.js) ---------- */
  var MAPS = BUILTIN.maps;

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
    //   river on a border: support never crosses it, for either side (the
    //   crossing check reads BOTH hexes' sides, so which hex owns it is moot).
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

  /* ---------- state ---------- */
  function other(p) { return p === 'red' ? 'blue' : 'red'; }

  function newMatch(opts) {
    opts = opts || {};
    var s = { seed: (opts.seed !== undefined ? opts.seed : (Date.now() & 0x7fffffff)) | 0 };
    var maps = (opts.maps && opts.maps.length) ? opts.maps : MAPS;
    var order = [];
    for (var i = 0; i < maps.length; i++) order.push(i);
    shuffle(s, order);
    var match = {
      seed: s.seed,
      maps: maps,           // full map definitions travel with the match (LAN-safe)
      mapOrder: order,
      battleIndex: 0,
      wins: { red: 0, blue: 0 },
      firstPlayer: opts.firstPlayer || (rnd(s) < 0.5 ? 'red' : 'blue'),
      winner: null
    };
    match.seed = s.seed;
    return match;
  }

  function buildDeck(s, player) {
    var deck = [];
    CARDS.forEach(function (c) {
      for (var i = 0; i < c.count; i++) if (!c.starting) deck.push(c.id);
    });
    shuffle(s, deck);
    return deck;
  }

  function newBattle(match) {
    var maps = match.maps || MAPS;
    var mapIdx = match.mapOrder[match.battleIndex % match.mapOrder.length];
    var map = maps[mapIdx];
    setBoard(map.shape || DEFAULT_SHAPE);
    var terrain = buildTerrain(map);
    var st = {
      boardShape: map.shape || DEFAULT_SHAPE,
      seed: match.seed,
      match: match,
      mapIndex: mapIdx,
      mapName: map.name,
      terrainEdges: terrain.edges,
      terrainPieces: terrain.pieces,
      hq: { red: key(map.redHQ[0], map.redHQ[1]), blue: key(map.blueHQ[0], map.blueHQ[1]) },
      hqAlive: { red: true, blue: true },
      units: {},      // hexKey -> {type, owner}
      trenches: {},   // hexKey -> {dirs:[d1,d2]}
      reserves: { red: copyReserves(), blue: copyReserves() },
      vp: { red: 0, blue: 0 },
      decks: {}, discards: { red: [], blue: [] }, removed: { red: [], blue: [] }, hands: { red: [], blue: [] },
      seen: { red: {}, blue: {} },  // cardId -> times it has appeared in p's hand
      playLog: [],                  // {p, id, mode, turn, seen-at-play} per card played
      lastSwap: { red: null, blue: null }, // p's most recent swap pair (AI anti-shuffle)
      stats: { attacks: 0, swaps: 0, marches: 0, deploys: 0, firstBlood: null }, // behaviour counters for the balance lab
      firstTurnDone: { red: false, blue: false },
      current: match.battleIndex === 0 ? match.firstPlayer : match.lastLoser,
      second: null,
      phase: 'choose-card', // choose-card | step | battle-over
      pending: null,
      battleWinner: null,
      winType: null,
      log: [],
      turnNumber: 1
    };
    st.second = other(st.current);
    st.decks.red = buildDeck(st, 'red');
    st.decks.blue = buildDeck(st, 'blue');
    log(st, 'Battle ' + (match.battleIndex + 1) + ' — "' + map.name + '". ' + cap(st.current) + ' moves first.');
    drawHand(st, st.current);
    return st;
  }
  function copyReserves() {
    var r = { trench: TRENCH_COUNT };
    Object.keys(UNITS).forEach(function (t) { r[t] = UNITS[t].count || 0; });
    return r;
  }
  function cap(p) { return p.charAt(0).toUpperCase() + p.slice(1); }
  function log(st, msg) { st.log.push({ turn: st.turnNumber, player: st.current, msg: msg }); }

  function cardsRemaining(st, p) {
    return st.decks[p].length + st.discards[p].length + st.hands[p].length;
  }

  function drawHand(st, p) {
    var hand = st.hands[p];
    var first = !st.firstTurnDone[p];
    if (first) {
      st.firstTurnDone[p] = true;
      hand.push(STARTING_CARD);
    }
    var want = first ? 3 : 4;
    var total = st.decks[p].length + st.discards[p].length;
    if (total <= (first ? 4 : 5)) want = total; // 5 or fewer remain: draw all
    var held = null;
    if (first) { // house rule: Airdrop may never be in the opening hand
      var ai = st.decks[p].indexOf('airdrop');
      if (ai >= 0) held = st.decks[p].splice(ai, 1)[0];
    }
    for (var i = 0; i < want; i++) {
      if (st.decks[p].length === 0 && st.discards[p].length > 0) {
        st.decks[p] = shuffle(st, st.discards[p]);
        st.discards[p] = [];
      }
      if (st.decks[p].length === 0) break;
      hand.push(st.decks[p].pop());
    }
    if (held) {
      var pos = Math.floor(rnd(st) * (st.decks[p].length + 1));
      st.decks[p].splice(pos, 0, held);
    }
    if (!st.seen) st.seen = { red: {}, blue: {} }; // self-heal pre-metrics saves
    hand.forEach(function (id) { st.seen[p][id] = (st.seen[p][id] || 0) + 1; });
    if (hand.length === 0) endByAttrition(st);
  }

  // Attrition score (June 2026 rules revision): VP of a player's SURVIVING units
  // on the board. Reserves never deployed count for nothing; kills only matter
  // because they remove enemy units from the field. (st.vp still tracks kills
  // for stats/journal, but victory reads the board.)
  function fieldScore(st, p) {
    var s = 0;
    for (var h in st.units) { var u = st.units[h]; if (u.owner === p) s += UNITS[u.type].vp; }
    return s;
  }

  function endByAttrition(st) {
    var fr = fieldScore(st, 'red'), fb = fieldScore(st, 'blue');
    var winner;
    if (fr > fb) winner = 'red';
    else if (fb > fr) winner = 'blue';
    else winner = st.second; // tie: player who went 2nd wins
    finishBattle(st, winner, 'attrition');
  }

  function finishBattle(st, winner, how) {
    st.phase = 'battle-over';
    st.battleWinner = winner;
    st.winType = how;
    st.pending = null;
    var m = st.match;
    m.wins[winner]++;
    m.lastLoser = other(winner);
    m.battleIndex++;
    m.seed = st.seed;
    if (m.wins[winner] >= 3) { m.winner = winner; }
    log(st, cap(winner) + ' wins the battle by ' + (how === 'hq' ? 'capturing the headquarters!' :
      how === 'concession' ? 'concession.' :
      'attrition (' + fieldScore(st, 'red') + ' VP vs ' + fieldScore(st, 'blue') + ' VP of surviving units).'));
  }

  // A player throws in the towel; the battle (not the match) goes to the enemy.
  function concede(st, p) {
    if (st.phase === 'battle-over') throw new Error('battle already over');
    log(st, cap(p) + ' concedes the field.');
    finishBattle(st, other(p), 'concession');
    return st;
  }

  // Is the battle a foregone conclusion for p? ADVISORY ONLY — never enforced.
  // Truthy ({need, gain, turnsLeft}) when BOTH paths to victory look closed:
  //  - attrition (surviving-units scoring): the field-score gap is bigger than
  //    the most p could plausibly swing it in the turns left. One turn can swing
  //    at most ~3 VP p's way (deploy or destroy an artillery) — multi-action
  //    cards can beat that, so this is a heuristic, which is why it only advises.
  //  - HQ capture: no unit (fielded, or deployed then marched) can reach the
  //    enemy HQ within the turns p has left; a live Airdrop keeps hope alive.
  function concedeAdvised(st, p) {
    if (st.phase !== 'choose-card') return null;
    var e = other(p);
    var turnsLeft = cardsRemaining(st, p); // each turn removes exactly 1 card from p's pool
    var need = (fieldScore(st, e) - fieldScore(st, p)) + (st.second === p ? 0 : 1); // second player wins ties
    if (need <= 0) return null;            // p still ahead (or tied as second player)
    var gain = 3 * turnsLeft;              // best case: a 3-VP swing every remaining turn
    if (gain >= need) return null;         // the gap can still be closed in principle
    if (st.hqAlive[e] && turnsLeft > 0) {
      var hasReserve = Object.keys(UNITS).some(function (t) { return st.reserves[p][t] > 0; });
      if (hasReserve && turnsLeft >= 2 && st.removed[p].indexOf('airdrop') < 0) return null; // Airdrop snipe still possible
      var hq = st.hq[e], reach = Infinity;
      for (var h2 in st.units) if (st.units[h2].owner === p) reach = Math.min(reach, dist(h2, hq));
      if (hasReserve) deployTargets(st, p, false).forEach(function (d) { reach = Math.min(reach, dist(d, hq) + 1); });
      if (reach <= turnsLeft) return null; // a march on the HQ is still conceivable
    }
    return { need: need, gain: gain, turnsLeft: turnsLeft };
  }

  /* ---------- queries ---------- */
  function unitAt(st, h) { return st.units[h] || null; }
  function isHQ(st, h) {
    if (st.hqAlive.red && st.hq.red === h) return 'red';
    if (st.hqAlive.blue && st.hq.blue === h) return 'blue';
    return null;
  }
  function isEmpty(st, h) { return !unitAt(st, h) && !isHQ(st, h); }
  function controlledHexes(st, p) {
    var out = [];
    for (var h in st.units) if (st.units[h].owner === p) out.push(h);
    if (st.hqAlive[p]) out.push(st.hq[p]);
    return out;
  }
  function deployTargets(st, p, anywhere) {
    var set = {};
    if (anywhere) {
      HEXES.forEach(function (h) { if (isEmpty(st, h)) set[h] = true; });
    } else {
      controlledHexes(st, p).forEach(function (c) {
        neighbors(c).forEach(function (n) { if (isEmpty(st, n)) set[n] = true; });
      });
    }
    return Object.keys(set);
  }
  // st.trenches[hex] is an ARRAY of {dirs:[d,d+1], owner} — a hex may hold
  // several trenches (per Bill's DoubleTrenchNotAllowed report), but their
  // edges may not overlap each other or this hex's own terrain sides.
  function trenchCovers(st, h, d) {
    var list = st.trenches[h];
    if (!list) return false;
    for (var i = 0; i < list.length; i++) if (list[i].dirs.indexOf(d) >= 0) return true;
    return false;
  }
  function edgeFreeForTrench(st, h, d) {
    // only works owned by this hex occupy the same physical space as a trench here
    return !st.terrainEdges[sideKey(h, d)] && !trenchCovers(st, h, d);
  }
  function trenchOrientations(st, h) {
    var out = [];
    for (var d = 0; d < 6; d++) {
      var d2 = (d + 1) % 6;
      if (edgeFreeForTrench(st, h, d) && edgeFreeForTrench(st, h, d2)) out.push([d, d2]);
    }
    return out;
  }
  function trenchTargets(st, p) {
    return controlledHexes(st, p).filter(function (h) {
      return trenchOrientations(st, h).length > 0;
    });
  }

  // attacks: {from, to, via} ; via = HQ hex passed through, or null
  function listAttacks(st, p) {
    var out = [], seen = {};
    function add(from, to, via) {
      var k = from + '>' + to + '>' + (via || '');
      if (seen[k]) return;
      seen[k] = true;
      out.push({ from: from, to: to, via: via || null });
    }
    for (var h in st.units) {
      if (st.units[h].owner !== p) continue;
      neighbors(h).forEach(function (n) {
        var u = unitAt(st, n), hq = isHQ(st, n);
        if ((u && u.owner !== p) || (hq && hq !== p)) add(h, n, null);
        // pass through an HQ hex (no unit standing rule needed: units never occupy HQ hexes)
        if (hq) {
          neighbors(n).forEach(function (m) {
            if (m === h) return;
            var u2 = unitAt(st, m), hq2 = isHQ(st, m);
            if ((u2 && u2.owner !== p) || (hq2 && hq2 !== p)) add(h, m, n);
          });
        }
      });
    }
    return out;
  }

  function listRepositions(st, p) {
    var moves = [], swaps = [], seenSwap = {};
    for (var h in st.units) {
      if (st.units[h].owner !== p) continue;
      neighbors(h).forEach(function (n) {
        if (isEmpty(st, n)) moves.push({ from: h, to: n, via: null });
        var u = unitAt(st, n);
        if (u && u.owner === p) {
          var k = edgeKey(h, n);
          if (!seenSwap[k]) { seenSwap[k] = true; swaps.push({ a: h, b: n }); }
        }
        var hq = isHQ(st, n);
        if (hq) { // through HQ
          neighbors(n).forEach(function (m) {
            if (m === h) return;
            if (isEmpty(st, m)) moves.push({ from: h, to: m, via: n });
            var u2 = unitAt(st, m);
            if (u2 && u2.owner === p) {
              var k2 = 'hq:' + edgeKey(h, m);
              if (!seenSwap[k2]) { seenSwap[k2] = true; swaps.push({ a: h, b: m, via: n }); }
            }
          });
        }
      });
    }
    return { moves: moves, swaps: swaps };
  }

  function listBarrageTargets(st, p) {
    // June 2026 ruling: the naval guns reach the whole board — ANY trench or
    // forest may be targeted (the old in/adjacent-to-controlled-hexes zone is gone).
    var trenches = [];
    Object.keys(st.trenches).forEach(function (h) {
      st.trenches[h].forEach(function (t, i) { trenches.push({ hex: h, idx: i, dirs: t.dirs }); });
    });
    var forestPieces = st.terrainPieces.filter(function (pc) {
      return pc.t === 'F' && !pc.removed;
    });
    return { trenches: trenches, forestPieces: forestPieces };
  }

  /* ---------- combat ---------- */
  // Support crossing rules (V0 terrain-crossing revision, July 2026):
  //  - a RIVER on the border between supporter and battle hex blocks support
  //    for EITHER side — control never counts across a river. Both hexes'
  //    sides are read, so which hex owns the river piece doesn't matter.
  //  - a TRENCH on that border blocks ATTACKER support only. Ownership is
  //    irrelevant (Bill: lose a trench and the enemy uses it just fine).
  //    Trenches no longer grant +1 defense — that's what mountains are for.
  function borderBlocked(st, fromHex, battleHex, attacking) {
    var dOut = dirBetween(fromHex, battleHex), dIn = dirBetween(battleHex, fromHex);
    if (st.terrainEdges[sideKey(fromHex, dOut)] === 'R' ||
        st.terrainEdges[sideKey(battleHex, dIn)] === 'R') return 'river';
    if (attacking && (trenchCovers(st, fromHex, dOut) || trenchCovers(st, battleHex, dIn))) return 'trench';
    return null;
  }
  function supportFor(st, p, battleHex, excludeHex, attacking) {
    var total = 0, parts = [];
    neighbors(battleHex).forEach(function (n) {
      if (n === excludeHex) return;
      var giver = null, amount = 0;
      var u = unitAt(st, n);
      if (u && u.owner === p && UNITS[u.type].sup > 0) { giver = UNITS[u.type].name; amount = UNITS[u.type].sup; }
      else if (isHQ(st, n) === p) { giver = 'HQ'; amount = 1; }
      if (!giver) return;
      var block = borderBlocked(st, n, battleHex, attacking);
      if (block) { parts.push(giver + ' support blocked by ' + block); return; }
      total += amount;
      parts.push(giver + ' +' + amount);
    });
    return { total: total, parts: parts };
  }

  function computeAttack(st, atk) {
    var p = st.units[atk.from].owner, e = other(p);
    var au = st.units[atk.from];
    var attackEdgeFromHex = atk.via || atk.from; // hex the attack crosses from
    var atkSide = sideKey(attackEdgeFromHex, dirBetween(attackEdgeFromHex, atk.to));
    var defSide = sideKey(atk.to, dirBetween(atk.to, attackEdgeFromHex));
    var aParts = [UNITS[au.type].name + ' attack ' + UNITS[au.type].atk];
    var aPow = UNITS[au.type].atk;
    var asup = supportFor(st, p, atk.to, atk.from, true);
    aPow += asup.total; aParts = aParts.concat(asup.parts);
    if (st.terrainEdges[atkSide] === 'F') { aPow += 1; aParts.push('Forest +1'); }
    var mod = atk.mod || 0;
    if (mod) { aPow += mod; aParts.push('Card ' + (mod > 0 ? '+' : '') + mod); }

    var du = unitAt(st, atk.to);
    var dHQ = isHQ(st, atk.to);
    var dPow, dParts;
    if (du) { dPow = UNITS[du.type].def; dParts = [UNITS[du.type].name + ' defense ' + UNITS[du.type].def]; }
    else { dPow = 0; dParts = ['Headquarters defense 0']; }
    var dsup = supportFor(st, e, atk.to, null, false);
    dPow += dsup.total; dParts = dParts.concat(dsup.parts);
    if (st.terrainEdges[defSide] === 'M') { dPow += 1; dParts.push('Mountain +1'); }
    // (trenches no longer add defense — they deny attacker support instead;
    //  the attack itself may always cross a trench or river)
    var outcome = aPow > dPow ? 'attacker' : (dPow > aPow ? 'defender' : 'tie');
    return {
      attackerPower: aPow, defenderPower: dPow,
      attackerParts: aParts, defenderParts: dParts,
      outcome: outcome, defenderIsHQ: !!dHQ, defenderUnit: du ? du.type : null
    };
  }

  function resolveAttack(st, atk) {
    var p = st.units[atk.from].owner, e = other(p);
    var res = computeAttack(st, atk);
    var au = st.units[atk.from];
    var du = unitAt(st, atk.to), dHQ = isHQ(st, atk.to);
    ensureStats(st).attacks++;
    var msg = cap(p) + ' ' + UNITS[au.type].name + ' attacks ' +
      (du ? cap(e) + ' ' + UNITS[du.type].name : cap(e) + ' HQ') +
      ' at ' + hexLabel(atk.to) +
      (atk.via ? ', striking through the HQ' : '') +
      ' (' + res.attackerPower + ' vs ' + res.defenderPower + '): ';

    // st.vp tracks kills for stats/journal only — victory reads fieldScore.
    function killDefender() {
      if (du) { delete st.units[atk.to]; st.vp[p] += UNITS[du.type].vp; if (!st.stats.firstBlood) st.stats.firstBlood = p; }
      if (dHQ) { st.hqAlive[dHQ] = false; }
    }
    function killAttacker() {
      delete st.units[atk.from];
      st.vp[e] += UNITS[au.type].vp;
      if (!st.stats.firstBlood) st.stats.firstBlood = e;
    }

    if (res.outcome === 'attacker') {
      killDefender();
      if (atk.noAdvance) {
        msg += 'defender destroyed; the attacker holds its ground.';
      } else {
        delete st.units[atk.from];
        st.units[atk.to] = au;
        msg += 'defender destroyed, attacker advances.';
      }
    } else if (res.outcome === 'defender') {
      killAttacker();
      msg += 'attack repelled, attacker destroyed.';
    } else { // tie
      if (atk.tieSpare) {
        killDefender();
        msg += 'a tie — defender destroyed; attacker withdraws in good order.';
      } else {
        killDefender();
        killAttacker();
        msg += 'a tie — both units destroyed.';
      }
    }
    log(st, msg);
    if (dHQ && (res.outcome === 'attacker' || res.outcome === 'tie')) {
      finishBattle(st, p, 'hq');
    }
    return res;
  }

  /* ---------- turn flow ---------- */
  // mode: 'normal' (the card's printed actions) | 'attack' | 'reposition'
  // House rule: any card may always be resolved as a simple attack or reposition instead.
  function playCard(st, cardId, mode) {
    if (st.phase !== 'choose-card') throw new Error('not in choose-card phase');
    mode = mode || 'normal';
    var p = st.current;
    var idx = st.hands[p].indexOf(cardId);
    if (idx < 0) throw new Error('card not in hand');
    st.hands[p].splice(idx, 1);
    if (!st.playLog) st.playLog = []; // self-heal pre-metrics saves
    st.playLog.push({ p: p, id: cardId, mode: mode, turn: st.turnNumber,
      seen: (st.seen && st.seen[p] && st.seen[p][cardId]) || 1 });
    var card = CARD_BY_ID[cardId];
    var steps;
    if (mode === 'attack') steps = [{ type: 'attack' }];
    else if (mode === 'reposition') steps = [{ type: 'reposition' }];
    else steps = card.steps.map(function (s) { return Object.assign({}, s); });
    st.pending = {
      cardId: cardId,
      mode: mode,
      steps: steps,
      idx: 0,
      acted: 0,                      // actions actually resolved (0 at endTurn = the play did nothing)
      logIdx: st.playLog.length - 1  // back-pointer so endTurn can mark the entry noop
    };
    st.phase = 'step';
    log(st, cap(p) + ' plays "' + card.name + '"' +
      (mode === 'attack' ? ' as a direct attack order.' : mode === 'reposition' ? ' as a simple maneuver.' : '.'));
    skipImpossible(st);
    return st;
  }

  function currentStep(st) {
    if (st.phase !== 'step' || !st.pending) return null;
    return st.pending.steps[st.pending.idx] || null;
  }

  function stepOptions(st) {
    var step = currentStep(st);
    if (!step) return null;
    var p = st.current;
    var card = CARD_BY_ID[st.pending.cardId];
    var o = { type: step.type, cardName: card.name, stepIndex: st.pending.idx, stepCount: st.pending.steps.length };
    if (step.type === 'deploy') {
      o.unit = step.unit;
      o.available = st.reserves[p][step.unit] > 0;
      o.targets = o.available ? deployTargets(st, p, step.anywhere) : [];
    } else if (step.type === 'trench') {
      o.available = st.reserves[p].trench > 0;
      o.targets = o.available ? trenchTargets(st, p) : [];
    } else if (step.type === 'attack') {
      o.mod = step.mod || 0;
      o.tieSpare = !!step.tieSpare;
      o.noAdvance = !!step.noAdvance;
      o.attacks = listAttacks(st, p).map(function (a) {
        a = Object.assign({}, a, { mod: step.mod || 0, tieSpare: !!step.tieSpare, noAdvance: !!step.noAdvance });
        a.preview = computeAttack(st, a);
        return a;
      });
    } else if (step.type === 'reposition') {
      var r = listRepositions(st, p);
      o.moves = r.moves; o.swaps = r.swaps;
    } else if (step.type === 'barrage') {
      var b = listBarrageTargets(st, p);
      o.trenches = b.trenches; o.forestPieces = b.forestPieces;
    }
    return o;
  }

  function stepHasOptions(st) {
    var o = stepOptions(st);
    if (!o) return false;
    if (o.type === 'deploy' || o.type === 'trench') return o.targets.length > 0;
    if (o.type === 'attack') return o.attacks.length > 0;
    if (o.type === 'reposition') return o.moves.length > 0 || o.swaps.length > 0;
    if (o.type === 'barrage') return o.trenches.length > 0 || o.forestPieces.length > 0;
    return false;
  }

  function skipImpossible(st) {
    while (st.phase === 'step' && currentStep(st) && !stepHasOptions(st)) {
      advanceStep(st);
    }
  }

  function advanceStep(st) {
    if (st.phase !== 'step') return;
    st.pending.idx++;
    if (st.pending.idx >= st.pending.steps.length) endTurn(st);
  }

  function ensureStats(st) { // self-heal saves from before the behaviour counters
    if (!st.stats) st.stats = { attacks: 0, swaps: 0, marches: 0, deploys: 0, firstBlood: null };
    if (!st.lastSwap) st.lastSwap = { red: null, blue: null };
    return st.stats;
  }
  function swapKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  function applyStep(st, choice) {
    if (st.phase !== 'step') throw new Error('no step pending');
    var p = st.current;
    ensureStats(st);
    var step = currentStep(st);
    if (choice && choice.skip) {
      advanceStep(st);
      if (st.phase === 'step') skipImpossible(st);
      return st;
    }
    if (step.type === 'deploy') {
      var targets = deployTargets(st, p, step.anywhere);
      if (st.reserves[p][step.unit] <= 0 || targets.indexOf(choice.hex) < 0) throw new Error('invalid deploy');
      st.reserves[p][step.unit]--;
      st.units[choice.hex] = { type: step.unit, owner: p };
      st.stats.deploys++;
      log(st, cap(p) + ' deploys ' + UNITS[step.unit].name + ' at ' + hexLabel(choice.hex) + '.');
    } else if (step.type === 'trench') {
      if (st.reserves[p].trench <= 0 || trenchTargets(st, p).indexOf(choice.hex) < 0) throw new Error('invalid trench hex');
      var dirs = choice.dirs;
      var pairOk = dirs && dirs.length === 2 && trenchOrientations(st, choice.hex).some(function (pr) {
        return (pr[0] === dirs[0] && pr[1] === dirs[1]) || (pr[0] === dirs[1] && pr[1] === dirs[0]);
      });
      if (!pairOk) throw new Error('invalid trench orientation');
      st.reserves[p].trench--;
      if (!st.trenches[choice.hex]) st.trenches[choice.hex] = [];
      st.trenches[choice.hex].push({ dirs: dirs.slice(), owner: p }); // owner is UI-only info; trenches aid any defender
      log(st, cap(p) + ' digs a trench at ' + hexLabel(choice.hex) +
        (st.trenches[choice.hex].length > 1 ? ' — the hex is now double-trenched.' : '.'));
    } else if (step.type === 'attack') {
      var legal = listAttacks(st, p).some(function (a) {
        return a.from === choice.from && a.to === choice.to && (a.via || null) === (choice.via || null);
      });
      if (!legal) throw new Error('invalid attack');
      resolveAttack(st, { from: choice.from, to: choice.to, via: choice.via || null, mod: step.mod || 0, tieSpare: !!step.tieSpare, noAdvance: !!step.noAdvance });
      if (st.phase === 'battle-over') return st;
    } else if (step.type === 'reposition') {
      var r = listRepositions(st, p);
      if (choice.swap) {
        var ok = r.swaps.some(function (s) { return (s.a === choice.a && s.b === choice.b) || (s.a === choice.b && s.b === choice.a); });
        if (!ok) throw new Error('invalid swap');
        var ua = st.units[choice.a], ub = st.units[choice.b];
        st.units[choice.a] = ub; st.units[choice.b] = ua;
        st.lastSwap[p] = swapKey(choice.a, choice.b);
        st.stats.swaps++;
        log(st, cap(p) + ' swaps the units at ' + hexLabel(choice.a) + ' and ' + hexLabel(choice.b) + '.');
      } else {
        var okm = r.moves.some(function (m) { return m.from === choice.from && m.to === choice.to; });
        if (!okm) throw new Error('invalid move');
        st.units[choice.to] = st.units[choice.from];
        delete st.units[choice.from];
        st.stats.marches++;
        log(st, cap(p) + ' marches ' + UNITS[st.units[choice.to].type].name + ' from ' + hexLabel(choice.from) + ' to ' + hexLabel(choice.to) + '.');
      }
    } else if (step.type === 'barrage') {
      var b = listBarrageTargets(st, p);
      if (choice.trenchHex) {
        var ti = choice.trenchIdx || 0;
        var okT = b.trenches.some(function (t) { return t.hex === choice.trenchHex && t.idx === ti; });
        if (!okT) throw new Error('invalid barrage');
        st.trenches[choice.trenchHex].splice(ti, 1);
        if (!st.trenches[choice.trenchHex].length) delete st.trenches[choice.trenchHex];
        log(st, cap(p) + "'s naval barrage obliterates a trench at " + hexLabel(choice.trenchHex) + '.');
      } else if (choice.pieceId) {
        var pc = st.terrainPieces.filter(function (x) { return x.id === choice.pieceId && !x.removed; })[0];
        if (!pc || b.forestPieces.indexOf(pc) < 0) throw new Error('invalid barrage');
        pc.removed = true;
        pc.edgeKeys.forEach(function (ek) { delete st.terrainEdges[ek]; });
        log(st, cap(p) + "'s naval barrage burns away the forest at " + hexLabel(pc.edgeKeys[0].split('>')[0]) + '.');
      } else throw new Error('invalid barrage choice');
    }
    if (st.pending) st.pending.acted = (st.pending.acted || 0) + 1;
    advanceStep(st);
    if (st.phase === 'step') skipImpossible(st);
    return st;
  }

  function endTurn(st) {
    var p = st.current;
    if (st.pending.acted === 0) {
      // The play resolved zero actions — an effective skipped turn. Bill wants
      // these visible in the journal AND measurable in the card report.
      log(st, cap(p) + ' finds no opening — the order is spent to no effect.');
      var entry = st.playLog[st.pending.logIdx];
      if (entry && entry.id === st.pending.cardId) entry.noop = true;
    }
    st.removed[p].push(st.pending.cardId);
    st.pending = null;
    // discard remaining hand
    st.discards[p] = st.discards[p].concat(st.hands[p]);
    st.hands[p] = [];
    st.current = other(p);
    st.turnNumber++;
    st.phase = 'choose-card';
    drawHand(st, st.current); // may end battle by attrition
  }

  /* ---------- AI ---------- */
  function clone(st) {
    var m = st.match;
    st.match = null;
    var c = JSON.parse(JSON.stringify(st));
    st.match = m;
    c.match = { wins: { red: m.wins.red, blue: m.wins.blue }, battleIndex: m.battleIndex, mapOrder: m.mapOrder, firstPlayer: m.firstPlayer, winner: null };
    return c;
  }

  function unitValue(t) { return { infantry: 3, cavalry: 4, artillery: 5 }[t] || ((UNITS[t] ? UNITS[t].vp : 1) + 2); }

  function threatScan(st, me) {
    // best enemy attack power against each of my pieces next turn (+1 for possible card mod)
    var en = other(me);
    var score = 0;
    listAttacks(st, en).forEach(function (a) {
      var res = computeAttack(st, Object.assign({}, a, { mod: 1 }));
      var tgt = st.units[a.to];
      if (res.defenderIsHQ) {
        if (res.outcome !== 'defender') score -= 600; // enemy can take our HQ
      } else if (tgt && tgt.owner === me) {
        if (res.outcome === 'attacker') score -= unitValue(tgt.type) * 6;
        else if (res.outcome === 'tie') score -= unitValue(tgt.type) * 2.5;
      }
    });
    return score;
  }

  function evalState(st, me) {
    var en = other(me);
    if (st.phase === 'battle-over') return st.battleWinner === me ? 1e6 : -1e6;
    var s = 0;
    // Attrition projection: who wins if the decks ran out right now? Ramps up as
    // they empty, so the side losing the standstill (incl. ties — second player
    // wins those) is pushed to force combat instead of swap-dancing to 0-0.
    // This replaced a kill-VP term when scoring moved to surviving units (June 2026).
    var fsMe = fieldScore(st, me), fsEn = fieldScore(st, en);
    var turnsLeft = Math.min(cardsRemaining(st, me), cardsRemaining(st, en));
    var urgency = Math.max(0, 1 - turnsLeft / 12);
    var attrWin = fsMe > fsEn || (fsMe === fsEn && st.second === me);
    s += (attrWin ? 1 : -1) * 500 * urgency;
    s += (fsMe - fsEn) * (8 + 40 * urgency);
    var myUnits = [], enUnits = [];
    for (var h in st.units) {
      var u = st.units[h];
      (u.owner === me ? myUnits : enUnits).push({ h: h, u: u });
    }
    myUnits.forEach(function (x) { s += unitValue(x.u.type) * 22; });
    enUnits.forEach(function (x) { s -= unitValue(x.u.type) * 22; });
    // reserves slightly less valuable than deployed
    ['infantry', 'cavalry', 'artillery'].forEach(function (t) {
      s += st.reserves[me][t] * unitValue(t) * 16;
      s -= st.reserves[en][t] * unitValue(t) * 16;
    });
    // advance toward enemy HQ; keep some defense near own HQ
    var ehq = st.hq[en], mhq = st.hq[me];
    myUnits.forEach(function (x) {
      s -= dist(x.h, ehq) * 2.2;
      if (dist(x.h, mhq) <= 1) s += 4;
    });
    enUnits.forEach(function (x) { s += dist(x.h, mhq) * 1.6; });
    // my immediate threats on enemy pieces
    listAttacks(st, me).forEach(function (a) {
      var res = computeAttack(st, a);
      if (res.defenderIsHQ) { if (res.outcome !== 'defender') s += 220; }
      else if (res.outcome === 'attacker') s += unitValue(st.units[a.to].type) * 3;
    });
    // enemy threats on mine
    s += threatScan(st, me);
    // trench coverage near my HQ is nice
    for (var th in st.trenches) if (dist(th, mhq) <= 1) s += 6 * st.trenches[th].length;
    return s;
  }

  function enumerateChoices(st) {
    var o = stepOptions(st);
    var out = [{ skip: true }];
    if (!o) return out;
    if (o.type === 'deploy') o.targets.forEach(function (h) { out.push({ hex: h }); });
    else if (o.type === 'trench') o.targets.forEach(function (h) {
      trenchOrientations(st, h).forEach(function (d) { out.push({ hex: h, dirs: d }); });
    });
    else if (o.type === 'attack') o.attacks.forEach(function (a) {
      out.push({ from: a.from, to: a.to, via: a.via });
    });
    else if (o.type === 'reposition') {
      o.moves.forEach(function (m) { out.push({ from: m.from, to: m.to }); });
      o.swaps.forEach(function (sw) { out.push({ swap: true, a: sw.a, b: sw.b }); });
    } else if (o.type === 'barrage') {
      o.trenches.forEach(function (t) { out.push({ trenchHex: t.hex, trenchIdx: t.idx }); });
      o.forestPieces.forEach(function (pc) { out.push({ pieceId: pc.id }); });
    }
    return out;
  }

  // Greedily resolve the pending card on a cloned state; returns {score, choices}
  function greedyResolve(sim, me, randomness, s) {
    var choices = [];
    var guard = 0;
    while (sim.phase === 'step' && guard++ < 12) {
      var opts = enumerateChoices(sim);
      var best = null, bestScore = -Infinity;
      // cap branching for performance
      if (opts.length > 80) {
        shuffle(s, opts);
        opts = opts.slice(0, 80);
        if (opts.every(function (c) { return !c.skip; })) opts.push({ skip: true });
      }
      opts.forEach(function (c) {
        var sim2 = clone(sim);
        try { applyStep(sim2, c); } catch (e) { return; }
        var sc = evalState(sim2, me) + (randomness ? rnd(s) * randomness : 0);
        if (c.skip) sc -= 1; // mild bias toward acting
        // anti-shuffle: re-swapping the pair I swapped last time is ping-ponging
        if (c.swap && sim.lastSwap && sim.lastSwap[me] === swapKey(c.a, c.b)) sc -= 10;
        if (sc > bestScore) { bestScore = sc; best = c; }
      });
      if (!best) best = { skip: true };
      choices.push(best);
      applyStep(sim, best);
    }
    return { score: evalState(sim, me), choices: choices };
  }

  // How reluctant the AI is to burn a card on a fallback play (higher = keep it)
  var CARD_KEEP = {
    mass_assault: 9, attack_plus1: 8, conscription: 7, deploy_cavalry: 7,
    deploy_inf_trench: 6, ordered_withdraw: 5, careful_maneuvers: 5,
    reckless_maneuvers: 5, deploy_artillery: 5, airdrop: 4, naval_barrage: 4,
    forced_march: 3, deploy_inf_start: 2
  };

  // Field Marshal helper: how good is this end-of-my-turn state for me, once
  // the enemy answers? Their hand is hidden, so resample it from what is
  // legitimately public (deck + hand contents are known, order is not), let
  // them play their best reply, and average over a few sampled hands.
  function sampledReplyScore(endSt, me, s, samples) {
    if (endSt.phase === 'battle-over') return evalState(endSt, me);
    var opp = endSt.current;
    var total = 0;
    for (var k = 0; k < samples; k++) {
      var sim0 = clone(endSt);
      var pool = sim0.decks[opp].concat(sim0.hands[opp]);
      shuffle(s, pool);
      var hn = sim0.hands[opp].length;
      sim0.hands[opp] = pool.slice(0, hn);
      sim0.decks[opp] = pool.slice(hn);
      var bestOpp = -Infinity, bestState = sim0;
      var tried = {};
      sim0.hands[opp].forEach(function (cid) {
        if (tried[cid]) return;
        tried[cid] = true;
        var sim2 = clone(sim0);
        try { playCard(sim2, cid); } catch (e) { return; }
        var r = (sim2.phase === 'step') ? greedyResolve(sim2, opp, 0, s) : { score: evalState(sim2, opp), choices: [] };
        if (r.score > bestOpp) { bestOpp = r.score; bestState = sim2; }
      });
      total += evalState(bestState, me);
    }
    return total / samples;
  }

  // Decide the AI's whole turn. Returns {cardId, mode, choices:[...]}
  // easy   = greedy with noisy evaluations (makes mistakes)
  // normal = greedy, one turn deep
  // hard   = normal shortlist, then the top candidates are re-scored by what
  //          the enemy can do back (sampled hands — it never peeks at yours)
  function aiPlanTurn(st, difficulty) {
    var me = st.current;
    var randomness = difficulty === 'easy' ? 60 : 0;
    var s = { seed: (st.seed ^ 0x9e3779b9) | 0 };
    var hand = st.hands[me].slice();
    var candidates = [];
    var tried = {};
    // A plan that resolves ZERO actions is a dead turn (Bill: players should
    // always get to act) — penalize harder than the -12 fallback bias AND the
    // hard AI's 2-sample reply noise (round 6: 25 wasn't enough; sampled-hand
    // variance between candidates flipped it). When truly nothing can act,
    // every plan carries the penalty, so it cancels out.
    function noopPenalty(sim) {
      var le = sim.playLog[sim.playLog.length - 1];
      return (le && le.p === me && le.noop) ? 80 : 0;
    }
    hand.forEach(function (cid) {
      if (tried[cid]) return;
      tried[cid] = true;
      var sim = clone(st);
      try { playCard(sim, cid); } catch (e) { return; }
      var r = (sim.phase === 'step') ? greedyResolve(sim, me, randomness, s) : { score: evalState(sim, me), choices: [] };
      var pen = noopPenalty(sim);
      candidates.push({ plan: { cardId: cid, mode: 'normal', choices: r.choices },
        score: r.score - pen + (randomness ? rnd(s) * randomness : 0), pen: pen, end: sim });
    });
    // House rule: any card may be played as a basic attack or reposition.
    // Burn the least precious card if that beats every printed action.
    var burn = hand.slice().sort(function (a, b) { return (CARD_KEEP[a] || 5) - (CARD_KEEP[b] || 5); })[0];
    if (burn) {
      ['attack', 'reposition'].forEach(function (mode) {
        var sim = clone(st);
        try { playCard(sim, burn, mode); } catch (e) { return; }
        var r = (sim.phase === 'step') ? greedyResolve(sim, me, randomness, s) : { score: evalState(sim, me), choices: [] };
        var pen = noopPenalty(sim);
        candidates.push({ plan: { cardId: burn, mode: mode, choices: r.choices },
          score: r.score - 12 - pen + (randomness ? rnd(s) * randomness : 0), pen: pen, end: sim }); // mild bias toward printed actions
      });
    }
    if (!candidates.length) return null;
    candidates.sort(function (a, b) { return b.score - a.score; });
    if (difficulty !== 'hard') return candidates[0].plan;
    var best = null, bestScore = -Infinity;
    candidates.slice(0, 3).forEach(function (cand) {
      // Common random numbers (round 6): every candidate is scored against the
      // SAME sampled enemy hands (fresh rng, same seed), otherwise one candidate
      // randomly eats an Airdrop-by-the-HQ sample (-600) that another never saw
      // — that noise once drowned the dead-turn penalty entirely.
      var s2 = { seed: (st.seed ^ 0x51f15eed) | 0 };
      // cand.score already carries -pen; subtract the other 0.7 share so the
      // dead-turn penalty hits the blend at FULL strength (0.3 alone diluted
      // -80 to -24 and the reply term never saw it).
      var sc = 0.3 * cand.score + 0.7 * sampledReplyScore(cand.end, me, s2, 2) - 0.7 * (cand.pen || 0);
      if (sc > bestScore) { bestScore = sc; best = cand.plan; }
    });
    return best;
  }

  /* ---------- battle simulation (shared by balance.js and the in-game lab) ---------- */
  function simBattle(map, seed, firstPlayer, diffRed, diffBlue) {
    var match = newMatch({ seed: seed | 0, maps: [map], firstPlayer: firstPlayer || 'red' });
    var st = newBattle(match);
    var guard = 0;
    while (st.phase !== 'battle-over' && guard++ < 400) {
      var diff = st.current === 'red' ? (diffRed || 'normal') : (diffBlue || diffRed || 'normal');
      var plan = aiPlanTurn(st, diff);
      if (!plan) break;
      playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.phase === 'step' && g2++ < 12) {
        var c = plan.choices.shift() || { skip: true };
        try { applyStep(st, c); }
        catch (e) { try { applyStep(st, { skip: true }); } catch (e2) { break; } }
      }
    }
    return st;
  }

  // Balance aggregation is split so the CLI (balance.js) and the in-browser
  // dashboard fold battles through the SAME code — if they ever disagree on a
  // number, that's a bug. balanceNew makes an empty aggregate; balanceAdd folds
  // one finished battle in; balanceMap is the synchronous convenience loop.
  function balanceNew(n) {
    var out = { n: n, redWins: 0, firstWins: 0, hqWins: 0, turns: 0, vpDiff: 0, unfinished: 0, cards: {},
      // behaviour metrics (June 2026): catch degenerate AI play, not just outcomes
      attacks: 0, swaps: 0, marches: 0, zeroKill: 0, tiebreak: 0,
      firstBloodGames: 0, firstBloodWins: 0, controlGames: 0, controlWins: 0,
      deployedShare: 0 };
    CARDS.forEach(function (c) { out.cards[c.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 }; });
    return out;
  }
  function balanceAdd(out, st, fp) {
    if (st.phase !== 'battle-over') { out.unfinished++; return out; }
    var unitTotal = 0;
    Object.keys(UNITS).forEach(function (t) { unitTotal += UNITS[t].count || 0; });
    var w = st.battleWinner;
    if (w === 'red') out.redWins++;
    if (w === fp) out.firstWins++;
    if (st.winType === 'hq') out.hqWins++;
    out.turns += st.turnNumber;
    var fsr = fieldScore(st, 'red'), fsb = fieldScore(st, 'blue');
    out.vpDiff += Math.abs(fsr - fsb);
    var stats = st.stats || {};
    out.attacks += stats.attacks || 0;
    out.swaps += stats.swaps || 0;
    out.marches += stats.marches || 0;
    if (st.vp.red + st.vp.blue === 0) out.zeroKill++;            // no unit ever died
    if (st.winType === 'attrition' && fsr === fsb) out.tiebreak++; // decided only by tie-goes-to-2nd
    if (stats.firstBlood) {
      out.firstBloodGames++;
      if (stats.firstBlood === w) out.firstBloodWins++;
    }
    var hr = 0, hb = 0;
    for (var h in st.units) (st.units[h].owner === 'red' ? hr++ : hb++);
    if (hr !== hb) {
      out.controlGames++;
      if ((w === 'red') === (hr > hb)) out.controlWins++;        // winner also held more hexes
    }
    var resLeft = 0;
    ['red', 'blue'].forEach(function (p) {
      Object.keys(UNITS).forEach(function (t) { resLeft += st.reserves[p][t] || 0; });
    });
    out.deployedShare += 1 - resLeft / (2 * unitTotal);
    (st.playLog || []).forEach(function (e) {
      var c = out.cards[e.id] || (out.cards[e.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 });
      c.plays++;
      if (e.p === w) c.wins++;
      if (e.mode !== 'normal') c.simple++;     // resolved as a basic attack/reposition
      if (e.seen <= 1) c.firstSight++;          // played the first time it was seen
      if (e.noop) c.noop++;                     // resolved ZERO actions — an effective skipped turn
      c.seenSum += e.seen;
    });
    return out;
  }
  // the seed/first-player schedule for battle g of a balance run — one place,
  // so the CLI and the dashboard replay the identical battles
  function balanceSeed(seedBase, g) { return (seedBase || 7919) + g * 104729 + 13; }
  function balanceFP(g) { return g % 2 === 0 ? 'red' : 'blue'; }

  // n AI-vs-AI battles on one map (alternating first player); aggregated stats.
  function balanceMap(map, n, opts) {
    opts = opts || {};
    var out = balanceNew(n);
    for (var g = 0; g < n; g++) {
      var fp = balanceFP(g);
      var st = simBattle(map, balanceSeed(opts.seedBase, g), fp, opts.diffRed, opts.diffBlue);
      balanceAdd(out, st, fp);
      if (st.phase === 'battle-over' && opts.onGame) opts.onGame(g + 1, n, st);
    }
    return out;
  }

  /* ---------- validation helper (for tests) ---------- */
  function validateMaps(list) {
    var problems = [];
    var prevShape = CURRENT_SHAPE;
    (list || MAPS).forEach(function (m) {
      var shape = m.shape || DEFAULT_SHAPE;
      if (!SHAPES[shape]) { problems.push(m.name + ': unknown board shape "' + shape + '"'); return; }
      setBoard(shape);
      try {
        buildTerrain(m);
        if (!inBoard.apply(null, m.redHQ)) problems.push(m.name + ': red HQ off board');
        if (!inBoard.apply(null, m.blueHQ)) problems.push(m.name + ': blue HQ off board');
        if (key.apply(null, m.redHQ) === key.apply(null, m.blueHQ)) problems.push(m.name + ': HQs overlap');
        var stock = {};
        Object.keys(TERRAIN_STOCK).forEach(function (k) { stock[k] = 0; });
        m.pieces.forEach(function (p) {
          var sk = p.t + p.edges.length;
          if (stock[sk] === undefined) problems.push(m.name + ': piece of length ' + p.edges.length + ' has no physical counterpart (stock: ' + Object.keys(TERRAIN_STOCK).join(',') + ')');
          else stock[sk]++;
        });
        var over = Object.keys(TERRAIN_STOCK).filter(function (k) { return stock[k] > TERRAIN_STOCK[k]; });
        if (over.length) problems.push(m.name + ': exceeds terrain stock ' + JSON.stringify(stock));
      } catch (e) { problems.push(e.message); }
    });
    setBoard(prevShape);
    return problems;
  }

  var Engine = {
    DIRS: DIRS, UNITS: UNITS, CARDS: CARDS, CARD_BY_ID: CARD_BY_ID, MAPS: MAPS,
    PIECE_TOTALS: PIECE_TOTALS, TERRAIN_STOCK: TERRAIN_STOCK,
    SHAPES: SHAPES, DEFAULT_SHAPE: DEFAULT_SHAPE, boardHexes: boardHexes, setBoard: setBoard, hexes: hexes,
    currentShape: currentShape, rot180: rot180, buildTerrain: buildTerrain, pieceProblem: pieceProblem, hexLabel: hexLabel,
    key: key, parseKey: parseKey, inBoard: inBoard, neighbor: neighbor, neighbors: neighbors,
    dist: dist, dirBetween: dirBetween, edgeKey: edgeKey, edgeFrom: edgeFrom, sideKey: sideKey, other: other,
    newMatch: newMatch, newBattle: newBattle,
    unitAt: unitAt, isHQ: isHQ, isEmpty: isEmpty, controlledHexes: controlledHexes,
    deployTargets: deployTargets, trenchTargets: trenchTargets, trenchOrientations: trenchOrientations,
    listAttacks: listAttacks, listRepositions: listRepositions, listBarrageTargets: listBarrageTargets,
    computeAttack: computeAttack, playCard: playCard, currentStep: currentStep,
    stepOptions: stepOptions, applyStep: applyStep, cardsRemaining: cardsRemaining,
    enumerateChoices: enumerateChoices,
    concede: concede, concedeAdvised: concedeAdvised, fieldScore: fieldScore,
    aiPlanTurn: aiPlanTurn, clone: clone, evalState: evalState, validateMaps: validateMaps,
    simBattle: simBattle, balanceMap: balanceMap,
    balanceNew: balanceNew, balanceAdd: balanceAdd, balanceSeed: balanceSeed, balanceFP: balanceFP
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else global.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
