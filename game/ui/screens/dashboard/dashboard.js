/* War of Attrition — ui part: the Balance Dashboard — DASH state, report
   rendering, markdown export. Classic script, no wrapper — top-level names
   attach to window (see ui/app.js header). Extracted verbatim from
   the dash* button wiring (incl. the Run loop) lives in ui/boot.js. */
'use strict';

/* =================== balance dashboard =================== */
// The full dev/balance.js report in the browser. Aggregation is WOA_SIM.balanceNew /
// WOA_SIM.balanceAdd — the SAME code the CLI folds skirmishes through — and the
// seed/first-player schedule is WOA_SIM.balanceSeed/balanceFP, so a run here with
// the same n/AI/maps reproduces the terminal's numbers exactly.
// view: 'tables' (the run-loop dashboard) | 'overview'|'maps'|'cards'|
// 'units' (the shell's pill nav — view-only, reads saved runs). detail:
// per-skirmish rows the charts view uses ({mapName: {turns:[], winTypes:[]}}),
// collected by the dashRun loop in ui/boot.js and reset each run — feeds
// ui/charts.js's primitives. chartMap is its histogram map knob.
//
// runA/runB/mapFocus/abMode/temperature/runs extend this SAME global — the
// header run-A/B pickers, pill nav and temperature selector read/write these
// fields; runs is the GET /api/runs listing (empty + a fallback note when
// there are no runs).
var DASH = { running:false, cancel:false, results:[], sort:{key:null, dir:1}, cardSort:{key:'sightPct', dir:-1}, meta:null, adhoc:null,
  view:'tables', detail:{}, chartMap:null,
  runA:null, runB:null, mapFocus:null, abMode:'B', temperature:'T0', runs:[], cc:null };
// Scoring/threshold/fold/markdown MODEL is shared with the CLI reporters —
// one implementation per fact, in report-model.js (global WOA_REPORT).

function openDash(){
  var sel = $('dashMap');
  var cur = sel.value;
  sel.innerHTML = '<option value="all">All in play</option>';
  getActiveMaps().forEach(function(m){
    var o = document.createElement('option');
    o.value = m.name; o.textContent = m.name;
    sel.appendChild(o);
  });
  if (cur) sel.value = [].some.call(sel.options, function(o){ return o.value===cur; }) ? cur : 'all';
  show('dashScr');
  dashLoadRuns(); // (re)populate the header run-A/B pickers every time the screen opens
}

/* ---- run-A/B pickers (GET /api/runs; view-only, server-mediated) ---
   A defaults to the CURRENT rules version's baseline row; no baseline
   yet in the real db falls back to the most recent run (runs sorted id DESC
   by GET /api/runs) — never an error. */
function dashRunLabel(r){
  var ai = (r.redAi && r.blueAi) ? (r.redAi === r.blueAi ? r.redAi : r.redAi+'/'+r.blueAi) : '';
  var bits = ['#'+r.id, r.version||'?', r.kind||'', ai, r.n?('n='+r.n):'', r.label||''].filter(function(s){ return !!s; });
  return bits.join(' · ') + (r.baseline ? '  ★baseline' : '');
}
function dashFillRunSelect(sel, val, loading){
  if (!sel) return;
  sel.innerHTML = '';
  var o = document.createElement('option');
  if (loading){ o.value=''; o.textContent='Loading…'; sel.appendChild(o); sel.disabled = true; return; }
  if (!DASH.runs.length){
    o.value = ''; o.textContent = 'No runs yet';
    sel.appendChild(o); sel.disabled = true; return;
  }
  sel.disabled = false;
  DASH.runs.forEach(function(r){
    var opt = document.createElement('option');
    opt.value = String(r.id); opt.textContent = dashRunLabel(r);
    sel.appendChild(opt);
  });
  if (val != null && [].some.call(sel.options, function(op){ return op.value === String(val); })) sel.value = String(val);
}
// Baseline for E.VERSION if pinned, else the most recent run (runs[0] — the
// server lists id DESC) — "falls back sensibly ... without error" (AC1).
function dashPickDefaultRuns(){
  if (DASH.runA == null){
    var base = null;
    for (var i=0; i<DASH.runs.length; i++){ if (DASH.runs[i].baseline && DASH.runs[i].version === E.VERSION){ base = DASH.runs[i]; break; } }
    DASH.runA = base ? base.id : (DASH.runs[0] ? DASH.runs[0].id : null);
  }
  if (DASH.runB == null){
    for (var j=0; j<DASH.runs.length; j++){ if (DASH.runs[j].id !== DASH.runA){ DASH.runB = DASH.runs[j].id; break; } }
  }
}
function dashLoadRuns(){
  dashFillRunSelect($('dashRunA'), DASH.runA, true);
  dashFillRunSelect($('dashRunB'), DASH.runB, true);
  fetch('/api/runs').then(function(r){ return r.ok ? r.json() : []; }).then(function(runs){
    DASH.runs = Array.isArray(runs) ? runs : [];
    dashPickDefaultRuns();
    renderDash();
  }).catch(function(){ DASH.runs = []; renderDash(); }); // best-effort, same idiom as api() callers
}

/* ---- chrome: header pickers + pill nav + temperature (every render — cheap) ---- */
function renderDashChrome(){
  dashPanesBuild();
  document.querySelectorAll('#dashPills .dpill').forEach(function(b){
    b.classList.toggle('sel', b.dataset.view === DASH.view);
  });
  var temp = $('dashTemp');
  if (temp) temp.value = DASH.temperature;
  dashFillRunSelect($('dashRunA'), DASH.runA);
  dashFillRunSelect($('dashRunB'), DASH.runB);
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
    title: n+' skirmishes/map, '+aiLabel,
    version: E.VERSION,
    metaTail: '±'+noise+' points at this n · from the in-browser Balance Dashboard',
    rows: rows,
    G: WOA_REPORT.foldGlobal(DASH.results.map(function(r){ return { agg: r.out, done: n - r.out.unfinished }; })),
    cards: E.CARDS, cardPoints: E.cardPoints
  });
}

function renderDash(){
  renderDashChrome();
  dashPanesShow(DASH.view);
}
