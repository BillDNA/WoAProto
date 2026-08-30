/* Iteration Workbench — the Plan / Run / Results / Trajectory shell (#139).
   Foundation surface #108 assumed already existed: this stands up the four-phase
   switcher and one labeled placeholder panel per phase. Each phase's real content
   is filled by its own follow-on ticket (Plan type/nudge, Temperature slot,
   questionnaire editor, Trajectory, Run, Results) — this file is just the frame.
   Ported from the throwaway dev/proto/calibration-dashboard.proto.html.
   Classic script + shared globals, wired like ui/maps-screen.js. */

// Ordered so the switcher reads Plan → Run → Results → Trajectory. The `fills`
// text names what the follow-on ticket replaces this placeholder body with.
var WORKBENCH_PHASES = [
  { id: 'plan',       n: 1, label: 'Plan',       fills: 'loop type, opening nudge, accept settings + debrief questionnaire' },
  { id: 'run',        n: 2, label: 'Run',        fills: 'over-the-shoulder live match feed + anomaly signals' },
  { id: 'results',    n: 3, label: 'Results',    fills: 'one-pager of built content with the reports nested beneath' },
  { id: 'trajectory', n: 4, label: 'Trajectory', fills: 'progress-over-time, rendered live from logs/woa.db' }
];
var WB_PHASE = 'plan';

// The one iterated axis picked in Plan (#140). The ids ARE the Temperature
// profile keys (game/content/temperatures.js, the authority) — the picked one is
// iterated, the other two HELD (its `step` semantics), and the id doubles as the
// loop's `profile`. temperatures.js is node-only (not loaded here), so this list
// can't derive from it; if a profile is renamed there, launch throws a loud
// `unknown profile` at the loop engine rather than corrupting silently.
var WB_LOOP_TYPES = [
  { id: 'card', label: 'Card', iterates: 'the deck' },
  { id: 'map',  label: 'Map',  iterates: 'the map' },
  { id: 'ai',   label: 'AI',   iterates: 'the AI weights' }
];
// Opening-nudge quick-chips — taste presets that append to the free-text nudge.
var WB_CHIPS = ['shorten games', 'punish turtling', 'reward aggression', 'make cavalry matter', 'tighten first-mover edge'];
// `temp` = the working Temperature the operator edits before a run — a deep copy
// of the picked loop type's default profile (game/content/temperatures.js), loaded
// by wbLoadProfile on render and on every loop-type switch. Sparse {key: grace};
// an omitted key ⇒ hold, the fixed ruler.
var WB_PLAN = { loopType: 'card', panel: ['hard'], iters: 6, n: 20, temp: null };
var WB_LAST_CONFIG = null;
// Launch handoff hook — the browser has no bridge to the node loop engine, so the
// real, testable handoff is the assembled run-config object. A follow-on server
// proxy can override WB_ON_LAUNCH to POST it; the default just surfaces it.
var WB_ON_LAUNCH = function (cfg) {
  if (typeof toast === 'function') toast('Loop config assembled — ' + cfg.loopType + ' loop, ' + cfg.iters + ' iterations.', 3000);
  if (typeof console !== 'undefined') console.log('WB_LAUNCH', cfg);
};

// Builds the whole shell once per open — every pane is rendered up front and the
// switcher only toggles which is shown (wbGoPhase). Opening always starts on Plan
// so re-entry is predictable; keeping all panes mounted means a follow-on ticket's
// pane content (a half-filled Plan form) survives a tab switch instead of being
// rebuilt away.
function renderWorkbench() {
  WB_PHASE = 'plan';
  wbLoadProfile(WB_PLAN.loopType);   // reset the accept-settings default on open (predictable re-entry)
  var tabs = WORKBENCH_PHASES.map(function (p) {
    return '<button class="wb-tab' + (p.id === WB_PHASE ? ' sel' : '') +
      '" data-phase="' + p.id + '" type="button"><b>' + p.n + '</b> ' + p.label + '</button>';
  }).join('<span class="wb-step">&rarr;</span>');

  var panes = WORKBENCH_PHASES.map(function (p) {
    var body = p.id === 'plan' ? wbPlanBody()
      : p.id === 'trajectory' ? '<div id="wbTraj"><p class="small wb-hint">Open this phase to load the champion line from <code>logs/woa.db</code>.</p></div>'
      : '<p class="small wb-placeholder">Placeholder &mdash; a follow-on ticket fills this phase with ' + p.fills + '.</p>';
    return '<div class="wb-pane" id="wbPane-' + p.id + '"' + (p.id === WB_PHASE ? '' : ' style="display:none;"') + '>' +
      '<h3 class="wb-phase-h">' + p.n + ' &middot; ' + p.label + '</h3>' + body +
      '</div>';
  }).join('');

  document.getElementById('wbNav').innerHTML = tabs;
  document.getElementById('wbPanes').innerHTML = panes;
  document.querySelectorAll('#wbNav .wb-tab').forEach(function (b) {
    b.onclick = function () { wbGoPhase(b.getAttribute('data-phase')); };
  });
  wbWirePlan();
}

// The Plan pane body: loop-type picker (one iterated, two held), opening nudge +
// quick-chips, and the Fixtures summary of what a candidate is measured on.
function wbPlanBody() {
  var types = WB_LOOP_TYPES.map(function (t) {
    var held = t.id !== WB_PLAN.loopType;
    return '<button type="button" class="wb-ltype' + (held ? ' held' : ' sel') + '" data-loop="' + t.id + '">' +
      '<b>' + t.label + '</b><span class="wb-lt-sub">' + (held ? 'held' : 'iterates ' + t.iterates) + '</span></button>';
  }).join('');
  var chips = WB_CHIPS.map(function (c) {
    return '<button type="button" class="wb-chip" data-chip="' + c + '">' + c + '</button>';
  }).join('');
  return '<div id="wbLoopTypes" class="wb-ltypes">' + types + '</div>' +
    '<label class="small wb-lbl" for="wbNudge">Opening nudge <span class="wb-hint">&mdash; where taste enters the loop</span></label>' +
    '<textarea id="wbNudge" class="wb-nudge" rows="2" placeholder="e.g. reward pushing the centre, punish turtling"></textarea>' +
    '<div id="wbChips" class="wb-chips">' + chips + '</div>' +
    '<label class="small wb-lbl">Accept settings <span class="wb-hint">&mdash; Tolerance grace per axis (click to escalate; Red%/1st% hard-gated)</span></label>' +
    '<div id="wbAccept" class="wb-accept">' + wbAcceptBody() + '</div>' +
    '<label class="small wb-lbl">Debrief questionnaire <span class="wb-hint">&mdash; asked after every skirmish (#111)</span></label>' +
    '<div id="wbQz" class="wb-qz">' + wbQzRows() + '</div>' +
    '<div id="wbFixtures" class="wb-fixtures small">' + wbFixturesText() + '</div>' +
    '<div class="ovr-btns"><button id="wbLaunch" type="button">Assemble &rarr; Launch</button></div>';
}

// The debrief questionnaire (game/content/questionnaire.js, #111) is editable
// pre-run: each {id,text} row is a stable-key label + editable text. Edits live
// in WB_QUESTIONS until saved through the server (POST /api/savequestionnaire),
// the same write path other content/ uses. questionnaire.js is loaded as a
// browser global here; guard so the pane still renders if it is absent.
var WB_QUESTIONS = null;
function wbQuestions() {
  if (!WB_QUESTIONS) {
    var src = (typeof WOA_QUESTIONNAIRE !== 'undefined' && WOA_QUESTIONNAIRE.questions) || [];
    WB_QUESTIONS = src.map(function (q) { return { id: q.id, text: q.text }; });
  }
  return WB_QUESTIONS;
}
function wbEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function wbQzRows() {
  var rows = wbQuestions().map(function (q, i) {
    return '<div class="wb-qrow" data-i="' + i + '">' +
      '<code class="wb-qid">' + wbEsc(q.id) + '</code>' +
      '<textarea class="wb-qtext" data-i="' + i + '" rows="2">' + wbEsc(q.text) + '</textarea>' +
      '</div>';
  }).join('');
  return rows +
    '<div class="wb-qbtns"><button id="wbQAdd" type="button" class="wb-chip">+ add question</button>' +
    '<button id="wbQSave" type="button" class="wb-chip">Save questionnaire</button></div>';
}

// Resolve the profiles authority (temperatures.js → WOA_TEMPERATURES) + the band
// mechanism (report-model → WOA_REPORT). Both load before this in index.html; a
// browser-order slip degrades the panel to a note rather than throwing.
function wbTemps() { return (typeof WOA_TEMPERATURES !== 'undefined') ? WOA_TEMPERATURES : null; }

// Deep-copy the default profile for a loop type into WB_PLAN.temp (the working
// Temperature). Fairness axes (Red%/1st%) are never in a default profile's
// tolerances — they stay held, rendered as a locked gate below.
function wbLoadProfile(id) {
  var T = wbTemps(), p = T && T.profiles[id];
  WB_PLAN.temp = p ? { name: p.name, step: p.step, tolerances: Object.assign({}, p.tolerances) } : null;
}

// The accept-settings rows: the hard-gated fairness pair (locked at hold) then one
// clickable pill per loosenable Tolerance, showing its grace class.
function wbAcceptBody() {
  var T = wbTemps(), R = (typeof WOA_REPORT !== 'undefined') ? WOA_REPORT : null;
  if (!T || !WB_PLAN.temp) return '<p class="small wb-hint">Temperature profiles unavailable.</p>';
  function label(k) { var b = R && R.bands(k, 'hold'); return (b && b.label) || k; }
  var rows = T.HARD_GATED.map(function (k) {
    return '<div class="wb-tol gated" data-metric="' + k + '"><b>' + label(k) +
      '</b><span class="wb-grace">hold &middot; hard-gated</span></div>';
  });
  var tol = WB_PLAN.temp.tolerances;
  Object.keys(tol).forEach(function (k) {
    rows.push('<button type="button" class="wb-tol" data-metric="' + k + '"><b>' + label(k) +
      '</b><span class="wb-grace">' + tol[k] + '</span></button>');
  });
  return rows.join('');
}

// Escalate one loosenable Tolerance one step around the grace cycle
// (hold→nudge→bold→bypass→hold). Fairness axes are locked out — they are not
// buttons and are refused here too.
function wbCycleTol(k) {
  var T = wbTemps(), tol = WB_PLAN.temp && WB_PLAN.temp.tolerances;
  if (!T || !tol || T.HARD_GATED.indexOf(k) >= 0) return;
  var order = T.GRACE, i = order.indexOf(tol[k]);
  tol[k] = order[(i + 1) % order.length];
  wbRenderAccept();
}

function wbWireAccept() {
  document.querySelectorAll('#wbAccept button.wb-tol').forEach(function (b) {
    b.onclick = function () { wbCycleTol(b.getAttribute('data-metric')); };
  });
}

function wbRenderAccept() {
  var el = document.getElementById('wbAccept');
  if (!el) return;
  el.innerHTML = wbAcceptBody();
  wbWireAccept();
}

// Fixtures = the deck / mapset / personality panel a candidate is measured on,
// read live from the engine surface the loop sweeps over.
function wbFixturesText() {
  var deck = E.ACTIVE_DECK || {}, ms = E.activeMapset() || {};
  return '<b>Fixtures</b> &mdash; deck <code>' + (deck.name || deck.id || '?') + '</code> (' +
    (E.deckPoints ? E.deckPoints(deck) : '?') + ' pts) &middot; mapset <code>' + (ms.id || 'all') + '</code> (' +
    (E.mapPool ? E.mapPool().length : '?') + ' maps) &middot; panel <code>' + WB_PLAN.panel.join('+') + '</code>';
}

function wbWirePlan() {
  document.querySelectorAll('#wbLoopTypes .wb-ltype').forEach(function (b) {
    b.onclick = function () { wbPickLoop(b.getAttribute('data-loop')); };
  });
  document.querySelectorAll('#wbChips .wb-chip').forEach(function (b) {
    b.onclick = function () {
      var ta = document.getElementById('wbNudge');
      ta.value = (ta.value.trim() ? ta.value.trim() + '; ' : '') + b.getAttribute('data-chip');
    };
  });
  wbWireAccept();
  document.getElementById('wbLaunch').onclick = wbLaunch;
  wbWireQz();
}

// Wire the questionnaire rows (re-called after add, which re-renders #wbQz).
function wbWireQz() {
  document.querySelectorAll('#wbQz .wb-qtext').forEach(function (ta) {
    ta.oninput = function () { wbQuestions()[+ta.getAttribute('data-i')].text = ta.value; };
  });
  document.getElementById('wbQAdd').onclick = function () {
    var qs = wbQuestions();
    var used = {}; qs.forEach(function (q) { used[q.id] = true; });
    var n = qs.length + 1; while (used['q' + n]) n++; // skip ids already in use (post-reload safety)
    qs.push({ id: 'q' + n, text: '' });
    document.getElementById('wbQz').innerHTML = wbQzRows();
    wbWireQz();
  };
  document.getElementById('wbQSave').onclick = wbSaveQz;
}

// Persist the edited questionnaire through the server (mirrors savedeck/savemap):
// the server rewrites content/questionnaire.js's QUESTIONS rows in place.
function wbSaveQz() {
  var qs = wbQuestions().filter(function (q) { return q.text.trim(); });
  if (typeof api !== 'function') return;
  api('savequestionnaire', { questions: qs })
    .then(function () { if (typeof toast === 'function') toast('Debrief questionnaire saved (' + qs.length + ' questions).', 2500); })
    .catch(function (e) { if (typeof toast === 'function') toast('Save failed — ' + e.message, 3500); });
}

// Pick the iterated loop type; the other two flip to `held`.
function wbPickLoop(id) {
  if (!WB_LOOP_TYPES.some(function (t) { return t.id === id; })) return;
  WB_PLAN.loopType = id;
  wbLoadProfile(id);       // re-load the accept-settings default for the newly picked loop type
  wbRenderAccept();
  WB_LOOP_TYPES.forEach(function (t) {
    var b = document.querySelector('#wbLoopTypes .wb-ltype[data-loop="' + t.id + '"]');
    var held = t.id !== id;
    b.classList.toggle('held', held);
    b.classList.toggle('sel', !held);
    b.querySelector('.wb-lt-sub').textContent = held ? 'held' : 'iterates ' + t.iterates;
  });
}

// Assemble the run-config the #138 orchestrator consumes. Keys mostly mirror
// dev/loop.js's CLI flags — its process boundary: `mapset` id (=--mapset, loop.js
// expands it to the maps array itself), `panel` (=--ai), `iters`/`n`. `profile` is
// the exception — it carries the EDITED Temperature OBJECT (not the --profile key
// string), which runDeckLoop's opts.profile accepts directly, so a launching proxy
// forwards it as-is (the CLI --profile can't express an escalated profile). `loopType`
// keeps the picked-type string for display. `nudge` is the taste the LLM drafter
// reads; `deck` records the active-deck fixture a candidate is measured against
// (loop.js has no --deck — the launching proxy applies it before the run).
function wbBuildConfig() {
  var ms = E.activeMapset() || {};
  return {
    loopType: WB_PLAN.loopType,
    // `profile` carries the operator's EDITED Temperature object (name/step/tolerances)
    // — runDeckLoop's opts.profile accepts an object directly (dev/loop.js), so the
    // per-axis escalations flow straight into the run. Falls back to the loop-type key
    // string only if the profiles authority failed to load (browser-order slip).
    profile: WB_PLAN.temp ? { name: WB_PLAN.temp.name, step: WB_PLAN.temp.step, tolerances: Object.assign({}, WB_PLAN.temp.tolerances) } : WB_PLAN.loopType,
    nudge: (document.getElementById('wbNudge').value || '').trim(),
    deck: (E.ACTIVE_DECK && E.ACTIVE_DECK.id) || 'seed',
    mapset: ms.id || 'all',
    panel: WB_PLAN.panel.slice(),
    iters: WB_PLAN.iters,
    n: WB_PLAN.n
  };
}

function wbLaunch() {
  WB_LAST_CONFIG = wbBuildConfig();
  WB_ON_LAUNCH(WB_LAST_CONFIG);
}

function wbGoPhase(id) {
  if (!WORKBENCH_PHASES.some(function (p) { return p.id === id; })) return;
  WB_PHASE = id;
  document.querySelectorAll('#wbNav .wb-tab').forEach(function (b) {
    b.classList.toggle('sel', b.getAttribute('data-phase') === id);
  });
  WORKBENCH_PHASES.forEach(function (p) {
    document.getElementById('wbPane-' + p.id).style.display = p.id === id ? '' : 'none';
  });
  if (id === 'trajectory') wbLoadTrajectory();   // refresh the champion line from the db each open
}

/* Trajectory phase (#143) — render the loop's champion line live from
   logs/woa.db. Picks the latest loop run (GET /api/runs), fetches its skirmish
   rows (GET /api/skirmishes — the same read path the dashboard uses), and folds
   the parent_id chain into the champion line. Never a committed .md. */
function wbTrajEmpty() {
  return '<p class="small wb-hint">No loop trajectory yet &mdash; run a Card loop (Plan &rarr; Launch) to write a ' +
    'parent-id chain into <code>logs/woa.db</code>, then reopen this phase.</p>';
}
function wbLoadTrajectory() {
  var el = document.getElementById('wbTraj');
  if (!el || typeof fetch !== 'function') return;
  el.innerHTML = '<p class="small wb-hint">Loading trajectory from <code>logs/woa.db</code>&hellip;</p>';
  fetch('/api/runs').then(function (r) { return r.ok ? r.json() : []; }).then(function (runs) {
    // Prefer the newest loop run (tool 'loop.js'); fall back to the newest run of any kind.
    var run = (runs || []).filter(function (x) { return x.tool === 'loop.js'; })[0] || (runs || [])[0];
    if (!run) { el.innerHTML = wbTrajEmpty(); return; }
    return fetch('/api/skirmishes?run=' + run.id).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      var model = (typeof CHART_MODEL !== 'undefined') && CHART_MODEL.buildTrajectoryModel(rows);
      el.innerHTML = model ? wbTrajBody(model, run) : wbTrajEmpty();
    });
  }).catch(function () { el.innerHTML = wbTrajEmpty(); });
}

// The champion line as an SVG: solid line through adopted incumbents, hollow
// off-line dots for rejected/parked candidates, a dashed target line at the
// ruler zero. Mirrors dev/proto/calibration-dashboard.proto.html framing ①.
function wbTrajSvg(m) {
  var W = 620, H = 200, pad = { l: 40, r: 16, t: 18, b: 30 };
  var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  var xs = Math.max(1, m.iters.length - 1);
  var lo = m.loScore, hi = m.hiScore + (m.hiScore - m.loScore) * 0.12 || 1;
  if (hi <= lo) hi = lo + 1;
  var X = function (i) { return pad.l + iw * (i / xs); };
  var Y = function (s) { return pad.t + ih * (1 - (s - lo) / (hi - lo)); };
  var champ = m.champs;
  var path = champ.map(function (t, k) { return (k ? 'L' : 'M') + X(t.i).toFixed(1) + ' ' + Y(t.score).toFixed(1); }).join(' ');
  var tgtY = Y(m.target);
  var dots = m.iters.map(function (t) {
    var solid = t.verdict === 'adopt', current = t.verdict === 'current';
    var c = t.verdict === 'reject' ? 'var(--red)' : current ? 'var(--copper)' : 'var(--forest)';
    return '<circle cx="' + X(t.i).toFixed(1) + '" cy="' + Y(t.score).toFixed(1) + '" r="' + (solid || current ? 5 : 4) +
      '" fill="' + (solid || current ? c : 'var(--parch)') + '" stroke="' + c + '" stroke-width="2"/>' +
      '<text x="' + X(t.i).toFixed(1) + '" y="' + (Y(t.score) - 10).toFixed(1) + '" text-anchor="middle" font-size="10" fill="var(--ink-soft)">' +
      t.score.toFixed(1) + '</text>';
  }).join('');
  var xlabs = m.iters.map(function (t) {
    return '<text x="' + X(t.i).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10" fill="var(--ink-soft)">' + (t.i + 1) + '</text>';
  }).join('');
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" class="wb-traj-svg" role="img" aria-label="balanceScore over loop iterations">' +
    '<line x1="' + pad.l + '" y1="' + tgtY.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + tgtY.toFixed(1) + '" stroke="var(--forest)" stroke-dasharray="4 4" opacity=".6"/>' +
    '<text x="' + (W - pad.r) + '" y="' + (tgtY - 5).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--forest)">target ' + m.target + '</text>' +
    '<path d="' + path + '" fill="none" stroke="var(--brass-dark)" stroke-width="2.5" stroke-linejoin="round"/>' +
    dots + xlabs +
    '<text x="' + pad.l + '" y="' + (H - 2) + '" font-size="10" fill="var(--ink-soft)">iteration &rarr;</text></svg>';
}

function wbTrajBody(m, run) {
  var toTarget = m.championScore != null ? (m.championScore - m.target).toFixed(1) : '—';
  var stat = function (k, v) { return '<div class="wb-stat"><div class="wb-stat-k">' + k + '</div><div class="wb-stat-v">' + v + '</div></div>'; };
  return '<div class="small wb-hint" style="margin-bottom:6px">balanceScore &middot; the fixed ruler (#83) &middot; lower = closer to ideal &middot; live from <code>logs/woa.db</code> run ' + wbEsc(String(run.id)) + '</div>' +
    wbTrajSvg(m) +
    '<p class="small wb-hint" style="margin-top:4px">Solid line &amp; filled dots = the <b>champion</b> (adopted incumbent). Hollow red dots = candidates the loop <b>tried and dropped</b>. Copper = the current candidate.</p>' +
    '<div class="wb-stats">' +
      stat('iterations', m.iters.length) +
      stat('adopted', m.adopted) +
      stat('rejected', m.rejected) +
      stat('champion score', m.championScore != null ? m.championScore.toFixed(1) : '—') +
      stat('to target', toTarget) +
    '</div>';
}
