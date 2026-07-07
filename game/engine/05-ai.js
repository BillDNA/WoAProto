/* War of Attrition — engine part 05: weights, personalities, eval, greedy search, reply sampling.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- AI ---------- */
  function clone(st) {
    var m = st.match;
    st.match = null;
    var c = JSON.parse(JSON.stringify(st));
    st.match = m;
    c.match = { wins: { red: m.wins.red, blue: m.wins.blue }, battleIndex: m.battleIndex, mapOrder: m.mapOrder, firstPlayer: m.firstPlayer, winner: null };
    return c;
  }
  // The AI's hot-loop clone: identical to clone() except it drops what the
  // search never reads — the journal prose (st.log grows every turn and was
  // dominating clone cost late-battle), all playLog entries but the LAST
  // (noopPenalty reads exactly that one), and fsTimeline. __sim marks the
  // state so I.finishBattle never fires persistence hooks for search clones.
  function cloneForSim(st) {
    var m = st.match, lg = st.log, pl = st.playLog, tl = st.fsTimeline;
    st.match = null; st.log = []; st.playLog = (pl && pl.length) ? [pl[pl.length - 1]] : []; st.fsTimeline = undefined;
    var c = JSON.parse(JSON.stringify(st));
    st.match = m; st.log = lg; st.playLog = pl; st.fsTimeline = tl;
    c.match = { wins: { red: m.wins.red, blue: m.wins.blue }, battleIndex: m.battleIndex, mapOrder: m.mapOrder, firstPlayer: m.firstPlayer, winner: null };
    c.__sim = true;
    return c;
  }

  function unitValue(t) { return { infantry: 3, cavalry: 4, artillery: 5 }[t] || ((I.UNITS[t] ? I.UNITS[t].vp : 1) + 2); }

  // ---- AI personalities are DATA (V0 ai-variety) ----
  // One engine, many temperaments: a config is { noise, breadth, replySamples,
  // replyWeight, weights:{...} }. noise = evaluation randomness (mistakes);
  // breadth = how many top candidates get re-scored by the opponent's sampled
  // best reply (0 = pure greedy, this is the depth/breadth dial); replySamples/
  // replyWeight tune that reply search. weights override AI_WEIGHTS terms.
  // Extra personalities can be defined in maps.js as an "ai" block — a new AI
  // is a new row of numbers, not new code. easy/normal/hard are presets here.
  // Guardrails baked in (don't lose them in a new config): the noopPenalty and
  // antiShuffle weights and the attrition projection are the round-5/6 anti-
  // degeneracy fixes — zero them and the swap-dance stalemate returns.
  var AI_WEIGHTS = {
    attrWin: 500,      // attrition-projection swing at full urgency
    fsDiff: 8, fsDiffUrgent: 40, // field-score diff, flat + urgency-scaled
    unitOnBoard: 22, unitReserve: 16, // unitValue multipliers
    advance: 2.2,      // pressure toward the enemy HQ (per hex of distance)
    hqGuard: 4,        // bonus for sitting next to my own HQ
    enemyDist: 1.6,    // keep enemy units far from my HQ
    myThreatHQ: 220, myThreatKill: 3,   // my available attacks next step
    threatHQ: 600, threatKill: 6, threatTie: 2.5, // enemy threats on me
    trenchHome: 6,     // trenches near my HQ
    noopPenalty: 80,   // dead-turn plans (round 6 — keep > fallbackBias + reply noise)
    antiShuffle: 10,   // re-swapping the same pair as last turn
    fallbackBias: 12   // mild preference for printed actions over card-burning
  };
  var AI_PRESETS = {
    easy:   { noise: 60, breadth: 0 },                                  // greedy + mistakes
    normal: { noise: 0,  breadth: 0 },                                  // greedy
    hard:   { noise: 0,  breadth: 3, replySamples: 2, replyWeight: 0.7 } // Field Marshal
  };
  Object.keys(I.BUILTIN.ai || {}).forEach(function (n) { AI_PRESETS[n] = I.BUILTIN.ai[n]; });
  function aiConfig(d) {
    var base = (typeof d === 'string' || d === undefined) ? (AI_PRESETS[d] || AI_PRESETS.normal) : d;
    var cfg = Object.assign({ noise: 0, breadth: 0, replySamples: 2, replyWeight: 0.7 }, base);
    cfg.w = Object.assign({}, AI_WEIGHTS, base.weights || {});
    return cfg;
  }

  function threatScan(st, me, w) {
    // best enemy attack power against each of my pieces next turn (+1 for possible card mod)
    var en = I.other(me);
    var score = 0;
    I.listAttacks(st, en).forEach(function (a) {
      var res = I.computeAttack(st, Object.assign({}, a, { mod: 1 }));
      var tgt = st.units[a.to];
      if (res.defenderIsHQ) {
        if (res.outcome !== 'defender') score -= w.threatHQ; // enemy can take our HQ
      } else if (tgt && tgt.owner === me) {
        if (res.outcome === 'attacker') score -= unitValue(tgt.type) * w.threatKill;
        else if (res.outcome === 'tie') score -= unitValue(tgt.type) * w.threatTie;
      }
    });
    return score;
  }

  function evalState(st, me, w) {
    w = w || AI_WEIGHTS;
    var en = I.other(me);
    if (st.phase === 'battle-over') return st.battleWinner === me ? 1e6 : -1e6;
    var s = 0;
    // Attrition projection: who wins if the decks ran out right now? Ramps up as
    // they empty, so the side losing the standstill (incl. ties — second player
    // wins those) is pushed to force combat instead of swap-dancing to 0-0.
    // This replaced a kill-VP term when scoring moved to surviving units (June 2026).
    var fsMe = I.fieldScore(st, me), fsEn = I.fieldScore(st, en);
    var turnsLeft = Math.min(I.cardsRemaining(st, me), I.cardsRemaining(st, en));
    var urgency = Math.max(0, 1 - turnsLeft / 12);
    var attrWin = fsMe > fsEn || (fsMe === fsEn && st.second === me);
    s += (attrWin ? 1 : -1) * w.attrWin * urgency;
    s += (fsMe - fsEn) * (w.fsDiff + w.fsDiffUrgent * urgency);
    var myUnits = [], enUnits = [];
    for (var h in st.units) {
      var u = st.units[h];
      (u.owner === me ? myUnits : enUnits).push({ h: h, u: u });
    }
    myUnits.forEach(function (x) { s += unitValue(x.u.type) * w.unitOnBoard; });
    enUnits.forEach(function (x) { s -= unitValue(x.u.type) * w.unitOnBoard; });
    // reserves slightly less valuable than deployed
    ['infantry', 'cavalry', 'artillery'].forEach(function (t) {
      s += st.reserves[me][t] * unitValue(t) * w.unitReserve;
      s -= st.reserves[en][t] * unitValue(t) * w.unitReserve;
    });
    // advance toward enemy HQ; keep some defense near own HQ
    var ehq = st.hq[en], mhq = st.hq[me];
    myUnits.forEach(function (x) {
      s -= I.dist(x.h, ehq) * w.advance;
      if (I.dist(x.h, mhq) <= 1) s += w.hqGuard;
    });
    enUnits.forEach(function (x) { s += I.dist(x.h, mhq) * w.enemyDist; });
    // my immediate threats on enemy pieces
    I.listAttacks(st, me).forEach(function (a) {
      var res = I.computeAttack(st, a);
      if (res.defenderIsHQ) { if (res.outcome !== 'defender') s += w.myThreatHQ; }
      else if (res.outcome === 'attacker') s += unitValue(st.units[a.to].type) * w.myThreatKill;
    });
    // enemy threats on mine
    s += threatScan(st, me, w);
    // trench coverage near my HQ is nice
    for (var th in st.trenches) if (I.dist(th, mhq) <= 1) s += w.trenchHome * st.trenches[th].length;
    return s;
  }

  function enumerateChoices(st) {
    var o = I.stepOptions(st, { previews: false });
    var out = [{ skip: true }];
    if (!o) return out;
    if (o.type === 'deploy') o.targets.forEach(function (h) { out.push({ hex: h }); });
    else if (o.type === 'trench') o.targets.forEach(function (h) {
      I.trenchOrientations(st, h).forEach(function (d) { out.push({ hex: h, dirs: d }); });
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
  function greedyResolve(sim, me, randomness, s, w) {
    w = w || AI_WEIGHTS;
    var choices = [];
    var guard = 0;
    while (sim.phase === 'step' && guard++ < 12) {
      var opts = enumerateChoices(sim);
      var best = null, bestScore = -Infinity;
      // I.cap branching for performance
      if (opts.length > 80) {
        I.shuffle(s, opts);
        opts = opts.slice(0, 80);
        if (opts.every(function (c) { return !c.skip; })) opts.push({ skip: true });
      }
      opts.forEach(function (c) {
        var sim2 = cloneForSim(sim);
        try { I.applyStep(sim2, c); } catch (e) { return; }
        var sc = evalState(sim2, me, w) + (randomness ? I.rnd(s) * randomness : 0);
        if (c.skip) sc -= 1; // mild bias toward acting
        // anti-shuffle: re-swapping the pair I swapped last time is ping-ponging
        if (c.swap && sim.lastSwap && sim.lastSwap[me] === I.swapKey(c.a, c.b)) sc -= w.antiShuffle;
        if (sc > bestScore) { bestScore = sc; best = c; }
      });
      if (!best) best = { skip: true };
      choices.push(best);
      I.applyStep(sim, best);
    }
    return { score: evalState(sim, me, w), choices: choices };
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
  function sampledReplyScore(endSt, me, s, samples, w) {
    w = w || AI_WEIGHTS;
    if (endSt.phase === 'battle-over') return evalState(endSt, me, w);
    var opp = endSt.current;
    var total = 0;
    for (var k = 0; k < samples; k++) {
      var sim0 = cloneForSim(endSt);
      var pool = sim0.decks[opp].concat(sim0.hands[opp]);
      I.shuffle(s, pool);
      var hn = sim0.hands[opp].length;
      sim0.hands[opp] = pool.slice(0, hn);
      sim0.decks[opp] = pool.slice(hn);
      var bestOpp = -Infinity, bestState = sim0;
      var tried = {};
      sim0.hands[opp].forEach(function (cid) {
        if (tried[cid]) return;
        tried[cid] = true;
        var sim2 = cloneForSim(sim0);
        try { I.playCard(sim2, cid); } catch (e) { return; }
        var r = (sim2.phase === 'step') ? greedyResolve(sim2, opp, 0, s, w) : { score: evalState(sim2, opp, w), choices: [] };
        if (r.score > bestOpp) { bestOpp = r.score; bestState = sim2; }
      });
      total += evalState(bestState, me, w);
    }
    return total / samples;
  }

  // Decide the AI's whole turn. Returns {cardId, mode, choices:[...]}
  // `difficulty` is a preset name ('easy' | 'normal' | 'hard' | any maps.js
  // "ai" entry) or a raw config object — see AI_PRESETS/aiConfig above.
  // easy   = greedy with noisy evaluations (makes mistakes)
  // normal = greedy, one turn deep
  // hard   = normal shortlist, then the top `breadth` candidates are re-scored
  //          by what the enemy can do back (sampled hands — never peeks at yours)
  function aiPlanTurn(st, difficulty) {
    var cfg = aiConfig(difficulty);
    var w = cfg.w;
    var me = st.current;
    var randomness = cfg.noise;
    var s = { seed: (st.seed ^ 0x9e3779b9) | 0 };
    var hand = st.hands[me].slice();
    var candidates = [];
    var tried = {};
    // A plan that resolves ZERO actions is a dead turn (Bill: players should
    // always get to act) — penalize harder than the fallbackBias AND the
    // reply-search noise (round 6: 25 wasn't enough; sampled-hand variance
    // between candidates flipped it). When truly nothing can act, every plan
    // carries the penalty, so it cancels out.
    function noopPenalty(sim) {
      var le = sim.playLog[sim.playLog.length - 1];
      return (le && le.p === me && le.noop) ? w.noopPenalty : 0;
    }
    hand.forEach(function (cid) {
      if (tried[cid]) return;
      tried[cid] = true;
      var sim = cloneForSim(st);
      try { I.playCard(sim, cid); } catch (e) { return; }
      var r = (sim.phase === 'step') ? greedyResolve(sim, me, randomness, s, w) : { score: evalState(sim, me, w), choices: [] };
      var pen = noopPenalty(sim);
      candidates.push({ plan: { cardId: cid, mode: 'normal', choices: r.choices },
        score: r.score - pen + (randomness ? I.rnd(s) * randomness : 0), pen: pen, end: sim });
    });
    // House rule: any card may be played as a basic attack or reposition.
    // Burn the least precious card if that beats every printed action.
    var burn = hand.slice().sort(function (a, b) { return (CARD_KEEP[a] || 5) - (CARD_KEEP[b] || 5); })[0];
    if (burn) {
      ['attack', 'reposition'].forEach(function (mode) {
        var sim = cloneForSim(st);
        try { I.playCard(sim, burn, mode); } catch (e) { return; }
        var r = (sim.phase === 'step') ? greedyResolve(sim, me, randomness, s, w) : { score: evalState(sim, me, w), choices: [] };
        var pen = noopPenalty(sim);
        candidates.push({ plan: { cardId: burn, mode: mode, choices: r.choices },
          score: r.score - w.fallbackBias - pen + (randomness ? I.rnd(s) * randomness : 0), pen: pen, end: sim }); // mild bias toward printed actions
      });
    }
    if (!candidates.length) return null;
    candidates.sort(function (a, b) { return b.score - a.score; });
    if (!cfg.breadth) return candidates[0].plan;
    var best = null, bestScore = -Infinity;
    candidates.slice(0, cfg.breadth).forEach(function (cand) {
      // Common random numbers (round 6): every candidate is scored against the
      // SAME sampled enemy hands (fresh rng, same seed), otherwise one candidate
      // randomly eats an Airdrop-by-the-HQ sample that another never saw —
      // that noise once drowned the dead-turn penalty entirely.
      var s2 = { seed: (st.seed ^ 0x51f15eed) | 0 };
      // cand.score already carries -pen; subtract the reply-side share too so
      // the dead-turn penalty hits the blend at FULL strength (the greedy share
      // alone diluted it and the reply term never saw it).
      var rw = cfg.replyWeight;
      var sc = (1 - rw) * cand.score + rw * sampledReplyScore(cand.end, me, s2, cfg.replySamples, w) - rw * (cand.pen || 0);
      if (sc > bestScore) { bestScore = sc; best = cand.plan; }
    });
    return best;
  }

  /* shared-namespace exports */
  I.clone = clone;
  I.cloneForSim = cloneForSim;
  I.unitValue = unitValue;
  I.AI_WEIGHTS = AI_WEIGHTS;
  I.AI_PRESETS = AI_PRESETS;
  I.aiConfig = aiConfig;
  I.threatScan = threatScan;
  I.evalState = evalState;
  I.enumerateChoices = enumerateChoices;
  I.greedyResolve = greedyResolve;
  I.CARD_KEEP = CARD_KEEP;
  I.sampledReplyScore = sampledReplyScore;
  I.aiPlanTurn = aiPlanTurn;
})(typeof window !== 'undefined' ? window : globalThis);
