/* War of Attrition — report model: the ONE copy of the balance-report logic every
   reporting surface shares (CLI, dashboard, saved markdown). Pure plain-data folds
   over E.balanceMap aggregates + trace envelopes; dual-exported (WOA_REPORT global
   + module.exports) like maps.js. Subsystem reference — envelope schema, band
   semantics, reporting doctrine, reconstruction caveats: docs/report-model.md.

   - pct(a, b)                 rounded percentage (0 when b is 0)
   - f1(x)                     one-decimal string, round-half-up
   - BANDS / bands(m,grace)    per-metric band table as DATA + effective band under
                               a grace class (hold|nudge|bold|bypass; legacy
                               T0/T1/T2 alias hold/nudge/bold). RANGES = per-axis ±.
   - balanceScore(agg, done)   balance-quality score, LOWER = better (folds BANDS)
   - mapNotes(agg, done)       health-flag strings for one map's aggregate
   - addAgg(dst, src)          fold one balanceMap aggregate into another
   - foldGlobal(rows)          [{agg, done}] -> G totals (incl. G.cards)
   - cardRows(cardAgg, cards)  derived card-table rows, 1stSight% desc
   - reportMarkdown(model)     the full saved-report markdown document
   - trace folds (one skirmish envelope in, derived value out):
       firstContactTurn · deployInterleave · settlePoint · actionOctileLanes ·
       vpDiffTrack · cardPlayTurnQuartiles
   - per-hex lenses: hexLenses (one skirmish -> per-hex occupancy/flips/kills) ·
       foldHexLenses (many skirmishes -> per-hex averages + dead/avenue class)
   - unitsAggFromEnvelopes(envs)  many envelopes -> per-unit-type {n, depMedian,
       roleY, breakthrough, exchange, lifespan, lifespanN}
   - bandN / SMALL_N / smallN  small-n rule
   - foldSkirmishes(rows)      DB `skirmishes` rows (GET /api/skirmishes) -> {agg, done}
   - envelopeFromRow(row)      a DB skirmish row's .trace TEXT -> parsed envelope */

var WOA_REPORT = (function () {

  // foldSkirmishes is the only fold downstream of the engine (delegates to its
  // single-source factsFromRow/foldFacts). Resolve the engine dual like maps.js.
  var ENG = (typeof window !== 'undefined' && window.Engine) ? window.Engine
    : (typeof require === 'function' ? require('./engine.js') : null);

  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  // Total actions = attacks + swaps + marches + deploys; the Attack/Swap SHARE denominator.
  function actionTotal(a) { return (a.attacks || 0) + (a.swaps || 0) + (a.marches || 0) + (a.deploys || 0); }
  // Prints a conditioned metric's slice-n, flagging small-n (see docs/report-model.md).
  function smallNote(n) { return ' (n=' + (n || 0) + ((n || 0) < SMALL_N.fleet ? ', small-n' : '') + ')'; }
  function hqReservePct(sum, n) { return n ? Math.round(100 * sum / n) + '%' : '—'; }

  /* The ONE band table, as data — balanceScore folds the eight feedsScore:true rows
     (no second copy of the ranges). Row shape {key,label,lo,hi,weight,feedsScore,
     val,nFor?} and every edge/denominator rationale: docs/report-model.md#metric-bands.
     SOT for the ranges is docs/balance/best-map-score.md — if it and this table
     disagree, the doc wins and this table is fixed. */
  var BANDS = [
    { key: 'red',    label: 'Red%',    lo: 45,  hi: 55,   weight: 1,   feedsScore: true,  val: function (a, done) { return pct(a.redWins, done); } },
    { key: 'first',  label: '1st%',    lo: 45,  hi: 55,   weight: 1,   feedsScore: true,  val: function (a, done) { return pct(a.firstWins, done); } },
    { key: 'hq',     label: 'HQ%',     lo: 10,  hi: 40,   weight: 0.5, feedsScore: true,  val: function (a, done) { return pct(a.hqWins, done); } },
    { key: 'zeroKill', label: '0kill%', lo: 0, hi: 5,     weight: 0.6, feedsScore: true,  val: function (a, done) { return pct(a.zeroKill, done); } },
    // conditioned: denominator is attritionEndings, not done
    { key: 'tie',    label: 'Tie%',    lo: 0,   hi: 18,   weight: 0.3, feedsScore: true,  val: function (a) { return a.attritionEndings ? pct(a.tiebreak, a.attritionEndings) : null; },
      nFor: function (a) { return a.attritionEndings || 0; } },
    { key: 'drag',   label: 'Drag',    lo: 0,   hi: 3.0,  weight: 4,   feedsScore: true,  val: function (a) { return a.attritionEndings ? (a.attritionKillTail || 0) / a.attritionEndings : null; },
      nFor: function (a) { return a.attritionEndings || 0; } },
    { key: 'swings', label: 'Swings',  lo: 2.0, hi: null, weight: 6,   feedsScore: true,  val: function (a, done) { return a.leadChanges / Math.max(1, done); } },
    { key: 'control', label: 'Control%', lo: 70, hi: 100, weight: 0.5, feedsScore: true,  val: function (a) { return a.controlGames ? pct(a.controlWins, a.controlGames) : null; },
      nFor: function (a) { return a.controlGames || 0; } },
    // guard bands: shaded, NOT scored (feedsScore:false). first-blood→win + Atk/Swp share
    { key: 'firstBlood', label: 'First-blood→win', lo: 55, hi: 70, weight: 0, feedsScore: false, val: function (a) { return a.firstBloodGames ? pct(a.firstBloodWins, a.firstBloodGames) : null; },
      nFor: function (a) { return a.firstBloodGames || 0; } },
    // shares over all actions (n = done, no nFor); null only if no actions were taken
    { key: 'attackShare', label: 'Attack%', lo: 12, hi: 28, weight: 0, feedsScore: false, val: function (a) { var t = actionTotal(a); return t ? pct(a.attacks, t) : null; } },
    { key: 'swapShare', label: 'Swap%', lo: 10, hi: 26, weight: 0, feedsScore: false, val: function (a) { var t = actionTotal(a); return t ? pct(a.swaps, t) : null; } }
  ];
  var BAND_BY_KEY = {};
  BANDS.forEach(function (b) { BAND_BY_KEY[b.key] = b; });

  /* Slice-n backing a band row's val(): `done`, or the row's own nFor for a
     conditioned metric. Callers compare against SMALL_N. */
  function bandN(bandRow, agg, done) {
    var b = (typeof bandRow === 'string') ? BAND_BY_KEY[bandRow] : bandRow;
    if (!b) return done;
    return b.nFor ? b.nFor(agg, done) : done;
  }
  // A conditioned metric with slice-n < 40 per map (or < 240 fleet-wide) renders
  // greyed, '(n=N)', excluded from the verdict banner.
  var SMALL_N = { map: 40, fleet: 240 };
  function smallN(n, scope) { return (n == null) || n < (scope === 'map' ? SMALL_N.map : SMALL_N.fleet); }

  /* Weighted distance of v OUTSIDE [lo, hi] (0 inside; null edge = unbounded on
     that side). null/NaN value scores 0 (the control guard: skip when
     controlGames == 0 leaves control.val() null). */
  function outBand(v, lo, hi, w) {
    if (v == null || v !== v) return 0;
    if (lo != null && v < lo) return w * (lo - v);
    if (hi != null && v > hi) return w * (v - hi);
    return 0;
  }

  /* Own-band-width basis for a grace ± (closed: hi-lo; half-open: |edge|; fully
     open: 0). The fraction each grace class widens by — hold=0, nudge=0.2,
     bold=0.4 — matching the legacy T0/T1/T2 tiers exactly. */
  function bandWidth(b) {
    var loOpen = (b.lo == null), hiOpen = (b.hi == null);
    return (!loOpen && !hiOpen) ? (b.hi - b.lo) : (!loOpen ? Math.abs(b.lo) : (!hiOpen ? Math.abs(b.hi) : 0));
  }
  var GRACE_FRAC = { hold: 0, nudge: 0.2, bold: 0.4 };   // bypass handled in bands()
  // Legacy report-wide tiers alias the per-axis grace classes — one code path.
  var GRACE_ALIAS = { T0: 'hold', T1: 'nudge', T2: 'bold' };

  /* Per-Tolerance authored ± widths — the loop's tunable knobs (#93). SEEDED here
     from today's GRACE_FRAC × own-band-width so the shipped grader is byte-identical
     (golden); edit a cell to widen ONE axis's grace independent of the others (a
     nudge on Red% need not equal a nudge on Drag). {key: {nudge, bold}} in points. */
  var RANGES = {};
  BANDS.forEach(function (b) {
    var w = bandWidth(b);
    RANGES[b.key] = Object.freeze({ nudge: GRACE_FRAC.nudge * w, bold: GRACE_FRAC.bold * w });
  });
  Object.freeze(RANGES);   // exported by reference — frozen so a consumer can't perturb band widths process-wide

  /* Effective band under a grace class: widen each CLOSED edge outward by the
     Tolerance's authored ± (RANGES); OPEN edges stay open. Grace ∈
     hold|nudge|bold|bypass (legacy T0/T1/T2 route through GRACE_ALIAS to the same
     path). `bypass` = never rejects → both edges open (outBand always 0), a shaded
     warning row only. See docs/report-model.md#metric-bands. */
  function bands(metric, grace) {
    var b = (typeof metric === 'string') ? BAND_BY_KEY[metric] : metric;
    if (!b) return null;
    grace = GRACE_ALIAS[grace] || grace || 'hold';
    var out = { key: b.key, label: b.label, weight: b.weight, feedsScore: b.feedsScore };
    if (grace === 'bypass') { out.lo = null; out.hi = null; return out; }
    var r = RANGES[b.key] || { nudge: 0, bold: 0 };
    var delta = grace === 'bold' ? r.bold : grace === 'nudge' ? r.nudge : 0;   // hold / unknown → 0
    out.lo = (b.lo == null) ? null : b.lo - delta;
    out.hi = (b.hi == null) ? null : b.hi + delta;
    return out;
  }

  /* Balance-quality score (LOWER = better, 0 = ideal) — the "best map" ideal-range
     rubric (SOT: docs/balance/best-map-score.md). Sums the feedsScore rows of the
     ONE band table above; attrition-only maps (HQ% < 10) are penalised. T0 bands
     only — the score is temperature-independent by design. */
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
          var a = dst.cards[cid] || (dst.cards[cid] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 });
          var c = src.cards[cid];
          ['plays', 'wins', 'simple', 'firstSight', 'seenSum', 'noop', 'hqPlays', 'hqWins'].forEach(function (f) { a[f] = (a[f] || 0) + (c[f] || 0); });
        });
      } else if (typeof src[k] === 'number') {
        dst[k] = (dst[k] || 0) + src[k];
      }
    });
    return dst;
  }

  /* Roll every map's aggregate into the report-wide totals. rows is
     [{agg, done}] — done is the caller's finished-skirmish count for that map
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
      // attrition-only slices (Tie%/Drag) and HQ-only slices (Reserves)
      G.attritionEndings += (a.attritionEndings || 0); G.attritionKillTail += (a.attritionKillTail || 0);
      G.hqEndings += (a.hqEndings || 0); G.resEndRedHQ += (a.reserveEndRedHQ || 0); G.resEndBlueHQ += (a.reserveEndBlueHQ || 0);
      G.fbWins += a.firstBloodWins; G.fbGames += a.firstBloodGames;
      G.ctlWins += a.controlWins; G.ctlGames += a.controlGames; G.depShare += a.deployedShare;
      G.resEndRed += (a.reserveEndRed || 0); G.resEndBlue += (a.reserveEndBlue || 0);
      G.killTail += (a.killTail || 0); G.leadChanges += (a.leadChanges || 0);
      Object.keys(a.cards || {}).forEach(function (cid) {
        var c = G.cards[cid] || (G.cards[cid] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 });
        var s = a.cards[cid];
        c.plays += s.plays; c.wins += s.wins; c.simple += s.simple;
        c.firstSight += s.firstSight; c.seenSum += s.seenSum; c.noop += (s.noop || 0);
        c.hqPlays += (s.hqPlays || 0); c.hqWins += (s.hqWins || 0);
      });
    });
    return G;
  }

  /* DB `skirmishes` rows (GET /api/skirmishes) -> the { agg, done } shape
     foldGlobal/balanceScore/BANDS consume. Delegates each row to the engine's
     single-source fold (below); done is rows.length (only skirmish-over states are
     stored). Column mapping + control NULL/NULL handling: docs/report-model.md. */
  function foldSkirmishes(rows) {
    var agg = { redWins: 0, firstWins: 0, hqWins: 0, turns: 0, vpDiff: 0,
      zeroKill: 0, tiebreak: 0, killTail: 0, leadChanges: 0,
      attacks: 0, swaps: 0, marches: 0, deploys: 0,
      attritionEndings: 0, attritionKillTail: 0,
      firstBloodGames: 0, firstBloodWins: 0, controlGames: 0, controlWins: 0, cards: {} };
    // factsFromRow maps stored columns onto the fact record foldFacts accumulates —
    // the same record + fold balanceAdd uses live. `cards` stays {} (separate table).
    (rows || []).forEach(function (r) { ENG.foldFacts(agg, ENG.factsFromRow(r)); });
    return { agg: agg, done: (rows || []).length };
  }

  /* WOA #57 — Mispricing residual soft-flag tunables (see cardRows below). ADVISORY
     only, never a hard gate (ADR-0002). ONE place to tune; docs/balance,
     card-rubric, and review-reports cite these.
       RESID_PTS   — |residual| in army-points that trips the ⚠ flag. Absolute is
                     fine because deck size is a fixed guardrail (~16 cards / ~68 pts);
                     re-tune if that budget moves a lot.
       MIN_HQPLAYS — a Card needs at least this many HQ × printed plays before its
                     residual is trusted (and shown). Below it the HQ slice is too
                     thin — a couple of lucky wins would swamp the share (the slice
                     is ~17% of skirmishes; small-n by construction). */
  var MISPRICE_RESID_PTS = 2.0;
  var MISPRICE_MIN_HQPLAYS = 10;

  /* Derived card-table rows (one per card in `cards`, i.e. E.CARDS), sorted
     by 1stSight% descending. win/simple/sight are rounded percentages of
     plays; seen is the display string ('-' when never played) and seenNum the
     same value as a number for sortable UIs.

     WOA #57 mispricing residual: when `cardPoints` (E.cardPoints) is passed, each
     row also carries `points` (army-points cost, ADR-0002) and `resid` — the card's
     share of the deck's DECISIVE WINS minus its share of the points BUDGET, scaled
     back to points (so the subtraction is in points; no win-rate is fitted to points
     — descriptive, not predictive, ADR-0002):
       priceShare_i = points_i / Σ points   (over played cards)
       winShare_i   = hqWins_i / Σ hqWins    (HQ × printed-play win contribution)
       resid_i      = (winShare_i − priceShare_i) · Σ points
     resid > 0 = the Card out-wins its price share (under-priced); resid < 0 = it
     costs more of the budget than it delivers. Two confounds keep this ADVISORY, not
     a verdict: (a) winShare is EXPOSURE-WEIGHTED — a Card drawn/played more often
     accrues more decisive wins, so a resid gap can be a draw-frequency artifact, not
     price; (b) the timing blind spot — a held-value Card (a saved attack buff) wins
     off-slice and can read negative without being weak. `resid` is null when points
     weren't supplied, the Card was never played, Σ hqWins = 0, or the Card's own HQ
     exposure is below MISPRICE_MIN_HQPLAYS (too thin to trust); `mispriced` marks a
     trusted |resid| ≥ MISPRICE_RESID_PTS. */
  function cardRows(cardAgg, cards, cardPoints) {
    var rows = cards.map(function (c) {
      var a = cardAgg[c.id] || { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 };
      return { id: c.id, name: c.name, plays: a.plays,
        win: pct(a.wins, a.plays), simple: pct(a.simple, a.plays), sight: pct(a.firstSight, a.plays),
        noop: pct(a.noop || 0, a.plays),
        seen: a.plays ? (a.seenSum / a.plays).toFixed(2) : '-',
        seenNum: a.plays ? +(a.seenSum / a.plays).toFixed(2) : 0,
        points: cardPoints ? cardPoints(c) : null, hqPlays: a.hqPlays || 0, hqWins: a.hqWins || 0,
        resid: null, mispriced: false };
    });
    if (cardPoints) {
      var sumPts = rows.reduce(function (s, r) { return s + (r.plays ? r.points : 0); }, 0);
      var sumHqWins = rows.reduce(function (s, r) { return s + r.hqWins; }, 0);
      if (sumPts > 0 && sumHqWins > 0) rows.forEach(function (r) {
        if (!r.plays || r.hqPlays < MISPRICE_MIN_HQPLAYS) return;   // never played / too-thin slice -> no residual
        r.resid = +(((r.hqWins / sumHqWins) - (r.points / sumPts)) * sumPts).toFixed(1);
        r.mispriced = Math.abs(r.resid) >= MISPRICE_RESID_PTS;
      });
    }
    return rows.sort(function (a, b) { return b.sight - a.sight; });
  }

  /* ===== Trace folds =====
     Pure functions over ONE skirmish's trace ENVELOPE (the shape both a DB trace row
     and a live skirmish state produce). Envelope schema, the dieT legacy rule, and
     the deploy-timing fidelity note: docs/report-model.md#trace-envelope. No DB, no
     DOM, nothing mutated; absent fields are omitted, so every reader guards. */
  /* envelopeFromRow: accept a DB row (string .trace -> JSON.parse, malformed returns
     null) or an already-parsed envelope, and fold in the sibling row.fs (the timeline
     the trace blob doesn't carry). One place, so no drill-down hand-rolls the parse. */
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
     or null if the skirmish had no attack. */
  function firstContactTurn(env) {
    var tr = traceOf(env);
    for (var i = 0; i < tr.length; i++) if (tr[i].a === 'attack') return tr[i].turn;
    return null;
  }

  /* Deploy interleave: share (0..1) of deploys occurring STRICTLY AFTER first
     contact — 0 = all up-front, 1 = all after the shooting starts. Deploy turns
     come from units.*.dep (exact), compared against firstContactTurn. No deploys,
     or no contact ⇒ 0 (nothing lands post-contact). */
  function deployInterleave(env) {
    var u = unitsOf(env), depTurns = [];
    Object.keys(u).forEach(function (t) { (u[t] && u[t].dep || []).forEach(function (tn) { depTurns.push(tn); }); });
    if (!depTurns.length) return 0;
    var fc = firstContactTurn(env);
    if (fc == null) return 0;
    var after = depTurns.filter(function (tn) { return tn > fc; }).length;
    return after / depTurns.length;
  }

  /* Settle point: percent of skirmish length (0..100) after which the field-score
     leader never flips again. Read off the trace `ld` field (leader after each
     turn, which carries through ties — it changes exactly on a real lead flip);
     the % of the LAST flip's turn. 0 = settled from the opening (no flips). */
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
     [0,1] for a single skirmish; the dashboard averages across skirmishes onto each
     lane's own scale. Octile of a turn = floor((turn-1)*8/turns), clamped 0..7.
     Noop turns (no `a`) count toward the denominator, no numerator.
     Returns [{deploy,attack,swap,march} × 8]. */
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
     in by GET /api/skirmishes and folded into the row by envelopeFromRow).
     Returns null when fs is absent (the caller greys it — no
     fabricated magnitude). { track:|r-b|/turn, signed:r-b/turn, peak, final }. */
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
     of its play times over NORMALIZED skirmish time (turn / turns ∈ (0,1]) — the
     "when cards fire" strip. Keyed by cardId ⇒ { n, q1, median, q3 }. */
  function cardPlayTurnQuartiles(env) {
    var tr = traceOf(env), turns = turnsOf(env) || 1, byCard = {}, out = {};
    tr.forEach(function (e) { (byCard[e.id] || (byCard[e.id] = [])).push(e.turn / turns); });
    Object.keys(byCard).forEach(function (id) {
      var arr = byCard[id].sort(function (a, b) { return a - b; });
      out[id] = { n: arr.length, q1: quantile(arr, 0.25), median: quantile(arr, 0.5), q3: quantile(arr, 0.75) };
    });
    return out;
  }

  /* Per-card {plays,wins,simple,firstSight,seenSum,noop} from a run's envelopes —
     the SAME shape balanceAdd builds live, so cardRows is reused UNMODIFIED for DB
     rows. `wins` is the POOLED rate (internal bubble-sizing only; never printed —
     docs/report-model.md#reporting-doctrine). */
  function cardAggFromEnvelopes(envs) {
    var cards = {};
    (envs || []).forEach(function (env) {
      var winner = env && env.winner, tr = traceOf(env);
      tr.forEach(function (e) {
        var c = cards[e.id] || (cards[e.id] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, declines: 0 });
        c.plays++;
        if (e.p === winner) c.wins++;
        if (e.mode !== 'normal') c.simple++;       // resolved as a basic attack/reposition
        if ((e.seen || 1) <= 1) c.firstSight++;     // played the first time it was seen
        if (e.noop) c.noop++;                       // resolved ZERO actions
        c.seenSum += (e.seen || 1);
        // #89 decline signal: every card held-but-passed-over this turn (older
        // traces without `declined` contribute nothing). appears = plays +
        // declines; decline-rate = declines / appears (per card).
        (e.declined || []).forEach(function (did) {
          var d = cards[did] || (cards[did] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, declines: 0 });
          d.declines++;
        });
      });
    });
    Object.keys(cards).forEach(function (id) { cards[id].appears = cards[id].plays + cards[id].declines; });
    return cards;
  }

  /* #89 phase-conditioned decline: per-card decline count in each of the 8
     turn-octiles (reusing the octile index at actionOctileLanes). A card is
     "declined" in a turn when it was in hand and a DIFFERENT card was played.
     Returns { cardId: [8 counts] }; #82 slices decline-rate by phase from this
     against the same-octile play counts. Empty for pre-#89 traces. */
  function cardDeclineByOctile(env) {
    var tr = traceOf(env), turns = turnsOf(env) || 1, out = {};
    tr.forEach(function (e) {
      var oi = Math.min(7, Math.max(0, Math.floor((e.turn - 1) * 8 / turns)));
      (e.declined || []).forEach(function (did) {
        (out[did] || (out[did] = [0, 0, 0, 0, 0, 0, 0, 0]))[oi]++;
      });
    });
    return out;
  }

  /* ===== Army-points calibration pass (#82 / #114, Track C of the #108 build order) =====
     A ONE-WAY ADVISORY pass (ADR-0002): points are a descriptive yardstick, never fitted
     to win-rate. This reads the two measured signals already in report-model — the `resid`
     from cardRows (measured contribution − price) and the #89 phase-conditioned decline —
     classifies each Card, folds a CONTRIBUTION-WEIGHTED capability-class signal, and proposes
     shared `POINTS` weight moves. Two guardrails are load-bearing:
       • a SHARED weight moves only on a consistent class signal (≥2 cards, no single card
         dominating the class's contribution); SINGLE-card domination is a REDESIGN flag,
         never a weight move (prune the card, don't distort the price table);
       • `deckPoints ≤ cap` is the one HARD gate — positive moves clamp to cap headroom;
         the Temperature (#109) supplies only SOFT velocity + direction, never a reject.
     Engine-global-free like cardRows: the caller passes cardPoints/deckPoints facts in. */
  var CALIB = {
    resid: MISPRICE_RESID_PTS,   // |resid| (pts) for a Card to read mispriced (reuse the #57 anchor)
    declineHigh: 0.6,            // decline-rate (declines/appears) at/above = heavily passed over
    classSignal: MISPRICE_RESID_PTS, // contribution-weighted |resid| (pts) a class needs to justify a move
    minClassCards: 2,            // a class needs ≥ this many classified cards to move (else single-card ⇒ flag)
    soloShare: 0.6,              // one card > this share of a class's contribution ⇒ single-card domination (flag, no move)
    stepPts: 0.5                 // base weight-move magnitude (one nudge); Temperature scales it up
  };
  // The loosenable axes a Temperature can widen (the scored feedsScore bands; Red%/1st% are
  // among them but hard-gated). The accept-gate "heat" is the fraction of THESE a profile
  // loosens — the denominator must be the full set, not the profile's own (sparse) key list.
  var LOOSENABLE_AXES = BANDS.filter(function (b) { return b.feedsScore; }).length;

  /* The POINTS levers a Card exercises, as a structural multiset {leverKey: count} —
     the calibration's read of the pricing structure (mirrors the engine's stepPoints
     shape: `step.<type>`, `tier.<unit>`, `mod` per |mod| point, `flag.<name>`). Counting
     occurrences is a different fact from PRICING them (that stays the engine's one weight
     table), so this is not a second copy of POINTS. capabilityClasses = its keys;
     leverExposure = its count-weighted sum over a deck. */
  function cardLevers(card) {
    var out = {}, steps = (card && Array.isArray(card.steps)) ? card.steps : [];
    steps.forEach(function (st) {
      if (!st || !st.type) return;
      out['step.' + st.type] = (out['step.' + st.type] || 0) + 1;
      if (st.unit) out['tier.' + st.unit] = (out['tier.' + st.unit] || 0) + 1;
      if (st.mod) out.mod = (out.mod || 0) + Math.abs(st.mod);
      if (st.tieSpare) out['flag.tieSpare'] = (out['flag.tieSpare'] || 0) + 1;
      if (st.noAdvance) out['flag.noAdvance'] = (out['flag.noAdvance'] || 0) + 1;
      if (st.anywhere) out['flag.anywhere'] = (out['flag.anywhere'] || 0) + 1;
    });
    return out;
  }

  /* Classify ONE Card from its measured `resid` + phase-conditioned decline octiles.
       Dominant          — out-wins its price share (resid ≥ +CALIB.resid) and players keep
                           reaching for it (decline-rate < declineHigh).
       Strictly-Dominated — under-delivers or unpriced-thin AND heavily declined EVEN in a
                           LATE octile (passed over even when its timing should be right).
       Weakly-Dominated  — under-delivers but declined only EARLY (held-value / timing —
                           the ADR-0002 blind spot; correctly priced, just saved), or
                           mispriced-negative without being shunned.
       null              — no trustworthy signal.
     octiles = the 8-count phase array (cardDeclineByOctile); absent ⇒ can't see "late",
     so a resid-negative card is Weakly (conservative — never a redesign flag on thin data). */
  function classifyCard(row, declineRate, octiles) {
    declineRate = declineRate || 0;
    var lateDeclined = !!(octiles && octiles.slice(4).some(function (n) { return n > 0; }));
    var resid = row ? row.resid : null;
    if (resid != null && resid >= CALIB.resid && declineRate < CALIB.declineHigh) return 'Dominant';
    var shunned = declineRate >= CALIB.declineHigh;
    if ((resid != null && resid <= -CALIB.resid) || shunned) {
      return (shunned && lateDeclined) ? 'Strictly-Dominated' : 'Weakly-Dominated';
    }
    return null;
  }

  /* Contribution-weighted capability-class signal over the classified cards. ONLY the
     trustworthy classes feed it — Dominant and Strictly-Dominated. Weakly-Dominated cards
     are EXCLUDED: their negative resid is a known held-value / timing artifact (ADR-0002),
     so folding it back into a shared move would reintroduce the very confound the class
     quarantines. Each contributing card adds its `resid` to every POINTS lever it exercises,
     weighted by its decisive-win contribution (hqWins, matching resid's basis; falls back to
     plays). Returns {lever: {weightedResid, contrib, cards, topShare}} where topShare is one
     card's share of the SIGNAL (Σ|w·resid|), not of head-count — a lone high-resid card
     dominates the signal even with few decisive wins, and the single-card guard must see that. */
  function capabilityClassSignal(classified) {
    var acc = {};
    (classified || []).forEach(function (c) {
      if (c.class !== 'Dominant' && c.class !== 'Strictly-Dominated') return;   // Weakly excluded (timing artifact)
      if (c.resid == null) return;
      var w = c.hqWins || c.plays || 0; if (w <= 0) return;
      Object.keys(c.levers).forEach(function (lever) {
        var a = acc[lever] || (acc[lever] = { wResid: 0, contrib: 0, cards: 0, absSig: 0, topAbs: 0 });
        var sig = Math.abs(w * c.resid);
        a.wResid += w * c.resid; a.contrib += w; a.cards++;
        a.absSig += sig; if (sig > a.topAbs) a.topAbs = sig;
      });
    });
    var out = {};
    Object.keys(acc).forEach(function (lever) {
      var a = acc[lever];
      out[lever] = { weightedResid: a.contrib ? a.wResid / a.contrib : 0, contrib: a.contrib,
        cards: a.cards, topShare: a.absSig ? a.topAbs / a.absSig : 1 };
    });
    return out;
  }

  /* Count-weighted occurrences of a lever across a deck (deck.cards[].count × cardLevers). */
  function leverExposure(deck, lever) {
    return ((deck && deck.cards) || []).reduce(function (s, c) {
      return s + (cardLevers(c)[lever] || 0) * (c.count == null ? 1 : c.count);
    }, 0);
  }
  /* Max positive Δ a lever's weight can take before the TIGHTEST deck hits `cap` (the one
     hard gate). deckPointsFn is the engine's E.deckPoints (kept engine-global-free). Infinity
     when no deck exposes the lever; never negative (a maxed deck yields 0 headroom).
     ponytail: exact only while POINTS.combo === 1.0 (deckPoints linear in each step weight).
     A non-unit combo makes cardPoints = Σstep · nSteps^(combo−1) nonlinear in a lever's
     weight — revisit this headroom (and the cap clamp it feeds) before tuning combo off 1.0. */
  function pointsHeadroom(decks, lever, deckPointsFn, cap) {
    var h = Infinity;
    (decks || []).forEach(function (d) {
      var ex = leverExposure(d, lever); if (!ex) return;
      var room = (cap - deckPointsFn(d)) / ex;
      if (room < h) h = room;
    });
    return h === Infinity ? Infinity : Math.max(0, h);
  }

  /* Accept gate — SOFT velocity + direction within a Temperature (#109). Direction is the
     signal's sign; magnitude is one nudge (CALIB.stepPts) scaled up by the profile's "heat"
     (fraction of loosened, non-hold tolerances) — a broadly-loosened Exploration temperature
     steps bigger. Soft by construction: it only sizes a move, it never rejects (the cap does
     that). null temperature ⇒ heat 0 ⇒ one nudge. Returns the signed magnitude. */
  function acceptMove(dir, temperature) {
    var tol = (temperature && temperature.tolerances) || {};
    // Profiles are SPARSE (holds omitted), so "heat" = loosened axes / all loosenable axes,
    // NOT / the profile's own key count (that would read 1.0 for every real profile).
    var loosened = Object.keys(tol).filter(function (k) { return tol[k] && tol[k] !== 'hold'; }).length;
    var heat = LOOSENABLE_AXES ? loosened / LOOSENABLE_AXES : 0;
    var mag = CALIB.stepPts * (1 + heat);
    return (dir >= 0 ? 1 : -1) * mag;
  }

  /* The calibration pass. Inputs (all measured, engine-global-free):
       rows        — cardRows(...) output (carries resid / hqWins / plays per card)
       aggById     — cardAggFromEnvelopes(...) (carries declines / appears per card)
       octilesById — {cardId: 8-count phase array} (folded cardDeclineByOctile), optional
       cardsById   — {cardId: card} (for cardLevers); defaults to deriving from rows if absent
       temperature — a #109 profile (soft velocity + direction), optional
       capHeadroom — fn(lever) → max positive Δ before the cap (from pointsHeadroom), optional
       weightOf    — fn(lever) → the lever's current POINTS weight, so a `lower` move floors at
                     weight 0 (a negative weight is nonsensical); optional
       veto        — fn(lever, move) → truthy DROPS the move (LLM feels-pass; applied AFTER
                     the math so taste can stop a move but never feeds the signal)
     Returns { classes, redesignFlags, signal, moves }. A move is proposed only for a lever
     with a consistent shared signal (|weightedResid| ≥ CALIB.classSignal, ≥ minClassCards,
     no single card > soloShare of the signal). A Dominant/Strictly-Dominated card raises a
     REDESIGN flag ONLY when NO shared move covers it — single-card domination the class
     signal can't move (prune the card); cards that co-drive a class move are handled by the
     move, not flagged. Positive moves clamp to cap headroom; lower moves floor at weight 0. */
  function calibratePoints(opts) {
    opts = opts || {};
    var rows = opts.rows || [], aggById = opts.aggById || {}, octilesById = opts.octilesById || {};
    var cardsById = opts.cardsById || {};
    var classes = rows.map(function (r) {
      var a = aggById[r.id] || {};
      var declineRate = a.appears ? a.declines / a.appears : 0;
      var card = cardsById[r.id] || { steps: r.steps };
      return { id: r.id, name: r.name, resid: r.resid, hqWins: r.hqWins, plays: r.plays,
        declineRate: +declineRate.toFixed(3), levers: cardLevers(card),
        class: classifyCard(r, declineRate, octilesById[r.id]) };
    });
    var signal = capabilityClassSignal(classes);
    var moves = [];
    Object.keys(signal).forEach(function (lever) {
      var s = signal[lever];
      if (Math.abs(s.weightedResid) < CALIB.classSignal) return;      // not a strong enough class lean
      if (s.cards < CALIB.minClassCards || s.topShare > CALIB.soloShare) return; // single-card domination ⇒ flag only
      // resid > 0 = class UNDER-priced (out-wins its price) ⇒ raise the weight; resid < 0 ⇒ lower it.
      var delta = acceptMove(s.weightedResid > 0 ? 1 : -1, opts.temperature);
      if (delta > 0 && opts.capHeadroom) {
        var room = opts.capHeadroom(lever);
        if (room <= 0) return;                                        // no cap headroom ⇒ no move (hard gate)
        if (delta > room) delta = room;                               // clamp positive move to the tightest deck (exact, never rounds over the cap)
      }
      if (delta < 0 && opts.weightOf) {
        var floor = -opts.weightOf(lever);                            // most we can lower before weight hits 0
        if (delta < floor) delta = floor;
        if (delta >= 0) return;                                       // already at/over 0 ⇒ no lower move
      }
      moves.push({ lever: lever, delta: delta, weightedResid: +s.weightedResid.toFixed(2),
        cards: s.cards, direction: delta >= 0 ? 'raise' : 'lower' });
    });
    if (opts.veto) moves = moves.filter(function (m) { return !opts.veto(m.lever, m); });
    // Redesign flags: a Dominant/Strictly-Dominated card whose imbalance NO shared move covers.
    var moved = {}; moves.forEach(function (m) { moved[m.lever] = true; });
    var redesignFlags = classes.filter(function (c) {
      if (c.class !== 'Dominant' && c.class !== 'Strictly-Dominated') return false;
      return !Object.keys(c.levers).some(function (lever) { return moved[lever]; });   // uncovered by any class move
    }).map(function (c) {
      return { id: c.id, name: c.name, class: c.class, resid: c.resid, declineRate: c.declineRate,
        reason: 'single-card ' + c.class.toLowerCase() + ', not covered by a shared class move — redesign the card, not the price' };
    });
    return { classes: classes, redesignFlags: redesignFlags, signal: signal, moves: moves };
  }

  /* The axis-worthy card Win%: sliced to HQ-capture endings × non-simple plays only
     (pooled Win% stays off print and off the quadrant axis — see the doctrine in
     docs/report-model.md#reporting-doctrine). Returns {cardId:{plays,wins}}; pct() at
     the call site (0-play reads null), and callers apply the small-n rule to `plays`
     — this slice is thin by construction. */
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

  /* One run's per-card view: parse this run's DB rows into envelopes once, then
     combine the two per-card folds above into ONE row per card, keyed by id.
     cardRows is reused UNMODIFIED (its pooled Win% dropped here — the axis-worthy
     number is the HQ slice); winHq is null when the card was never played in a
     non-simple HQ-capture ending this run (excluded from the quadrant, not a
     fabricated 0). envs is exposed alongside — the fire-time strips fold the raw
     envelopes, not the per-card agg. Takes the card list as a param (like cardRows)
     so it stays engine-global-free. */
  function cardRunView(rows, cards) {
    var envs = (rows || []).map(envelopeFromRow).filter(function (e) { return !!e; });
    var agg = cardAggFromEnvelopes(envs);
    var slice = cardHqWinSlice(envs);
    var byId = {};
    cardRows(agg, cards).forEach(function (r) {
      var s = slice[r.id];
      byId[r.id] = { id: r.id, name: r.name, plays: r.plays, sight: r.sight, simple: r.simple,
        noop: r.noop, seenNum: r.seenNum,
        winHq: (s && s.plays) ? pct(s.wins, s.plays) : null, winHqN: s ? s.plays : 0 };
    });
    return { byId: byId, envs: envs };
  }

  /* Fleet-wide "when cards fire" quartiles: cardPlayTurnQuartiles answers "at what
     normalized time did this card fire in ONE skirmish"; this pools each skirmish's
     MEDIAN across a run's envelopes and re-quantiles that pooled array with the SAME
     quantile() — no new quantile math, one level up (per-skirmish -> fleet).
     Returns {cardId: {q1, median, q3}}. */
  function cardFleetFireTimes(envs) {
    var byCard = {};
    (envs || []).forEach(function (env) {
      var q = cardPlayTurnQuartiles(env);
      Object.keys(q).forEach(function (id) { (byCard[id] || (byCard[id] = [])).push(q[id].median); });
    });
    var out = {};
    Object.keys(byCard).forEach(function (id) {
      var arr = byCard[id].sort(function (a, b) { return a - b; });
      out[id] = { q1: quantile(arr, 0.25), median: quantile(arr, 0.5), q3: quantile(arr, 0.75) };
    });
    return out;
  }

  /* Per unit type, per skirmish FIELDED: normalized median deploy turn, roleY
     (attacks vs absorbed), breakthrough (absorbed/fielded), exchange (kills/deaths),
     median lifespan. One fold, every Units-tab chart reads it. Lifespan is a per-type
     FIFO pairing of dep[]->dieT[] with survivors right-censored, and the small-n /
     legacy-greying rules: docs/report-model.md#unit-lifespan-pairing-is-fifo. */
  function unitsAggFromEnvelopes(envs) {
    var out = {}, sawUnits = false, sawDieT = false;
    (envs || []).forEach(function (env) {
      var u = unitsOf(env), turns = turnsOf(env) || 1;
      Object.keys(u).forEach(function (t) {
        sawUnits = true;
        var ut = u[t] || {};
        var o = out[t] || (out[t] = { atk: 0, abs: 0, kill: 0, die: 0, skirmishesFielded: 0, depNorm: [], lifespans: [] });
        var dep = (ut.dep || []).slice().sort(function (a, b) { return a - b; });
        if (dep.length) { o.skirmishesFielded++; dep.forEach(function (tn) { o.depNorm.push(tn / turns); }); }
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
        n: o.skirmishesFielded, atk: o.atk, abs: o.abs, kill: o.kill, die: o.die,
        depMedian: dep.length ? quantile(dep, 0.5) : null,
        roleY: (o.atk + o.abs) ? 100 * o.atk / (o.atk + o.abs) : null,
        breakthrough: o.skirmishesFielded ? o.abs / o.skirmishesFielded : null,
        exchange: o.die ? o.kill / o.die : null,
        lifespan: life.length ? quantile(life, 0.5) : null, lifespanN: life.length
      };
    });
    return { types: types, hasUnits: sawUnits, hasDieT: sawDieT };
  }

  // A run's skirmish rows -> per-unit-type agg: parse each row to an envelope
  // (dropping rows that don't parse), then hand them to the ONE fold above.
  // The Units pane's per-run input (mirrors cardAggFromEnvelopes' role for
  // Cards). Pure, node + browser.
  function unitsAggFromRows(rows) {
    var envs = (rows || []).map(envelopeFromRow).filter(function (e) { return !!e; });
    return unitsAggFromEnvelopes(envs);
  }

  /* The full saved-report markdown. dev/balance-report.js and the dashboard's
     Save-report button are two callers of THIS one renderer; the model
     parameterizes exactly what differs between them:
       title    text after '# Balance report — ' (br: '<diff> AI';
                dash: '<n> skirmishes/map, <ai label>')
       version  rules version for the meta line
       metaTail meta-line text after '<k> map(s) · ' — skirmish totals +
                accumulation note + '±x pts/map · dev/balance-report.js' for
                the CLI, '±x points at this n · from the in-browser Balance
                Dashboard' for the dashboard
       rows     [{name, shape, agg, done, notes:[..], score?}] in table order
       G        foldGlobal totals (G.cards feeds the card table)
       cards    E.CARDS (card-table row order before the 1stSight sort)
       style    'report' (canonical file report: Balance column + footnote,
                '## Overall' + Behaviour/decisiveness prose, '## Cards (N
                skirmishes)', 'Plays') or 'dashboard' (no score column,
                '## Overall (n=N skirmishes)' + Victory/Aggression bullets,
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
    // Atk%/Swp% are SHARES of all actions (deck-size-proof); Tie%/Drag are
    // conditioned to attrition endings (a.attritionEndings), not `done`.
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
      L.push('_Balance column: weighted distance outside each metric\'s ideal range (0 = ideal, lower = better) — Red/1st 45–55, HQ 10–40, 0kill ≤5, Tie ≤18, Drag ≤3.0, Swings ≥2.0, Control ≥70. Tie%/Drag over attrition endings only (rules 1.2). SOT: docs/balance/best-map-score.md._');
      L.push('');
      L.push('## Overall');
      L.push('');
      L.push('- red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) + '% · HQ captures ' +
        pct(G.hq, G.games) + '% · avg skirmish ' + f1(G.turns / G.games) + ' turns');
      L.push('- Behaviour: ' + pct(G.attacks, actionTotal(G)) + '% attacks & ' + pct(G.swaps, actionTotal(G)) + '% swaps of all actions · zero-kill ' +
        pct(G.zeroKill, G.games) + '% · ' + Math.round(100 * G.depShare / G.games) + '% of units ever fielded');
      L.push('- Reserves at end (HQ endings only' + smallNote(G.hqEndings) + '): red ' + hqReservePct(G.resEndRedHQ, G.hqEndings) + ' · blue ' +
        hqReservePct(G.resEndBlueHQ, G.hqEndings) + ' of that side\'s pieces still undeployed at the HQ capture (high = a rush before commit)');
      L.push('- Decisiveness: tie-goes-to-2nd decided ' + pct(G.tiebreak, G.attritionEndings) + '% of attrition endings · first blood won ' +
        pct(G.fbWins, G.fbGames) + '% of the ' + pct(G.fbGames, G.games) + '% of skirmishes with a kill · more-hexes side won ' + pct(G.ctlWins, G.ctlGames) + '%');
      L.push('- Pacing: ' + f1(G.attritionKillTail / Math.max(1, G.attritionEndings)) + ' kill-less turns before end, attrition endings (0=decisive, ~32=circling) · ' +
        f1(G.leadChanges / G.games) + ' lead swings/skirmish (higher = more back-and-forth)');
      L.push('');
      L.push('## Cards (' + G.games + ' skirmishes)');
    } else {
      L.push('## Overall (n=' + G.games + ' skirmishes)');
      L.push('');
      L.push('- Victory: red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) +
        '% · HQ captures ' + pct(G.hq, G.games) + '% · avg ' + f1(G.turns / mx) + ' turns');
      L.push('- Aggression: ' + pct(G.attacks, actionTotal(G)) + '% attacks & ' + pct(G.swaps, actionTotal(G)) + '% swaps of all actions · ' +
        Math.round(100 * G.depShare / mx) + '% of units fielded · zero-kill ' + pct(G.zeroKill, G.games) + '%');
      L.push('- Reserves at end (HQ endings only' + smallNote(G.hqEndings) + '): red ' + hqReservePct(G.resEndRedHQ, G.hqEndings) + ' · blue ' +
        hqReservePct(G.resEndBlueHQ, G.hqEndings) + ' of pieces still undeployed at the HQ capture');
      L.push('- Decisiveness: tie→2nd ' + pct(G.tiebreak, G.attritionEndings) + '% of attrition endings · first blood converts ' +
        pct(G.fbWins, G.fbGames) + '% · board leader wins ' + pct(G.ctlWins, G.ctlGames) + '%');
      L.push('- Pacing: ' + f1(G.attritionKillTail / Math.max(1, G.attritionEndings)) + ' kill-less turns before end (attrition) · ' + f1(G.leadChanges / mx) + ' lead swings/skirmish');
      L.push('');
      L.push('## Card report');
    }
    L.push('');
    // Noop% printed (dead-turn check); Win% deliberately omitted — docs/report-model.md#reporting-doctrine.
    // WOA #57: Pts (army-points cost) + Resid (mispricing residual) print when cardPoints is supplied.
    var withPts = !!model.cardPoints, flagged = false;
    L.push('| Card | Simple% | Noop% | 1stSight% | AvgSeen | ' + (style === 'report' ? 'Plays' : 'plays') +
      (withPts ? ' | Pts | Resid' : '') + ' |');
    L.push('|---|--:|--:|--:|--:|--:|' + (withPts ? '--:|--:|' : ''));
    cardRows(G.cards, model.cards, model.cardPoints).forEach(function (r) {
      var tail = '';
      if (withPts) {
        var resid = r.resid == null ? '-' : (r.resid > 0 ? '+' : '') + f1(r.resid) + (r.mispriced ? ' ⚠' : '');
        if (r.mispriced) flagged = true;
        tail = ' | ' + f1(r.points) + ' | ' + resid;
      }
      L.push('| ' + r.name + ' | ' + r.simple + ' | ' + r.noop + ' | ' + r.sight + ' | ' + r.seen + ' | ' + r.plays + tail + ' |');
    });
    L.push('');
    if (withPts) {
      L.push('_Pts: army-points cost (ADR-0002). Resid: the Card\'s share of decisive wins − its share of the points budget, in points (+ out-wins its cost, − costs more than it delivers). ⚠ = |Resid| ≥ ' +
        f1(MISPRICE_RESID_PTS) + ' — a **soft** mispricing flag, never a gate. Two confounds: a held-value Card (a saved attack buff) wins off-slice and can read − without being weak, and Resid is exposure-weighted so a draw-frequency gap can masquerade as price. Signal is the thin HQ-capture × printed-play slice (Cards under ' +
        MISPRICE_MIN_HQPLAYS + ' such plays show \'-\'); read at scale.' +
        (flagged ? '' : ' None flagged this run.') + '_');
      L.push('');
    }
    // Obsidian-style tag footer so reports are findable by kind + rules version
    L.push('#reports #balance #v' + String(model.version).replace(/\./g, '-'));
    L.push('');
    return L.join('\n');
  }

  /* ===== Per-hex lenses =====
     Three spatial reads from the trace's `h` stream (the 'q,r' hex each play acts on)
     -> { plays, turns, hexes: { 'q,r': { occ, flips, kills } } }. deploy/march take
     the hex (flip if it was the other player's); attack with k>0 flips + adds kills;
     swap is a touch only. occ = held-turns / plays; only touched hexes appear.
     Best-effort reconstruction — the trace has no march origin/outcome/HQ positions;
     the bounded approximations (lingering origins, own-death in k, HQ exemption) are
     in docs/report-model.md#spatial-reconstruction-hexlenses-is-best-effort. */
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

  /* Classification thresholds — the ONE place they live (dead hex = <5% occupancy;
     avenue of attack = flips in the top quartile of the flip distribution). */
  var HEX_DEAD_OCC = 0.05, HEX_AVENUE_Q = 0.75;

  /* Fold many skirmishes' hexLenses into per-hex AVERAGES + the classification:
     occ averaged across skirmishes ("% of turns held"), flips &
     kills as per-SKIRMISH rates, dead = avg occupancy < 5%, avenue-of-attack =
     avg flips in the top quartile of the (>0) flip distribution. envs =
     envelopes (envelopeFromRow output); charts.js folds one run's skirmishes for
     one map, per the A|B toggle. Returns
       { n, avenueThresh, hexes: { 'q,r': { occ, flips, kills, dead, avenue } } }.
     n=0 -> empty hexes (caller renders "no skirmishes"). */
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

  /* ===== cross-skirmish drill-down folds (Maps pane) =====
     Combine many per-skirmish envelopes into one map's chart data. The
     per-skirmish primitives (envelopeFromRow / actionOctileLanes / vpDiffTrack)
     are above; these fold them ACROSS a map's skirmishes. Pure, node + browser. */

  // One map's parsed envelopes from a run's rows (skips rows that don't parse).
  function envelopesForMap(rows, mapName) {
    return (rows || []).filter(function (r) { return r.map === mapName; })
      .map(envelopeFromRow).filter(function (e) { return !!e; });
  }

  // Average each octile lane across skirmishes, per lane. null when there are no
  // envelopes, so callers render "no skirmishes" instead of a flat zero lane.
  var DRILL_LANES = ['deploy', 'attack', 'swap', 'march'];
  function laneAvg(envs) {
    if (!envs.length) return null;
    var sums = {};
    DRILL_LANES.forEach(function (a) { sums[a] = [0, 0, 0, 0, 0, 0, 0, 0]; });
    envs.forEach(function (env) {
      actionOctileLanes(env).forEach(function (row, oi) {
        DRILL_LANES.forEach(function (a) { sums[a][oi] += row[a]; });
      });
    });
    var out = {};
    DRILL_LANES.forEach(function (a) { out[a] = sums[a].map(function (v) { return v / envs.length; }); });
    return out;
  }

  // Resample each skirmish's |VP-diff| track (per-turn, so different lengths
  // can't be averaged index-for-index) onto steps+1 evenly-spaced points over
  // normalized skirmish time (linear interpolation), then average across
  // skirmishes. Envelopes with no fs are skipped, not zeroed; {points, n, total}
  // tells the caller how many carried fs. null only when NOT ONE envelope has fs.
  function vpDiffAvg(envs, steps) {
    steps = steps || 8;
    var tracks = envs.map(function (env) { var vd = vpDiffTrack(env); return vd && vd.track; }).filter(function (t) { return !!t && t.length; });
    if (!tracks.length) return null;
    var points = [];
    for (var s = 0; s <= steps; s++) {
      var frac = s / steps, sum = 0;
      tracks.forEach(function (tr) {
        var pos = frac * (tr.length - 1), lo = Math.floor(pos), hi = Math.min(tr.length - 1, lo + 1), f = pos - lo;
        sum += tr[lo] + (tr[hi] - tr[lo]) * f;
      });
      points.push(sum / tracks.length);
    }
    return { points: points, n: tracks.length, total: envs.length };
  }

  /* One balance-score dumbbell per map seen in EITHER run's skirmish rows: fold
     each map's rows per run through the SAME
     foldSkirmishes/balanceScore the fleet-wide totals use. score is null for a
     map a run never played; done is that run's skirmish count for the map.
     Sorted worst-first on B (B's score if it has one, else A's, else last) so
     the regression lands at the top. Pure cross-skirmish fold, node + browser. */
  function mapScoreDumbbells(rowsA, rowsB) {
    var byMapA = {}, byMapB = {};
    (rowsA || []).forEach(function (r) { (byMapA[r.map] || (byMapA[r.map] = [])).push(r); });
    (rowsB || []).forEach(function (r) { (byMapB[r.map] || (byMapB[r.map] = [])).push(r); });
    var names = {};
    Object.keys(byMapA).forEach(function (m) { names[m] = 1; });
    Object.keys(byMapB).forEach(function (m) { names[m] = 1; });
    var rows = Object.keys(names).map(function (m) {
      var gA = byMapA[m] ? foldSkirmishes(byMapA[m]) : null;
      var gB = byMapB[m] ? foldSkirmishes(byMapB[m]) : null;
      return {
        map: m, doneA: gA ? gA.done : 0, doneB: gB ? gB.done : 0,
        scoreA: gA ? balanceScore(gA.agg, gA.done) : null,
        scoreB: gB ? balanceScore(gB.agg, gB.done) : null
      };
    });
    rows.sort(function (a, b) {
      var av = a.scoreB != null ? a.scoreB : (a.scoreA != null ? a.scoreA : -1);
      var bv = b.scoreB != null ? b.scoreB : (b.scoreA != null ? b.scoreA : -1);
      return bv - av;
    });
    return rows;
  }

  return { pct: pct, f1: f1, actionTotal: actionTotal, balanceScore: balanceScore, mapNotes: mapNotes,
    addAgg: addAgg, foldGlobal: foldGlobal, cardRows: cardRows, reportMarkdown: reportMarkdown,
    MISPRICE_RESID_PTS: MISPRICE_RESID_PTS, MISPRICE_MIN_HQPLAYS: MISPRICE_MIN_HQPLAYS,
    // bands-as-data + trace folds (node + browser both consume)
    BANDS: BANDS, bands: bands, RANGES: RANGES, outBand: outBand, quantile: quantile,
    firstContactTurn: firstContactTurn, deployInterleave: deployInterleave, settlePoint: settlePoint,
    actionOctileLanes: actionOctileLanes, vpDiffTrack: vpDiffTrack, cardPlayTurnQuartiles: cardPlayTurnQuartiles,
    // Maps pane: cross-skirmish drill-down folds (one map, many skirmishes)
    envelopesForMap: envelopesForMap, laneAvg: laneAvg, vpDiffAvg: vpDiffAvg,
    // Overview pane: per-map balance-score dumbbell fold (1f)
    mapScoreDumbbells: mapScoreDumbbells,
    // per-card DB-rows aggregate (cardRows-compatible) + the Win% doctrine slice
    cardAggFromEnvelopes: cardAggFromEnvelopes, cardHqWinSlice: cardHqWinSlice, cardDeclineByOctile: cardDeclineByOctile,
    // Army-points calibration pass (#82/#114): classify → contribution-weighted class signal → cap-safe shared-weight moves
    CALIB: CALIB, cardLevers: cardLevers, classifyCard: classifyCard, capabilityClassSignal: capabilityClassSignal,
    leverExposure: leverExposure, pointsHeadroom: pointsHeadroom, acceptMove: acceptMove, calibratePoints: calibratePoints,
    // Cards pane: per-run per-card view + fleet-wide fire-time quartiles (many skirmishes)
    cardRunView: cardRunView, cardFleetFireTimes: cardFleetFireTimes,
    // per-unit-type aggregate (role map / breakthrough / lifespan / exchange)
    unitsAggFromEnvelopes: unitsAggFromEnvelopes, unitsAggFromRows: unitsAggFromRows,
    // per-hex lenses (drill-down) + dead/avenue thresholds
    hexLenses: hexLenses, foldHexLenses: foldHexLenses, HEX_DEAD_OCC: HEX_DEAD_OCC, HEX_AVENUE_Q: HEX_AVENUE_Q,
    // small-n rule + DB-rows-as-agg fold (Overview)
    bandN: bandN, SMALL_N: SMALL_N, smallN: smallN, foldSkirmishes: foldSkirmishes, envelopeFromRow: envelopeFromRow };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_REPORT;
