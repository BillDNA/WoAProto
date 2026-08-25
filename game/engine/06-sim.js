/* War of Attrition — engine part 06: skirmish simulation + balance aggregation + map validation.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* The one skirmish drive-loop: decide a turn, play the card, drain the step
     queue. `decide` is the only thing that varies (which AI/plan drives the turn)
     — one implementation per fact. The 400-turn / 12-step caps are load-bearing
     infinite-loop guards. Not used by claude-plays.js (its LLM decides per step,
     so there's no whole-plan drain) or smoke.js (which drives the real DOM). */
  function playToEnd(st, opts) {
    opts = opts || {};
    var guard = 0;
    while (st.phase !== 'skirmish-over' && guard++ < 400) {
      var plan = opts.decide(st);
      if (!plan) break;
      I.playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.phase === 'step' && g2++ < 12) {
        var c = plan.choices.shift() || { skip: true };
        try { I.applyStep(st, c); }
        catch (e) { try { I.applyStep(st, { skip: true }); } catch (e2) { break; } }
      }
    }
    return st;
  }

  /* ---------- skirmish simulation (shared by balance.js and the in-game lab) ---------- */
  function simSkirmish(map, seed, firstPlayer, diffRed, diffBlue) {
    var match = I.newMatch({ seed: seed | 0, maps: [map], firstPlayer: firstPlayer || 'red' });
    var st = I.newSkirmish(match);
    return playToEnd(st, { decide: function (s) {
      var diff = s.current === 'red' ? (diffRed || 'normal') : (diffBlue || diffRed || 'normal');
      return I.aiPlanTurn(s, diff);
    } });
  }

  // Balance aggregation is split so the CLI (balance.js) and the in-browser
  // dashboard fold skirmishes through the SAME code — if they ever disagree on a
  // number, that's a bug. balanceNew makes an empty aggregate; balanceAdd folds
  // one finished skirmish in; balanceMap is the synchronous convenience loop.
  function balanceNew(n) {
    var out = { n: n, redWins: 0, firstWins: 0, hqWins: 0, turns: 0, vpDiff: 0, unfinished: 0, cards: {},
      // behaviour metrics (June 2026): catch degenerate AI play, not just outcomes.
      // WOA-039 (rules 1.2): deploys joins attacks/swaps/marches so the report can
      // print Attack/Swap SHARE (attacks / all four action counts) — deck-size-proof.
      attacks: 0, swaps: 0, marches: 0, deploys: 0, zeroKill: 0, tiebreak: 0,
      firstBloodGames: 0, firstBloodWins: 0, controlGames: 0, controlWins: 0,
      deployedShare: 0,
      // WOA-016: per-side split of the SAME reserves-at-end read deployedShare
      // uses above — share (0..1 per skirmish, summed) of THAT side's pieces
      // still undeployed when the skirmish ended. Instrument for the "hoarding
      // reserves wins" felt-note (balance-loop-v2 final report §5c.4).
      reserveEndRed: 0, reserveEndBlue: 0,
      // WOA-039 (rules 1.2): win-path conditioning. Tie%/Drag report over
      // attrition endings only (HQ endings pull Drag to 0 by definition and
      // dilute Tie% by the HQ share); Reserves reports over HQ endings only.
      // These slice counters + slice sums keep the pooled fields intact (the
      // legacy Tables view + deployedShare reconcile still read them) while the
      // report/dashboard read the sliced versions.
      attritionEndings: 0, attritionKillTail: 0,
      hqEndings: 0, reserveEndRedHQ: 0, reserveEndBlueHQ: 0,
      // Feedback Round 2 pacing metrics:
      killTail: 0,      // trailing kill-less turns (0 = ended on a kill/HQ, ~32 = no-kill grind)
      leadChanges: 0 }; // field-score lead flips per skirmish (higher = more back-and-forth)
    I.CARDS.forEach(function (c) { out.cards[c.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 }; });
    return out;
  }
  /* ---------- the per-Skirmish FACT (architecture review 01) ----------
     One home for "the facts of a finished Skirmish". These three used to be
     re-derived by hand in THREE places (balanceAdd here, db.js insertSkirmish,
     report-model.js foldBattles), kept in sync only by "bit-for-bit the same"
     comments. Now:
       skirmishFacts(st, fp) — derive the flat record from a LIVE engine state
       factsFromRow(row)     — the SAME record from a persisted DB skirmish row
                               (GET /api/battles camelCase alias shape)
       foldFacts(agg, f)     — accumulate one record into the SHARED aggregate
     Field names match the DB row aliases so factsFromRow is (near-)identity.
     Scope: the shared scalar facts + the shared fold only. balanceAdd's own
     extras (reserve fractions, HQ-ending slice, the per-card fold) were never
     duplicated in foldBattles, so they stay in balanceAdd below. */
  function skirmishFacts(st, firstPlayer) {
    var fsr = I.fieldScore(st, 'red'), fsb = I.fieldScore(st, 'blue');
    var stats = st.stats || {};
    var vp = st.vp || { red: 0, blue: 0 };
    var hr = 0, hb = 0;
    for (var h in st.units) (st.units[h].owner === 'red' ? hr++ : hb++);
    var resRed = 0, resBlue = 0;
    Object.keys(I.UNITS).forEach(function (t) {
      resRed += (st.reserves.red[t] || 0); resBlue += (st.reserves.blue[t] || 0);
    });
    return {
      firstPlayer: firstPlayer, winner: st.skirmishWinner || null, winType: st.winType || null,
      turns: st.turnNumber || 0, fsRed: fsr, fsBlue: fsb,
      firstBlood: stats.firstBlood || null, leadChanges: st.leadChanges || 0,
      attacks: stats.attacks || 0, swaps: stats.swaps || 0, marches: stats.marches || 0, deploys: stats.deploys || 0,
      zeroKill: (vp.red + vp.blue === 0) ? 1 : 0,                            // no unit ever died
      tiebreak: (st.winType === 'attrition' && fsr === fsb) ? 1 : 0,        // decided only by tie-goes-to-2nd
      killTail: Math.max(0, (st.turnNumber || 0) - (st.lastKillTurn || 0)), // trailing kill-less turns
      hexesRed: hr, hexesBlue: hb, resEndRed: resRed, resEndBlue: resBlue
    };
  }
  // A persisted DB skirmish row (listBattles/GET /api/battles alias shape) ->
  // the same record foldFacts folds. hexes_* are NULL on pre-WOA-038 rows;
  // pass through as null so foldFacts drops them from control (never a 0/0 tie).
  function factsFromRow(r) {
    return {
      firstPlayer: r.firstPlayer, winner: r.winner, winType: r.winType,
      turns: r.turns || 0, fsRed: r.fsRed || 0, fsBlue: r.fsBlue || 0,
      firstBlood: r.firstBlood || null, leadChanges: r.leadChanges || 0,
      attacks: r.attacks || 0, swaps: r.swaps || 0, marches: r.marches || 0, deploys: r.deploys || 0,
      zeroKill: r.zeroKill ? 1 : 0, tiebreak: r.tiebreak ? 1 : 0, killTail: r.killTail || 0,
      hexesRed: (r.hexesRed != null ? r.hexesRed : null), hexesBlue: (r.hexesBlue != null ? r.hexesBlue : null),
      resEndRed: r.resEndRed || 0, resEndBlue: r.resEndBlue || 0
    };
  }
  // Fold one fact record into the SHARED aggregate (the exact fields both the
  // live fold and the DB fold accumulate). Callers own any extra fields.
  function foldFacts(agg, f) {
    if (f.winner === 'red') agg.redWins++;
    if (f.winner && f.winner === f.firstPlayer) agg.firstWins++;
    if (f.winType === 'hq') agg.hqWins++;
    agg.turns += f.turns;
    agg.vpDiff += Math.abs(f.fsRed - f.fsBlue);
    agg.attacks += f.attacks; agg.swaps += f.swaps; agg.marches += f.marches; agg.deploys += f.deploys;
    if (f.zeroKill) agg.zeroKill++;
    if (f.tiebreak) agg.tiebreak++;
    agg.killTail += f.killTail;
    // WOA-039: Drag/Tie% condition to attrition endings — HQ endings pull Drag
    // to 0 by definition and dilute Tie% by the HQ share.
    if (f.winType === 'attrition') { agg.attritionEndings++; agg.attritionKillTail += f.killTail; }
    agg.leadChanges += f.leadChanges;
    if (f.firstBlood) { agg.firstBloodGames++; if (f.firstBlood === f.winner) agg.firstBloodWins++; }
    // WOA-038: a NULL hex pair means "no control data" — never a fabricated tie.
    if (f.hexesRed != null && f.hexesBlue != null && f.hexesRed !== f.hexesBlue) {
      agg.controlGames++;
      if ((f.winner === 'red') === (f.hexesRed > f.hexesBlue)) agg.controlWins++;
    }
    return agg;
  }

  function balanceAdd(out, st, fp) {
    if (st.phase !== 'skirmish-over') { out.unfinished++; return out; }
    var unitTotal = 0;
    Object.keys(I.UNITS).forEach(function (t) { unitTotal += I.UNITS[t].count || 0; });
    var f = skirmishFacts(st, fp);
    foldFacts(out, f);                                          // the shared scalar facts + fold
    var w = f.winner;
    // ---- balanceAdd-only extras (not folded on the DB row path) ----
    out.deployedShare += 1 - (f.resEndRed + f.resEndBlue) / (2 * unitTotal);
    out.reserveEndRed += f.resEndRed / unitTotal;
    out.reserveEndBlue += f.resEndBlue / unitTotal;
    // WOA-039: Reserves-at-end conditions to HQ endings only (an HQ rush ends
    // before a side commits its reserves — the diagnostic reads meaningfully
    // only there; attrition endings run to deck-out and deploy almost everything).
    if (st.winType === 'hq') {
      out.hqEndings++;
      out.reserveEndRedHQ += f.resEndRed / unitTotal;
      out.reserveEndBlueHQ += f.resEndBlue / unitTotal;
    }
    var hqEnding = st.winType === 'hq';
    (st.playLog || []).forEach(function (e) {
      var c = out.cards[e.id] || (out.cards[e.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 });
      c.plays++;
      if (e.p === w) c.wins++;
      if (e.mode !== 'normal') c.simple++;     // resolved as a basic attack/reposition
      if (e.seen <= 1) c.firstSight++;          // played the first time it was seen
      if (e.noop) c.noop++;                     // resolved ZERO actions — an effective skipped turn
      c.seenSum += e.seen;
      // WOA #57 mispricing residual: the axis-worthy card win contribution —
      // HQ-capture endings × printed (non-simple) plays only, mirroring
      // cardHqWinSlice (report-model.js). Pooled Win% is dead at these n
      // (docs/report-model.md#reporting-doctrine); this slice carries the signal.
      if (hqEnding && e.mode === 'normal') { c.hqPlays++; if (e.p === w) c.hqWins++; }
    });
    return out;
  }
  // the seed/first-player schedule for skirmish g of a balance run — one place,
  // so the CLI and the dashboard replay the identical skirmishes
  function balanceSeed(seedBase, g) { return (seedBase || 7919) + g * 104729 + 13; }
  function balanceFP(g) { return g % 2 === 0 ? 'red' : 'blue'; }

  // n AI-vs-AI skirmishes on one map (alternating first player); aggregated stats.
  function balanceMap(map, n, opts) {
    opts = opts || {};
    var out = balanceNew(n);
    for (var g = 0; g < n; g++) {
      var fp = balanceFP(g);
      var st = simSkirmish(map, balanceSeed(opts.seedBase, g), fp, opts.diffRed, opts.diffBlue);
      balanceAdd(out, st, fp);
      if (st.phase === 'skirmish-over' && opts.onGame) opts.onGame(g + 1, n, st);
    }
    return out;
  }

  /* ---------- validation helper (for tests) ---------- */
  function validateMaps(list) {
    var problems = [];
    var prevShape = I.currentShape();
    (list || I.MAPS).forEach(function (m) {
      var shape;
      try { shape = I.ensureMapShape(m); }
      catch (e) { problems.push(m.name + ': ' + e.message); return; }
      if (!I.SHAPES[shape]) { problems.push(m.name + ': unknown board shape "' + shape + '"'); return; }
      if (m.shapeDef && I.SHAPES[shape].list.length > 24)
        problems.push(m.name + ': ' + I.SHAPES[shape].list.length + ' hexes exceeds the 24-hex ceiling (laser-cutter max; big empty maps are not fun)');
      I.setBoard(shape);
      try {
        I.buildTerrain(m);
        if (!I.inBoard.apply(null, m.redHQ)) problems.push(m.name + ': red HQ off board');
        if (!I.inBoard.apply(null, m.blueHQ)) problems.push(m.name + ': blue HQ off board');
        if (I.key.apply(null, m.redHQ) === I.key.apply(null, m.blueHQ)) problems.push(m.name + ': HQs overlap');
        var stock = {};
        Object.keys(I.TERRAIN_STOCK).forEach(function (k) { stock[k] = 0; });
        m.pieces.forEach(function (p) {
          var sk = p.t + p.edges.length;
          if (stock[sk] === undefined) problems.push(m.name + ': piece of length ' + p.edges.length + ' has no physical counterpart (stock: ' + Object.keys(I.TERRAIN_STOCK).join(',') + ')');
          else stock[sk]++;
        });
        var over = Object.keys(I.TERRAIN_STOCK).filter(function (k) { return stock[k] > I.TERRAIN_STOCK[k]; });
        if (over.length) problems.push(m.name + ': exceeds terrain stock ' + JSON.stringify(stock));
      } catch (e) { problems.push(e.message); }
    });
    I.setBoard(prevShape);
    return problems;
  }

  /* shared-namespace exports */
  I.playToEnd = playToEnd;
  I.simSkirmish = simSkirmish;
  I.skirmishFacts = skirmishFacts;
  I.factsFromRow = factsFromRow;
  I.foldFacts = foldFacts;
  I.balanceNew = balanceNew;
  I.balanceAdd = balanceAdd;
  I.balanceSeed = balanceSeed;
  I.balanceFP = balanceFP;
  I.balanceMap = balanceMap;
  I.validateMaps = validateMaps;
})(typeof window !== 'undefined' ? window : globalThis);
