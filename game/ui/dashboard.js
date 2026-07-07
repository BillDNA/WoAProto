/* War of Attrition — ui part: the Balance Dashboard — DASH state, report
   rendering, markdown export. Classic script, no wrapper — top-level names
   attach to window (see ui/app.js header). Extracted verbatim from
   index.html's inline app script; the dash* button wiring (incl. the Run
   loop) lives in ui/boot.js. */
'use strict';

/* =================== balance dashboard =================== */
// The full balance.js report in the browser. Aggregation is E.balanceNew /
// E.balanceAdd — the SAME code the CLI folds battles through — and the
// seed/first-player schedule is E.balanceSeed/balanceFP, so a run here with
// the same n/AI/maps reproduces the terminal's numbers exactly.
// view: 'tables' | 'charts' (the Tables|Charts tabs above #dashOut).
// detail: per-battle rows the charts need ({mapName: {turns:[], winTypes:[]}}),
// collected by the dashRun loop in ui/boot.js and reset each run. chartMap is
// the histogram's map knob (null = the run's best-balance map).
var DASH = { running:false, cancel:false, results:[], sort:{key:null, dir:1}, cardSort:{key:'sightPct', dir:-1}, meta:null, adhoc:null,
  view:'tables', detail:{}, chartMap:null };
// Scoring/threshold/fold/markdown MODEL is shared with the CLI reporters —
// one implementation per fact, in report-model.js (global WOA_REPORT).
var dpct = WOA_REPORT.pct;

function openDash(){
  var sel = $('dashMap');
  var cur = sel.value;
  sel.innerHTML = '<option value="all">All in play</option>';
  getMapPool().forEach(function(m){
    var o = document.createElement('option');
    o.value = m.name; o.textContent = m.name;
    sel.appendChild(o);
  });
  if (cur) sel.value = [].some.call(sel.options, function(o){ return o.value===cur; }) ? cur : 'all';
  show('dashScr');
}

// Balance a map AS DRAWN — possibly unsaved (the map editor's Balance button).
// Restructure step 9 deleted the old in-game balance lab so this is the ONE
// aggregation pipeline: the def rides along as DASH.adhoc under a transient
// '(as drawn)' option (value '@adhoc'), and the normal dashRun path (ui/boot.js)
// resolves that value to [DASH.adhoc]. Invalid maps toast and stay put.
function openDashDef(def){
  if (!def) return; // edBuildDef() already toasted the reason
  var probs = E.validateMaps([def]);
  if (probs.length){ toast('Map problem: '+probs.join('; '), 4200); return; }
  DASH.adhoc = def;
  openDash(); // rebuilds #dashMap from the pool, so (re)inject the adhoc option after
  var sel = $('dashMap');
  var o = sel.querySelector('option[value="@adhoc"]');
  if (!o){
    o = document.createElement('option');
    o.value = '@adhoc';
    sel.appendChild(o);
  }
  o.textContent = '(as drawn) ' + def.name;
  sel.value = '@adhoc';
  $('dashRun').click();
}

function dashDownloadReport(fname, md){
  var blob = new Blob([md], { type:'text/markdown' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded '+fname+' &mdash; run <code>node game/server.js</code> to save straight into logs/reports/balance/'+E.VERSION+'/.', 5600);
}
function dashReportMarkdown(){
  var n = DASH.meta.n, dr = DASH.meta.dr, db = DASH.meta.db;
  var noise = Math.round(100/Math.sqrt(n));
  var aiLabel = dr===db ? dr+' AI both sides' : 'red '+dr+' vs blue '+db;
  var rows = DASH.results.map(function(r){
    var o = r.out, done = Math.max(1, n - o.unfinished);
    return { name: r.map.name,
      shape: (r.map.shapeDef || String(r.map.shape||'').charAt(0)==='@') ? 'custom' : (r.map.shape||'?'),
      agg: o, done: done, notes: WOA_REPORT.mapNotes(o, done) };
  });
  return WOA_REPORT.reportMarkdown({
    style: 'dashboard',
    title: n+' battles/map, '+aiLabel,
    version: E.VERSION,
    metaTail: '±'+noise+' points at this n · from the in-browser Balance Dashboard',
    rows: rows,
    G: WOA_REPORT.foldGlobal(DASH.results.map(function(r){ return { agg: r.out, done: n - r.out.unfinished }; })),
    cards: E.CARDS
  });
}

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
// column tooltips: what each stat means + its healthy target (Feedback Round 1)
var MAP_TIPS = {
  name:'Map name', shape:'Board shape (custom = a carved outline)',
  red:'Red win rate. 50% = balanced; ≥62% or ≤38% flags a side bias (±noise at this n)',
  first:'First-mover win rate. Target ~46-50%; ≥62% / ≤38% flags a turn-order bias',
  hq:'Share of battles ending in HQ capture (rest are attrition). ≤8% = attrition-only, ≥55% = HQ-rushable',
  turns:'Average battle length in turns (~20 typical)',
  vpdiff:'Average field-score margin of victory — higher = more decisive',
  atk:'Attacks per battle. Healthy ~5', swp:'Swaps per battle. Healthy ~7',
  zk:'Zero-kill battles. Healthy ~4%; ≥20% flags stalemates',
  tie:'Battles decided by the tie-goes-to-2nd rule — lower is better (~25% baseline)',
  drag:'Avg trailing turns with no kill before the game ended. 0 = decisive finish; high = the AIs marched in circles',
  swing:'Avg times the field-score lead flipped to the other side per battle. High = real back-and-forth; 0 = wire-to-wire'
};
var CARD_TIPS = {
  name:'Card',
  winPct:'Win rate when played — hugs 50% in attrition games; treat only big deviations',
  simplePct:'Share resolved as a basic attack/reposition — high = the printed action often was not worth it',
  sightPct:'Share played the first turn it was seen — high + low AvgSeen = always-good on sight (OP watchlist)',
  avgSeen:'Average times in hand before it was played — high = situational/hoarded',
  plays:'Total times played across all battles'
};
function dstat(label, val, tip){ return '<div class="dstat" title="'+tip+'"><span>'+label+'</span><span>'+val+'</span></div>'; }
function renderDash(){
  var el = $('dashOut');
  // Tables|Charts toggle (V1 graphs spec) — charts view is ui/charts.js
  var tt = $('dashTabTables'), tc = $('dashTabCharts');
  if (tt){ tt.classList.toggle('sel', DASH.view !== 'charts'); tc.classList.toggle('sel', DASH.view === 'charts'); }
  if (DASH.view === 'charts'){ renderCharts(el); return; }
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
      hq: dpct(o.hqWins, done), turns: +(o.turns/done).toFixed(1), vpdiff: +(o.vpDiff/done).toFixed(1),
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
    ['turns','Turns'], ['vpdiff','VPdiff'], ['atk','Atk'], ['swp','Swp'], ['zk','0kill%'], ['tie','Tie%'],
    ['drag','Drag'], ['swing','Swings'], [null,'notes']
  ];
  var h = '<h3>Maps &mdash; '+n+' battles each, '+aiLabel+' <span class="small">(&plusmn;'+noise+' points at this n)</span></h3>';
  h += '<table><tr>';
  cols.forEach(function(c){
    if (!c[0]){ h += '<th title="Automated flags derived from the thresholds in this table">'+c[1]+'</th>'; return; }
    h += '<th class="sortable'+(key===c[0]?' sorted':'')+'" data-key="'+c[0]+'" title="'+(MAP_TIPS[c[0]]||'')+' &middot; click to sort">'+c[1]+(key===c[0]?(dir>0?' &#9650;':' &#9660;'):'')+'</th>';
  });
  h += '<th title="red vs blue win share">R/B</th></tr>';
  rows.forEach(function(r){
    h += '<tr><td style="text-align:left;"><b>'+r.name+'</b></td><td>'+r.shape+'</td>' +
      '<td>'+r.red+'%</td><td>'+r.first+'%</td><td>'+r.hq+'%</td><td>'+r.turns+'</td><td>'+r.vpdiff+'</td>' +
      '<td>'+r.atk+'</td><td>'+r.swp+'</td><td>'+r.zk+'%</td><td>'+r.tie+'%</td>' +
      '<td>'+r.drag+'</td><td>'+r.swing+'</td>' +
      '<td style="text-align:left;" class="dnote">'+(r.notes||'')+'</td><td>'+dbar(r.red)+'</td></tr>';
  });
  h += '</table>';

  // ---- overall + behaviour + decisiveness (the shared foldGlobal — the SAME
  // fold balance.js and balance-report.js run) ----
  var G = WOA_REPORT.foldGlobal(DASH.results.map(function(r){ return { agg: r.out, done: n - r.out.unfinished }; }));
  var mx = Math.max(1, G.games);
  h += '<h3>Overall <span class="small">(n='+G.games+' battles)</span></h3>' +
    '<div class="dstats">' +
      '<div class="dgrp g-vic"><div class="dgrp-h">Victory</div>' +
        dstat('Red wins', '<b>'+dpct(G.red,G.games)+'%</b> '+dbar(dpct(G.red,G.games)), 'Overall red win rate across all maps. 50% = balanced.') +
        dstat('First mover wins', '<b>'+dpct(G.first,G.games)+'%</b> '+dbar(dpct(G.first,G.games),'brass'), 'Win rate of whoever moved first. Target ~46-50%.') +
        dstat('HQ captures', '<b>'+dpct(G.hq,G.games)+'%</b>', 'Share of battles won by capturing the HQ; the rest end in attrition. ~22% typical.') +
        dstat('Avg length', '<b>'+(G.turns/mx).toFixed(1)+'</b> turns', 'Mean battle length in turns. ~20 typical.') +
      '</div>' +
      '<div class="dgrp g-agg"><div class="dgrp-h">Aggression</div>' +
        dstat('Attacks / battle', '<b>'+(G.attacks/mx).toFixed(1)+'</b>', 'Attacks resolved per battle. Healthy ~5.') +
        dstat('Swaps / battle', '<b>'+(G.swaps/mx).toFixed(1)+'</b>', 'Repositions/swaps per battle. Healthy ~7.') +
        dstat('Units fielded', '<b>'+Math.round(100*G.depShare/mx)+'%</b>', 'Share of each army that ever reached the board. Healthy ~88%.') +
        dstat('Zero-kill battles', '<b>'+dpct(G.zeroKill,G.games)+'%</b>', 'Battles that ended with no unit killed. Healthy ~4%; high = stalemates.') +
      '</div>' +
      '<div class="dgrp g-dec"><div class="dgrp-h">Decisiveness</div>' +
        dstat('Tie &rarr; 2nd player', '<b>'+dpct(G.tiebreak,G.games)+'%</b>', 'Battles decided by the tie-goes-to-second rule. Lower is better; ~25% baseline (the biggest open lever).') +
        dstat('First blood converts', '<b>'+dpct(G.fbWins,G.fbGames)+'%</b>', 'How often the side that drew first blood went on to win, across the '+dpct(G.fbGames,G.games)+'% of battles with a kill. ~61% baseline.') +
        dstat('Board leader wins', '<b>'+dpct(G.ctlWins,G.ctlGames)+'%</b>', 'How often the side holding more hexes won. ~81% baseline.') +
        dstat('Kill-less turns to end', '<b>'+(G.killTail/mx).toFixed(1)+'</b>', 'Avg trailing turns with no kill before the game ended. 0 = decisive; high = the AIs marched in circles.') +
        dstat('Lead swings / battle', '<b>'+(G.leadChanges/mx).toFixed(1)+'</b>', 'Avg times the field-score lead flipped sides per battle. Higher = more back-and-forth; a losing player can feel a comeback.') +
      '</div>' +
    '</div>' +
    '<p class="small">Hover any stat or column header for what it means and its healthy range. Full targets in design-docs/grading-rubrics.md.</p>';

  // ---- card report (shared derivation; local keys are this table's sort ids) ----
  var crows = WOA_REPORT.cardRows(G.cards, E.CARDS).map(function(r){
    return { name: r.name, plays: r.plays, winPct: r.win, simplePct: r.simple,
      sightPct: r.sight, avgSeen: r.seenNum };
  });
  crows = dashSort(crows, DASH.cardSort.key, DASH.cardSort.dir);
  var ccols = [['name','Card'], ['winPct','Win%'], ['simplePct','Simple%'], ['sightPct','1stSight%'], ['avgSeen','AvgSeen'], ['plays','plays']];
  h += '<h3>Card report <span class="small">('+G.games+' battles of AI play)</span></h3><table><tr>';
  ccols.forEach(function(c){
    h += '<th class="sortable'+(DASH.cardSort.key===c[0]?' sorted':'')+'" data-ckey="'+c[0]+'" title="'+(CARD_TIPS[c[0]]||'')+' &middot; click to sort">'+c[1]+(DASH.cardSort.key===c[0]?(DASH.cardSort.dir>0?' &#9650;':' &#9660;'):'')+'</th>';
  });
  h += '<th title="share of plays by the eventual winner">Win share</th></tr>';
  crows.forEach(function(r){
    h += '<tr><td style="text-align:left;"><b>'+r.name+'</b></td><td>'+r.winPct+'%</td><td>'+r.simplePct+'%</td>' +
      '<td>'+r.sightPct+'%</td><td>'+r.avgSeen+'</td><td>'+r.plays+'</td><td>'+dbar(r.winPct)+'</td></tr>';
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
