/* Iteration Workbench — the Plan / Run / Results / Trajectory shell (#139).
   Foundation surface #108 assumed already existed: this stands up the four-phase
   switcher and one labeled placeholder panel per phase. Each phase's real content
   is filled by its own follow-on ticket (Plan type/nudge, Temperature + Tolerance,
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

// The one iterated axis picked in Plan (#140). The ids ARE the Tolerance
// profile keys (game/content/tolerances.js, the authority) — the picked one is
// iterated, the other two HELD, and the id doubles as the loop's `profile`.
// tolerances.js is node-only (not loaded here), so this list can't derive from it;
// if a profile is renamed there, launch throws a loud `unknown profile` at the loop
// engine rather than corrupting silently.
var WB_LOOP_TYPES = [
  { id: 'card', label: 'Card', iterates: 'the deck' },
  { id: 'map',  label: 'Map',  iterates: 'the map' },
  { id: 'ai',   label: 'AI',   iterates: 'the AI weights' }
];
// Opening-nudge quick-chips — taste presets that append to the free-text nudge.
var WB_CHIPS = ['shorten games', 'punish turtling', 'reward aggression', 'make cavalry matter', 'tighten first-mover edge'];
// Author-boldness Temperature (#164) — how far from proven patterns the Author subagent
// may stray. A plain passthrough scalar: no gate, nothing folded, handed to the Author's
// prompt. `standard` is the loose-enough default so a normal run keeps something.
var WB_TEMPERATURES = ['safe', 'standard', 'bold', 'wild'];
// `tolerance` = the working Tolerance the operator edits before a run — a deep copy
// of the picked loop type's default profile (game/content/tolerances.js), loaded
// by wbLoadProfile on render and on every loop-type switch. Sparse {key: grace};
// an omitted key ⇒ hold, the fixed ruler. The Tolerance shapes/flags balance drift;
// it never rejects a run.
var WB_PLAN = { loopType: 'card', panel: ['hard'], iters: 6, n: 20, tolerance: null, temperature: 'standard' };
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
  WB_RUN_STATUS = null; WB_RESULTS = null;   // predictable re-entry: a prior run's live status / results don't linger as if current
  wbLoadProfile(WB_PLAN.loopType);   // reset the accept-settings default on open (predictable re-entry)
  var tabs = WORKBENCH_PHASES.map(function (p) {
    return '<button class="wb-tab' + (p.id === WB_PHASE ? ' sel' : '') +
      '" data-phase="' + p.id + '" type="button"><b>' + p.n + '</b> ' + p.label + '</button>';
  }).join('<span class="wb-step">&rarr;</span>');

  var panes = WORKBENCH_PHASES.map(function (p) {
    var body = p.id === 'plan' ? wbPlanBody()
      : p.id === 'run' ? '<div id="wbRun">' + wbRunBody() + '</div>'
      : p.id === 'results' ? '<div id="wbAuthored">' + wbAuthoredBody() + '</div><div id="wbResults">' + wbResultsBody() + '</div>'
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
  wbWireRun();
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
    '<label class="small wb-lbl">Temperature <span class="wb-hint">&mdash; author boldness: how far from proven patterns the Author may stray</span></label>' +
    '<div id="wbTemp" class="wb-temps">' + wbTempBody() + '</div>' +
    '<label class="small wb-lbl">Tolerance <span class="wb-hint">&mdash; balance band, grace per axis (click to escalate; Red%/1st% hard-flagged, always a loud flag never a reject)</span></label>' +
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

// Resolve the profiles authority (tolerances.js → WOA_TOLERANCES) + the band
// mechanism (report-model → WOA_REPORT). Both load before this in index.html; a
// browser-order slip degrades the panel to a note rather than throwing.
function wbTols() { return (typeof WOA_TOLERANCES !== 'undefined') ? WOA_TOLERANCES : null; }

// Deep-copy the default profile for a loop type into WB_PLAN.tolerance (the working
// Tolerance). Balance axes (Red%/1st%) are never in a default profile's tolerances —
// they stay held, rendered as a locked flag row below.
function wbLoadProfile(id) {
  var T = wbTols(), p = T && T.profiles[id];
  WB_PLAN.tolerance = p ? { name: p.name, tolerances: Object.assign({}, p.tolerances) } : null;
}

// The author-boldness Temperature picker: one pill per level, the picked one selected.
// A plain scalar knob (WB_PLAN.temperature) — no gate, carried straight into the config.
function wbTempBody() {
  return WB_TEMPERATURES.map(function (t) {
    return '<button type="button" class="wb-temp' + (t === WB_PLAN.temperature ? ' sel' : '') +
      '" data-temp="' + t + '">' + t + '</button>';
  }).join('');
}

// The Tolerance rows: the hard-flagged balance pair (Red%/1st%, locked at hold) then one
// clickable pill per loosenable Tolerance axis, showing its grace class.
function wbAcceptBody() {
  var T = wbTols(), R = (typeof WOA_REPORT !== 'undefined') ? WOA_REPORT : null;
  if (!T || !WB_PLAN.tolerance) return '<p class="small wb-hint">Tolerance profiles unavailable.</p>';
  function label(k) { var b = R && R.bands(k, 'hold'); return (b && b.label) || k; }
  var rows = T.HARD_FLAGGED.map(function (k) {
    return '<div class="wb-tol flagged" data-metric="' + k + '"><b>' + label(k) +
      '</b><span class="wb-grace">hold &middot; hard-flagged</span></div>';
  });
  var tol = WB_PLAN.tolerance.tolerances;
  Object.keys(tol).forEach(function (k) {
    rows.push('<button type="button" class="wb-tol" data-metric="' + k + '"><b>' + label(k) +
      '</b><span class="wb-grace">' + tol[k] + '</span></button>');
  });
  return rows.join('');
}

// Escalate one loosenable Tolerance one step around the grace cycle
// (hold→nudge→bold→bypass→hold). Balance axes (Red%/1st%) are locked out — they are
// not buttons and are refused here too.
function wbCycleTol(k) {
  var T = wbTols(), tol = WB_PLAN.tolerance && WB_PLAN.tolerance.tolerances;
  if (!T || !tol || T.HARD_FLAGGED.indexOf(k) >= 0) return;
  var order = T.GRACE, i = order.indexOf(tol[k]);
  tol[k] = order[(i + 1) % order.length];
  wbRenderAccept();
}

function wbWireAccept() {
  document.querySelectorAll('#wbAccept button.wb-tol').forEach(function (b) {
    b.onclick = function () { wbCycleTol(b.getAttribute('data-metric')); };
  });
}

// Pick the author-boldness Temperature; the picked pill flips to `sel`.
function wbPickTemp(t) {
  if (WB_TEMPERATURES.indexOf(t) < 0) return;
  WB_PLAN.temperature = t;
  document.querySelectorAll('#wbTemp .wb-temp').forEach(function (b) {
    b.classList.toggle('sel', b.getAttribute('data-temp') === t);
  });
}

function wbWireTemp() {
  document.querySelectorAll('#wbTemp .wb-temp').forEach(function (b) {
    b.onclick = function () { wbPickTemp(b.getAttribute('data-temp')); };
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
  wbWireTemp();
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
// the exception — it carries the EDITED Tolerance OBJECT (not the --profile key
// string), which runDeckLoop's opts.profile accepts directly, so a launching proxy
// forwards it as-is (the CLI --profile can't express an escalated profile). `loopType`
// keeps the picked-type string for display. `temperature` is the author-boldness knob
// (#164), a plain passthrough. `nudge` is the taste the LLM drafter reads; `deck` records
// the active-deck fixture a candidate is measured against (loop.js has no --deck — the
// launching proxy applies it before the run).
function wbBuildConfig() {
  var ms = E.activeMapset() || {};
  return {
    loopType: WB_PLAN.loopType,
    // `profile` carries the operator's EDITED Tolerance object (name/tolerances) —
    // runDeckLoop's opts.profile accepts an object directly (dev/loop.js), so the
    // per-axis escalations flow straight into the run. Falls back to the loop-type key
    // string only if the profiles authority failed to load (browser-order slip).
    profile: WB_PLAN.tolerance ? { name: WB_PLAN.tolerance.name, tolerances: Object.assign({}, WB_PLAN.tolerance.tolerances) } : WB_PLAN.loopType,
    // `temperature` — author-boldness, a plain passthrough value (Plan → Author prompt, #164).
    temperature: WB_PLAN.temperature,
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
  if (id === 'results') wbLoadAuthored();         // refresh the Author's this-run feed from logs/authored each open
}

/* Authored feed (#165) — the card-Author's SHAPING of the catalog this run, rendered as
   cards (never JSON). Read live from GET /api/authored (logs/authored/latest.json, which
   dev/author-card.js writes on every add/edit/remove). Each record is a rendered card face
   with an add / edit / removed badge so the three moves are visibly distinguished — the
   Author's file writes are visible as content, not only a git diff (spec §12, §2).
   Feed shape: { nudge, temperature, authoredAt, cards:[{ action:'add'|'edit'|'remove',
   card:{id,name,text,points,steps}, before?, note }] }. */
var WB_AUTHORED = null;

// Human-readable step line for a card face — same idiom as wbResCards (type + signed mod),
// extended to name a deploy's unit and flag tieSpare/noAdvance/anywhere so the reader sees
// what the card actually does, not just "attack".
function wbCardSteps(steps) {
  return (steps || []).map(function (s) {
    var t = wbEsc(s.type);
    if (s.unit) t += ' ' + wbEsc(s.unit);
    if (s.mod != null && s.mod !== 0) t += ' ' + (s.mod > 0 ? '+' : '') + s.mod;
    var flags = ['tieSpare', 'noAdvance', 'anywhere'].filter(function (f) { return s[f]; });
    if (flags.length) t += ' (' + flags.join(', ') + ')';
    return t;
  }).join(' &middot; ');
}

// One authored card: the REAL game card face (app.js cardFace, the one shared renderer)
// with an add/edit/remove badge + coloured frame so a glance tells the three moves apart;
// a removed card is dimmed + struck (it left the catalog). Authored cards have no art file
// yet, so the face shows the standard "art/<id>.jpg" placeholder. Evidence — army-points
// cost, the step breakdown, and the note — sits beneath the card.
function wbAuthoredCard(rec) {
  var act = { add: 1, edit: 1, remove: 1 }[rec && rec.action] ? rec.action : 'add';
  var badge = { add: 'added', edit: 'edited', remove: 'removed' }[act];
  var card = (rec && rec.card) || {};
  var steps = wbCardSteps(card.steps);
  var meta = [];
  if (card.points != null) meta.push(wbEsc(String(card.points)) + ' pts');
  if (steps) meta.push(steps);
  var graded = rec && rec.findings && rec.findings.axes && rec.findings.axes.length ? ' has-findings' : '';
  return '<div class="wb-authored ' + act + graded + '">' +
    '<span class="wb-act ' + act + '">' + badge + '</span>' +
    '<div class="card wb-auth-face">' + cardFace(card, { placeholder: true }) + '</div>' +
    (meta.length ? '<div class="small wb-hint wb-auth-meta">' + meta.join(' &middot; ') + '</div>' : '') +
    (rec && rec.note ? '<div class="small wb-built-note wb-auth-note">' + wbEsc(rec.note) + '</div>' : '') +
    wbAuthoredFindings(rec) +
    '</div>';
}

/* The FRESH grader's rubric findings under the card (#166). Distinct from the balance numbers
   (Simple%/1stSight% live in the Run/Results anomaly + built-card blocks): these are the
   subjective read — per axis, POSITION (where the card sits) + VELOCITY (the fix toward good),
   prose, never a score/band/pass-fail. The finding record carries each axis keyed with its
   title + setFit (grade-card.js stamps them from the one axis source), so we render a pure
   function of the data: the SET-FIT (catalog-fit, #163) finding is pulled out into its own
   labelled block, the per-card axes follow, and the Author's one-fix-pass outcome closes it —
   the card proceeds regardless of what the grader said (it cannot bounce). */
function wbAuthoredFinding(f) {
  return '<div class="wb-finding' + (f.setFit ? ' wb-setfit' : '') + '">' +
    '<div class="wb-fx-axis">' + (f.setFit ? '<span class="wb-fx-tag">set-fit</span> ' : '') + wbEsc(f.title) + '</div>' +
    '<div class="small wb-fx-pos"><b>Position</b> ' + wbEsc(f.position) + '</div>' +
    '<div class="small wb-fx-vel"><b>Velocity</b> ' + wbEsc(f.velocity) + '</div>' +
    '</div>';
}
function wbAuthoredFindings(rec) {
  var g = rec && rec.findings;
  if (!g || !(g.axes && g.axes.length)) return '';
  // set-fit first (its own block), then the per-card axes, so catalog-fit isn't buried.
  var ordered = g.axes.slice().sort(function (a, b) { return (b.setFit ? 1 : 0) - (a.setFit ? 1 : 0); });
  var fx = g.fixPass;
  return '<div class="wb-findings">' +
    '<div class="small wb-lbl wb-fx-head">Rubric findings <span class="wb-hint">&mdash; fresh grader, an aim not a gate</span></div>' +
    ordered.map(wbAuthoredFinding).join('') +
    (fx ? '<div class="small wb-fixpass"><b>Author\'s one fix pass:</b> ' +
      (fx.note ? wbEsc(fx.note) : (fx.applied ? 'applied' : 'none')) +
      ' <span class="wb-hint">&mdash; card proceeds regardless</span></div>' : '') +
    '</div>';
}

function wbAuthoredBody() {
  var f = WB_AUTHORED;
  if (!f || !(f.cards && f.cards.length)) {
    return '<label class="small wb-lbl">Authored this run <span class="wb-hint">&mdash; the catalog the Author shaped</span></label>' +
      '<p class="small wb-hint">No authored content yet &mdash; when the card Author runs, each card it ' +
      '<b>adds / edits / removes</b> lands here as a rendered card, read live from <code>logs/authored/latest.json</code>.</p>';
  }
  var meta = [];
  if (f.nudge) meta.push('nudge <b>' + wbEsc(f.nudge) + '</b>');
  if (f.temperature) meta.push('temperature <b>' + wbEsc(f.temperature) + '</b>');
  var counts = { add: 0, edit: 0, remove: 0 };
  f.cards.forEach(function (r) { if (counts[r.action] != null) counts[r.action]++; });
  var summary = counts.add + ' added &middot; ' + counts.edit + ' edited &middot; ' + counts.remove + ' removed';
  return '<label class="small wb-lbl">Authored this run <span class="wb-hint">&mdash; ' + summary + '</span></label>' +
    (meta.length ? '<div class="small wb-hint" style="margin-bottom:6px">' + meta.join(' &middot; ') + '</div>' : '') +
    '<div class="wb-auth-grid">' + f.cards.map(wbAuthoredCard).join('') + '</div>';
}

// Inject an authored feed and re-render the Authored pane in place. The live loader calls
// this from a fetch; the red-test (dev/smoke.js) calls it with a mock feed.
function wbSetAuthored(feed) {
  WB_AUTHORED = feed;
  var el = document.getElementById('wbAuthored');
  if (el) el.innerHTML = wbAuthoredBody();
}

// Refresh the authored feed from the server each time Results opens (like Trajectory).
// Fails open to the idle note if the read hiccups or runs under file:// with no server.
function wbLoadAuthored() {
  if (typeof fetch !== 'function') return;
  fetch('/api/authored').then(function (r) { return r.ok ? r.json() : { cards: [] }; })
    .then(function (feed) { wbSetAuthored(feed); })
    .catch(function () { /* keep whatever is shown */ });
}

/* Run phase (#144) — a live monitor for the running loop (#138). The browser has
   no bridge to the node loop process (mirrors the launch handoff, WB_ON_LAUNCH), so
   a follow-on server proxy tails the loop's LOOP_STEP/LOOP_RESULT stdout and calls
   wbSetRunStatus(status); until one runs, the pane shows an idle note. The panel is a
   pure render of that status object, so the red-test feeds it a mock (dev/smoke.js).
   Status shape (every field optional — a partial status still renders):
     { loopType, state:'running'|'paused'|'stopped'|'done', iter, iters, swept,
       best:{candidate,score}, steps:[LOOP_STEP,...],
       signals:{ declines:[{card,declined,offered}], zeroKills:{count,total}, feelNotes:{count} } } */
var WB_RUN_STATUS = null;
// Majority of offered turns declined = "worth a look" (the #89 declined tell).
var WB_DECLINE_FLAG = 0.6;
// pause/stop/resume signalled back to the loop — a hook a proxy overrides to POST the
// control; the default just surfaces it (same posture as WB_ON_LAUNCH).
var WB_ON_CONTROL = function (action) {
  if (typeof toast === 'function') toast('Loop ' + action + ' requested.', 2000);
  if (typeof console !== 'undefined') console.log('WB_CONTROL', action);
};

// Inject a fresh loop status and re-render the Run pane in place. The proxy calls
// this per LOOP_STEP; the red-test calls it with a mock status.
function wbSetRunStatus(status) {
  WB_RUN_STATUS = status;
  var el = document.getElementById('wbRun');
  if (el) { el.innerHTML = wbRunBody(); wbWireRun(); }
}

// Classify the run signals into "worth a look" items — the tells worth catching
// mid-run. Each item: { level:'flag'|'ok', text }. A card that declined a majority of
// its offered turns, any zero-kill stalemate, and whether debrief feel-notes engaged.
function wbRunAnomalies(s) {
  var sig = (s && s.signals) || {}, out = [];
  (sig.declines || []).forEach(function (d) {
    if (d.offered && d.declined / d.offered >= WB_DECLINE_FLAG) {
      out.push({ level: 'flag', text: '<b>' + wbEsc(d.card) + '</b> declined ' + d.declined + '/' + d.offered +
        ' offered turns (' + Math.round(100 * d.declined / d.offered) + '%) — a card the AI keeps passing up' });
    }
  });
  if (sig.zeroKills && sig.zeroKills.count > 0) {
    out.push({ level: 'flag', text: sig.zeroKills.count + ' zero-kill stalemate' + (sig.zeroKills.count === 1 ? '' : 's') +
      (sig.zeroKills.total ? ' of ' + sig.zeroKills.total + ' skirmishes' : '') + ' — games ending with nothing traded' });
  }
  if (sig.feelNotes) {
    out.push(sig.feelNotes.count > 0
      ? { level: 'ok', text: 'feel-notes engaged — ' + sig.feelNotes.count + ' debrief note' + (sig.feelNotes.count === 1 ? '' : 's') + ' captured' }
      : { level: 'flag', text: 'feel-notes silent — the debrief is producing no notes this run' });
  }
  return out;
}

function wbAnomalyPanel(s) {
  var items = wbRunAnomalies(s);
  var body = items.length
    ? items.map(function (a) {
        return '<div class="wb-anom ' + a.level + '"><span class="wb-anom-dot"></span><span>' + a.text + '</span></div>';
      }).join('')
    : '<p class="small wb-hint">Nothing worth a look yet — no declined-card, stalemate, or silent-debrief tell so far.</p>';
  return '<label class="small wb-lbl">Worth a look <span class="wb-hint">&mdash; anomalies auto-flagged mid-run</span></label>' +
    '<div id="wbAnom" class="wb-anoms">' + body + '</div>';
}

// The Run pane body: progress (iteration / swept / running-best / state), pause+stop
// controls, a tail of recent LOOP_STEP lines, and the Worth-a-look anomaly panel.
function wbRunBody() {
  var s = WB_RUN_STATUS;
  if (!s) return '<p class="small wb-hint">No loop running &mdash; assemble one in <b>Plan &rarr; Launch</b>. ' +
    'Once the loop reports, this phase tracks iteration, skirmishes swept, and the running-best, live, and flags anything worth a look.</p>';
  var stat = function (k, v) { return '<div class="wb-stat"><div class="wb-stat-k">' + k + '</div><div class="wb-stat-v">' + v + '</div></div>'; };
  var state = s.state || 'running';
  var best = s.best ? s.best.score + (s.best.candidate ? ' <span class="wb-hint">' + wbEsc(s.best.candidate) + '</span>' : '') : '&mdash;';
  var stats = '<div class="wb-stats">' +
    stat('iteration', (s.iter != null ? s.iter : '?') + ' / ' + (s.iters != null ? s.iters : '?')) +
    stat('swept', s.swept != null ? s.swept : '&mdash;') +
    stat('running-best', best) +
    stat('state', '<span class="wb-run-state ' + state + '">' + state + '</span>') +
    '</div>';
  var running = state === 'running' || state === 'paused';
  var controls = '<div class="ovr-btns wb-run-ctrls">' +
    '<button id="wbPause" type="button"' + (running ? '' : ' disabled') + '>' + (state === 'paused' ? 'Resume' : 'Pause') + '</button>' +
    '<button id="wbStop" type="button" class="ghost"' + (running ? '' : ' disabled') + '>Stop</button></div>';
  var steps = (s.steps || []).slice(-8).map(function (st) {
    var v = st.verdict || '?';
    return '<div class="wb-log-row ' + v + '"><code>iter ' + st.iter + '</code> ' + wbEsc(st.candidate || '') +
      ' &middot; score ' + (st.score != null ? st.score : '?') +
      (st.velocity != null ? ' &middot; vel ' + (st.velocity > 0 ? '+' : '') + st.velocity : '') +
      ' &middot; <b class="wb-verdict">' + v + '</b>' + (st.reason ? ' <span class="wb-hint">' + wbEsc(st.reason) + '</span>' : '') + '</div>';
  }).join('');
  var log = '<label class="small wb-lbl">Log tail <span class="wb-hint">&mdash; latest iterations</span></label>' +
    '<div id="wbRunLog" class="wb-log">' + (steps || '<p class="small wb-hint">No iterations reported yet.</p>') + '</div>';
  return stats + controls + wbAnomalyPanel(s) + log;
}

function wbWireRun() {
  var pause = document.getElementById('wbPause'), stop = document.getElementById('wbStop');
  var st = WB_RUN_STATUS && WB_RUN_STATUS.state;
  if (pause) pause.onclick = function () { WB_ON_CONTROL(st === 'paused' ? 'resume' : 'pause'); };
  if (stop) stop.onclick = function () { WB_ON_CONTROL('stop'); };
}

/* Results phase (#145) — leads with the CONTENT the loop built, not metrics. The
   browser has no bridge to the node loop, so (like Run) a follow-on server proxy
   injects the final candidate set via wbSetResults(results); the panel is a pure
   render of it, and the red-test feeds a mock (dev/smoke.js). Reports (balance,
   feels debriefs #111) are nested under <details>, deliberately not the front page;
   the Run-phase "worth a look" flags carry forward from results.signals.
   Results shape (every field optional — a partial result still renders):
     { loopType, adopted, total, runId,
       cards:   [{ tag:'keep'|'iterate'|'cut', change:'new'|'tuned'|'held',
                   card:{name,cost,text,steps:[{type,mod}]}, resid, win, seen, note }],
       maps:    [{ tag, name, def:<shapeDef>, drag, swings, verdict }],
       weights: [{ personality, deltas:[{key, before, after}] }],
       balance: { metrics:[{label,value,cls}], note },   // nested, collapsed
       feels:   { count, notes:[string,...] },            // nested, collapsed
       signals: {...} } // same shape wbRunAnomalies reads — carried forward */
var WB_RESULTS = null;

// Inject the final candidate set and re-render the Results pane in place. The proxy
// calls this once the loop finishes; the red-test calls it with a mock.
function wbSetResults(results) {
  WB_RESULTS = results;
  var el = document.getElementById('wbResults');
  if (el) el.innerHTML = wbResultsBody();
}

// keep/iterate/cut pill — the verdict on a built card or map. Whitelisted: the
// tag is proxy-fed, so an unexpected value falls back to 'keep' rather than
// interpolating untrusted text into the class + label (the file's wbEsc posture).
function wbTagPill(tag) {
  var t = { keep: 1, iterate: 1, cut: 1 }[tag] ? tag : 'keep';
  return '<span class="wb-tag ' + t + '">' + t + '</span>';
}

// One built card face: the pill + change-note, the card itself (cost/text/steps),
// then resid·win·seen as evidence BENEATH the design (the issue's ordering).
function wbResCards(cards) {
  if (!cards || !cards.length) return '';
  var faces = cards.map(function (c) {
    var card = c.card || {};
    var steps = (card.steps || []).map(function (s) {
      return wbEsc(s.type) + (s.mod != null && s.mod !== 0 ? ' ' + (s.mod > 0 ? '+' : '') + s.mod : '');
    }).join(' &middot; ');
    var ev = [];
    if (c.resid != null) ev.push('resid ' + c.resid);
    if (c.win != null) ev.push('win ' + c.win);
    if (c.seen != null) ev.push('seen ' + c.seen);
    return '<div class="wb-built">' +
      '<div class="wb-built-hd">' + wbTagPill(c.tag) +
        '<b class="wb-built-name">' + wbEsc(card.name || '?') + '</b>' +
        (card.cost != null ? '<span class="wb-hint">cost ' + wbEsc(String(card.cost)) + '</span>' : '') +
        (c.change ? '<span class="wb-change">' + wbEsc(c.change) + '</span>' : '') + '</div>' +
      (card.text ? '<div class="wb-built-text">' + wbEsc(card.text) + '</div>' : '') +
      (steps ? '<div class="small wb-hint wb-built-steps">' + steps + '</div>' : '') +
      (c.note ? '<div class="small wb-built-note">' + wbEsc(c.note) + '</div>' : '') +
      (ev.length ? '<div class="small wb-hint wb-built-ev">' + ev.join(' &middot; ') + '</div>' : '') +
      '</div>';
  }).join('');
  return '<label class="small wb-lbl">Cards built <span class="wb-hint">&mdash; tagged keep / iterate / cut; evidence beneath the design</span></label>' +
    '<div class="wb-built-grid">' + faces + '</div>';
}

// One built map: the outline thumbnail (reusing previewSVG) + the Drag/Swings
// feel-read and verdict. previewSVG needs the engine geometry; guard it.
function wbResMaps(maps) {
  if (!maps || !maps.length) return '';
  var tiles = maps.map(function (m) {
    var svg = '';
    try { if (typeof previewSVG === 'function' && m.def) svg = previewSVG(m.def); } catch (e) { svg = ''; }
    var feel = [];
    if (m.drag != null) feel.push('Drag ' + m.drag);
    if (m.swings != null) feel.push('Swings ' + m.swings);
    return '<div class="wb-built">' +
      '<div class="wb-built-hd">' + wbTagPill(m.tag) + '<b class="wb-built-name">' + wbEsc(m.name || '?') + '</b></div>' +
      (svg ? '<div class="wb-map-thumb">' + svg + '</div>' : '') +
      (feel.length ? '<div class="small wb-hint wb-built-ev">' + feel.join(' &middot; ') + '</div>' : '') +
      (m.verdict ? '<div class="small wb-built-note">' + wbEsc(m.verdict) + '</div>' : '') +
      '</div>';
  }).join('');
  return '<label class="small wb-lbl">Maps built <span class="wb-hint">&mdash; outline + Drag/Swings feel-read</span></label>' +
    '<div class="wb-built-grid">' + tiles + '</div>';
}

// Heuristic deltas — the AI_WEIGHTS the loop tuned, per personality, before&rarr;after.
function wbResWeights(weights) {
  if (!weights || !weights.length) return '';
  var blocks = weights.map(function (w) {
    var rows = (w.deltas || []).map(function (d) {
      var moved = d.before !== d.after;
      return '<div class="wb-wrow' + (moved ? ' moved' : '') + '"><code>' + wbEsc(d.key) + '</code>' +
        '<span class="wb-wdelta">' + wbEsc(String(d.before)) + ' &rarr; <b>' + wbEsc(String(d.after)) + '</b></span></div>';
    }).join('');
    return '<div class="wb-built"><div class="wb-built-hd"><b class="wb-built-name">' + wbEsc(w.personality || '?') + '</b></div>' + rows + '</div>';
  }).join('');
  return '<label class="small wb-lbl">Heuristic deltas <span class="wb-hint">&mdash; AI_WEIGHTS the loop tuned, per personality</span></label>' +
    '<div class="wb-built-grid">' + blocks + '</div>';
}

// The nested balance report (collapsed by default): the full metrics table is one
// click away, deliberately not the front page. metrics = [{label,value,cls}].
function wbResBalance(balance) {
  var m = balance && balance.metrics;
  var body = (m && m.length)
    ? '<div class="wb-log">' + m.map(function (r) {
        return '<div class="wb-log-row"><b>' + wbEsc(r.label) + '</b> &middot; ' +
          '<span class="' + (r.cls ? 'wb-band ' + wbEsc(r.cls) : '') + '">' + wbEsc(String(r.value)) + '</span></div>';
      }).join('') + '</div>'
    : '<p class="small wb-hint">Full metrics live on the Balance Dashboard and in <code>logs/reports/balance</code>.</p>';
  return '<details class="wb-details"><summary>Balance report' +
    (balance && balance.note ? ' <span class="wb-hint">&mdash; ' + wbEsc(balance.note) + '</span>' : '') +
    '</summary>' + body + '</details>';
}

// Feels debriefs (#111) nested (collapsed): the debrief notes captured this run.
function wbResFeels(feels) {
  if (!feels) return '';
  var notes = (feels.notes || []);
  var body = notes.length
    ? '<div class="wb-log">' + notes.map(function (n) { return '<div class="wb-log-row">' + wbEsc(n) + '</div>'; }).join('') + '</div>'
    : '<p class="small wb-hint">No debrief notes captured this run.</p>';
  return '<details class="wb-details"><summary>Feels debriefs' +
    (feels.count != null ? ' <span class="wb-hint">&mdash; ' + feels.count + ' note' + (feels.count === 1 ? '' : 's') + '</span>' : '') +
    '</summary>' + body + '</details>';
}

// The Run-phase "worth a look" flags, carried forward into Results.
function wbResFlags(s) {
  var items = wbRunAnomalies(s);
  if (!items.length) return '';
  var body = items.map(function (a) {
    return '<div class="wb-anom ' + a.level + '"><span class="wb-anom-dot"></span><span>' + a.text + '</span></div>';
  }).join('');
  return '<label class="small wb-lbl">Worth a look <span class="wb-hint">&mdash; carried forward from the run</span></label>' +
    '<div class="wb-anoms">' + body + '</div>';
}

// The Results pane body: built content leads (cards, maps, heuristic deltas), the
// carried-forward flags, then the reports nested collapsed beneath.
function wbResultsBody() {
  var r = WB_RESULTS;
  if (!r) return '<p class="small wb-hint">No results yet &mdash; finish a loop in <b>Run</b> and its final candidate set lands here: ' +
    'the content it built (cards / maps / heuristic deltas) tagged keep / iterate / cut, with the balance and feels reports nested beneath.</p>';
  var head = '';
  if (r.adopted != null || r.total != null) {
    head = '<div class="small wb-hint" style="margin-bottom:8px">' +
      (r.loopType ? '<b>' + wbEsc(r.loopType) + '</b> loop &middot; ' : '') +
      (r.adopted != null && r.total != null ? r.adopted + ' of ' + r.total + ' candidates adopted' : '') +
      (r.runId != null ? ' &middot; run ' + wbEsc(String(r.runId)) : '') + '</div>';
  }
  var built = wbResCards(r.cards) + wbResMaps(r.maps) + wbResWeights(r.weights);
  if (!built) built = '<p class="small wb-hint">This run adopted no new content.</p>';
  return head + wbResFlags(r) + built + wbResBalance(r.balance) + wbResFeels(r.feels);
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
    // Only a loop run (tool 'loop.js') writes a parent_id chain; any other run's
    // rows are all parent_id NULL, so there is nothing to fetch or fold for them.
    var run = (runs || []).filter(function (x) { return x.tool === 'loop.js'; })[0];
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
  var stat = function (k, v) { return '<div class="wb-stat"><div class="wb-stat-k">' + k + '</div><div class="wb-stat-v">' + v + '</div></div>'; };
  return '<div class="small wb-hint" style="margin-bottom:6px">balanceScore &middot; the fixed ruler (#83) &middot; lower = closer to ideal (target ' + m.target + ') &middot; live from <code>logs/woa.db</code> run ' + wbEsc(String(run.id)) + '</div>' +
    wbTrajSvg(m) +
    '<p class="small wb-hint" style="margin-top:4px">Solid line &amp; filled dots = the <b>champion</b> (adopted incumbent). Hollow red dots = candidates the loop <b>tried and dropped</b>. Copper = the last candidate tried (verdict not in the chain).</p>' +
    '<div class="wb-stats">' +
      stat('iterations', m.iters.length) +
      stat('adopted', m.adopted) +
      stat('rejected', m.rejected) +
      stat('champion score', m.championScore != null ? m.championScore.toFixed(1) : '&mdash;') +
    '</div>';
}
