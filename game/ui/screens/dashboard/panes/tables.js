/* War of Attrition — dashboard pane: TABLES, the run-loop view. The full
   dev/balance.js report in the browser, plus the Run/Save controls the other
   panes do not have (declared as this pane's `chrome`, so the shell shows and
   hides them). Aggregation is WOA_SIM.balanceNew/balanceAdd — the SAME fold the
   CLI runs — so a run here reproduces the terminal's numbers exactly. */
'use strict';

var dpct = WOA_REPORT.pct;

function dashSort(rows, key, dir){
  return rows.slice().sort(function(a, b){
    var av = a[key], bv = b[key];
    if (typeof av === 'string') return dir * av.localeCompare(bv);
    return dir * (av - bv);
  });
}
function dbar(redPct, cls){
  return '<span class="dbar"><i class="'+(cls||'red')+'" style="width:'+redPct+'%"></i><i class="'+(cls?'':'blue')+'" style="width:'+(100-redPct)+'%"></i></span>';
}
// column tooltips: what each stat means + its healthy target
var MAP_TIPS = {
  name:'Map name', shape:'Board shape (custom = a carved outline)',
  red:'Red win rate. 50% = balanced; ≥62% or ≤38% flags a side bias (±noise at this n)',
  first:'First-mover win rate. Target ~46-50%; ≥62% / ≤38% flags a turn-order bias',
  hq:'Share of skirmishes ending in HQ capture (rest are attrition). ≤8% = attrition-only, ≥55% = HQ-rushable',
  turns:'Average skirmish length in turns (~20 typical)',
  fsdiff:'Average field-score margin of victory — higher = more decisive',
  atk:'Attacks per skirmish. Healthy ~5', swp:'Swaps per skirmish. Healthy ~7',
  zk:'Zero-kill skirmishes. Healthy ~4%; ≥20% flags stalemates',
  tie:'Skirmishes decided by the tie-goes-to-2nd rule — lower is better (10% baseline)',
  drag:'Avg trailing turns with no kill before the game ended. 0 = decisive finish; high = the AIs marched in circles',
  swing:'Avg times the field-score lead flipped to the other side per skirmish. High = real back-and-forth; 0 = wire-to-wire'
};
var CARD_TIPS = {
  name:'Card',
  winPct:'Win rate when played — hugs 50% in attrition games; treat only big deviations',
  simplePct:'Share resolved as a basic attack/reposition — high = the printed action often was not worth it',
  noopPct:'Share of plays that resolved zero actions (dead turns) — should be ~0; above 2% = investigate',
  sightPct:'Share played the first turn it was seen — high + low AvgSeen = always-good on sight (OP watchlist)',
  avgSeen:'Average times in hand before it was played — high = situational/hoarded',
  plays:'Total times played across all skirmishes'
};
function dstat(label, val, tip){ return '<div class="dstat" title="'+tip+'"><span>'+label+'</span><span>'+val+'</span></div>'; }

// the shell dispatcher — chrome (header/pills/temperature) every
// call, then either the Tables pane (the run-loop dashboard, run controls +
// save intact) or one of the view-only panes (Run/Save hidden). Every dash*
// button handler in ui/boot.js keeps calling renderDash() — the entry point
// doesn't move.

function renderDashTables(el){
  if (!DASH.results.length){ el.innerHTML = ''; return; }
  var n = DASH.meta.n;
  var noise = Math.round(100 / Math.sqrt(n));
  var aiLabel = DASH.meta.dr === DASH.meta.db ? DASH.meta.dr + ' AI both sides' : 'red ' + DASH.meta.dr + ' vs blue ' + DASH.meta.db;

  // ---- per-map rows (notes/thresholds from the shared report model) ----
  var rows = DASH.results.map(function(r){
    var o = r.out, done = Math.max(1, n - o.unfinished);
    var notes = WOA_REPORT.mapNotes(o, done);
    return {
      name: r.map.name, shape: (r.map.shapeDef || String(r.map.shape||'').charAt(0)==='@') ? 'custom' : (r.map.shape || '?'), done: done,
      red: dpct(o.redWins, done), first: dpct(o.firstWins, done),
      hq: dpct(o.hqWins, done), turns: +(o.turns/done).toFixed(1), fsdiff: +(o.fsDiff/done).toFixed(1),
      atk: +(o.attacks/done).toFixed(1), swp: +(o.swaps/done).toFixed(1),
      zk: dpct(o.zeroKill, done), tie: dpct(o.tiebreak, done),
      drag: +((o.killTail||0)/done).toFixed(1), swing: +((o.leadChanges||0)/done).toFixed(1),
      notes: notes.join(', ')
    };
  });
  var key = DASH.sort.key, dir = DASH.sort.dir;
  if (key) rows = dashSort(rows, key, dir);
  var cols = [
    ['name','Map'], ['shape','Shape'], ['red','Red%'], ['first','1st%'], ['hq','HQ%'],
    ['turns','Turns'], ['fsdiff','FSdiff'], ['atk','Atk'], ['swp','Swp'], ['zk','0kill%'], ['tie','Tie%'],
    ['drag','Drag'], ['swing','Swings'], [null,'notes']
  ];
  var h = '<h3>Maps &mdash; '+n+' skirmishes each, '+aiLabel+' <span class="small">(&plusmn;'+noise+' points at this n)</span></h3>';
  h += '<table><tr>';
  cols.forEach(function(c){
    if (!c[0]){ h += '<th title="Automated flags derived from the thresholds in this table">'+c[1]+'</th>'; return; }
    h += uiSortableTh(c, key, dir, MAP_TIPS[c[0]], 'data-key');
  });
  h += '<th title="red vs blue win share">R/B</th></tr>';
  rows.forEach(function(r){
    h += '<tr><td style="text-align:left;"><b>'+r.name+'</b></td><td>'+r.shape+'</td>' +
      '<td>'+r.red+'%</td><td>'+r.first+'%</td><td>'+r.hq+'%</td><td>'+r.turns+'</td><td>'+r.fsdiff+'</td>' +
      '<td>'+r.atk+'</td><td>'+r.swp+'</td><td>'+r.zk+'%</td><td>'+r.tie+'%</td>' +
      '<td>'+r.drag+'</td><td>'+r.swing+'</td>' +
      '<td style="text-align:left;" class="dnote">'+(r.notes||'')+'</td><td>'+dbar(r.red)+'</td></tr>';
  });
  h += '</table>';

  // ---- overall + behaviour + decisiveness (the shared foldGlobal — the SAME
  // fold balance.js and balance-report.js run) ----
  var G = WOA_REPORT.foldGlobal(DASH.results.map(function(r){ return { agg: r.out, done: n - r.out.unfinished }; }));
  var mx = Math.max(1, G.games);
  h += '<h3>Overall <span class="small">(n='+G.games+' skirmishes)</span></h3>' +
    '<div class="dstats">' +
      '<div class="dgrp g-vic"><div class="dgrp-h">Victory</div>' +
        dstat('Red wins', '<b>'+dpct(G.red,G.games)+'%</b> '+dbar(dpct(G.red,G.games)), 'Overall red win rate across all maps. 50% = balanced.') +
        dstat('First mover wins', '<b>'+dpct(G.first,G.games)+'%</b> '+dbar(dpct(G.first,G.games),'brass'), 'Win rate of whoever moved first. Target ~46-50%.') +
        dstat('HQ captures', '<b>'+dpct(G.hq,G.games)+'%</b>', 'Share of skirmishes won by capturing the HQ; the rest end in attrition. ~22% typical.') +
        dstat('Avg length', '<b>'+(G.turns/mx).toFixed(1)+'</b> turns', 'Mean skirmish length in turns. ~20 typical.') +
      '</div>' +
      '<div class="dgrp g-agg"><div class="dgrp-h">Aggression</div>' +
        dstat('Attacks / skirmish', '<b>'+(G.attacks/mx).toFixed(1)+'</b>', 'Attacks resolved per skirmish. Healthy ~5.') +
        dstat('Swaps / skirmish', '<b>'+(G.swaps/mx).toFixed(1)+'</b>', 'Repositions/swaps per skirmish. Healthy ~7.') +
        dstat('Units fielded', '<b>'+Math.round(100*G.depShare/mx)+'%</b>', 'Share of each army that ever reached the board. Healthy ~88%.') +
        dstat('Zero-kill skirmishes', '<b>'+dpct(G.zeroKill,G.games)+'%</b>', 'Skirmishes that ended with no unit killed. Healthy ~4%; high = stalemates.') +
      '</div>' +
      '<div class="dgrp g-dec"><div class="dgrp-h">Decisiveness</div>' +
        dstat('Tie &rarr; 2nd player', '<b>'+dpct(G.tiebreak,G.games)+'%</b>', 'Skirmishes decided by the tie-goes-to-second rule. Lower is better; ~25% baseline (the biggest open lever).') +
        dstat('First blood converts', '<b>'+dpct(G.fbWins,G.fbGames)+'%</b>', 'How often the side that drew first blood went on to win, across the '+dpct(G.fbGames,G.games)+'% of skirmishes with a kill. ~61% baseline.') +
        dstat('Board leader wins', '<b>'+dpct(G.ctlWins,G.ctlGames)+'%</b>', 'How often the side holding more hexes won. ~81% baseline.') +
        dstat('Kill-less turns to end', '<b>'+(G.killTail/mx).toFixed(1)+'</b>', 'Avg trailing turns with no kill before the game ended. 0 = decisive; high = the AIs marched in circles.') +
        dstat('Lead swings / skirmish', '<b>'+(G.leadChanges/mx).toFixed(1)+'</b>', 'Avg times the field-score lead flipped sides per skirmish. Higher = more back-and-forth; a losing player can feel a comeback.') +
      '</div>' +
    '</div>' +
    '<p class="small">Hover any stat or column header for what it means and its healthy range. Full targets in docs/balance/.</p>';

  // ---- card report (shared derivation; local keys are this table's sort ids) ----
  var crows = WOA_REPORT.cardRows(G.cards, E.CARDS).map(function(r){
    return { name: r.name, plays: r.plays, winPct: r.win, simplePct: r.simple,
      noopPct: r.noop, sightPct: r.sight, avgSeen: r.seenNum };
  });
  crows = dashSort(crows, DASH.cardSort.key, DASH.cardSort.dir);
  var ccols = [['name','Card'], ['winPct','Win%'], ['simplePct','Simple%'], ['noopPct','Noop%'], ['sightPct','1stSight%'], ['avgSeen','AvgSeen'], ['plays','plays']];
  h += '<h3>Card report <span class="small">('+G.games+' skirmishes of AI play)</span></h3><table><tr>';
  ccols.forEach(function(c){
    h += uiSortableTh(c, DASH.cardSort.key, DASH.cardSort.dir, CARD_TIPS[c[0]], 'data-ckey');
  });
  h += '<th title="share of plays by the eventual winner">Win share</th></tr>';
  crows.forEach(function(r){
    h += '<tr><td style="text-align:left;"><b>'+r.name+'</b></td><td>'+r.winPct+'%</td><td>'+r.simplePct+'%</td>' +
      '<td>'+r.noopPct+'%</td><td>'+r.sightPct+'%</td><td>'+r.avgSeen+'</td><td>'+r.plays+'</td><td>'+dbar(r.winPct)+'</td></tr>';
  });
  h += '</table>' +
    '<p class="small">Hover a column header for what it means and its target.</p>';

  el.innerHTML = h;
  el.querySelectorAll('th[data-key]').forEach(function(th){
    th.onclick = function(){
      var k = th.dataset.key;
      DASH.sort = { key: k, dir: DASH.sort.key === k ? -DASH.sort.dir : (k==='name'||k==='shape' ? 1 : -1) };
      renderDash();
    };
  });
  el.querySelectorAll('th[data-ckey]').forEach(function(th){
    th.onclick = function(){
      var k = th.dataset.ckey;
      DASH.cardSort = { key: k, dir: DASH.cardSort.key === k ? -DASH.cardSort.dir : (k==='name' ? 1 : -1) };
      renderDash();
    };
  });
}

dashPane({ id:'tables', label:'Tables', needsRuns:false,
  chrome:['dashTablesIntro','dashRunControls'], render: renderDashTables });
