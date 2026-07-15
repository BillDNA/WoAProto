/* War of Attrition — engine part 06: battle simulation + balance aggregation + map validation.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- battle simulation (shared by balance.js and the in-game lab) ---------- */
  function simBattle(map, seed, firstPlayer, diffRed, diffBlue) {
    var match = I.newMatch({ seed: seed | 0, maps: [map], firstPlayer: firstPlayer || 'red' });
    var st = I.newBattle(match);
    var guard = 0;
    while (st.phase !== 'battle-over' && guard++ < 400) {
      var diff = st.current === 'red' ? (diffRed || 'normal') : (diffBlue || diffRed || 'normal');
      var plan = I.aiPlanTurn(st, diff);
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

  // Balance aggregation is split so the CLI (balance.js) and the in-browser
  // dashboard fold battles through the SAME code — if they ever disagree on a
  // number, that's a bug. balanceNew makes an empty aggregate; balanceAdd folds
  // one finished battle in; balanceMap is the synchronous convenience loop.
  function balanceNew(n) {
    var out = { n: n, redWins: 0, firstWins: 0, hqWins: 0, turns: 0, vpDiff: 0, unfinished: 0, cards: {},
      // behaviour metrics (June 2026): catch degenerate AI play, not just outcomes
      attacks: 0, swaps: 0, marches: 0, zeroKill: 0, tiebreak: 0,
      firstBloodGames: 0, firstBloodWins: 0, controlGames: 0, controlWins: 0,
      deployedShare: 0,
      // WOA-016: per-side split of the SAME reserves-at-end read deployedShare
      // uses above — share (0..1 per battle, summed) of THAT side's pieces
      // still undeployed when the battle ended. Instrument for the "hoarding
      // reserves wins" felt-note (balance-loop-v2 final report §5c.4).
      reserveEndRed: 0, reserveEndBlue: 0,
      // Feedback Round 2 pacing metrics:
      killTail: 0,      // trailing kill-less turns (0 = ended on a kill/HQ, ~32 = no-kill grind)
      leadChanges: 0 }; // field-score lead flips per battle (higher = more back-and-forth)
    I.CARDS.forEach(function (c) { out.cards[c.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 }; });
    return out;
  }
  function balanceAdd(out, st, fp) {
    if (st.phase !== 'battle-over') { out.unfinished++; return out; }
    var unitTotal = 0;
    Object.keys(I.UNITS).forEach(function (t) { unitTotal += I.UNITS[t].count || 0; });
    var w = st.battleWinner;
    if (w === 'red') out.redWins++;
    if (w === fp) out.firstWins++;
    if (st.winType === 'hq') out.hqWins++;
    out.turns += st.turnNumber;
    var fsr = I.fieldScore(st, 'red'), fsb = I.fieldScore(st, 'blue');
    out.vpDiff += Math.abs(fsr - fsb);
    var stats = st.stats || {};
    out.attacks += stats.attacks || 0;
    out.swaps += stats.swaps || 0;
    out.marches += stats.marches || 0;
    if (st.vp.red + st.vp.blue === 0) out.zeroKill++;            // no unit ever died
    if (st.winType === 'attrition' && fsr === fsb) out.tiebreak++; // decided only by tie-goes-to-2nd
    out.killTail += Math.max(0, st.turnNumber - (st.lastKillTurn || 0)); // trailing kill-less turns
    out.leadChanges += (st.leadChanges || 0);
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
    var resLeft = 0, resSide = { red: 0, blue: 0 };
    ['red', 'blue'].forEach(function (p) {
      Object.keys(I.UNITS).forEach(function (t) { var v = st.reserves[p][t] || 0; resLeft += v; resSide[p] += v; });
    });
    out.deployedShare += 1 - resLeft / (2 * unitTotal);
    out.reserveEndRed += resSide.red / unitTotal;
    out.reserveEndBlue += resSide.blue / unitTotal;
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
  I.simBattle = simBattle;
  I.balanceNew = balanceNew;
  I.balanceAdd = balanceAdd;
  I.balanceSeed = balanceSeed;
  I.balanceFP = balanceFP;
  I.balanceMap = balanceMap;
  I.validateMaps = validateMaps;
})(typeof window !== 'undefined' ? window : globalThis);
