/* War of Attrition — report model: the ONE copy of the balance-report logic
   that every reporting surface shares (V1 restructure step 10).

   Standing goal: one implementation per fact. The scoring formula, the per-map
   note thresholds (62/38/8/55/20), the global fold, the card-table row
   derivation and the saved-report markdown used to live in four places
   (game/balance.js, game/ui/dashboard.js, dev/balance-report.js,
   dev/tune-weights.js) and drifted. They live HERE now; consumers keep only
   their own presentation (terminal padding, HTML tables, header metadata).

   Exposed as the browser global WOA_REPORT (classic script, loaded by
   index.html after the engine parts) AND as module.exports for node — the
   same dual-export pattern as maps.js. No dependencies: every function takes
   plain data (E.balanceMap aggregates, E.CARDS) as arguments.

   - pct(a, b)                 rounded percentage (0 when b is 0)
   - f1(x)                     one-decimal string, round-half-up
   - BANDS / bands(m,temp)     per-metric band table as DATA + effective band at
                               a temperature (WOA-033, SPEC §6)
   - balanceScore(agg, done)   balance-quality score, LOWER = better (folds BANDS)
   - mapNotes(agg, done)       health-flag strings for one map's aggregate
                               (the '**best balance**' marker is the caller's)
   - addAgg(dst, src)          fold one balanceMap aggregate into another
   - foldGlobal(rows)          [{agg, done}] -> G totals (incl. G.cards)
   - cardRows(cardAgg, cards)  derived card-table rows, 1stSight% desc
   - reportMarkdown(model)     the full saved-report markdown document
   - trace folds (WOA-033, one battle envelope in, derived value out):
       firstContactTurn · deployInterleave · settlePoint · actionOctileLanes ·
       vpDiffTrack · cardPlayTurnQuartiles
   - per-hex lenses (WOA-042, SPEC §5): hexLenses (one battle -> per-hex
       occupancy/flips/kills) · foldHexLenses (many battles -> per-hex averages
       + dead/avenue classification)
   - unitsAggFromEnvelopes(envs)  many envelopes -> per-unit-type {n, depMedian,
       roleY, breakthrough, exchange, lifespan, lifespanN} (WOA-044, SPEC §3)
   - bandN(bandRow,agg,done) / SMALL_N / smallN(n,scope)  small-n rule (SPEC §8)
   - foldBattles(rows)         DB `battles` rows (GET /api/battles) -> {agg, done}
   - envelopeFromRow(row)      a DB battle row's .trace TEXT -> parsed envelope */

var WOA_REPORT = (function () {

  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  // WOA-039 (rules 1.2): total actions taken in a battle set = attacks + swaps +
  // marches + deploys. The denominator for Attack/Swap SHARE, which is
  // deck-size-proof where raw Atk/Swp counts were not (WOA-030 16→17 cards
  // inflated the counts without any behaviour change).
  function actionTotal(a) { return (a.attacks || 0) + (a.swaps || 0) + (a.marches || 0) + (a.deploys || 0); }
  // WOA-039 / SPEC §8: a conditioned metric prints its slice-n and flags when it
  // is below the fleet-wide trust threshold (the report can't grey a row, so it
  // annotates instead — the dashboard band board does the greying). HQ-sliced
  // reserves are typically small-n (HQ endings are a minority of battles).
  function smallNote(n) { return ' (n=' + (n || 0) + ((n || 0) < SMALL_N.fleet ? ', small-n' : '') + ')'; }
  function hqReservePct(sum, n) { return n ? Math.round(100 * sum / n) + '%' : '—'; }

  /* ===== Metric bands as DATA (WOA-033, SPEC §6) =====
     The ONE band table. SOT for the prose is
     dynamic-scrum/rubrics/grading-rubrics.md §"Best map" (the ideal-range
     table, WOA-007) + the North stars / Game-level guards; if that doc and
     this table disagree, the doc wins and this table is fixed. `balanceScore`
     folds over THIS table (no second copy of the ranges) — the eight
     feedsScore:true rows ARE the ideal-range list.

     WOA-039 (rules 1.2 re-baseline): this is the ticket where balanceScore's
     output legitimately MOVES (the golden diff intentionally breaks, justified
     by the version bump). Tie% and Drag now condition their denominator to
     ATTRITION endings (val over attritionEndings, not `done`); their band edges
     were re-measured 2026-07-18 (n=60/map hard-vs-hard, cavsplit17-raid-paid,
     Core Six). Attack/Swap SHARE joined as guard bands (feedsScore:false —
     shaded on the dashboard, not scored) replacing the cut raw Atk/Swp counts.
     The scored set stays the same eight metrics.

     Per row: { key, label, lo, hi, weight, feedsScore, val(agg,done), nFor? }
       lo / hi     band edges; null = OPEN on that side (no penalty there).
                   0 is a real closed edge, NOT open (only null/absent is open).
       weight      points per unit outside the band (feeds the score).
       feedsScore  true = summed into balanceScore; false = a shaded GUARD band
                   the dashboard renders but the score ignores.
       val         pulls this metric's value out of a balanceMap aggregate
                   (pct() for %-metrics; a raw ratio for Drag & Swings — so a
                   NaN from a malformed agg scores 0). A conditioned metric
                   divides by its slice count, not `done`, and carries nFor.
       nFor        the sample size backing val() — the slice denominator for
                   conditioned metrics (control/firstBlood: their sub-population;
                   tie/drag: attritionEndings), read by the small-n rule. */
  var BANDS = [
    { key: 'red',    label: 'Red%',    lo: 45,  hi: 55,   weight: 1,   feedsScore: true,  val: function (a, done) { return pct(a.redWins, done); } },
    { key: 'first',  label: '1st%',    lo: 45,  hi: 55,   weight: 1,   feedsScore: true,  val: function (a, done) { return pct(a.firstWins, done); } },
    { key: 'hq',     label: 'HQ%',     lo: 10,  hi: 40,   weight: 0.5, feedsScore: true,  val: function (a, done) { return pct(a.hqWins, done); } },
    { key: 'zeroKill', label: '0kill%', lo: 0, hi: 5,     weight: 0.6, feedsScore: true,  val: function (a, done) { return pct(a.zeroKill, done); } },
    // WOA-039: Tie%/Drag denominator = attrition endings (a.attritionEndings),
    // NOT every finished battle. HQ endings have Drag 0 by definition and
    // diluted the pooled Tie%. Bands re-baselined 2026-07-18 off the sliced read.
    { key: 'tie',    label: 'Tie%',    lo: 0,   hi: 18,   weight: 0.3, feedsScore: true,  val: function (a) { return a.attritionEndings ? pct(a.tiebreak, a.attritionEndings) : null; },
      nFor: function (a) { return a.attritionEndings || 0; } },
    { key: 'drag',   label: 'Drag',    lo: 0,   hi: 3.0,  weight: 4,   feedsScore: true,  val: function (a) { return a.attritionEndings ? (a.attritionKillTail || 0) / a.attritionEndings : null; },
      nFor: function (a) { return a.attritionEndings || 0; } },
    { key: 'swings', label: 'Swings',  lo: 2.0, hi: null, weight: 6,   feedsScore: true,  val: function (a, done) { return a.leadChanges / Math.max(1, done); } },
    { key: 'control', label: 'Control%', lo: 70, hi: 100, weight: 0.5, feedsScore: true,  val: function (a) { return a.controlGames ? pct(a.controlWins, a.controlGames) : null; },
      nFor: function (a) { return a.controlGames || 0; } },
    // Guard bands — shaded on the dashboard, NOT scored (feedsScore:false ⇒
    // never touches balanceScore). First-blood→win (SPEC §1, the snowball
    // check) + the WOA-039 Attack/Swap SHARE pair (% of all actions taken;
    // deck-size-proof; the swap-dance detector). Share bands centered on the
    // 2026-07-18 measured reality (n=60/map hard-vs-hard, cavsplit17-raid-paid).
    { key: 'firstBlood', label: 'First-blood→win', lo: 55, hi: 70, weight: 0, feedsScore: false, val: function (a) { return a.firstBloodGames ? pct(a.firstBloodWins, a.firstBloodGames) : null; },
      nFor: function (a) { return a.firstBloodGames || 0; } },
    // Shares are over EVERY battle's actions (n = done, like Red%/HQ% — no
    // nFor), so they're never spuriously small-n; val is null only when a
    // (degenerate) battle set took no actions at all.
    { key: 'attackShare', label: 'Attack%', lo: 12, hi: 28, weight: 0, feedsScore: false, val: function (a) { var t = actionTotal(a); return t ? pct(a.attacks, t) : null; } },
    { key: 'swapShare', label: 'Swap%', lo: 10, hi: 26, weight: 0, feedsScore: false, val: function (a) { var t = actionTotal(a); return t ? pct(a.swaps, t) : null; } }
  ];
  var BAND_BY_KEY = {};
  BANDS.forEach(function (b) { BAND_BY_KEY[b.key] = b; });

  /* Sample size backing a band row's val() — most rows are denominated over
     every finished battle (`done`); control/firstBlood are conditioned on a
     sub-population (battles with a hex lead / a kill) and carry their own
     nFor(agg,done). WOA-035 (SPEC §8 small-n rule): callers compare this
     against SMALL_N.map/.fleet instead of re-deriving each metric's
     denominator by hand. */
  function bandN(bandRow, agg, done) {
    var b = (typeof bandRow === 'string') ? BAND_BY_KEY[bandRow] : bandRow;
    if (!b) return done;
    return b.nFor ? b.nFor(agg, done) : done;
  }
  // SPEC §8: any conditioned metric with slice-n < 40 per map (or < 240
  // fleet-wide) renders greyed, '(n=N)', excluded from the verdict banner.
  var SMALL_N = { map: 40, fleet: 240 };
  function smallN(n, scope) { return (n == null) || n < (scope === 'map' ? SMALL_N.map : SMALL_N.fleet); }

  /* Weighted distance of v OUTSIDE [lo, hi] (0 inside; null edge = unbounded on
     that side). null/NaN value scores 0 — reproduces the old scorer's control
     guard (skip when controlGames == 0) and its NaN-is-0 behaviour exactly. */
  function outBand(v, lo, hi, w) {
    if (v == null || v !== v) return 0;
    if (lo != null && v < lo) return w * (lo - v);
    if (hi != null && v > hi) return w * (v - hi);
    return 0;
  }

  /* Effective band for a metric at a temperature (SPEC §6). T1/T2 widen each
     CLOSED edge outward by 20%/40% of band width; OPEN (null) edges stay open.
     Band width = hi - lo when both edges are finite; for a half-open band
     (exactly one finite edge — only Swings among the scored eight) there is no
     finite hi-lo, so the closed edge widens by the same fraction of |edge|
     (Swings lo 2.0 → 1.6 at T1, 1.2 at T2 — a proportional relaxation). T0
     returns the stored edges unchanged. `metric` is a key string or a band row. */
  function bands(metric, temperature) {
    var b = (typeof metric === 'string') ? BAND_BY_KEY[metric] : metric;
    if (!b) return null;
    var frac = temperature === 'T1' ? 0.2 : temperature === 'T2' ? 0.4 : 0;
    var lo = b.lo, hi = b.hi, loOpen = (lo == null), hiOpen = (hi == null);
    var w = (!loOpen && !hiOpen) ? (hi - lo) : (!loOpen ? Math.abs(lo) : (!hiOpen ? Math.abs(hi) : 0));
    return { key: b.key, label: b.label, weight: b.weight, feedsScore: b.feedsScore,
      lo: loOpen ? null : lo - frac * w, hi: hiOpen ? null : hi + frac * w };
  }

  /* Balance-quality score (LOWER = better, 0 = ideal) — the "best map"
     ideal-range rubric (SOT: grading-rubrics §"Best map", WOA-007). Sums the
     feedsScore rows of the ONE band table above; attrition-only maps (HQ% < 10)
     are penalised (Round-4 ruling reversed 2026-07-10, swing reward gone with
     it). T0 bands only — the score is temperature-independent by design. */
  function balanceScore(agg, done) {
    var s = 0;
    BANDS.forEach(function (b) { if (b.feedsScore) s += outBand(b.val(agg, done), b.lo, b.hi, b.weight); });
    return s;
  }

  /* Per-map health flags — the 62/38/8/55/20 thresholds every report quotes.
     Returns an array of note strings; callers join and may prepend their own
     markers (e.g. balance-report's '**best balance**'). */
  function mapNotes(agg, done) {
    var notes = [];
    if (pct(agg.redWins, done) >= 62 || pct(agg.redWins, done) <= 38) notes.push('SIDE-BIASED');
    if (pct(agg.firstWins, done) >= 62) notes.push('1st-mover strong');
    if (pct(agg.firstWins, done) <= 38) notes.push('2nd-mover strong');
    if (pct(agg.hqWins, done) <= 8) notes.push('attrition-only');
    if (pct(agg.hqWins, done) >= 55) notes.push('HQ-rushable');
    if (pct(agg.zeroKill, done) >= 20) notes.push('STALEMATES');
    return notes;
  }

  /* Fold a balanceMap aggregate (all sum/count fields, incl. the cards
     sub-object) into a running total — pure field-wise addition, since
     balanceAdd only ever accumulates sums. Used by balance-report's
     per-version accumulator. */
  function addAgg(dst, src) {
    Object.keys(src).forEach(function (k) {
      if (k === 'cards') {
        dst.cards = dst.cards || {};
        Object.keys(src.cards).forEach(function (cid) {
          var a = dst.cards[cid] || (dst.cards[cid] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 });
          var c = src.cards[cid];
          ['plays', 'wins', 'simple', 'firstSight', 'seenSum', 'noop'].forEach(function (f) { a[f] = (a[f] || 0) + (c[f] || 0); });
        });
      } else if (typeof src[k] === 'number') {
        dst[k] = (dst[k] || 0) + src[k];
      }
    });
    return dst;
  }

  /* Roll every map's aggregate into the report-wide totals. rows is
     [{agg, done}] — done is the caller's finished-battle count for that map
     (n - unfinished). Returns the G object all Overall sections read, with
     the card fold under G.cards. */
  function foldGlobal(rows) {
    var G = { red: 0, first: 0, hq: 0, games: 0, turns: 0, attacks: 0, swaps: 0, marches: 0, deploys: 0,
      zeroKill: 0, tiebreak: 0, attritionEndings: 0, attritionKillTail: 0,
      hqEndings: 0, resEndRedHQ: 0, resEndBlueHQ: 0,
      fbWins: 0, fbGames: 0, ctlWins: 0, ctlGames: 0, depShare: 0, resEndRed: 0, resEndBlue: 0,
      killTail: 0, leadChanges: 0, cards: {} };
    rows.forEach(function (x) {
      var a = x.agg;
      G.red += a.redWins; G.first += a.firstWins; G.hq += a.hqWins; G.games += x.done; G.turns += a.turns;
      G.attacks += a.attacks; G.swaps += a.swaps; G.marches += (a.marches || 0); G.deploys += (a.deploys || 0);
      G.zeroKill += a.zeroKill; G.tiebreak += a.tiebreak;
      // WOA-039: attrition-only slices (Tie%/Drag) and HQ-only slices (Reserves)
      G.attritionEndings += (a.attritionEndings || 0); G.attritionKillTail += (a.attritionKillTail || 0);
      G.hqEndings += (a.hqEndings || 0); G.resEndRedHQ += (a.reserveEndRedHQ || 0); G.resEndBlueHQ += (a.reserveEndBlueHQ || 0);
      G.fbWins += a.firstBloodWins; G.fbGames += a.firstBloodGames;
      G.ctlWins += a.controlWins; G.ctlGames += a.controlGames; G.depShare += a.deployedShare;
      G.resEndRed += (a.reserveEndRed || 0); G.resEndBlue += (a.reserveEndBlue || 0);
      G.killTail += (a.killTail || 0); G.leadChanges += (a.leadChanges || 0);
      Object.keys(a.cards || {}).forEach(function (cid) {
        var c = G.cards[cid] || (G.cards[cid] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 });
        var s = a.cards[cid];
        c.plays += s.plays; c.wins += s.wins; c.simple += s.simple;
        c.firstSight += s.firstSight; c.seenSum += s.seenSum; c.noop += (s.noop || 0);
      });
    });
    return G;
  }

  /* ===== DB battle rows -> agg (WOA-035, Overview) =====
     Fold an array of `battles` table rows (as GET /api/battles?run=<id>
     returns them — camelCase scalar columns, one row per finished battle;
     insertBattle only ever stores battle-over states, so `done` is simply
     rows.length, no unfinished count to subtract) into the SAME aggregate
     shape balanceAdd builds server-side in-memory, restricted to the fields
     every stored column can rebuild exactly:
       redWins/firstWins/hqWins/turns/vpDiff/zeroKill/tiebreak/killTail/
       leadChanges/attacks/swaps/marches/deploys/firstBloodGames/
       firstBloodWins — bit-for-bit the same source (fs_red/fs_blue ARE
       E.fieldScore at battle end, per db.js insertBattle). WOA-039: the
       attrition-only slice (attritionEndings + attritionKillTail, the Tie%/Drag
       denominator + numerator) is derived HERE from win_type + kill_tail, the
       same slice balanceAdd computes live — no new stored column.
     controlGames/controlWins (WOA-038): board hex-ownership at battle end IS
     a stored column pair now (hexesRed/hexesBlue — dev/db.js insertBattle's
     hexesHeld(st), the same tally balanceAdd folds live). A row only feeds
     controlGames when BOTH are non-null (older rows, written before this
     ticket, carry NULL/NULL — "no control data", never a fabricated 0/0
     tie) AND unequal (a real hex tie contributes to done but not to
     controlGames, same as balanceAdd) — controlWins then increments when the
     winner also held more hexes. Rows missing the pair fall out of both
     counters, so BANDS' control.val()/bandN() see a smaller-but-real n
     instead of 0 (small-n path only kicks in when genuinely few battles
     carry the columns, e.g. a run mixing pre/post-WOA-038 rows). cards stays
     {} — card_plays is a separate table this fold doesn't touch (out of
     scope here). Returns { agg, done } — the exact shape
     foldGlobal/balanceScore/BANDS already consume. */
  function foldBattles(rows) {
    var agg = { redWins: 0, firstWins: 0, hqWins: 0, turns: 0, vpDiff: 0,
      zeroKill: 0, tiebreak: 0, killTail: 0, leadChanges: 0,
      attacks: 0, swaps: 0, marches: 0, deploys: 0,
      attritionEndings: 0, attritionKillTail: 0,
      firstBloodGames: 0, firstBloodWins: 0, controlGames: 0, controlWins: 0, cards: {} };
    (rows || []).forEach(function (r) {
      if (r.winner === 'red') agg.redWins++;
      if (r.winner && r.winner === r.firstPlayer) agg.firstWins++;
      if (r.winType === 'hq') agg.hqWins++;
      agg.turns += r.turns || 0;
      agg.vpDiff += Math.abs((r.fsRed || 0) - (r.fsBlue || 0));
      if (r.zeroKill) agg.zeroKill++;
      if (r.tiebreak) agg.tiebreak++;
      agg.killTail += r.killTail || 0;
      // WOA-039: attrition-only slice for Tie%/Drag — the same win_type + kill_tail
      // columns balanceAdd folds live, sliced identically so live == DB bit-for-bit.
      if (r.winType === 'attrition') { agg.attritionEndings++; agg.attritionKillTail += r.killTail || 0; }
      agg.leadChanges += r.leadChanges || 0;
      agg.attacks += r.attacks || 0; agg.swaps += r.swaps || 0;
      agg.marches += r.marches || 0; agg.deploys += r.deploys || 0;
      if (r.firstBlood) {
        agg.firstBloodGames++;
        if (r.firstBlood === r.winner) agg.firstBloodWins++;
      }
      // WOA-038: hexesRed/hexesBlue are NULL on legacy rows — guard both,
      // don't coerce to 0 (a missing pair must never read as a 0/0 tie).
      if (r.hexesRed != null && r.hexesBlue != null && r.hexesRed !== r.hexesBlue) {
        agg.controlGames++;
        if ((r.winner === 'red') === (r.hexesRed > r.hexesBlue)) agg.controlWins++;
      }
    });
    return { agg: agg, done: (rows || []).length };
  }

  /* Derived card-table rows (one per card in `cards`, i.e. E.CARDS), sorted
     by 1stSight% descending. win/simple/sight are rounded percentages of
     plays; seen is the display string ('-' when never played) and seenNum the
     same value as a number for sortable UIs. */
  function cardRows(cardAgg, cards) {
    return cards.map(function (c) {
      var a = cardAgg[c.id] || { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 };
      return { id: c.id, name: c.name, plays: a.plays,
        win: pct(a.wins, a.plays), simple: pct(a.simple, a.plays), sight: pct(a.firstSight, a.plays),
        noop: pct(a.noop || 0, a.plays),
        seen: a.plays ? (a.seenSum / a.plays).toFixed(2) : '-',
        seenNum: a.plays ? +(a.seenSum / a.plays).toFixed(2) : 0 };
    }).sort(function (a, b) { return b.sight - a.sight; });
  }

  /* ===== Trace folds (WOA-033, SPEC §1–2) =====
     Pure functions over ONE battle's trace ENVELOPE — the SPEC §4 row shape
     both a DB trace row (JSON.parse) and a live battle state (trivial wrapper)
     produce:
       { v, map, seed, fp, winner, winType, turns,
         trace: [ {p,id,mode,turn,seen, a?,h?,k?,ld?,u?,noop?} ... ],  // st.playLog
         units: { infantry:{dep:[..],atk,abs,kill,die,dieT:[..]}, cavalry:{..}, artillery:{..} }, // st.unitMetrics
         fs?:  [ [redFieldScore, blueFieldScore] ... ]  // per turn; only vpDiffTrack needs it }
     dieT (WOA-044) is a death-TURN list, symmetric to dep — absent entirely on
     rows recorded before this ticket (LEGACY: every type's units[t] has no
     dieT array at all, not an empty one; unitsAggFromEnvelopes' hasDieT flag
     distinguishes "no deaths this run" from "this run predates dieT capture").
     No DB, no DOM, nothing mutated. WOA-034/035 fold these across many rows.
     Absent fields are omitted in the trace (WOA-031), so every reader guards.

     Fidelity note (WOA-031): mixed deploy+attack plays are tagged a:'attack'
     (attack is sticky), so deploy TIMING is read from units.*.dep (exact
     per-type deploy turns), never by scanning the a-stream for 'deploy'. First
     contact is the first a:'attack' entry (exact). */
  /* A DB battle row's `trace` column is the envelope JSON as TEXT (WOA-032
     SPEC §4); a live battle state can be handed to the same folds already
     wrapped as an envelope object. envelopeFromRow accepts either — a row
     with a string .trace gets JSON.parse'd (defensively: a malformed/absent
     trace returns null rather than throwing), an already-parsed envelope
     object passes through unchanged. One place, so WOA-035's Overview and
     later map/card/unit drill-downs never hand-roll the parse.
     WOA-037: the trace blob itself never carries `fs` (dev/db.js's insertBattle
     doesn't put it there) — GET /api/battles attaches it as a sibling `row.fs`
     (the per-turn [fsRed,fsBlue] timeline, one grouped query over the
     `timeline` table). So once the envelope's parsed, fold row.fs in too —
     the one place every envelope consumer (vpDiffTrack) gets it, regardless
     of whether env.fs already arrived pre-attached (a live battle wrapper). */
  function envelopeFromRow(row) {
    if (!row) return null;
    var env = null;
    if (typeof row.trace === 'string') {
      try { env = JSON.parse(row.trace); } catch (e) { return null; }
    } else if (row.trace && typeof row.trace === 'object') {
      env = row.trace;
    }
    if (!env) return null;
    if (env.fs == null && row.fs) env.fs = row.fs;
    return env;
  }
  function traceOf(env) { return (env && (env.trace || env.playLog)) || []; }
  function unitsOf(env) { return (env && (env.units || env.unitMetrics)) || {}; }
  function turnsOf(env) {
    if (env && env.turns) return env.turns;
    var tr = traceOf(env), mx = 0;
    tr.forEach(function (e) { if ((e.turn || 0) > mx) mx = e.turn; });
    return mx;
  }

  /* First-contact turn: the turn of the first attack (raw turn number, exact),
     or null if the battle had no attack. SPEC §1 (population: all). */
  function firstContactTurn(env) {
    var tr = traceOf(env);
    for (var i = 0; i < tr.length; i++) if (tr[i].a === 'attack') return tr[i].turn;
    return null;
  }

  /* Deploy interleave: share (0..1) of deploys occurring STRICTLY AFTER first
     contact — 0 = all up-front, 1 = all after the shooting starts. Deploy turns
     come from units.*.dep (exact), compared against firstContactTurn (SPEC §1;
     population: all). No deploys, or no contact ⇒ 0 (nothing lands post-contact). */
  function deployInterleave(env) {
    var u = unitsOf(env), depTurns = [];
    Object.keys(u).forEach(function (t) { (u[t] && u[t].dep || []).forEach(function (tn) { depTurns.push(tn); }); });
    if (!depTurns.length) return 0;
    var fc = firstContactTurn(env);
    if (fc == null) return 0;
    var after = depTurns.filter(function (tn) { return tn > fc; }).length;
    return after / depTurns.length;
  }

  /* Settle point: percent of battle length (0..100) after which the field-score
     leader never flips again. Read off the trace `ld` field (leader after each
     turn, which carries through ties — it changes exactly on a real lead flip);
     the % of the LAST flip's turn. 0 = settled from the opening (no flips).
     SPEC §1 (population: all; normalized to battle length %). */
  function settlePoint(env) {
    var tr = traceOf(env), turns = turnsOf(env), prev = null, lastFlip = 0;
    tr.forEach(function (e) {
      if (e.ld == null) return;
      if (prev != null && e.ld !== prev) lastFlip = e.turn;
      prev = e.ld;
    });
    return turns ? 100 * lastFlip / turns : 0;
  }

  /* Per-turn action-octile lanes: 8 rows (turn-octiles 0..7), each the avg
     plays-per-turn of each action type in that octile = (count of that action)
     / (turns in the octile). One card is played per turn, so each value is in
     [0,1] for a single battle; the dashboard averages across battles onto each
     lane's own scale. Octile of a turn = floor((turn-1)*8/turns), clamped 0..7.
     Noop turns (no `a`) count toward the denominator, no numerator. SPEC §2 /
     design 3a (population: all). Returns [{deploy,attack,swap,march} × 8]. */
  var LANE_ACTIONS = ['deploy', 'attack', 'swap', 'march'];
  function actionOctileLanes(env) {
    var tr = traceOf(env), turns = turnsOf(env) || 1, lanes = [];
    for (var o = 0; o < 8; o++) { var row = { _turns: 0 }; LANE_ACTIONS.forEach(function (a) { row[a] = 0; }); lanes.push(row); }
    tr.forEach(function (e) {
      var oi = Math.min(7, Math.max(0, Math.floor((e.turn - 1) * 8 / turns)));
      lanes[oi]._turns++;
      if (e.a && lanes[oi][e.a] != null) lanes[oi][e.a]++;
    });
    return lanes.map(function (row) {
      var d = row._turns, o = {};
      LANE_ACTIONS.forEach(function (a) { o[a] = d ? row[a] / d : 0; });
      return o;
    });
  }

  /* |VP-diff| track: the per-turn field-score margin. This is the EXACT VP diff
     (the same field scores the report's VPdiff column and woa.db store), which
     the play/kill stream alone can't reconstruct (a kill's victim VP isn't in
     the trace) — so it reads env.fs, the per-turn [red,blue] field-score
     timeline (live state: st.fsTimeline; DB: the `timeline` table, joined
     in by GET /api/battles and folded into the row by envelopeFromRow,
     WOA-037). Returns null when fs is absent (the caller greys it — no
     fabricated magnitude). { track:|r-b|/turn, signed:r-b/turn, peak, final }.
     SPEC §1 VPdiff / design 2b-3a (population: all). */
  function vpDiffTrack(env) {
    var fs = env && env.fs;
    if (!Array.isArray(fs) || !fs.length) return null;
    var track = fs.map(function (p) { return Math.abs((p[0] || 0) - (p[1] || 0)); });
    var signed = fs.map(function (p) { return (p[0] || 0) - (p[1] || 0); });
    return { track: track, signed: signed, peak: track.reduce(function (m, v) { return v > m ? v : m; }, 0), final: track[track.length - 1] };
  }

  /* Linear-interpolation quantile (numpy default) over a pre-SORTED array. */
  function quantile(sorted, p) {
    if (!sorted.length) return 0;
    if (sorted.length === 1) return sorted[0];
    var idx = p * (sorted.length - 1), lo = Math.floor(idx), frac = idx - lo;
    return (lo + 1 < sorted.length) ? sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
  }

  /* Per-card play-turn quartiles: for each card played, the quartiles + median
     of its play times over NORMALIZED battle time (turn / turns ∈ (0,1]) — the
     "when cards fire" strip. Keyed by cardId ⇒ { n, q1, median, q3 }. SPEC §2
     (population: per card; normalized to battle length). */
  function cardPlayTurnQuartiles(env) {
    var tr = traceOf(env), turns = turnsOf(env) || 1, byCard = {}, out = {};
    tr.forEach(function (e) { (byCard[e.id] || (byCard[e.id] = [])).push(e.turn / turns); });
    Object.keys(byCard).forEach(function (id) {
      var arr = byCard[id].sort(function (a, b) { return a - b; });
      out[id] = { n: arr.length, q1: quantile(arr, 0.25), median: quantile(arr, 0.5), q3: quantile(arr, 0.75) };
    });
    return out;
  }

  /* ===== Per-card aggregates from many battle envelopes (WOA-043, Cards tab) =====
     foldBattles's `cards` field stays {} BY DESIGN (its own comment: card_plays
     is a separate table, out of scope for the Overview/Maps folds that ticket
     built). The Cards tab is where a run's per-card aggregate is actually
     needed, so this derives the SAME {plays,wins,simple,firstSight,seenSum,noop}
     shape balanceAdd builds live (engine/06-sim.js ~line 111) directly from
     each battle's trace envelope (already captured per SPEC §4 trace — no new
     capture), so WOA_REPORT.cardRows can be reused UNMODIFIED for a run's DB
     rows exactly as it already is for a live in-memory run. wins here is the
     POOLED win rate (every ending) — kept for internal bubble-sizing/tooltip
     use only; it must never reach print (WOA-019) or the sight-quadrant axis
     (SPEC §2 — see cardHqWinSlice below for the axis-worthy slice). */
  function cardAggFromEnvelopes(envs) {
    var cards = {};
    (envs || []).forEach(function (env) {
      var winner = env && env.winner, tr = traceOf(env);
      tr.forEach(function (e) {
        var c = cards[e.id] || (cards[e.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 });
        c.plays++;
        if (e.p === winner) c.wins++;
        if (e.mode !== 'normal') c.simple++;       // resolved as a basic attack/reposition
        if ((e.seen || 1) <= 1) c.firstSight++;     // played the first time it was seen
        if (e.noop) c.noop++;                       // resolved ZERO actions
        c.seenSum += (e.seen || 1);
      });
    });
    return cards;
  }

  /* Card Win% doctrine slice (SPEC §2): pooled card Win% stays OUT of print
     (WOA-019) and out of the Cards-tab quadrant's axis — the number that IS
     meaningful there is sliced to HQ-capture endings × non-simple plays (a
     basic-attack/reposition fallback isn't really "the card winning", and a
     battle that ended in attrition was decided by the standoff, not the last
     card played). DB/dashboard-only; the Cards-tab sight quadrant (WOA-043) is
     the first consumer. Returns {cardId: {plays, wins}} — pct() at the call
     site so a 0-play card reads null rather than NaN, and callers apply the
     small-n rule (SPEC §8) to `plays` before trusting the percentage (this
     slice is thin by construction: HQ endings are ~17% of battles, and only
     the non-simple plays within those count — expect small-n almost always at
     ordinary run sizes). */
  function cardHqWinSlice(envs) {
    var out = {};
    (envs || []).forEach(function (env) {
      if (!env || env.winType !== 'hq') return;
      var tr = traceOf(env), winner = env.winner;
      tr.forEach(function (e) {
        if (e.mode !== 'normal') return; // simple (basic attack/reposition) plays excluded
        var c = out[e.id] || (out[e.id] = { plays: 0, wins: 0 });
        c.plays++;
        if (e.p === winner) c.wins++;
      });
    });
    return out;
  }

  /* ===== Per-unit-type aggregates from many battle envelopes (WOA-044, Units
     tab) ===== SPEC §3: per unit type, per battle FIELDED — median deploy
     turn (normalized to battle length, matching the deployInterleave/
     settlePoint/cardPlayTurnQuartiles idiom already in this file rather than
     raw turn numbers, which aren't comparable across battles of different
     length); attacks made vs absorbed (as one balance reading, roleY); the
     breakthrough number (absorbed/battle fielded); exchange (kills/deaths);
     median lifespan. One fold, every Units-tab chart reads it (unitsOf,
     turnsOf already exist above for hexLenses/vpDiffTrack).

     Lifespan pairing (documented per the ticket's explicit ask): dep[] and
     dieT[] are both already chronological BY CONSTRUCTION (each push happens
     at the moment its event resolves, and turn numbers only increase within
     one battle), so this pairs them index-wise per type PER BATTLE (never
     pooled across battles first — a battle's own turn count is what a
     survivor's censor point needs): the k-th death (by turn) is attributed to
     the k-th deploy (by turn) — a per-type FIFO approximation, since the
     trace carries no persistent per-unit identity. Deploys left unmatched
     (dep.length > dieT.length that battle) survived to battle end: their
     lifespan is RIGHT-CENSORED at that battle's own turn count
     (turns - depTurn), not excluded — excluding survivors would silently
     drop every unit that held the line all game (exactly the "steady
     support" units the chart most wants to show), understating lifespan for
     the units least deserving it.

     Small-n (SPEC §8, per the ticket): a type's OWN n is battlesFielded (the
     Units block is per-battle unconditioned — richer than the Cards HQ-slice
     by construction), used for EVERY chart on this tab, not a chart-specific
     slice count; callers grey per-mark with WOA_REPORT.smallN(n,'fleet').

     Legacy rows (hasDieT false — no type in ANY envelope carries a dieT
     array) can't derive lifespan at all; the Lifespan chart greys itself
     fleet-wide with a "predates capture" note instead of drawing a
     fabricated zero, the same convention vpDiffTrack established pre-WOA-037. */
  function unitsAggFromEnvelopes(envs) {
    var out = {}, sawUnits = false, sawDieT = false;
    (envs || []).forEach(function (env) {
      var u = unitsOf(env), turns = turnsOf(env) || 1;
      Object.keys(u).forEach(function (t) {
        sawUnits = true;
        var ut = u[t] || {};
        var o = out[t] || (out[t] = { atk: 0, abs: 0, kill: 0, die: 0, battlesFielded: 0, depNorm: [], lifespans: [] });
        var dep = (ut.dep || []).slice().sort(function (a, b) { return a - b; });
        if (dep.length) { o.battlesFielded++; dep.forEach(function (tn) { o.depNorm.push(tn / turns); }); }
        o.atk += ut.atk || 0; o.abs += ut.abs || 0; o.kill += ut.kill || 0; o.die += ut.die || 0;
        if (Array.isArray(ut.dieT)) {
          sawDieT = true;
          var dieT = ut.dieT.slice().sort(function (a, b) { return a - b; });
          var n = Math.min(dep.length, dieT.length);
          for (var i = 0; i < n; i++) o.lifespans.push(dieT[i] - dep[i]);
          for (var j = n; j < dep.length; j++) o.lifespans.push(Math.max(0, turns - dep[j])); // censored survivor
        }
      });
    });
    var types = {};
    Object.keys(out).forEach(function (t) {
      var o = out[t];
      var dep = o.depNorm.slice().sort(function (a, b) { return a - b; });
      var life = o.lifespans.slice().sort(function (a, b) { return a - b; });
      types[t] = {
        n: o.battlesFielded, atk: o.atk, abs: o.abs, kill: o.kill, die: o.die,
        depMedian: dep.length ? quantile(dep, 0.5) : null,
        roleY: (o.atk + o.abs) ? 100 * o.atk / (o.atk + o.abs) : null,
        breakthrough: o.battlesFielded ? o.abs / o.battlesFielded : null,
        exchange: o.die ? o.kill / o.die : null,
        lifespan: life.length ? quantile(life, 0.5) : null, lifespanN: life.length
      };
    });
    return { types: types, hasUnits: sawUnits, hasDieT: sawDieT };
  }

  /* The full saved-report markdown. dev/balance-report.js and the dashboard's
     Save-report button are two callers of THIS one renderer; the model
     parameterizes exactly what differs between them:
       title    text after '# Balance report — ' (br: '<diff> AI';
                dash: '<n> battles/map, <ai label>')
       version  rules version for the meta line
       metaTail meta-line text after '<k> map(s) · ' — battle totals +
                accumulation note + '±x pts/map · dev/balance-report.js' for
                the CLI, '±x points at this n · from the in-browser Balance
                Dashboard' for the dashboard
       rows     [{name, shape, agg, done, notes:[..], score?}] in table order
       G        foldGlobal totals (G.cards feeds the card table)
       cards    E.CARDS (card-table row order before the 1stSight sort)
       style    'report' (canonical file report: Balance column + footnote,
                '## Overall' + Behaviour/decisiveness prose, '## Cards (N
                battles)', 'Plays') or 'dashboard' (no score column,
                '## Overall (n=N battles)' + Victory/Aggression bullets,
                '## Card report', 'plays')
     Returns the document WITHOUT a trailing newline (the dashboard's exact
     historical shape); balance-report appends its final '\n' when writing. */
  function reportMarkdown(model) {
    var G = model.G, style = model.style || 'report', scoreCol = style === 'report';
    var mx = Math.max(1, G.games);
    var L = [];
    L.push('# Balance report — ' + model.title);
    L.push('');
    L.push('_Rules version ' + model.version + ' · ' + model.rows.length + ' map(s) · ' + model.metaTail + '_');
    L.push('');
    L.push('## Maps');
    L.push('');
    // WOA-039: Atk%/Swp% are SHARES of all actions (deck-size-proof); Tie%/Drag
    // are conditioned to attrition endings (a.attritionEndings), not `done`.
    L.push('| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk% | Swp% | 0kill% | Tie% | Drag | Swings | ' +
      (scoreCol ? 'Balance | ' : '') + 'Notes |');
    L.push('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|' + (scoreCol ? '--:|' : '') + '---|');
    model.rows.forEach(function (x) {
      var a = x.agg, done = x.done, act = actionTotal(a), att = a.attritionEndings || 0;
      L.push('| ' + x.name + ' | ' + x.shape + ' | ' + pct(a.redWins, done) + ' | ' + pct(a.firstWins, done) +
        ' | ' + pct(a.hqWins, done) + ' | ' + f1(a.turns / done) + ' | ' + f1(a.vpDiff / done) + ' | ' + pct(a.attacks, act) +
        ' | ' + pct(a.swaps, act) + ' | ' + pct(a.zeroKill, done) + ' | ' + pct(a.tiebreak, att) +
        ' | ' + f1((a.attritionKillTail || 0) / Math.max(1, att)) + ' | ' + f1((a.leadChanges || 0) / done) +
        (scoreCol ? ' | ' + f1(x.score) : '') + ' | ' + x.notes.join(', ') + ' |');
    });
    L.push('');
    if (style === 'report') {
      L.push('_Balance column: weighted distance outside each metric\'s ideal range (0 = ideal, lower = better) — Red/1st 45–55, HQ 10–40, 0kill ≤5, Tie ≤18, Drag ≤3.0, Swings ≥2.0, Control ≥70. Tie%/Drag over attrition endings only (rules 1.2). SOT: grading-rubrics §Best map._');
      L.push('');
      L.push('## Overall');
      L.push('');
      L.push('- red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) + '% · HQ captures ' +
        pct(G.hq, G.games) + '% · avg battle ' + f1(G.turns / G.games) + ' turns');
      L.push('- Behaviour: ' + pct(G.attacks, actionTotal(G)) + '% attacks & ' + pct(G.swaps, actionTotal(G)) + '% swaps of all actions · zero-kill ' +
        pct(G.zeroKill, G.games) + '% · ' + Math.round(100 * G.depShare / G.games) + '% of units ever fielded');
      L.push('- Reserves at end (HQ endings only' + smallNote(G.hqEndings) + '): red ' + hqReservePct(G.resEndRedHQ, G.hqEndings) + ' · blue ' +
        hqReservePct(G.resEndBlueHQ, G.hqEndings) + ' of that side\'s pieces still undeployed at the HQ capture (high = a rush before commit)');
      L.push('- Decisiveness: tie-goes-to-2nd decided ' + pct(G.tiebreak, G.attritionEndings) + '% of attrition endings · first blood won ' +
        pct(G.fbWins, G.fbGames) + '% of the ' + pct(G.fbGames, G.games) + '% of battles with a kill · more-hexes side won ' + pct(G.ctlWins, G.ctlGames) + '%');
      L.push('- Pacing: ' + f1(G.attritionKillTail / Math.max(1, G.attritionEndings)) + ' kill-less turns before end, attrition endings (0=decisive, ~32=circling) · ' +
        f1(G.leadChanges / G.games) + ' lead swings/battle (higher = more back-and-forth)');
      L.push('');
      L.push('## Cards (' + G.games + ' battles)');
    } else {
      L.push('## Overall (n=' + G.games + ' battles)');
      L.push('');
      L.push('- Victory: red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) +
        '% · HQ captures ' + pct(G.hq, G.games) + '% · avg ' + f1(G.turns / mx) + ' turns');
      L.push('- Aggression: ' + pct(G.attacks, actionTotal(G)) + '% attacks & ' + pct(G.swaps, actionTotal(G)) + '% swaps of all actions · ' +
        Math.round(100 * G.depShare / mx) + '% of units fielded · zero-kill ' + pct(G.zeroKill, G.games) + '%');
      L.push('- Reserves at end (HQ endings only' + smallNote(G.hqEndings) + '): red ' + hqReservePct(G.resEndRedHQ, G.hqEndings) + ' · blue ' +
        hqReservePct(G.resEndBlueHQ, G.hqEndings) + ' of pieces still undeployed at the HQ capture');
      L.push('- Decisiveness: tie→2nd ' + pct(G.tiebreak, G.attritionEndings) + '% of attrition endings · first blood converts ' +
        pct(G.fbWins, G.fbGames) + '% · board leader wins ' + pct(G.ctlWins, G.ctlGames) + '%');
      L.push('- Pacing: ' + f1(G.attritionKillTail / Math.max(1, G.attritionEndings)) + ' kill-less turns before end (attrition) · ' + f1(G.leadChanges / mx) + ' lead swings/battle');
      L.push('');
      L.push('## Card report');
    }
    L.push('');
    // Noop% restored July 2026 (rules 1.0): new multi-step cards are where dead
    // turns reappear, and the rubric's dead-card check needs a printed number.
    // Win% dropped from print July 2026 (WOA-019): dead at n=700, all cards
    // read 49-52 against the +/-8 rubric threshold — still computed in
    // cardRows() and recorded in logs/woa.db, just not shown here.
    L.push('| Card | Simple% | Noop% | 1stSight% | AvgSeen | ' + (style === 'report' ? 'Plays' : 'plays') + ' |');
    L.push('|---|--:|--:|--:|--:|--:|');
    cardRows(G.cards, model.cards).forEach(function (r) {
      L.push('| ' + r.name + ' | ' + r.simple + ' | ' + r.noop + ' | ' + r.sight + ' | ' + r.seen + ' | ' + r.plays + ' |');
    });
    L.push('');
    // Obsidian-style tag footer so reports are findable by kind + rules version
    L.push('#reports #balance #v' + String(model.version).replace(/\./g, '-'));
    L.push('');
    return L.join('\n');
  }

  /* ===== Per-hex lenses (WOA-042, SPEC §5) =====
     Three SPATIAL reads folded from the trace's `h` stream (the raw 'q,r'
     engine key each play acts on — recordPlay in engine/04-battle.js writes
     the deploy target / march destination / swap hex / attack battle-hex; an
     attack also carries `k` kills). ONE battle envelope in ->
       { plays, turns, hexes: { 'q,r': { occ, flips, kills } } }.

     Reconstruction is best-effort over WHAT THE TRACE RECORDS — hexes acted
     on, kills, and the actor `p` — NOT a full combat replay (the trace has no
     march ORIGIN, no attack outcome, no starting HQ positions):
       owner{}  who last held each hex.
       deploy(h,p) / march(h=dest,p): p takes h; a flip when h was the OTHER
         player's. The march origin isn't in the trace (WOA-031 omits it), so a
         vacated origin lingers as "held" — a bounded over-count that only
         inflates the BUSY end, never the dead end the <5% test reads, and it
         happens to surface rushable lanes (a march onto ground the enemy last
         held reads as a kill-less flip — the SPEC §5 "high flips + low kills"
         signature).
       swap(h,p): a same-owner cross-type swap (rules 1.0 bans same-type) — no
         ownership change, just a touch.
       attack(h=battle hex,p,k): kills += k; a kill (k>0) is a violent contest
         that hands the hex to the attacker -> flip when h wasn't already p's.
         (k also counts an attacker's own death, so this slightly over-attributes
         captures — acceptable for a relative heatmap; documented.)
     Occupancy credits +1 turn to every currently-held hex after each play, so
     occ = heldTurns / plays ∈ [0,1] = "% of turns held". Only hexes the trace
     TOUCHED appear; HQ hexes never show unless attacked, so the RENDER layer
     (which knows the map's HQs) exempts them from the dead-hex hatch — the fold
     stays pure over the trace, no map/board dependency. */
  function hexLenses(env) {
    var tr = traceOf(env), owner = {}, held = {}, flips = {}, kills = {}, touched = {}, plays = 0;
    tr.forEach(function (e) {
      plays++;
      var h = e.h, p = e.p;
      if (h) {
        touched[h] = true;
        if (e.a === 'deploy' || e.a === 'march') {
          if (owner[h] && owner[h] !== p) flips[h] = (flips[h] || 0) + 1;
          owner[h] = p;
        } else if (e.a === 'attack') {
          if (e.k) {
            kills[h] = (kills[h] || 0) + e.k;
            if (owner[h] !== p) flips[h] = (flips[h] || 0) + 1;
            owner[h] = p;
          }
        } // swap: touch only — no ownership change
      }
      // credit occupancy: every hex currently held gets +1 for this play/turn
      Object.keys(owner).forEach(function (k) { held[k] = (held[k] || 0) + 1; });
    });
    var hexes = {};
    Object.keys(touched).forEach(function (k) {
      hexes[k] = { occ: plays ? (held[k] || 0) / plays : 0, flips: flips[k] || 0, kills: kills[k] || 0 };
    });
    return { plays: plays, turns: turnsOf(env), hexes: hexes };
  }

  /* SPEC §5 classification thresholds — the ONE place they live (dead hex =
     <5% occupancy; avenue of attack = flips in the top quartile of the flip
     distribution). */
  var HEX_DEAD_OCC = 0.05, HEX_AVENUE_Q = 0.75;

  /* Fold many battles' hexLenses into per-hex AVERAGES + the SPEC §5
     classification: occ averaged across battles ("% of turns held"), flips &
     kills as per-BATTLE rates, dead = avg occupancy < 5%, avenue-of-attack =
     avg flips in the top quartile of the (>0) flip distribution. envs =
     envelopes (envelopeFromRow output); charts.js folds one run's battles for
     one map, per the A|B toggle. Returns
       { n, avenueThresh, hexes: { 'q,r': { occ, flips, kills, dead, avenue } } }.
     n=0 -> empty hexes (caller renders "no battles"). */
  function foldHexLenses(envs) {
    var n = (envs || []).length, acc = {};
    (envs || []).forEach(function (env) {
      var L = hexLenses(env);
      Object.keys(L.hexes).forEach(function (k) {
        var a = acc[k] || (acc[k] = { occ: 0, flips: 0, kills: 0 });
        a.occ += L.hexes[k].occ; a.flips += L.hexes[k].flips; a.kills += L.hexes[k].kills;
      });
    });
    var hexes = {}, flipVals = [];
    Object.keys(acc).forEach(function (k) {
      var occ = n ? acc[k].occ / n : 0, flips = n ? acc[k].flips / n : 0, kills = n ? acc[k].kills / n : 0;
      hexes[k] = { occ: occ, flips: flips, kills: kills, dead: occ < HEX_DEAD_OCC, avenue: false };
      if (flips > 0) flipVals.push(flips);
    });
    var thresh = flipVals.length ? quantile(flipVals.sort(function (a, b) { return a - b; }), HEX_AVENUE_Q) : Infinity;
    Object.keys(hexes).forEach(function (k) { if (hexes[k].flips > 0 && hexes[k].flips >= thresh) hexes[k].avenue = true; });
    return { n: n, avenueThresh: thresh, hexes: hexes };
  }

  return { pct: pct, f1: f1, actionTotal: actionTotal, balanceScore: balanceScore, mapNotes: mapNotes,
    addAgg: addAgg, foldGlobal: foldGlobal, cardRows: cardRows, reportMarkdown: reportMarkdown,
    // WOA-033: bands-as-data + trace folds (node + browser both consume)
    BANDS: BANDS, bands: bands, outBand: outBand, quantile: quantile,
    firstContactTurn: firstContactTurn, deployInterleave: deployInterleave, settlePoint: settlePoint,
    actionOctileLanes: actionOctileLanes, vpDiffTrack: vpDiffTrack, cardPlayTurnQuartiles: cardPlayTurnQuartiles,
    // WOA-043: per-card DB-rows aggregate (cardRows-compatible) + the SPEC §2 Win% doctrine slice
    cardAggFromEnvelopes: cardAggFromEnvelopes, cardHqWinSlice: cardHqWinSlice,
    // WOA-044: per-unit-type aggregate (role map / breakthrough / lifespan / exchange, SPEC §3)
    unitsAggFromEnvelopes: unitsAggFromEnvelopes,
    // WOA-042: per-hex lenses (drill-down) + SPEC §5 dead/avenue thresholds
    hexLenses: hexLenses, foldHexLenses: foldHexLenses, HEX_DEAD_OCC: HEX_DEAD_OCC, HEX_AVENUE_Q: HEX_AVENUE_Q,
    // WOA-035: small-n rule + DB-rows-as-agg fold (Overview)
    bandN: bandN, SMALL_N: SMALL_N, smallN: smallN, foldBattles: foldBattles, envelopeFromRow: envelopeFromRow };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_REPORT;
