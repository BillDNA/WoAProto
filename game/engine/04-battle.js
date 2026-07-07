/* War of Attrition — engine part 04: match/battle lifecycle + card-step turn flow + hooks.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- state ---------- */

  function newMatch(opts) {
    opts = opts || {};
    var s = { seed: (opts.seed !== undefined ? opts.seed : (Date.now() & 0x7fffffff)) | 0 };
    var maps = (opts.maps && opts.maps.length) ? opts.maps : I.MAPS;
    var order = [];
    for (var i = 0; i < maps.length; i++) order.push(i);
    I.shuffle(s, order);
    var match = {
      seed: s.seed,
      maps: maps,           // full map definitions travel with the match (LAN-safe)
      mapOrder: order,
      battleIndex: 0,
      wins: { red: 0, blue: 0 },
      firstPlayer: opts.firstPlayer || (I.rnd(s) < 0.5 ? 'red' : 'blue'),
      winner: null
    };
    match.seed = s.seed;
    return match;
  }

  function buildDeck(s, player) {
    var deck = [];
    I.CARDS.forEach(function (c) {
      for (var i = 0; i < c.count; i++) if (!c.starting) deck.push(c.id);
    });
    I.shuffle(s, deck);
    return deck;
  }

  function newBattle(match) {
    var maps = match.maps || I.MAPS;
    var mapIdx = match.mapOrder[match.battleIndex % match.mapOrder.length];
    var map = maps[mapIdx];
    var shapeName = I.ensureMapShape(map);
    I.setBoard(shapeName);
    var terrain = I.buildTerrain(map);
    var st = {
      boardShape: shapeName,
      seed: match.seed,
      match: match,
      mapIndex: mapIdx,
      mapName: map.name,
      terrainEdges: terrain.edges,
      terrainPieces: terrain.pieces,
      hq: { red: I.key(map.redHQ[0], map.redHQ[1]), blue: I.key(map.blueHQ[0], map.blueHQ[1]) },
      hqAlive: { red: true, blue: true },
      units: {},      // hexKey -> {type, owner}
      trenches: {},   // hexKey -> {dirs:[d1,d2]}
      reserves: { red: copyReserves(), blue: copyReserves() },
      vp: { red: 0, blue: 0 },
      decks: {}, discards: { red: [], blue: [] }, removed: { red: [], blue: [] }, hands: { red: [], blue: [] },
      seen: { red: {}, blue: {} },  // cardId -> times it has appeared in p's hand
      playLog: [],                  // {p, id, mode, turn, seen-at-play} per card played
      lastSwap: { red: null, blue: null }, // p's most recent swap pair (AI anti-I.shuffle)
      stats: { attacks: 0, swaps: 0, marches: 0, deploys: 0, firstBlood: null }, // behaviour counters for the balance lab
      firstTurnDone: { red: false, blue: false },
      current: match.battleIndex === 0 ? match.firstPlayer : match.lastLoser,
      second: null,
      phase: 'choose-card', // choose-card | step | battle-over
      pending: null,
      battleWinner: null,
      winType: null,
      log: [],
      turnNumber: 1,
      lastKillTurn: 0,   // turn of the most recent kill/HQ fall — kill-less-tail metric
      leadChanges: 0,    // times the field-score leader flipped to the OTHER side
      lastLeader: null,  // last definite (non-tie) field-score leader
      fsTimeline: []     // [fsRed, fsBlue] per completed turn (V1 DB timeline; absent on sims + old saves)
    };
    st.second = I.other(st.current);
    st.decks.red = buildDeck(st, 'red');
    st.decks.blue = buildDeck(st, 'blue');
    log(st, 'Battle ' + (match.battleIndex + 1) + ' — "' + map.name + '". ' + I.cap(st.current) + ' moves first.');
    drawHand(st, st.current);
    return st;
  }
  function copyReserves() {
    var r = { trench: I.TRENCH_COUNT };
    Object.keys(I.UNITS).forEach(function (t) { r[t] = I.UNITS[t].count || 0; });
    return r;
  }
  function log(st, msg) { st.log.push({ turn: st.turnNumber, player: st.current, msg: msg }); }

  function cardsRemaining(st, p) {
    return st.decks[p].length + st.discards[p].length + st.hands[p].length;
  }

  function drawHand(st, p) {
    var hand = st.hands[p];
    var first = !st.firstTurnDone[p];
    if (first) {
      st.firstTurnDone[p] = true;
      hand.push(I.STARTING_CARD);
    }
    var want = first ? 3 : 4;
    var total = st.decks[p].length + st.discards[p].length;
    if (total <= (first ? 4 : 5)) want = total; // 5 or fewer remain: draw all
    var held = [];
    if (first) { // house rule: cards flagged noOpener (e.g. Airdrop) never open
      for (var hi = st.decks[p].length - 1; hi >= 0; hi--) {
        var cid = st.decks[p][hi];
        if (I.CARD_BY_ID[cid] && I.CARD_BY_ID[cid].noOpener) held.push(st.decks[p].splice(hi, 1)[0]);
      }
    }
    for (var i = 0; i < want; i++) {
      if (st.decks[p].length === 0 && st.discards[p].length > 0) {
        st.decks[p] = I.shuffle(st, st.discards[p]);
        st.discards[p] = [];
      }
      if (st.decks[p].length === 0) break;
      hand.push(st.decks[p].pop());
    }
    held.forEach(function (cid) {
      var pos = Math.floor(I.rnd(st) * (st.decks[p].length + 1));
      st.decks[p].splice(pos, 0, cid);
    });
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
    for (var h in st.units) { var u = st.units[h]; if (u.owner === p) s += I.UNITS[u.type].vp; }
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

  // V1 seam: every REAL finished battle (never an AI-search clone — those carry
  // __sim) flows through here, so persistence subscribes once and covers every
  // source: human play, watch mode, the lab, LLM battles. Hook errors never
  // break the game.
  var HOOKS = { onBattleEnd: [] };
  function finishBattle(st, winner, how) {
    st.phase = 'battle-over';
    st.battleWinner = winner;
    st.winType = how;
    st.pending = null;
    var m = st.match;
    m.wins[winner]++;
    m.lastLoser = I.other(winner);
    m.battleIndex++;
    m.seed = st.seed;
    if (m.wins[winner] >= 3) { m.winner = winner; }
    log(st, I.cap(winner) + ' wins the battle by ' + (how === 'hq' ? 'capturing the headquarters!' :
      how === 'concession' ? 'concession.' :
      'attrition (' + fieldScore(st, 'red') + ' VP vs ' + fieldScore(st, 'blue') + ' VP of surviving units).'));
    if (!st.__sim) HOOKS.onBattleEnd.forEach(function (fn) {
      try { fn(st); } catch (e) { if (typeof console !== 'undefined') console.error('onBattleEnd hook failed: ' + e.message); }
    });
  }

  // A player throws in the towel; the battle (not the match) goes to the enemy.
  function concede(st, p) {
    if (st.phase === 'battle-over') throw new Error('battle already over');
    log(st, I.cap(p) + ' concedes the field.');
    finishBattle(st, I.other(p), 'concession');
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
    var e = I.other(p);
    var turnsLeft = cardsRemaining(st, p); // each turn removes exactly 1 card from p's pool
    var need = (fieldScore(st, e) - fieldScore(st, p)) + (st.second === p ? 0 : 1); // second player wins ties
    if (need <= 0) return null;            // p still ahead (or tied as second player)
    var gain = 3 * turnsLeft;              // best case: a 3-VP swing every remaining turn
    if (gain >= need) return null;         // the gap can still be closed in principle
    if (st.hqAlive[e] && turnsLeft > 0) {
      var hasReserve = Object.keys(I.UNITS).some(function (t) { return st.reserves[p][t] > 0; });
      if (hasReserve && turnsLeft >= 2 && st.removed[p].indexOf('airdrop') < 0) return null; // Airdrop snipe still possible
      var hq = st.hq[e], reach = Infinity;
      for (var h2 in st.units) if (st.units[h2].owner === p) reach = Math.min(reach, I.dist(h2, hq));
      if (hasReserve) I.deployTargets(st, p, false).forEach(function (d) { reach = Math.min(reach, I.dist(d, hq) + 1); });
      if (reach <= turnsLeft) return null; // a march on the HQ is still conceivable
    }
    return { need: need, gain: gain, turnsLeft: turnsLeft };
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
    // House rule (Feedback Round 1): a basic reposition is only allowed when no
    // basic attack is possible — you can't I.shuffle pieces to dodge a fight.
    if (mode === 'reposition' && I.listAttacks(st, p).length > 0)
      throw new Error('cannot reposition while a basic attack is available');
    st.hands[p].splice(idx, 1);
    if (!st.playLog) st.playLog = []; // self-heal pre-metrics saves
    st.playLog.push({ p: p, id: cardId, mode: mode, turn: st.turnNumber,
      seen: (st.seen && st.seen[p] && st.seen[p][cardId]) || 1 });
    var card = I.CARD_BY_ID[cardId];
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
    log(st, I.cap(p) + ' plays "' + card.name + '"' +
      (mode === 'attack' ? ' as a direct attack order.' : mode === 'reposition' ? ' as a simple maneuver.' : '.'));
    skipImpossible(st);
    return st;
  }

  function currentStep(st) {
    if (st.phase !== 'step' || !st.pending) return null;
    return st.pending.steps[st.pending.idx] || null;
  }

  // opts.previews === false skips the per-attack I.computeAttack preview — the
  // previews exist for the UI's hover pills; the AI's I.enumerateChoices and the
  // step-possibility checks below never read them (V1 seam, hot path).
  function stepOptions(st, opts) {
    var step = currentStep(st);
    if (!step) return null;
    var p = st.current;
    var card = I.CARD_BY_ID[st.pending.cardId];
    var o = { type: step.type, cardName: card.name, stepIndex: st.pending.idx, stepCount: st.pending.steps.length };
    if (step.type === 'deploy') {
      o.unit = step.unit;
      o.available = st.reserves[p][step.unit] > 0;
      o.targets = o.available ? I.deployTargets(st, p, step.anywhere) : [];
    } else if (step.type === 'trench') {
      o.available = st.reserves[p].trench > 0;
      o.targets = o.available ? I.trenchTargets(st, p) : [];
    } else if (step.type === 'attack') {
      o.mod = step.mod || 0;
      o.tieSpare = !!step.tieSpare;
      o.noAdvance = !!step.noAdvance;
      var withPreviews = !(opts && opts.previews === false);
      o.attacks = I.listAttacks(st, p).map(function (a) {
        a = Object.assign({}, a, { mod: step.mod || 0, tieSpare: !!step.tieSpare, noAdvance: !!step.noAdvance });
        if (withPreviews) a.preview = I.computeAttack(st, a);
        return a;
      });
    } else if (step.type === 'reposition') {
      var r = I.listRepositions(st, p);
      o.moves = r.moves; o.swaps = r.swaps;
    } else if (step.type === 'barrage') {
      var b = I.listBarrageTargets(st, p);
      o.trenches = b.trenches; o.forestPieces = b.forestPieces;
    }
    return o;
  }

  function stepHasOptions(st) {
    var o = stepOptions(st, { previews: false });
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

  // Feedback Round 2: a card must accomplish at least one action if it can — you
  // may skip an individual step, but not skip EVERY step to burn the order for
  // free. A voluntary skip is refused only when nothing has acted yet, this step
  // can act, and no later step can (it's the card's last chance). Steps with no
  // legal option are still auto-skipped by skipImpossible, and a card where no
  // step can act at all still legitimately no-ops.
  function laterStepPlayable(st) {
    var save = st.pending.idx, found = false;
    for (var i = save + 1; i < st.pending.steps.length && !found; i++) {
      st.pending.idx = i;
      if (stepHasOptions(st)) found = true;
    }
    st.pending.idx = save;
    return found;
  }
  function mustPlayStep(st) {
    return st.phase === 'step' && !!st.pending && st.pending.acted === 0 &&
      stepHasOptions(st) && !laterStepPlayable(st);
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
      if (mustPlayStep(st)) throw new Error('at least one step of a card must be played');
      advanceStep(st);
      if (st.phase === 'step') skipImpossible(st);
      return st;
    }
    if (step.type === 'deploy') {
      var targets = I.deployTargets(st, p, step.anywhere);
      if (st.reserves[p][step.unit] <= 0 || targets.indexOf(choice.hex) < 0) throw new Error('invalid deploy');
      st.reserves[p][step.unit]--;
      st.units[choice.hex] = { type: step.unit, owner: p };
      st.stats.deploys++;
      log(st, I.cap(p) + ' deploys ' + I.UNITS[step.unit].name + ' at ' + I.hexLabel(choice.hex) + '.');
    } else if (step.type === 'trench') {
      if (st.reserves[p].trench <= 0 || I.trenchTargets(st, p).indexOf(choice.hex) < 0) throw new Error('invalid trench hex');
      var dirs = choice.dirs;
      var pairOk = dirs && dirs.length === 2 && I.trenchOrientations(st, choice.hex).some(function (pr) {
        return (pr[0] === dirs[0] && pr[1] === dirs[1]) || (pr[0] === dirs[1] && pr[1] === dirs[0]);
      });
      if (!pairOk) throw new Error('invalid trench orientation');
      st.reserves[p].trench--;
      if (!st.trenches[choice.hex]) st.trenches[choice.hex] = [];
      st.trenches[choice.hex].push({ dirs: dirs.slice(), owner: p }); // owner is UI-only info; trenches aid any defender
      log(st, I.cap(p) + ' digs a trench at ' + I.hexLabel(choice.hex) +
        (st.trenches[choice.hex].length > 1 ? ' — the hex is now double-trenched.' : '.'));
    } else if (step.type === 'attack') {
      var legal = I.listAttacks(st, p).some(function (a) {
        return a.from === choice.from && a.to === choice.to && (a.via || null) === (choice.via || null);
      });
      if (!legal) throw new Error('invalid attack');
      I.resolveAttack(st, { from: choice.from, to: choice.to, via: choice.via || null, mod: step.mod || 0, tieSpare: !!step.tieSpare, noAdvance: !!step.noAdvance });
      if (st.phase === 'battle-over') return st;
    } else if (step.type === 'reposition') {
      var r = I.listRepositions(st, p);
      if (choice.swap) {
        var ok = r.swaps.some(function (s) { return (s.a === choice.a && s.b === choice.b) || (s.a === choice.b && s.b === choice.a); });
        if (!ok) throw new Error('invalid swap');
        var ua = st.units[choice.a], ub = st.units[choice.b];
        st.units[choice.a] = ub; st.units[choice.b] = ua;
        st.lastSwap[p] = swapKey(choice.a, choice.b);
        st.stats.swaps++;
        log(st, I.cap(p) + ' swaps the units at ' + I.hexLabel(choice.a) + ' and ' + I.hexLabel(choice.b) + '.');
      } else {
        var okm = r.moves.some(function (m) { return m.from === choice.from && m.to === choice.to; });
        if (!okm) throw new Error('invalid move');
        st.units[choice.to] = st.units[choice.from];
        delete st.units[choice.from];
        st.stats.marches++;
        log(st, I.cap(p) + ' marches ' + I.UNITS[st.units[choice.to].type].name + ' from ' + I.hexLabel(choice.from) + ' to ' + I.hexLabel(choice.to) + '.');
      }
    } else if (step.type === 'barrage') {
      var b = I.listBarrageTargets(st, p);
      if (choice.trenchHex) {
        var ti = choice.trenchIdx || 0;
        var okT = b.trenches.some(function (t) { return t.hex === choice.trenchHex && t.idx === ti; });
        if (!okT) throw new Error('invalid barrage');
        st.trenches[choice.trenchHex].splice(ti, 1);
        if (!st.trenches[choice.trenchHex].length) delete st.trenches[choice.trenchHex];
        log(st, I.cap(p) + "'s naval barrage obliterates a trench at " + I.hexLabel(choice.trenchHex) + '.');
      } else if (choice.pieceId) {
        var pc = st.terrainPieces.filter(function (x) { return x.id === choice.pieceId && !x.removed; })[0];
        if (!pc || b.forestPieces.indexOf(pc) < 0) throw new Error('invalid barrage');
        pc.removed = true;
        pc.edgeKeys.forEach(function (ek) { delete st.terrainEdges[ek]; });
        log(st, I.cap(p) + "'s naval barrage burns away the forest at " + I.hexLabel(pc.edgeKeys[0].split('>')[0]) + '.');
      } else throw new Error('invalid barrage choice');
    }
    if (st.pending) st.pending.acted = (st.pending.acted || 0) + 1;
    advanceStep(st);
    if (st.phase === 'step') skipImpossible(st);
    return st;
  }

  function endTurn(st) {
    var p = st.current;
    // Decisiveness: did this turn flip the field-score lead to the OTHER side?
    // (a swing to a tie doesn't count as a change — Feedback Round 2)
    var fr = fieldScore(st, 'red'), fb = fieldScore(st, 'blue');
    var lead = fr > fb ? 'red' : (fb > fr ? 'blue' : null);
    if (lead) {
      if (st.lastLeader && lead !== st.lastLeader) st.leadChanges = (st.leadChanges || 0) + 1;
      st.lastLeader = lead;
    }
    if (st.fsTimeline) st.fsTimeline.push([fr, fb]); // absent on sims + pre-V1 saves
    if (st.pending.acted === 0) {
      // The play resolved zero actions — an effective skipped turn. Bill wants
      // these visible in the journal AND measurable in the card report.
      log(st, I.cap(p) + ' finds no opening — the order is spent to no effect.');
      var entry = st.playLog[st.pending.logIdx];
      if (entry && entry.id === st.pending.cardId) entry.noop = true;
    }
    st.removed[p].push(st.pending.cardId);
    st.pending = null;
    // discard remaining hand
    st.discards[p] = st.discards[p].concat(st.hands[p]);
    st.hands[p] = [];
    st.current = I.other(p);
    st.turnNumber++;
    st.phase = 'choose-card';
    drawHand(st, st.current); // may end battle by attrition
  }

  /* shared-namespace exports */
  I.newMatch = newMatch;
  I.buildDeck = buildDeck;
  I.newBattle = newBattle;
  I.copyReserves = copyReserves;
  I.log = log;
  I.cardsRemaining = cardsRemaining;
  I.drawHand = drawHand;
  I.fieldScore = fieldScore;
  I.endByAttrition = endByAttrition;
  I.finishBattle = finishBattle;
  I.HOOKS = HOOKS;
  I.concede = concede;
  I.concedeAdvised = concedeAdvised;
  I.playCard = playCard;
  I.currentStep = currentStep;
  I.stepOptions = stepOptions;
  I.stepHasOptions = stepHasOptions;
  I.skipImpossible = skipImpossible;
  I.advanceStep = advanceStep;
  I.laterStepPlayable = laterStepPlayable;
  I.mustPlayStep = mustPlayStep;
  I.ensureStats = ensureStats;
  I.swapKey = swapKey;
  I.applyStep = applyStep;
  I.endTurn = endTurn;
})(typeof window !== 'undefined' ? window : globalThis);
