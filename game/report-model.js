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
   - balanceScore(agg, done)   balance-quality score, LOWER = better
   - mapNotes(agg, done)       health-flag strings for one map's aggregate
                               (the '**best balance**' marker is the caller's)
   - addAgg(dst, src)          fold one balanceMap aggregate into another
   - foldGlobal(rows)          [{agg, done}] -> G totals (incl. G.cards)
   - cardRows(cardAgg, cards)  derived card-table rows, 1stSight% desc
   - reportMarkdown(model)     the full saved-report markdown document */

var WOA_REPORT = (function () {

  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }

  /* Balance-quality score (LOWER = better / more playable). Rewards fairness
     (red% & first-mover% near 50) and tension (lead swings), penalises
     degenerate play (zero-kill stalemates, tie-goes-to-2nd deciding it, long
     kill-less drag). Per Bill's Round-4 note, an attrition-only map is NOT
     penalised — a map where the lead changed hands right up to the end is a
     good map. */
  function balanceScore(agg, done) {
    var red = pct(agg.redWins, done), first = pct(agg.firstWins, done), zk = pct(agg.zeroKill, done),
      tie = pct(agg.tiebreak, done), swings = agg.leadChanges / Math.max(1, done), drag = agg.killTail / Math.max(1, done);
    return Math.abs(red - 50) + Math.abs(first - 50) + zk * 0.6 + tie * 0.3 + drag * 0.4 - swings * 3;
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
    var G = { red: 0, first: 0, hq: 0, games: 0, turns: 0, attacks: 0, swaps: 0, zeroKill: 0, tiebreak: 0,
      fbWins: 0, fbGames: 0, ctlWins: 0, ctlGames: 0, depShare: 0, killTail: 0, leadChanges: 0, cards: {} };
    rows.forEach(function (x) {
      var a = x.agg;
      G.red += a.redWins; G.first += a.firstWins; G.hq += a.hqWins; G.games += x.done; G.turns += a.turns;
      G.attacks += a.attacks; G.swaps += a.swaps; G.zeroKill += a.zeroKill; G.tiebreak += a.tiebreak;
      G.fbWins += a.firstBloodWins; G.fbGames += a.firstBloodGames;
      G.ctlWins += a.controlWins; G.ctlGames += a.controlGames; G.depShare += a.deployedShare;
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
    L.push('| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk | Swp | 0kill% | Tie% | Drag | Swings | ' +
      (scoreCol ? 'Balance | ' : '') + 'Notes |');
    L.push('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|' + (scoreCol ? '--:|' : '') + '---|');
    model.rows.forEach(function (x) {
      var a = x.agg, done = x.done;
      L.push('| ' + x.name + ' | ' + x.shape + ' | ' + pct(a.redWins, done) + ' | ' + pct(a.firstWins, done) +
        ' | ' + pct(a.hqWins, done) + ' | ' + f1(a.turns / done) + ' | ' + f1(a.vpDiff / done) + ' | ' + f1(a.attacks / done) +
        ' | ' + f1(a.swaps / done) + ' | ' + pct(a.zeroKill, done) + ' | ' + pct(a.tiebreak, done) +
        ' | ' + f1((a.killTail || 0) / done) + ' | ' + f1((a.leadChanges || 0) / done) +
        (scoreCol ? ' | ' + f1(x.score) : '') + ' | ' + x.notes.join(', ') + ' |');
    });
    L.push('');
    if (style === 'report') {
      L.push('_Balance column: lower = fairer + more back-and-forth (|red−50| + |1st−50| + penalties for zero-kill/tie-decided/drag, minus a reward for lead swings). Heuristic — Bill decides._');
      L.push('');
      L.push('## Overall');
      L.push('');
      L.push('- red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) + '% · HQ captures ' +
        pct(G.hq, G.games) + '% · avg battle ' + f1(G.turns / G.games) + ' turns');
      L.push('- Behaviour: ' + f1(G.attacks / G.games) + ' attacks & ' + f1(G.swaps / G.games) + ' swaps/battle · zero-kill ' +
        pct(G.zeroKill, G.games) + '% · ' + Math.round(100 * G.depShare / G.games) + '% of units ever fielded');
      L.push('- Decisiveness: tie-goes-to-2nd decided ' + pct(G.tiebreak, G.games) + '% · first blood won ' +
        pct(G.fbWins, G.fbGames) + '% of the ' + pct(G.fbGames, G.games) + '% of battles with a kill · more-hexes side won ' + pct(G.ctlWins, G.ctlGames) + '%');
      L.push('- Pacing: ' + f1(G.killTail / G.games) + ' kill-less turns before end (0=decisive, ~32=circling) · ' +
        f1(G.leadChanges / G.games) + ' lead swings/battle (higher = more back-and-forth)');
      L.push('');
      L.push('## Cards (' + G.games + ' battles)');
    } else {
      L.push('## Overall (n=' + G.games + ' battles)');
      L.push('');
      L.push('- Victory: red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) +
        '% · HQ captures ' + pct(G.hq, G.games) + '% · avg ' + f1(G.turns / mx) + ' turns');
      L.push('- Aggression: ' + f1(G.attacks / mx) + ' attacks & ' + f1(G.swaps / mx) + ' swaps/battle · ' +
        Math.round(100 * G.depShare / mx) + '% of units fielded · zero-kill ' + pct(G.zeroKill, G.games) + '%');
      L.push('- Decisiveness: tie→2nd ' + pct(G.tiebreak, G.games) + '% · first blood converts ' +
        pct(G.fbWins, G.fbGames) + '% · board leader wins ' + pct(G.ctlWins, G.ctlGames) + '%');
      L.push('- Pacing: ' + f1(G.killTail / mx) + ' kill-less turns before end · ' + f1(G.leadChanges / mx) + ' lead swings/battle');
      L.push('');
      L.push('## Card report');
    }
    L.push('');
    // Noop% restored July 2026 (rules 1.0): new multi-step cards are where dead
    // turns reappear, and the rubric's dead-card check needs a printed number.
    L.push('| Card | Win% | Simple% | Noop% | 1stSight% | AvgSeen | ' + (style === 'report' ? 'Plays' : 'plays') + ' |');
    L.push('|---|--:|--:|--:|--:|--:|--:|');
    cardRows(G.cards, model.cards).forEach(function (r) {
      L.push('| ' + r.name + ' | ' + r.win + ' | ' + r.simple + ' | ' + r.noop + ' | ' + r.sight + ' | ' + r.seen + ' | ' + r.plays + ' |');
    });
    L.push('');
    // Obsidian-style tag footer so reports are findable by kind + rules version
    L.push('#reports #balance #v' + String(model.version).replace(/\./g, '-'));
    L.push('');
    return L.join('\n');
  }

  return { pct: pct, f1: f1, balanceScore: balanceScore, mapNotes: mapNotes,
    addAgg: addAgg, foldGlobal: foldGlobal, cardRows: cardRows, reportMarkdown: reportMarkdown };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_REPORT;
