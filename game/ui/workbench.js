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
var WB_PLAN = { loopType: 'card', panel: ['hard'], iters: 6, n: 20 };
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
  var tabs = WORKBENCH_PHASES.map(function (p) {
    return '<button class="wb-tab' + (p.id === WB_PHASE ? ' sel' : '') +
      '" data-phase="' + p.id + '" type="button"><b>' + p.n + '</b> ' + p.label + '</button>';
  }).join('<span class="wb-step">&rarr;</span>');

  var panes = WORKBENCH_PHASES.map(function (p) {
    var body = p.id === 'plan' ? wbPlanBody()
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
  WB_LOOP_TYPES.forEach(function (t) {
    var b = document.querySelector('#wbLoopTypes .wb-ltype[data-loop="' + t.id + '"]');
    var held = t.id !== id;
    b.classList.toggle('held', held);
    b.classList.toggle('sel', !held);
    b.querySelector('.wb-lt-sub').textContent = held ? 'held' : 'iterates ' + t.iterates;
  });
}

// Assemble the run-config the #138 orchestrator consumes. Keys mirror dev/loop.js's
// CLI flags — its process boundary — not runDeckLoop's internal opts: `profile`
// (=--profile, the picked loopType), `mapset` id (=--mapset, loop.js expands it to
// the maps array itself), `panel` (=--ai), `iters`/`n`. `nudge` is the taste the LLM
// drafter reads; `deck` records the active-deck fixture a candidate is measured
// against (loop.js has no --deck — the launching proxy applies it before the run).
function wbBuildConfig() {
  var ms = E.activeMapset() || {};
  return {
    loopType: WB_PLAN.loopType,
    profile: WB_PLAN.loopType,
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
}
