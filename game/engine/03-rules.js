/* War of Attrition — engine part 03: legal-move queries + combat (pure; UI + AI both consume).
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- queries ---------- */
  function unitAt(st, h) { return st.pieces.units[h] || null; }
  function isHQ(st, h) {
    if (st.board.hqAlive.red && st.board.hq.red === h) return 'red';
    if (st.board.hqAlive.blue && st.board.hq.blue === h) return 'blue';
    return null;
  }
  function isEmpty(st, h) { return !unitAt(st, h) && !isHQ(st, h); }

  /* ---------- piece storage ----------
     The ONE place the shape of st.pieces (units / trenches / reserves) is
     known. Every free function reaches pieces through these accessors — reads
     via unitAt/units/eachUnit, writes via place/remove/advance and the reserve
     helpers — so re-keying or re-typing a piece is a one-place edit and nothing
     distant breaks. */
  var Pieces = {
    units: function (st) { return st.pieces.units; },
    unitAt: unitAt,
    eachUnit: function (st, fn) { var U = st.pieces.units; for (var h in U) fn(h, U[h]); },
    place: function (st, h, type, owner) { st.pieces.units[h] = { type: type, owner: owner }; },
    remove: function (st, h) { delete st.pieces.units[h]; },
    advance: function (st, from, to) { st.pieces.units[to] = st.pieces.units[from]; delete st.pieces.units[from]; },
    swap: function (st, a, b) { var ua = st.pieces.units[a]; st.pieces.units[a] = st.pieces.units[b]; st.pieces.units[b] = ua; },
    reserve: function (st, p, type) { return st.pieces.reserves[p][type]; },
    spendReserve: function (st, p, type) { st.pieces.reserves[p][type]--; },
    trenchesAt: function (st, h) { return st.pieces.trenches[h]; },
    trenches: function (st) { return st.pieces.trenches; }
  };

  function controlledHexes(st, p) {
    var out = [];
    Pieces.eachUnit(st, function (h, u) { if (u.owner === p) out.push(h); });
    if (st.board.hqAlive[p]) out.push(st.board.hq[p]);
    return out;
  }
  function deployTargets(st, p, anywhere) {
    var set = {};
    if (anywhere) {
      I.hexes().forEach(function (h) { if (isEmpty(st, h)) set[h] = true; });
    } else {
      controlledHexes(st, p).forEach(function (c) {
        I.neighbors(c).forEach(function (n) {
          if (isEmpty(st, n) && !I.deployBlocked(st, c, n)) set[n] = true;
        });
      });
    }
    return Object.keys(set);
  }
  // st.pieces.trenches[hex] is an ARRAY of {dirs:[d,d+1], owner} — a hex may hold
  // several trenches (per Bill's DoubleTrenchNotAllowed report), but their
  // edges may not overlap each I.other or this hex's own terrain sides.
  function trenchCovers(st, h, d) {
    var list = st.pieces.trenches[h];
    if (!list) return false;
    for (var i = 0; i < list.length; i++) if (list[i].dirs.indexOf(d) >= 0) return true;
    return false;
  }
  function edgeFreeForTrench(st, h, d) {
    // A trench needs the physical space of the side, so it needs the side empty
    // — of authored terrain owned by THIS hex, and of another trench.
    return !I.terrainAt(st, h, d);
  }
  function trenchOrientations(st, h) {
    var out = [];
    for (var d = 0; d < 6; d++) {
      var d2 = (d + 1) % 6;
      if (!edgeFreeForTrench(st, h, d) || !edgeFreeForTrench(st, h, d2)) continue;
      // A trench only denies support across a border that a skirmish can happen on.
      // If BOTH edges face off-board there's no such border — it does nothing, so
      // don't offer it (else the AI can dig a useless trench facing off-board).
      if (!I.neighbor(h, d) && !I.neighbor(h, d2)) continue;
      out.push([d, d2]);
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
    for (var h in st.pieces.units) {
      if (st.pieces.units[h].owner !== p) continue;
      I.neighbors(h).forEach(function (n) {
        var u = unitAt(st, n), hq = isHQ(st, n);
        if ((u && u.owner !== p) || (hq && hq !== p)) add(h, n, null);
        // pass through an HQ hex (no unit standing rule needed: units never occupy HQ hexes)
        if (hq) {
          I.neighbors(n).forEach(function (m) {
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
    // Swapping two units of the SAME type changes nothing on the board — it's a
    // hidden skip the metrics can't see — so it's not legal.
    var moves = [], swaps = [], seenSwap = {};
    for (var h in st.pieces.units) {
      if (st.pieces.units[h].owner !== p) continue;
      var myType = st.pieces.units[h].type;
      I.neighbors(h).forEach(function (n) {
        if (isEmpty(st, n)) moves.push({ from: h, to: n, via: null });
        var u = unitAt(st, n);
        if (u && u.owner === p && u.type !== myType) {
          var k = I.edgeKey(h, n);
          if (!seenSwap[k]) { seenSwap[k] = true; swaps.push({ a: h, b: n }); }
        }
        var hq = isHQ(st, n);
        if (hq) { // through HQ
          I.neighbors(n).forEach(function (m) {
            if (m === h) return;
            if (isEmpty(st, m)) moves.push({ from: h, to: m, via: n });
            var u2 = unitAt(st, m);
            if (u2 && u2.owner === p && u2.type !== myType) {
              var k2 = 'hq:' + I.edgeKey(h, m);
              if (!seenSwap[k2]) { seenSwap[k2] = true; swaps.push({ a: h, b: m, via: n }); }
            }
          });
        }
      });
    }
    return { moves: moves, swaps: swaps };
  }

  function listBarrageTargets(st, p) {
    // The naval guns reach the whole board — anything barrageable may be hit.
    // The two storages answer separately: trenches sit in st.pieces, authored
    // terrain in st.board.terrainPieces.
    var trenches = [];
    if (I.terrainNamed('trench').barrageable)
      Object.keys(st.pieces.trenches).forEach(function (h) {
        st.pieces.trenches[h].forEach(function (t, i) { trenches.push({ hex: h, idx: i, dirs: t.dirs }); });
      });
    var terrainTargets = st.board.terrainPieces.filter(function (pc) {
      var t = I.terrainOf(pc.t);
      return t && t.barrageable && !pc.removed;
    });
    return { trenches: trenches, terrainTargets: terrainTargets };
  }

  /* ---------- combat ---------- */
  // Attacker support crosses a border unless the terrain on it says otherwise —
  // which terrain, and what it denies, is each room's answer in
  // engine/board/terrain/. Only the ATTACKER's support is ever denied, and
  // ownership of the piece is irrelevant. Returns the blocker's name for the
  // combat breakdown, or null.
  function borderBlocked(st, fromHex, skirmishHex, attacking) {
    if (!attacking) return null;
    var t = I.supportBlocker(st, fromHex, skirmishHex);
    return t ? t.name : null;
  }
  function supportFor(st, p, skirmishHex, excludeHex, attacking) {
    var total = 0, parts = [], hexes = [];
    I.neighbors(skirmishHex).forEach(function (n) {
      if (n === excludeHex) return;
      var giver = null, amount = 0;
      var u = unitAt(st, n);
      if (u && u.owner === p && I.UNITS[u.type].sup > 0) { giver = I.UNITS[u.type].name; amount = I.UNITS[u.type].sup; }
      else if (isHQ(st, n) === p) { giver = 'HQ'; amount = I.CONFIG.combat.hqSupport; }
      if (!giver) return;
      var block = borderBlocked(st, n, skirmishHex, attacking);
      if (block) { parts.push(giver + ' support blocked by ' + block); return; }
      total += amount;
      parts.push(giver + ' +' + amount);
      hexes.push(n); // who actually contributed — the UI highlights them
    });
    return { total: total, parts: parts, hexes: hexes };
  }

  // Terrain letters on every edge a hex OWNS. Commander combatMods read this: a
  // Fortress is dug into its whole position, so its bonus keys on the hex holding
  // terrain — on any facing, not just the attacked edge. A terrain type's own
  // attack/defence answers stay per-edge.
  // Reads through terrainAt, so a hex's dug trenches count as its terrain here
  // too — a trait may gate on any registered type, not only the authored ones.
  function hexTerrain(st, hex) {
    var out = [];
    for (var d = 0; d < 6; d++) {
      var t = I.terrainAt(st, hex, d);
      if (t && out.indexOf(t.letter) < 0) out.push(t.letter);
    }
    return out;
  }

  function computeAttack(st, atk) {
    var p = st.pieces.units[atk.from].owner, e = I.other(p);
    var au = st.pieces.units[atk.from];
    var attackEdgeFromHex = atk.via || atk.from; // hex the attack crosses from
    var aParts = [I.UNITS[au.type].name + ' attack ' + I.UNITS[au.type].atk];
    var aPow = I.UNITS[au.type].atk;
    var asup = supportFor(st, p, atk.to, atk.from, true);
    aPow += asup.total; aParts = aParts.concat(asup.parts);
    var aTer = I.sideEffect(st, attackEdgeFromHex, I.dirBetween(attackEdgeFromHex, atk.to), 'attack');
    aPow += aTer.delta; if (aTer.part) aParts.push(aTer.part);
    var mod = atk.mod || 0;
    if (mod) { aPow += mod; aParts.push('Card ' + (mod > 0 ? '+' : '') + mod); }
    // Commander passive: an attack-side combatMod, gated by the attacker's hex terrain.
    var aCmd = I.commanderCombat(I.sideCommander(st, p), 'attack', hexTerrain(st, attackEdgeFromHex));
    aPow += aCmd.delta; aParts = aParts.concat(aCmd.parts);

    var du = unitAt(st, atk.to);
    var dHQ = isHQ(st, atk.to);
    var dPow, dParts;
    if (du) { dPow = I.UNITS[du.type].def; dParts = [I.UNITS[du.type].name + ' defense ' + I.UNITS[du.type].def]; }
    else { dPow = 0; dParts = ['Headquarters defense 0']; }
    var dsup = supportFor(st, e, atk.to, null, false);
    dPow += dsup.total; dParts = dParts.concat(dsup.parts);
    var dTer = I.sideEffect(st, atk.to, I.dirBetween(atk.to, attackEdgeFromHex), 'defense');
    dPow += dTer.delta; if (dTer.part) dParts.push(dTer.part);
    // Commander passive: a defense-side combatMod, gated by the defender's hex terrain
    // (any owned terrain edge, not only the attacked one — the "dug in" rule).
    var dCmd = I.commanderCombat(I.sideCommander(st, e), 'defense', hexTerrain(st, atk.to));
    dPow += dCmd.delta; dParts = dParts.concat(dCmd.parts);
    var outcome = aPow > dPow ? 'attacker' : (dPow > aPow ? 'defender' : 'tie');
    return {
      attackerPower: aPow, defenderPower: dPow,
      attackerParts: aParts, defenderParts: dParts,
      outcome: outcome, defenderIsHQ: !!dHQ, defenderUnit: du ? du.type : null
    };
  }

  function resolveAttack(st, atk) {
    var au = unitAt(st, atk.from), p = au.owner, e = I.other(p);
    var res = computeAttack(st, atk);
    var du = unitAt(st, atk.to), dHQ = isHQ(st, atk.to);
    // A trench on the ATTACKED border of the defending hex lets the defender
    // survive an even fight, and stops a tie from capturing a trenched HQ. Same
    // edge test borderBlocked uses (dIn = the defender's side toward the hex the
    // attack crosses from); trench OWNERSHIP is irrelevant.
    var borderTrenched = trenchCovers(st, atk.to, I.dirBetween(atk.to, atk.via || atk.from));
    I.ensureStats(st).attacks++;
    // Tag the play as an attack + tally attacks-made/absorbed by unit type.
    // 'attack' is sticky on the trace entry (see I.recordPlay) so
    // a reposition step later in the SAME play (Reckless Maneuvers) can't steal
    // the tag out from under this attack's kill.
    I.recordPlay(st, 'attack', atk.to);
    var um = I.ensureUnitMetrics(st);
    um[au.type].atk++;
    if (du) um[du.type].abs++;
    var msg = I.cap(p) + ' ' + I.UNITS[au.type].name + ' attacks ' +
      (du ? I.cap(e) + ' ' + I.UNITS[du.type].name : I.cap(e) + ' HQ') +
      ' at ' + I.hexLabel(atk.to) +
      (atk.via ? ', striking through the HQ' : '') +
      ' (' + res.attackerPower + ' vs ' + res.defenderPower + '): ';

    // st.result.kills tracks kills for stats/journal only — victory reads I.fieldScore.
    function killDefender() {
      if (du) {
        Pieces.remove(st, atk.to); st.result.kills[p] += I.UNITS[du.type].worth; if (!st.journal.stats.firstBlood) st.journal.stats.firstBlood = p;
        um[du.type].die++; um[du.type].dieT.push(st.flow.turnNumber); um[au.type].kill++;
        I.recordKill(st, 1);
      }
      if (dHQ) { st.board.hqAlive[dHQ] = false; }
      st.journal.lastKillTurn = st.flow.turnNumber;
    }
    function killAttacker() {
      Pieces.remove(st, atk.from);
      st.result.kills[e] += I.UNITS[au.type].worth;
      if (!st.journal.stats.firstBlood) st.journal.stats.firstBlood = e;
      um[au.type].die++; um[au.type].dieT.push(st.flow.turnNumber);
      if (du) um[du.type].kill++;
      I.recordKill(st, 1);
      st.journal.lastKillTurn = st.flow.turnNumber;
    }

    if (res.outcome === 'attacker') {
      killDefender();
      if (atk.noAdvance) {
        msg += 'defender destroyed; the attacker holds its ground.';
      } else {
        Pieces.advance(st, atk.from, atk.to);
        msg += 'defender destroyed, attacker advances.';
      }
    } else if (res.outcome === 'defender') {
      killAttacker();
      msg += 'attack repelled, attacker destroyed.';
    } else { // tie
      if (borderTrenched) {
        // A trenched border spares the defender on a tie — an even assault
        // bounces off the dug-in line. The attacker still dies as in a normal
        // tie UNLESS it has tieSpare (Ordered Withdraw / Over the Top); tieSpare
        // + trench = a whiff where nobody falls.
        if (atk.tieSpare) {
          msg += 'a tie against the trench — the assault is thrown back; the attacker withdraws in good order and neither side falls.';
        } else {
          killAttacker();
          msg += 'a tie against the trench — the defender holds the line; the attacker is destroyed.';
        }
      } else if (atk.tieSpare) {
        killDefender();
        msg += 'a tie — defender destroyed; attacker withdraws in good order.';
      } else {
        killDefender();
        killAttacker();
        msg += 'a tie — both units destroyed.';
      }
    }
    I.log(st, msg);
    // HQ capture: an attacker win always takes it; a tie takes it too UNLESS the
    // attacked HQ border is trenched (trench your HQ and a tie can't take it).
    // An untrenched-HQ tie still captures.
    if (dHQ && (res.outcome === 'attacker' || (res.outcome === 'tie' && !borderTrenched))) {
      I.finishSkirmish(st, p, 'hq');
    }
    return res;
  }

  /* shared-namespace exports */
  I.Pieces = Pieces;
  I.unitAt = unitAt;
  I.isHQ = isHQ;
  I.isEmpty = isEmpty;
  I.controlledHexes = controlledHexes;
  I.deployTargets = deployTargets;
  I.trenchCovers = trenchCovers;
  I.edgeFreeForTrench = edgeFreeForTrench;
  I.trenchOrientations = trenchOrientations;
  I.trenchTargets = trenchTargets;
  I.listAttacks = listAttacks;
  I.listRepositions = listRepositions;
  I.listBarrageTargets = listBarrageTargets;
  I.borderBlocked = borderBlocked;
  I.supportFor = supportFor;
  I.computeAttack = computeAttack;
  I.resolveAttack = resolveAttack;
})(typeof window !== 'undefined' ? window : globalThis);
