/* War of Attrition — the batch/measurement layer: skirmish simulation + balance
   aggregation, kept out of the shipped engine. This is NOT the engine —
   it is measurement built ON the engine's play surface (playToEnd + the play
   primitives). Deleting this file leaves a game that still boots and plays a
   skirmish by hand; only the Balance Dashboard's live sweep and the CLI reporters
   go dark. It stays under game/ (not dev/) because the in-browser dashboard runs
   the SAME fold and the server serves only game/ — see docs/code-architecture.md.

   Dual-exported (WOA_SIM global + module.exports) like report-model.js; resolves
   the engine dual the same way. Load order: engine parts -> sim.js -> report-model.js
   (report-model's foldSkirmishes delegates to factsFromRow/foldFacts here). */
var WOA_SIM = (function () {

  var ENG = (typeof window !== 'undefined' && window.Engine) ? window.Engine
    : (typeof require === 'function' ? require('./engine.js') : null);

  /* ---------- skirmish simulation (shared by the CLI reporters and the in-browser dashboard) ---------- */
  // `decks` = {red, blue} per-side selection (each null|deck|id|name).
  // Omitted -> both sides share the active deck.
  function simSkirmish(map, seed, firstPlayer, diffRed, diffBlue, decks) {
    var battle = ENG.newBattle({ seed: seed | 0, maps: [map], firstPlayer: firstPlayer || 'red', decks: decks || null });
    var st = ENG.newSkirmish(battle);
    return ENG.playToEnd(st, { decide: function (s) {
      var diff = s.current === 'red' ? (diffRed || 'normal') : (diffBlue || diffRed || 'normal');
      return ENG.aiPlanTurn(s, diff);
    } });
  }

  // Balance aggregation is split so the CLI reporters and the in-browser
  // dashboard fold skirmishes through the SAME code — if they ever disagree on a
  // number, that's a bug. balanceNew makes an empty aggregate; balanceAdd folds
  // one finished skirmish in; balanceMap is the synchronous convenience loop.
  function balanceNew(n) {
    var out = { n: n, redWins: 0, firstWins: 0, hqWins: 0, turns: 0, fsDiff: 0, unfinished: 0, cards: {},
      // behaviour metrics: catch degenerate AI play, not just outcomes.
      // deploys joins attacks/swaps/marches so the report can print Attack/Swap
      // SHARE (attacks / all four action counts) — deck-size-proof.
      attacks: 0, swaps: 0, marches: 0, deploys: 0, zeroKill: 0, tiebreak: 0,
      firstBloodGames: 0, firstBloodWins: 0, controlGames: 0, controlWins: 0,
      deployedShare: 0,
      // Per-side split of the SAME reserves-at-end read deployedShare uses
      // above — share (0..1 per skirmish, summed) of THAT side's pieces still
      // undeployed when the skirmish ended. Instrument for the "hoarding
      // reserves wins" felt-note.
      reserveEndRed: 0, reserveEndBlue: 0,
      // Win-path conditioning. Tie%/Drag report over
      // attrition endings only (HQ endings pull Drag to 0 by definition and
      // dilute Tie% by the HQ share); Reserves reports over HQ endings only.
      // These slice counters + slice sums keep the pooled fields intact (the
      // legacy Tables view + deployedShare reconcile still read them) while the
      // report/dashboard read the sliced versions.
      attritionEndings: 0, attritionKillTail: 0,
      hqEndings: 0, reserveEndRedHQ: 0, reserveEndBlueHQ: 0,
      // pacing metrics:
      killTail: 0,      // trailing kill-less turns (0 = ended on a kill/HQ, ~32 = no-kill grind)
      leadChanges: 0 }; // field-score lead flips per skirmish (higher = more back-and-forth)
    ENG.CARDS.forEach(function (c) { out.cards[c.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 }; });
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
    var fsr = ENG.fieldScore(st, 'red'), fsb = ENG.fieldScore(st, 'blue');
    var stats = st.journal.stats || {};
    var kills = st.result.kills || { red: 0, blue: 0 };
    var hr = 0, hb = 0;
    for (var h in st.pieces.units) (st.pieces.units[h].owner === 'red' ? hr++ : hb++);
    var resRed = 0, resBlue = 0;
    Object.keys(ENG.UNITS).forEach(function (t) {
      resRed += (st.pieces.reserves.red[t] || 0); resBlue += (st.pieces.reserves.blue[t] || 0);
    });
    return {
      firstPlayer: firstPlayer, winner: st.result.skirmishWinner || null, winType: st.result.winType || null,
      turns: st.flow.turnNumber || 0, fsRed: fsr, fsBlue: fsb,
      firstBlood: stats.firstBlood || null, leadChanges: st.journal.leadChanges || 0,
      attacks: stats.attacks || 0, swaps: stats.swaps || 0, marches: stats.marches || 0, deploys: stats.deploys || 0,
      zeroKill: (kills.red + kills.blue === 0) ? 1 : 0,                            // no unit ever died
      tiebreak: (st.result.winType === 'attrition' && fsr === fsb) ? 1 : 0,        // decided only by tie-goes-to-2nd
      killTail: Math.max(0, (st.flow.turnNumber || 0) - (st.journal.lastKillTurn || 0)), // trailing kill-less turns
      hexesRed: hr, hexesBlue: hb, resEndRed: resRed, resEndBlue: resBlue
    };
  }
  // A persisted DB skirmish row (listBattles/GET /api/battles alias shape) ->
  // the same record foldFacts folds. hexes_* are NULL on rows with no control
  // data; pass through as null so foldFacts drops them from control (never a 0/0 tie).
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
    agg.fsDiff += Math.abs(f.fsRed - f.fsBlue);
    agg.attacks += f.attacks; agg.swaps += f.swaps; agg.marches += f.marches; agg.deploys += f.deploys;
    if (f.zeroKill) agg.zeroKill++;
    if (f.tiebreak) agg.tiebreak++;
    agg.killTail += f.killTail;
    // Drag/Tie% condition to attrition endings — HQ endings pull Drag
    // to 0 by definition and dilute Tie% by the HQ share.
    if (f.winType === 'attrition') { agg.attritionEndings++; agg.attritionKillTail += f.killTail; }
    agg.leadChanges += f.leadChanges;
    if (f.firstBlood) { agg.firstBloodGames++; if (f.firstBlood === f.winner) agg.firstBloodWins++; }
    // A NULL hex pair means "no control data" — never a fabricated tie.
    if (f.hexesRed != null && f.hexesBlue != null && f.hexesRed !== f.hexesBlue) {
      agg.controlGames++;
      if ((f.winner === 'red') === (f.hexesRed > f.hexesBlue)) agg.controlWins++;
    }
    return agg;
  }

  function balanceAdd(out, st, fp) {
    if (st.flow.phase !== 'skirmish-over') { out.unfinished++; return out; }
    var unitTotal = 0;
    Object.keys(ENG.UNITS).forEach(function (t) { unitTotal += ENG.UNITS[t].count || 0; });
    var f = skirmishFacts(st, fp);
    foldFacts(out, f);                                          // the shared scalar facts + fold
    var w = f.winner;
    // ---- balanceAdd-only extras (not folded on the DB row path) ----
    out.deployedShare += 1 - (f.resEndRed + f.resEndBlue) / (2 * unitTotal);
    out.reserveEndRed += f.resEndRed / unitTotal;
    out.reserveEndBlue += f.resEndBlue / unitTotal;
    // Reserves-at-end conditions to HQ endings only (an HQ rush ends
    // before a side commits its reserves — the diagnostic reads meaningfully
    // only there; attrition endings run to deck-out and deploy almost everything).
    if (st.result.winType === 'hq') {
      out.hqEndings++;
      out.reserveEndRedHQ += f.resEndRed / unitTotal;
      out.reserveEndBlueHQ += f.resEndBlue / unitTotal;
    }
    var hqEnding = st.result.winType === 'hq';
    (st.journal.playLog || []).forEach(function (e) {
      var c = out.cards[e.id] || (out.cards[e.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 });
      c.plays++;
      if (e.p === w) c.wins++;
      if (e.mode !== 'normal') c.simple++;     // resolved as a basic attack/reposition
      if (e.seen <= 1) c.firstSight++;          // played the first time it was seen
      if (e.noop) c.noop++;                     // resolved ZERO actions — an effective skipped turn
      c.seenSum += e.seen;
      // Mispricing residual: the axis-worthy card win contribution —
      // HQ-capture endings × printed (non-simple) plays only, mirroring
      // cardHqWinSlice (report-model.js). Pooled Win% is dead at these n
      // (docs/reference/report-model.md#reporting-doctrine); this slice carries the signal.
      if (hqEnding && e.mode === 'normal') { c.hqPlays++; if (e.p === w) c.hqWins++; }
    });
    return out;
  }
  // the seed/first-player schedule for skirmish g of a balance run — one place,
  // so every reporter and the dashboard replay the identical skirmishes
  function balanceSeed(seedBase, g) { return (seedBase || 7919) + g * 104729 + 13; }
  function balanceFP(g) { return g % 2 === 0 ? 'red' : 'blue'; }

  // n AI-vs-AI skirmishes on one map (alternating first player); aggregated stats.
  function balanceMap(map, n, opts) {
    opts = opts || {};
    var out = balanceNew(n);
    for (var g = 0; g < n; g++) {
      var fp = balanceFP(g);
      var st = simSkirmish(map, balanceSeed(opts.seedBase, g), fp, opts.diffRed, opts.diffBlue, opts.decks);
      balanceAdd(out, st, fp);
      if (st.flow.phase === 'skirmish-over' && opts.onGame) opts.onGame(g + 1, n, st);
    }
    return out;
  }

  return {
    simSkirmish: simSkirmish,
    skirmishFacts: skirmishFacts, factsFromRow: factsFromRow, foldFacts: foldFacts,
    balanceNew: balanceNew, balanceAdd: balanceAdd,
    balanceSeed: balanceSeed, balanceFP: balanceFP, balanceMap: balanceMap
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_SIM;
