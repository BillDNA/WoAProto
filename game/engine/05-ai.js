/* War of Attrition — engine part 05: weights, personalities, eval, greedy search, reply sampling.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- AI ---------- */
  // Structural deep clone with JSON.parse(JSON.stringify) semantics but no
  // string round-trip. The Field Marshal search clones the skirmish state once
  // per candidate move — thousands of times per skirmish — and the
  // serialize-then-parse pair dominated that cost. This reproduces JSON exactly
  // so a cloned search state stays byte-identical to the old JSON clone (keeping
  // a throwaway refactor diff reproducible): own enumerable keys in source order (state carries no
  // integer-like keys, so that is insertion order — same iteration order the
  // engine's for..in scans depend on); undefined/function/symbol values dropped
  // from objects and turned to null in arrays; non-finite numbers to null.
  // The skirmish state is pure JSON data (no Dates/Maps/class instances), which
  // is why the round-trip was safe to begin with and this stays equivalent.
  // Both state clones (clone / cloneForSim) route through here — ONE clone
  // mechanism, so the AI's searched state can never drift from the real state
  // via a different deep-copy rule; the pure-JSON precondition is theirs to hold.
  function jsonClone(v) {
    if (v === null || typeof v !== 'object')
      return (typeof v === 'number' && !isFinite(v)) ? null : v; // JSON: NaN/Infinity -> null
    if (Array.isArray(v)) {
      var n = v.length, a = new Array(n);
      for (var i = 0; i < n; i++) {
        var e = v[i];
        a[i] = (e === undefined || typeof e === 'function' || typeof e === 'symbol') ? null : jsonClone(e);
      }
      return a;
    }
    var out = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      var val = v[k];
      if (val === undefined || typeof val === 'function' || typeof val === 'symbol') continue; // JSON drops these keys
      out[k] = jsonClone(val);
    }
    return out;
  }

  function clone(st) {
    var m = st.battle;
    st.battle = null;
    var c = jsonClone(st);
    st.battle = m;
    c.battle = { wins: { red: m.wins.red, blue: m.wins.blue }, skirmishIndex: m.skirmishIndex, mapOrder: m.mapOrder, firstPlayer: m.firstPlayer, winner: null };
    return c;
  }
  // The AI's hot-loop clone: identical to clone() except it drops what the
  // search never reads — the journal prose (st.journal.log grows every turn and was
  // dominating clone cost late-skirmish), all playLog entries but the LAST
  // (noopPenalty reads exactly that one), the decisionLog (capture only, never
  // read by search), and fsTimeline. __sim marks the state so I.finishSkirmish
  // never fires persistence hooks for search clones.
  function cloneForSim(st) {
    var m = st.battle, lg = st.journal.log, pl = st.journal.playLog, dl = st.journal.decisionLog, tl = st.journal.fsTimeline, sd = st.cards.sideDecks, cm = st.commanders;
    // sideDecks registries + commanders are immutable for the skirmish (resolved
    // once at newSkirmish) — strip them out of the deep clone and reattach the
    // SAME reference, like battle/log below.
    st.battle = null; st.journal.log = []; st.journal.playLog = (pl && pl.length) ? [pl[pl.length - 1]] : []; st.journal.decisionLog = []; st.journal.fsTimeline = undefined; st.cards.sideDecks = undefined; st.commanders = undefined;
    var c = jsonClone(st);
    st.battle = m; st.journal.log = lg; st.journal.playLog = pl; st.journal.decisionLog = dl; st.journal.fsTimeline = tl; st.cards.sideDecks = sd; st.commanders = cm;
    c.battle = { wins: { red: m.wins.red, blue: m.wins.blue }, skirmishIndex: m.skirmishIndex, mapOrder: m.mapOrder, firstPlayer: m.firstPlayer, winner: null };
    c.cards.sideDecks = sd;
    if (cm) c.commanders = cm;
    c.__sim = true;
    return c;
  }

  // ---- AI personalities are DATA ----
  // One engine, many temperaments: a config is { noise, breadth, replySamples,
  // replyWeight, weights:{...} }. noise = evaluation randomness (mistakes);
  // breadth = how many top candidates get re-scored by the opponent's sampled
  // best reply (0 = pure greedy, this is the depth/breadth dial); replySamples/
  // replyWeight tune that reply search. weights override AI_WEIGHTS terms.
  // Extra personalities can be defined in maps.js as an "ai" block — a new AI
  // is a new row of numbers, not new code. easy/normal/hard are presets here.
  // The weights + tuning dials are config homes in engine/ai/ai-config.js (guardrails:
  // never zero noopPenalty / antiShuffle / attrWin in a new personality — they hold off
  // the swap-dance stalemate). Read below as I.AI_WEIGHTS / I.AI_TUNING at each site.
  var AI_PRESETS = {
    easy:   { noise: 60, breadth: 0 },                                  // greedy + mistakes
    normal: { noise: 0,  breadth: 0 },                                  // greedy
    hard:   { noise: 0,  breadth: 3, replySamples: 2, replyWeight: 0.7 } // Field Marshal
  };
  Object.keys(I.BUILTIN.ai || {}).forEach(function (n) { AI_PRESETS[n] = I.BUILTIN.ai[n]; });
  function aiConfig(d) {
    var base = (typeof d === 'string' || d === undefined) ? (AI_PRESETS[d] || AI_PRESETS.normal) : d;
    var cfg = Object.assign({}, I.AI_TUNING.defaults, base);
    cfg.w = Object.assign({}, I.AI_WEIGHTS, base.weights || {});
    return cfg;
  }

  function threatScan(st, me, w) {
    // best enemy attack power against each of my pieces next turn (+1 for possible card mod)
    var en = I.other(me);
    var score = 0;
    I.listAttacks(st, en).forEach(function (a) {
      var res = I.computeAttack(st, Object.assign({}, a, { mod: I.AI_TUNING.threatCardMod }));
      var tgt = st.pieces.units[a.to];
      if (res.defenderIsHQ) {
        if (res.outcome !== 'defender') score -= w.threatHQ; // enemy can take our HQ
      } else if (tgt && tgt.owner === me) {
        if (res.outcome === 'attacker') score -= I.unitValue(tgt.type, w) * w.threatKill;
        else if (res.outcome === 'tie') score -= I.unitValue(tgt.type, w) * w.threatTie;
      }
    });
    return score;
  }

  // How many of a trench's two covered edges face a LIVE enemy lane — an enemy
  // unit within 2 hexes of the far side of the denied border. Trenches are
  // attacker-support denial, so an edge nobody can attack across is worth
  // nothing; this is what makes the AI's choice of trench orientation a real one.
  function trenchFacingLive(st, h, dirs, enemyHexes) {
    var v = 0;
    for (var i = 0; i < dirs.length; i++) {
      var n = I.neighbor(h, dirs[i]);
      if (!n) continue;
      for (var j = 0; j < enemyHexes.length; j++) {
        if (I.dist(n, enemyHexes[j]) <= I.AI_TUNING.laneRange) { v++; break; }
      }
    }
    return v;
  }

  function evalState(st, me, w) {
    w = w || I.AI_WEIGHTS;
    var en = I.other(me);
    if (st.flow.phase === 'skirmish-over') return st.result.skirmishWinner === me ? 1e6 : -1e6;
    var s = 0;
    // Attrition projection: who wins if the decks ran out right now? Ramps up as
    // they empty, so the side losing the standstill (incl. ties — second player
    // wins those) is pushed to force combat instead of swap-dancing to 0-0.
    // Scoring reads surviving units, not kills.
    var fsMe = I.fieldScore(st, me), fsEn = I.fieldScore(st, en);
    var turnsLeft = Math.min(I.cardsRemaining(st, me), I.cardsRemaining(st, en));
    var urgency = Math.max(0, 1 - turnsLeft / I.AI_TUNING.urgencyWindow);
    var attrWin = fsMe > fsEn || (fsMe === fsEn && st.flow.second === me);
    s += (attrWin ? 1 : -1) * w.attrWin * urgency;
    s += (fsMe - fsEn) * (w.fsDiff + w.fsDiffUrgent * urgency);
    var myUnits = [], enUnits = [];
    for (var h in st.pieces.units) {
      var u = st.pieces.units[h];
      (u.owner === me ? myUnits : enUnits).push({ h: h, u: u });
    }
    myUnits.forEach(function (x) { s += I.unitValue(x.u.type, w) * w.unitOnBoard; });
    enUnits.forEach(function (x) { s -= I.unitValue(x.u.type, w) * w.unitOnBoard; });
    // reserves slightly less valuable than deployed
    I.unitTypes().forEach(function (t) {
      s += st.pieces.reserves[me][t] * I.unitValue(t, w) * w.unitReserve;
      s -= st.pieces.reserves[en][t] * I.unitValue(t, w) * w.unitReserve;
    });
    // advance toward enemy HQ; keep some defense near own HQ
    var ehq = st.board.hq[en], mhq = st.board.hq[me];
    myUnits.forEach(function (x) {
      s -= I.dist(x.h, ehq) * w.advance;
      if (I.dist(x.h, mhq) <= 1) s += w.hqGuard;
    });
    enUnits.forEach(function (x) { s += I.dist(x.h, mhq) * w.enemyDist; });
    // my immediate threats on enemy pieces
    I.listAttacks(st, me).forEach(function (a) {
      var res = I.computeAttack(st, a);
      if (res.defenderIsHQ) { if (res.outcome !== 'defender') s += w.myThreatHQ; }
      else if (res.outcome === 'attacker') s += I.unitValue(st.pieces.units[a.to].type, w) * w.myThreatKill;
    });
    // enemy threats on mine
    s += threatScan(st, me, w);
    // Trenches: proximity to my HQ is nice, but a trench is attacker-support
    // denial — its real worth is FACING somewhere the enemy can actually come
    // from. Count each covered edge on a live lane (my unit's hex, or a hex
    // shielding my HQ) so orientation isn't an arbitrary tie.
    var enemyHexes = enUnits.map(function (x) { return x.h; });
    for (var th in st.pieces.trenches) {
      if (I.dist(th, mhq) <= 1) s += w.trenchHome * st.pieces.trenches[th].length;
      var occ = st.pieces.units[th];
      if ((occ && occ.owner === me) || I.dist(th, mhq) <= 1) {
        for (var ti = 0; ti < st.pieces.trenches[th].length; ti++) {
          s += w.trenchFacing * trenchFacingLive(st, th, st.pieces.trenches[th][ti].dirs, enemyHexes);
        }
      }
    }
    return s;
  }

  function enumerateWithOptions(st) {
    var o = I.stepOptions(st, { previews: false });
    var out = [{ skip: true }];
    if (!o) return { o: null, choices: out };
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
      o.terrainTargets.forEach(function (pc) { out.push({ pieceId: pc.id }); });
    }
    return { o: o, choices: out };
  }
  function enumerateChoices(st) { return enumerateWithOptions(st).choices; }

  // Cheap static pre-rank for the branching cap — no cloning, just "roughly
  // how promising is this option". Only ORDER matters (the real clone+eval
  // decides); ties keep enumeration order, so the search stays deterministic.
  // Scale note for tuners: attacks that win land ~100+, advances ~30, swaps 10.
  function prescoreChoice(st, o, c, me, w, ctx) {
    if (c.skip) return -1e5; // ranked last; re-appended after the cut anyway
    if (o.type === 'attack') {
      var res = I.computeAttack(st, { from: c.from, to: c.to, via: c.via || null,
        mod: o.mod || 0, tieSpare: !!o.tieSpare, noAdvance: !!o.noAdvance });
      if (res.defenderIsHQ && res.outcome !== 'defender') return 1e4; // skirmish won
      var tgt = res.defenderUnit ? I.unitValue(res.defenderUnit, w) : 0;
      var mine = I.unitValue(st.pieces.units[c.from].type, w);
      if (res.outcome === 'attacker') return 100 + tgt * 10;
      if (res.outcome === 'tie') return 50 + (tgt - mine) * 10;
      return -mine * 10; // walking into a repulse
    }
    if (o.type === 'deploy') {
      return 40 - I.dist(c.hex, ctx.ehq) * 4 + (I.dist(c.hex, ctx.mhq) <= 1 ? 2 : 0);
    }
    if (o.type === 'trench') {
      return 20 + trenchFacingLive(st, c.hex, c.dirs, ctx.enemyHexes) * 10;
    }
    if (o.type === 'reposition') {
      if (c.swap) return 10; // situational; the eval sorts survivors out
      return 30 + (I.dist(c.from, ctx.ehq) - I.dist(c.to, ctx.ehq)) * 8;
    }
    return 25; // barrage: option counts never reach the cap
  }
  function prescoreCtx(st, me) {
    var en = I.other(me), enemyHexes = [];
    for (var h in st.pieces.units) if (st.pieces.units[h].owner === en) enemyHexes.push(h);
    return { mhq: st.board.hq[me], ehq: st.board.hq[en], enemyHexes: enemyHexes };
  }

  // Greedily resolve the pending card on a cloned state; returns {score, choices}
  function greedyResolve(sim, me, randomness, s, w) {
    w = w || I.AI_WEIGHTS;
    var choices = [];
    var guard = 0;
    while (sim.flow.phase === 'step' && guard++ < I.CONFIG.limits.stepsPerTurn) {
      var eo = enumerateWithOptions(sim);
      var opts = eo.choices;
      var best = null, bestScore = -Infinity;
      // Branching cap: on a high-branching step, keep the top w.shortlist by
      // static pre-rank rather than a random slice that could discard the best
      // move; skip stays available.
      if (opts.length > w.shortlist) {
        var ctx = prescoreCtx(sim, me);
        var scored = opts.map(function (c, i) { return { c: c, i: i, p: prescoreChoice(sim, eo.o, c, me, w, ctx) }; });
        scored.sort(function (a, b) { return b.p - a.p || a.i - b.i; });
        opts = scored.slice(0, w.shortlist).map(function (x) { return x.c; });
        opts.push({ skip: true });
      }
      opts.forEach(function (c) {
        var sim2 = cloneForSim(sim);
        try { I.applyStep(sim2, c); } catch (e) { return; }
        var sc = evalState(sim2, me, w) + (randomness ? I.rnd(s) * randomness : 0);
        if (c.skip) sc -= I.AI_TUNING.skipBias; // mild bias toward acting
        // anti-shuffle: re-swapping the pair I swapped last time is ping-ponging
        if (c.swap && sim.journal.lastSwap && sim.journal.lastSwap[me] === I.swapKey(c.a, c.b)) sc -= w.antiShuffle;
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
    w = w || I.AI_WEIGHTS;
    if (endSt.flow.phase === 'skirmish-over') return evalState(endSt, me, w);
    var opp = endSt.flow.current;
    var total = 0;
    for (var k = 0; k < samples; k++) {
      var sim0 = cloneForSim(endSt);
      var pool = sim0.cards.decks[opp].concat(sim0.cards.hands[opp]);
      I.shuffle(s, pool);
      var hn = sim0.cards.hands[opp].length;
      sim0.cards.hands[opp] = pool.slice(0, hn);
      sim0.cards.decks[opp] = pool.slice(hn);
      var bestOpp = -Infinity, bestState = sim0;
      var tried = {};
      sim0.cards.hands[opp].forEach(function (cid) {
        if (tried[cid]) return;
        tried[cid] = true;
        var sim2 = cloneForSim(sim0);
        try { I.playCard(sim2, cid); } catch (e) { return; }
        var r = (sim2.flow.phase === 'step') ? greedyResolve(sim2, opp, 0, s, w) : { score: evalState(sim2, opp, w), choices: [] };
        if (r.score > bestOpp) { bestOpp = r.score; bestState = sim2; }
      });
      total += evalState(bestState, me, w);
    }
    return total / samples;
  }

  // Decide the AI's whole turn. Returns {cardId, mode, choices:[...]}
  // `personality` is a preset name ('easy' | 'normal' | 'hard' | any maps.js
  // "ai" entry) or a raw config object — see AI_PRESETS/aiConfig above.
  // easy   = greedy with noisy evaluations (makes mistakes)
  // normal = greedy, one turn deep
  // hard   = normal shortlist, then the top `breadth` candidates are re-scored
  //          by what the enemy can do back (sampled hands — never peeks at yours)
  function aiPlanTurn(st, personality) {
    var cfg = aiConfig(personality);
    var me = st.flow.current;
    // The side's Commander weight override merges OVER the personality-blended
    // AI_WEIGHTS, so the enemy Commander plays its own numbers. The passive-aware
    // eval comes for free — evalState/threatScan score through computeAttack, which
    // already reads the Commander's combatMod off the seated st.commanders.
    var w = I.mergeCommanderWeights(cfg.w, I.sideCommander(st, me));
    var randomness = cfg.noise;
    var s = { seed: (st.seed ^ 0x9e3779b9) | 0 };
    var hand = st.cards.hands[me].slice();
    var candidates = [];
    var tried = {};
    // A plan that resolves ZERO actions is a dead turn (Bill: players should
    // always get to act) — penalize harder than the fallbackBias AND the
    // reply-search noise (sampled-hand variance between candidates can flip a
    // smaller penalty). When truly nothing can act, every plan
    // carries the penalty, so it cancels out.
    function noopPenalty(sim) {
      var le = sim.journal.playLog[sim.journal.playLog.length - 1];
      return (le && le.p === me && le.noop) ? w.noopPenalty : 0;
    }
    hand.forEach(function (cid) {
      if (tried[cid]) return;
      tried[cid] = true;
      var sim = cloneForSim(st);
      try { I.playCard(sim, cid); } catch (e) { return; }
      var r = (sim.flow.phase === 'step') ? greedyResolve(sim, me, randomness, s, w) : { score: evalState(sim, me, w), choices: [] };
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
        var r = (sim.flow.phase === 'step') ? greedyResolve(sim, me, randomness, s, w) : { score: evalState(sim, me, w), choices: [] };
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
      // Common random numbers: every candidate is scored against the SAME
      // sampled enemy hands (fresh rng, same seed), otherwise one candidate
      // randomly eats an Airdrop-by-the-HQ sample that another never saw — that
      // noise can drown the dead-turn penalty entirely.
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

  // Rank the current step's legal choices by the same clone+eval the AI uses.
  // Built for the LLM harness: show the model the top k of N instead of
  // every legal move, WITHOUT hiding anything strategic —
  //   - an attack step is never truncated (attacks are the strategic moves),
  //   - any choice touching ground within 1 of either HQ is force-included,
  //   - skip is always listed when legal.
  // Returns { type, total, shown:[{choice, score}] } — shown sorted best-first,
  // score = evalState of the resulting position (the honest heuristic number).
  function rankChoices(st, opts) {
    opts = opts || {};
    var k = opts.k || I.AI_TUNING.optionCap;
    var w = aiConfig(opts.config).w;
    var me = st.flow.current;
    var eo = enumerateWithOptions(st);
    if (!eo.o) return { type: null, total: 0, shown: [] };
    if (eo.o.type === 'attack') k = Math.max(k, eo.choices.length); // never hide an attack
    var mhq = st.board.hq[me], ehq = st.board.hq[I.other(me)];
    function nearHQ(c) {
      var spots = [c.hex, c.to, c.from, c.a, c.b].filter(Boolean);
      return spots.some(function (h) { return I.dist(h, mhq) <= 1 || I.dist(h, ehq) <= 1; });
    }
    var scored = eo.choices.map(function (c, i) {
      if (c.skip) return { choice: c, score: -Infinity, i: i, keep: true };
      var sim = cloneForSim(st), sc;
      try { I.applyStep(sim, c); sc = evalState(sim, me, w); } catch (e) { sc = -Infinity; }
      return { choice: c, score: sc, i: i, keep: nearHQ(c) };
    });
    scored.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    var shown = scored.slice(0, k);
    scored.slice(k).forEach(function (x) { if (x.keep) shown.push(x); });
    return {
      type: eo.o.type, total: eo.choices.length,
      shown: shown.map(function (x) { return { choice: x.choice, score: x.score === -Infinity ? null : Math.round(x.score) }; })
    };
  }

  /* shared-namespace exports */
  I.clone = clone;
  I.cloneForSim = cloneForSim;
  I.AI_PRESETS = AI_PRESETS;
  I.aiConfig = aiConfig;
  I.threatScan = threatScan;
  I.evalState = evalState;
  I.enumerateChoices = enumerateChoices;
  I.greedyResolve = greedyResolve;
  I.CARD_KEEP = CARD_KEEP;
  I.sampledReplyScore = sampledReplyScore;
  I.aiPlanTurn = aiPlanTurn;
  I.rankChoices = rankChoices;
})(typeof window !== 'undefined' ? window : globalThis);
