/* War of Attrition — engine part 03: legal-move queries + combat (pure; UI + AI both consume).
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

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
      I.hexes().forEach(function (h) { if (isEmpty(st, h)) set[h] = true; });
    } else {
      controlledHexes(st, p).forEach(function (c) {
        I.neighbors(c).forEach(function (n) {
          // a river on the c|n border stops control from extending across it
          // (Round 3: adjacency control must not cross the water)
          if (isEmpty(st, n) && !riverBetween(st, c, n)) set[n] = true;
        });
      });
    }
    return Object.keys(set);
  }
  // st.trenches[hex] is an ARRAY of {dirs:[d,d+1], owner} — a hex may hold
  // several trenches (per Bill's DoubleTrenchNotAllowed report), but their
  // edges may not overlap each I.other or this hex's own terrain sides.
  function trenchCovers(st, h, d) {
    var list = st.trenches[h];
    if (!list) return false;
    for (var i = 0; i < list.length; i++) if (list[i].dirs.indexOf(d) >= 0) return true;
    return false;
  }
  function edgeFreeForTrench(st, h, d) {
    // only works owned by this hex occupy the same physical space as a trench here
    return !st.terrainEdges[I.sideKey(h, d)] && !trenchCovers(st, h, d);
  }
  function trenchOrientations(st, h) {
    var out = [];
    for (var d = 0; d < 6; d++) {
      var d2 = (d + 1) % 6;
      if (!edgeFreeForTrench(st, h, d) || !edgeFreeForTrench(st, h, d2)) continue;
      // A trench only denies support across a border that a battle can happen on.
      // If BOTH edges face off-board there's no such border — it does nothing, so
      // don't offer it (Feedback Round 2: AI dug a useless trench facing off-board).
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
    for (var h in st.units) {
      if (st.units[h].owner !== p) continue;
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
    // Round-3 ruling, enforced in 1.0 (was documented as shipped but never made
    // it into the code): swapping two units of the SAME type changes nothing on
    // the board — it's a hidden skip the metrics can't see — so it's not legal.
    var moves = [], swaps = [], seenSwap = {};
    for (var h in st.units) {
      if (st.units[h].owner !== p) continue;
      var myType = st.units[h].type;
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
  // Support crossing rules (Feedback Round 3 river revision, July 2026):
  //  - a TRENCH on the border between supporter and battle hex blocks ATTACKER
  //    support only. Ownership is irrelevant (Bill: lose a trench and the enemy
  //    uses it just fine). Trenches grant no +1 defense — that's for mountains.
  //  - a RIVER no longer blocks support at all: support crosses it freely for
  //    both sides. A river instead denies DEPLOY-control extension across it
  //    (riverBetween / deployTargets) — control creep stops at the water, but
  //    armies already on the field still support across it. Bill's Round-3 goal:
  //    make situational repositioning stronger and cut infantry-for-infantry
  //    swaps. Attacks/moves/Airdrop cross freely; a river is not barrageable.
  function borderBlocked(st, fromHex, battleHex, attacking) {
    var dOut = I.dirBetween(fromHex, battleHex), dIn = I.dirBetween(battleHex, fromHex);
    if (attacking && (trenchCovers(st, fromHex, dOut) || trenchCovers(st, battleHex, dIn))) return 'trench';
    return null;
  }
  // A river on the border between two adjacent hexes stops deploy-control from
  // extending across it (Round 3: adjacency control must not cross the water).
  // Reads both hexes' sides — ownership of the piece is irrelevant.
  function riverBetween(st, a, b) {
    var dOut = I.dirBetween(a, b), dIn = I.dirBetween(b, a);
    return st.terrainEdges[I.sideKey(a, dOut)] === 'R' || st.terrainEdges[I.sideKey(b, dIn)] === 'R';
  }
  function supportFor(st, p, battleHex, excludeHex, attacking) {
    var total = 0, parts = [], hexes = [];
    I.neighbors(battleHex).forEach(function (n) {
      if (n === excludeHex) return;
      var giver = null, amount = 0;
      var u = unitAt(st, n);
      if (u && u.owner === p && I.UNITS[u.type].sup > 0) { giver = I.UNITS[u.type].name; amount = I.UNITS[u.type].sup; }
      else if (isHQ(st, n) === p) { giver = 'HQ'; amount = 1; }
      if (!giver) return;
      var block = borderBlocked(st, n, battleHex, attacking);
      if (block) { parts.push(giver + ' support blocked by ' + block); return; }
      total += amount;
      parts.push(giver + ' +' + amount);
      hexes.push(n); // who actually contributed — the UI highlights them
    });
    return { total: total, parts: parts, hexes: hexes };
  }

  function computeAttack(st, atk) {
    var p = st.units[atk.from].owner, e = I.other(p);
    var au = st.units[atk.from];
    var attackEdgeFromHex = atk.via || atk.from; // hex the attack crosses from
    var atkSide = I.sideKey(attackEdgeFromHex, I.dirBetween(attackEdgeFromHex, atk.to));
    var defSide = I.sideKey(atk.to, I.dirBetween(atk.to, attackEdgeFromHex));
    var aParts = [I.UNITS[au.type].name + ' attack ' + I.UNITS[au.type].atk];
    var aPow = I.UNITS[au.type].atk;
    var asup = supportFor(st, p, atk.to, atk.from, true);
    aPow += asup.total; aParts = aParts.concat(asup.parts);
    if (st.terrainEdges[atkSide] === 'F') { aPow += 1; aParts.push('Forest +1'); }
    var mod = atk.mod || 0;
    if (mod) { aPow += mod; aParts.push('Card ' + (mod > 0 ? '+' : '') + mod); }

    var du = unitAt(st, atk.to);
    var dHQ = isHQ(st, atk.to);
    var dPow, dParts;
    if (du) { dPow = I.UNITS[du.type].def; dParts = [I.UNITS[du.type].name + ' defense ' + I.UNITS[du.type].def]; }
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
    var p = st.units[atk.from].owner, e = I.other(p);
    var res = computeAttack(st, atk);
    var au = st.units[atk.from];
    var du = unitAt(st, atk.to), dHQ = isHQ(st, atk.to);
    // rules 1.1 (S1): a trench on the ATTACKED border of the defending hex lets
    // the defender survive an even fight, and stops a tie from capturing a
    // trenched HQ. Same edge test borderBlocked uses (dIn = the defender's side
    // toward the hex the attack crosses from); trench OWNERSHIP is irrelevant.
    var borderTrenched = trenchCovers(st, atk.to, I.dirBetween(atk.to, atk.via || atk.from));
    I.ensureStats(st).attacks++;
    // WOA-031 (SPEC §4): tag the play as an attack + tally attacks-made/absorbed
    // by unit type. 'attack' is sticky on the trace entry (see I.recordPlay) so
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

    // st.vp tracks kills for stats/journal only — victory reads I.fieldScore.
    function killDefender() {
      if (du) {
        delete st.units[atk.to]; st.vp[p] += I.UNITS[du.type].vp; if (!st.stats.firstBlood) st.stats.firstBlood = p;
        um[du.type].die++; um[du.type].dieT.push(st.turnNumber); um[au.type].kill++;
        I.recordKill(st, 1);
      }
      if (dHQ) { st.hqAlive[dHQ] = false; }
      st.lastKillTurn = st.turnNumber;
    }
    function killAttacker() {
      delete st.units[atk.from];
      st.vp[e] += I.UNITS[au.type].vp;
      if (!st.stats.firstBlood) st.stats.firstBlood = e;
      um[au.type].die++; um[au.type].dieT.push(st.turnNumber);
      if (du) um[du.type].kill++;
      I.recordKill(st, 1);
      st.lastKillTurn = st.turnNumber;
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
      if (borderTrenched) {
        // rules 1.1 (S1, Variant A/A1): a trenched border spares the defender on
        // a tie — an even assault bounces off the dug-in line. The attacker still
        // dies as in a normal tie UNLESS it has tieSpare (Ordered Withdraw / Over
        // the Top); tieSpare + trench = a whiff where nobody falls (A1).
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
    // attacked HQ border is trenched (rules 1.1, S1 — trench your HQ and a tie
    // can't take it). An untrenched-HQ tie still captures exactly as before.
    if (dHQ && (res.outcome === 'attacker' || (res.outcome === 'tie' && !borderTrenched))) {
      I.finishBattle(st, p, 'hq');
    }
    return res;
  }

  /* shared-namespace exports */
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
  I.riverBetween = riverBetween;
  I.supportFor = supportFor;
  I.computeAttack = computeAttack;
  I.resolveAttack = resolveAttack;
})(typeof window !== 'undefined' ? window : globalThis);
