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

  /* ---------- static data ---------- */
  var UNITS = {
    infantry: { name: 'Infantry', atk: 1, def: 1, sup: 1, vp: 1 },
    cavalry: { name: 'Cavalry', atk: 3, def: 0, sup: 0, vp: 2 },
    artillery: { name: 'Artillery', atk: 0, def: 0, sup: 2, vp: 3 }
  };
  var RESERVES = { infantry: 7, cavalry: 2, artillery: 1, trench: 3 };

  var CARDS = [
    { id: 'deploy_inf_start', name: 'Deploy Infantry', count: 1, starting: true,
      text: 'Place an Infantry unit adjacent to any controlled hex.',
      steps: [{ type: 'deploy', unit: 'infantry' }] },
    { id: 'deploy_artillery', name: 'Deploy Artillery', count: 1,
      text: 'Place an Artillery unit adjacent to any controlled hex.',
      steps: [{ type: 'deploy', unit: 'artillery' }] },
    { id: 'deploy_inf_trench', name: 'Entrench', count: 3,
      text: 'Place an Infantry unit adjacent to any controlled hex. Then build a trench on any controlled hex.',
      steps: [{ type: 'deploy', unit: 'infantry' }, { type: 'trench' }] },
    { id: 'airdrop', name: 'Airdrop', count: 1,
      text: 'Place an Infantry unit on any empty hex. (Never in your opening hand.)',
      steps: [{ type: 'deploy', unit: 'infantry', anywhere: true }] },
    { id: 'conscription', name: 'Conscription', count: 1,
      text: 'Place two Infantry units adjacent to any controlled hex, in sequence.',
      steps: [{ type: 'deploy', unit: 'infantry' }, { type: 'deploy', unit: 'infantry' }] },
    { id: 'deploy_cavalry', name: 'Deploy Cavalry', count: 1,
      text: 'Place two Cavalry units adjacent to any controlled hex, in sequence.',
      steps: [{ type: 'deploy', unit: 'cavalry' }, { type: 'deploy', unit: 'cavalry' }] },
    { id: 'attack_plus1', name: 'Attack +1', count: 2,
      text: 'Order an attack with +1 support.',
      steps: [{ type: 'attack', mod: 1 }] },
    { id: 'mass_assault', name: 'Mass Assault', count: 1,
      text: 'Order an attack. Then order another attack.',
      steps: [{ type: 'attack' }, { type: 'attack' }] },
    { id: 'careful_maneuvers', name: 'Careful Maneuvers', count: 1,
      text: 'Reposition a unit. Then order an attack with −1 support.',
      steps: [{ type: 'reposition' }, { type: 'attack', mod: -1 }] },
    { id: 'reckless_maneuvers', name: 'Reckless Maneuvers', count: 1,
      text: 'Order an attack. Then reposition a unit.',
      steps: [{ type: 'attack' }, { type: 'reposition' }] },
    { id: 'ordered_withdraw', name: 'Ordered Withdraw', count: 1,
      text: 'Order an attack. On a tie, your attacker survives but does not take the hex.',
      steps: [{ type: 'attack', tieSpare: true }] },
    { id: 'naval_barrage', name: 'Naval Barrage', count: 1,
      text: 'Remove a trench or forest near your lines (optional). Then order an attack.',
      steps: [{ type: 'barrage' }, { type: 'attack' }] },
    { id: 'forced_march', name: 'Forced March', count: 1,
      text: 'Reposition up to three times, in sequence.',
      steps: [{ type: 'reposition' }, { type: 'reposition' }, { type: 'reposition' }] }
  ];
  var CARD_BY_ID = {};
  CARDS.forEach(function (c) { CARD_BY_ID[c.id] = c; });

  /* ---------- maps (data lives in maps.js) ---------- */
  var MAPS = BUILTIN.maps;

  // A terrain piece is physical: it sits INSIDE one hex and wraps adjacent
  // corners. Returns a problem string, or null if the piece is well-formed.
  function pieceProblem(p) {
    if (!p || (p.t !== 'F' && p.t !== 'M')) return 'piece type must be "F" or "M"';
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
    //   mountain in hex X: +1 defense when X is attacked across it.
    // returns { edges: {sideKey: 'F'|'M'}, pieces:[{id,t,edgeKeys:[sideKey...]}] }
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
  function copyReserves() { return { infantry: 7, cavalry: 2, artillery: 1, trench: 3 }; }
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
      hand.push('deploy_inf_start');
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
    if (hand.length === 0) endByAttrition(st);
  }

  function endByAttrition(st) {
    var vr = st.vp.red, vb = st.vp.blue;
    var winner;
    if (vr > vb) winner = 'red';
    else if (vb > vr) winner = 'blue';
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
    log(st, cap(winner) + ' wins the battle by ' + (how === 'hq' ? 'capturing the headquarters!' : 'attrition (' + st.vp.red + ' VP vs ' + st.vp.blue + ' VP).'));
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
  // House rule: an edge cannot carry both terrain and a trench.
  function edgeFreeForTrench(st, h, d) {
    // only terrain owned by this hex occupies the same physical space as a trench here
    return !st.terrainEdges[sideKey(h, d)];
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
      return !st.trenches[h] && trenchOrientations(st, h).length > 0;
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
    // hexes in/adjacent to controlled territory
    var zone = {};
    controlledHexes(st, p).forEach(function (c) {
      zone[c] = true;
      neighbors(c).forEach(function (n) { zone[n] = true; });
    });
    var trenchHexes = Object.keys(st.trenches).filter(function (h) { return zone[h]; });
    var forestPieces = st.terrainPieces.filter(function (pc) {
      if (pc.t !== 'F' || pc.removed) return false;
      return pc.edgeKeys.some(function (sk) {
        var parts = sk.split('>');
        var n = neighbor(parts[0], +parts[1]);
        return zone[parts[0]] || (n && zone[n]);
      });
    });
    return { trenchHexes: trenchHexes, forestPieces: forestPieces };
  }

  /* ---------- combat ---------- */
  function supportFor(st, p, battleHex, excludeHex) {
    var total = 0, parts = [];
    neighbors(battleHex).forEach(function (n) {
      if (n === excludeHex) return;
      var u = unitAt(st, n);
      if (u && u.owner === p && UNITS[u.type].sup > 0) {
        total += UNITS[u.type].sup;
        parts.push(UNITS[u.type].name + ' +' + UNITS[u.type].sup);
      }
      if (isHQ(st, n) === p) { total += 1; parts.push('HQ +1'); }
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
    var asup = supportFor(st, p, atk.to, atk.from);
    aPow += asup.total; aParts = aParts.concat(asup.parts);
    if (st.terrainEdges[atkSide] === 'F') { aPow += 1; aParts.push('Forest +1'); }
    var mod = atk.mod || 0;
    if (mod) { aPow += mod; aParts.push('Card ' + (mod > 0 ? '+' : '') + mod); }

    var du = unitAt(st, atk.to);
    var dHQ = isHQ(st, atk.to);
    var dPow, dParts;
    if (du) { dPow = UNITS[du.type].def; dParts = [UNITS[du.type].name + ' defense ' + UNITS[du.type].def]; }
    else { dPow = 0; dParts = ['Headquarters defense 0']; }
    var dsup = supportFor(st, e, atk.to, null);
    dPow += dsup.total; dParts = dParts.concat(dsup.parts);
    if (st.terrainEdges[defSide] === 'M') { dPow += 1; dParts.push('Mountain +1'); }
    var tr = st.trenches[atk.to];
    if (tr) {
      var dirIn = dirBetween(atk.to, attackEdgeFromHex);
      if (tr.dirs.indexOf(dirIn) >= 0) { dPow += 1; dParts.push('Trench +1'); }
    }
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
    var msg = cap(p) + ' ' + UNITS[au.type].name + ' attacks ' +
      (du ? cap(e) + ' ' + UNITS[du.type].name : cap(e) + ' HQ') +
      ' at ' + hexLabel(atk.to) +
      (atk.via ? ', striking through the HQ' : '') +
      ' (' + res.attackerPower + ' vs ' + res.defenderPower + '): ';

    function killDefender() {
      if (du) { delete st.units[atk.to]; st.vp[p] += UNITS[du.type].vp; }
      if (dHQ) { st.hqAlive[dHQ] = false; }
    }
    function killAttacker() {
      delete st.units[atk.from];
      st.vp[e] += UNITS[au.type].vp;
    }

    if (res.outcome === 'attacker') {
      killDefender();
      delete st.units[atk.from];
      st.units[atk.to] = au;
      msg += 'defender destroyed, attacker advances.';
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
    var card = CARD_BY_ID[cardId];
    var steps;
    if (mode === 'attack') steps = [{ type: 'attack' }];
    else if (mode === 'reposition') steps = [{ type: 'reposition' }];
    else steps = card.steps.map(function (s) { return Object.assign({}, s); });
    st.pending = {
      cardId: cardId,
      mode: mode,
      steps: steps,
      idx: 0
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
      o.attacks = listAttacks(st, p).map(function (a) {
        a = Object.assign({}, a, { mod: step.mod || 0, tieSpare: !!step.tieSpare });
        a.preview = computeAttack(st, a);
        return a;
      });
    } else if (step.type === 'reposition') {
      var r = listRepositions(st, p);
      o.moves = r.moves; o.swaps = r.swaps;
    } else if (step.type === 'barrage') {
      var b = listBarrageTargets(st, p);
      o.trenchHexes = b.trenchHexes; o.forestPieces = b.forestPieces;
    }
    return o;
  }

  function stepHasOptions(st) {
    var o = stepOptions(st);
    if (!o) return false;
    if (o.type === 'deploy' || o.type === 'trench') return o.targets.length > 0;
    if (o.type === 'attack') return o.attacks.length > 0;
    if (o.type === 'reposition') return o.moves.length > 0 || o.swaps.length > 0;
    if (o.type === 'barrage') return o.trenchHexes.length > 0 || o.forestPieces.length > 0;
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

  function applyStep(st, choice) {
    if (st.phase !== 'step') throw new Error('no step pending');
    var p = st.current;
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
      log(st, cap(p) + ' deploys ' + UNITS[step.unit].name + ' at ' + hexLabel(choice.hex) + '.');
    } else if (step.type === 'trench') {
      if (st.reserves[p].trench <= 0 || trenchTargets(st, p).indexOf(choice.hex) < 0) throw new Error('invalid trench hex');
      var dirs = choice.dirs;
      var pairOk = dirs && dirs.length === 2 && trenchOrientations(st, choice.hex).some(function (pr) {
        return (pr[0] === dirs[0] && pr[1] === dirs[1]) || (pr[0] === dirs[1] && pr[1] === dirs[0]);
      });
      if (!pairOk) throw new Error('invalid trench orientation');
      st.reserves[p].trench--;
      st.trenches[choice.hex] = { dirs: dirs.slice(), owner: p }; // owner is UI-only info; trenches aid any defender
      log(st, cap(p) + ' digs a trench at ' + hexLabel(choice.hex) + '.');
    } else if (step.type === 'attack') {
      var legal = listAttacks(st, p).some(function (a) {
        return a.from === choice.from && a.to === choice.to && (a.via || null) === (choice.via || null);
      });
      if (!legal) throw new Error('invalid attack');
      resolveAttack(st, { from: choice.from, to: choice.to, via: choice.via || null, mod: step.mod || 0, tieSpare: !!step.tieSpare });
      if (st.phase === 'battle-over') return st;
    } else if (step.type === 'reposition') {
      var r = listRepositions(st, p);
      if (choice.swap) {
        var ok = r.swaps.some(function (s) { return (s.a === choice.a && s.b === choice.b) || (s.a === choice.b && s.b === choice.a); });
        if (!ok) throw new Error('invalid swap');
        var ua = st.units[choice.a], ub = st.units[choice.b];
        st.units[choice.a] = ub; st.units[choice.b] = ua;
        log(st, cap(p) + ' swaps the units at ' + hexLabel(choice.a) + ' and ' + hexLabel(choice.b) + '.');
      } else {
        var okm = r.moves.some(function (m) { return m.from === choice.from && m.to === choice.to; });
        if (!okm) throw new Error('invalid move');
        st.units[choice.to] = st.units[choice.from];
        delete st.units[choice.from];
        log(st, cap(p) + ' marches ' + UNITS[st.units[choice.to].type].name + ' from ' + hexLabel(choice.from) + ' to ' + hexLabel(choice.to) + '.');
      }
    } else if (step.type === 'barrage') {
      var b = listBarrageTargets(st, p);
      if (choice.trenchHex) {
        if (b.trenchHexes.indexOf(choice.trenchHex) < 0) throw new Error('invalid barrage');
        delete st.trenches[choice.trenchHex];
        log(st, cap(p) + "'s naval barrage obliterates the trench at " + hexLabel(choice.trenchHex) + '.');
      } else if (choice.pieceId) {
        var pc = st.terrainPieces.filter(function (x) { return x.id === choice.pieceId && !x.removed; })[0];
        if (!pc || b.forestPieces.indexOf(pc) < 0) throw new Error('invalid barrage');
        pc.removed = true;
        pc.edgeKeys.forEach(function (ek) { delete st.terrainEdges[ek]; });
        log(st, cap(p) + "'s naval barrage burns away the forest at " + hexLabel(pc.edgeKeys[0].split('>')[0]) + '.');
      } else throw new Error('invalid barrage choice');
    }
    advanceStep(st);
    if (st.phase === 'step') skipImpossible(st);
    return st;
  }

  function endTurn(st) {
    var p = st.current;
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

  function unitValue(t) { return { infantry: 3, cavalry: 4, artillery: 5 }[t]; }

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
    s += (st.vp[me] - st.vp[en]) * 60;
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
    for (var th in st.trenches) if (dist(th, mhq) <= 1) s += 6;
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
      o.trenchHexes.forEach(function (h) { out.push({ trenchHex: h }); });
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

  // Decide the AI's whole turn. Returns {cardId, mode, choices:[...]}
  function aiPlanTurn(st, difficulty) {
    var me = st.current;
    var randomness = difficulty === 'easy' ? 60 : 0;
    var s = { seed: (st.seed ^ 0x9e3779b9) | 0 };
    var hand = st.hands[me].slice();
    var bestPlan = null, bestScore = -Infinity;
    var tried = {};
    hand.forEach(function (cid) {
      if (tried[cid]) return;
      tried[cid] = true;
      var sim = clone(st);
      try { playCard(sim, cid); } catch (e) { return; }
      var r = (sim.phase === 'step') ? greedyResolve(sim, me, randomness, s) : { score: evalState(sim, me), choices: [] };
      var sc = r.score + (randomness ? rnd(s) * randomness : 0);
      if (sc > bestScore) { bestScore = sc; bestPlan = { cardId: cid, mode: 'normal', choices: r.choices }; }
    });
    // House rule: any card may be played as a basic attack or reposition.
    // Burn the least precious card if that beats every printed action.
    var burn = hand.slice().sort(function (a, b) { return (CARD_KEEP[a] || 5) - (CARD_KEEP[b] || 5); })[0];
    if (burn) {
      ['attack', 'reposition'].forEach(function (mode) {
        var sim = clone(st);
        try { playCard(sim, burn, mode); } catch (e) { return; }
        var r = (sim.phase === 'step') ? greedyResolve(sim, me, randomness, s) : { score: evalState(sim, me), choices: [] };
        var sc = r.score - 12 + (randomness ? rnd(s) * randomness : 0); // mild bias toward printed actions
        if (sc > bestScore) { bestScore = sc; bestPlan = { cardId: burn, mode: mode, choices: r.choices }; }
      });
    }
    return bestPlan;
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
        var stock = { F2: 0, F3: 0, M2: 0, M3: 0 };
        m.pieces.forEach(function (p) {
          var sk = p.t + p.edges.length;
          if (stock[sk] === undefined) problems.push(m.name + ': piece of length ' + p.edges.length + ' has no physical counterpart (lengths 2-3 exist)');
          else stock[sk]++;
        });
        if (stock.F3 > 2 || stock.M3 > 2 || stock.F2 > 4 || stock.M2 > 4) problems.push(m.name + ': exceeds terrain stock ' + JSON.stringify(stock));
      } catch (e) { problems.push(e.message); }
    });
    setBoard(prevShape);
    return problems;
  }

  var Engine = {
    DIRS: DIRS, UNITS: UNITS, CARDS: CARDS, CARD_BY_ID: CARD_BY_ID, MAPS: MAPS,
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
    aiPlanTurn: aiPlanTurn, clone: clone, evalState: evalState, validateMaps: validateMaps
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else global.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
