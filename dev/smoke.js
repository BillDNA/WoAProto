/* Headless UI smoke test: boots index.html in jsdom, plays a full AI-vs-AI
   skirmish through the real DOM, pokes the maps screen and the editor.
   Run from the repo root:  node --test dev/smoke.js  (or `npm test`) */
var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));

var GAME = path.join(__dirname, '..', 'game');
function read(f) { return fs.readFileSync(path.join(GAME, f), 'utf8'); }

// content/ is loaded in the browser by content/manifest.js via document.write;
// jsdom has no external loader, so inline every content file (they populate
// window.WOA_CONTENT the same way) plus the core scripts.
function readContent() {
  var out = '';
  ['cards', 'decks', 'maps'].forEach(function (kind) {   // cards catalog (#159): deck refs hydrate against it
    var d = path.join(GAME, 'content', kind);
    fs.readdirSync(d).filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) {
      out += fs.readFileSync(path.join(d, f), 'utf8') + '\n';
    });
  });
  return out;
}
var html = read('index.html');
// inline EVERY <script src> so jsdom needs no loader — the manifest tag expands
// to the content files (same document.write effect), everything else reads
// straight from disk. Any tag left un-replaced is a loud failure, not a silent
// no-op, so a changed tag can't quietly drop a script.
html = html.replace(/<script src="([^"]+)"><\/script>/g, function (tag, src) {
  if (src === 'content/manifest.js') return '<script>' + readContent() + '</script>';
  return '<script>' + read(src) + '</script>';
});
if (/<script [^>]*src=/.test(html)) {
  throw new Error('un-inlined <script src> tag survived (inliner regex mismatch)');
}

// One async node:test: the whole play-through is a single linear flow, so any
// failed assertion (or app error) thrown in a scheduled callback rejects this
// promise and fails the test. 180s covers the dashboard's real balance runs.
test('headless UI smoke (jsdom)', { timeout: 180000 }, () => new Promise((resolve, reject) => {
// Serve the page from an http origin — the local server (node game/server.js)
// is the only supported run path (ADR-0001), so the UI is always server-backed.
var dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/game/index.html' });
var win = dom.window, doc = win.document;
win.confirm = function () { return true; };
// jsdom ships no fetch; stand in a fail-open no-op server so the always-on
// /api paths (skirmish recording, run listing, saves) resolve without a real
// backend — GET /api/runs returns no runs. overviewSmoke overrides this with a
// seeded-runs stub for its own fixtures.
win.fetch = function () {
  return Promise.resolve({ ok: true, json: function () { return Promise.resolve([]); } });
};

// jsdom has no rAF-based timers issue but uses real setTimeout — speed the AI up.
// Wrap the raw scheduler so a thrown assertion (or app error) inside any
// scheduled callback rejects the test promise instead of dying as an uncaught
// jsdom exception.
var rawSetTimeout = win.setTimeout;
function realSetTimeout(fn, ms) { return rawSetTimeout(function () { try { return fn(); } catch (e) { reject(e); } }, ms); }
win.setTimeout = function (fn, ms) { return realSetTimeout(fn, Math.min(ms || 0, 5)); };

// The real server-served launch/control hooks (boot.js) — captured before the
// #144 section overrides them with capture stubs, so the #154 loop-bridge section
// can drive the genuine POST-to-/api/runloop flow.
var wbRealLaunch, wbRealControl;
realSetTimeout(function () {
  console.log('== boot ==');
  wbRealLaunch = win.WB_ON_LAUNCH; wbRealControl = win.WB_ON_CONTROL;
  assert.ok(win.Engine && win.Engine.MAPS.length >= 5, 'engine loaded the map roster (' + (win.Engine && win.Engine.MAPS.length) + ' maps)');
  assert.ok(doc.querySelectorAll('#edShape option').length === Object.keys(win.Engine.SHAPES).length + 1,
    'editor shape dropdown = maps.js shapes + the Custom entry');

  console.log('== iteration workbench shell (#139) ==');
  doc.getElementById('btnWorkbench').click();
  assert.ok(doc.getElementById('wbScr').classList.contains('active'), 'workbench screen shown');
  var wbTabs = doc.querySelectorAll('#wbNav .wb-tab');
  var wbPhases = Array.prototype.map.call(wbTabs, function (b) { return b.getAttribute('data-phase'); });
  assert.deepStrictEqual(wbPhases, ['plan', 'run', 'results', 'trajectory'],
    'all four phase tabs present in order (got ' + wbPhases.join(',') + ')');
  assert.ok(doc.querySelector('#wbNav .wb-tab.sel').getAttribute('data-phase') === 'plan', 'Plan is the default phase');
  assert.ok(doc.getElementById('wbPane-plan').style.display !== 'none' &&
    doc.getElementById('wbPane-run').style.display === 'none', 'only the active phase pane is shown');
  // each tab switches the shown pane; every phase is now filled (Plan #140, Run
  // #144, Results #145, Trajectory #143), so none carries a placeholder body.
  wbPhases.forEach(function (id) {
    doc.querySelector('#wbNav .wb-tab[data-phase="' + id + '"]').click();
    assert.ok(win.WB_PHASE === id && doc.getElementById('wbPane-' + id).style.display !== 'none',
      'clicking the ' + id + ' tab shows its pane');
  });

  console.log('== Plan phase: loop-type picker + nudge + fixtures -> config (#140) ==');
  doc.querySelector('#wbNav .wb-tab[data-phase="plan"]').click();
  // #141 accept-settings pre-loads the picked loop type's default profile. On open the
  // loop type is Card, whose default loosens `swings` (Map's default does not).
  var acc0 = doc.getElementById('wbAccept');
  assert.ok(acc0 && acc0.querySelectorAll('.wb-tol').length > 0, 'accept-settings panel is populated on the Plan phase');
  assert.ok(acc0.querySelector('button.wb-tol[data-metric="swings"]'), 'Card profile pre-loaded (its swings Tolerance is present)');
  // AC1: three loop types (card/map/ai); one selected, the other two shown held.
  var ltypes = doc.querySelectorAll('#wbLoopTypes .wb-ltype');
  var ltIds = Array.prototype.map.call(ltypes, function (b) { return b.getAttribute('data-loop'); });
  assert.deepStrictEqual(ltIds, ['card', 'map', 'ai'], 'three loop types offered in order (got ' + ltIds.join(',') + ')');
  assert.ok(doc.querySelectorAll('#wbLoopTypes .wb-ltype.sel').length === 1, 'exactly one loop type selected');
  doc.querySelector('#wbLoopTypes .wb-ltype[data-loop="map"]').click();
  assert.ok(doc.querySelector('#wbLoopTypes .wb-ltype[data-loop="map"]').classList.contains('sel'), 'clicking Map selects it');
  assert.ok(doc.querySelector('#wbLoopTypes .wb-ltype[data-loop="card"]').classList.contains('held') &&
    doc.querySelector('#wbLoopTypes .wb-ltype[data-loop="ai"]').classList.contains('held'),
    'the two unpicked loop types are visibly marked held');
  assert.ok(!doc.querySelector('#wbLoopTypes .wb-ltype[data-loop="map"]').classList.contains('held'), 'the picked loop type is not held');

  console.log('== Plan phase: Tolerance + author-boldness Temperature (#141/#164) ==');
  // AC1: switching loop type re-loads the accept-settings default. Map loosens `control`
  // (Card does not) and drops Card's `swings`.
  var acc = doc.getElementById('wbAccept');
  assert.ok(acc.querySelector('button.wb-tol[data-metric="control"]') && !acc.querySelector('button.wb-tol[data-metric="swings"]'),
    'picking Map re-loads its default profile (control in, swings out)');
  // AC2: Red% / 1st% shown hard-flagged — locked at hold, a loud flag never a clickable escalation.
  var flaggedRows = acc.querySelectorAll('.wb-tol.flagged');
  assert.ok(flaggedRows.length === 2, 'two hard-flagged balance rows shown (got ' + flaggedRows.length + ')');
  Array.prototype.forEach.call(flaggedRows, function (r) {
    assert.ok(/hard-flagged/.test(r.textContent) && r.tagName !== 'BUTTON', 'balance row is locked (' + r.textContent.trim() + ')');
  });
  assert.ok(!acc.querySelector('button.wb-tol[data-metric="red"]') && !acc.querySelector('button.wb-tol[data-metric="first"]'),
    'Red% / 1st% are never rendered as loosenable buttons');
  // Each loosenable Tolerance renders its grace class; escalate one per-axis (nudge -> bold).
  var tolBtns = acc.querySelectorAll('button.wb-tol[data-metric]');
  assert.ok(tolBtns.length >= 1, 'loosenable Tolerance rows rendered');
  Array.prototype.forEach.call(tolBtns, function (b) {
    assert.ok(/hold|nudge|bold|bypass/.test(b.textContent), b.getAttribute('data-metric') + ' Tolerance shows its grace class');
  });
  var hq = acc.querySelector('button.wb-tol[data-metric="hq"]');
  assert.ok(hq && /nudge/.test(hq.textContent), 'HQ Tolerance pre-loads the profile default (nudge)');
  hq.click();
  assert.ok(/bold/.test(doc.getElementById('wbAccept').querySelector('button.wb-tol[data-metric="hq"]').textContent),
    'clicking a Tolerance escalates its grace one step (nudge -> bold)');

  // #164: the author-boldness Temperature picker — a separate knob from the Tolerance band.
  var temps = doc.querySelectorAll('#wbTemp .wb-temp');
  assert.ok(temps.length >= 2, 'author-boldness Temperature pills rendered (got ' + temps.length + ')');
  var selTemp = doc.querySelector('#wbTemp .wb-temp.sel');
  assert.ok(selTemp && selTemp.getAttribute('data-temp') === win.WB_PLAN.temperature, 'a Temperature is pre-selected (' + (selTemp && selTemp.textContent) + ')');
  var boldTemp = doc.querySelector('#wbTemp .wb-temp[data-temp="bold"]');
  assert.ok(boldTemp, 'a bolder Temperature level is offered');
  boldTemp.click();
  assert.ok(win.WB_PLAN.temperature === 'bold' && doc.querySelector('#wbTemp .wb-temp.sel').getAttribute('data-temp') === 'bold',
    'clicking a Temperature pill picks it (author-boldness = bold)');

  // nudge free-text + quick-chips (taste); a chip appends to the nudge.
  var nudge = doc.getElementById('wbNudge');
  assert.ok(nudge && nudge.tagName === 'TEXTAREA', 'opening-nudge textarea present');
  nudge.value = 'punish turtling';
  var chip = doc.querySelector('#wbChips .wb-chip');
  assert.ok(!!chip, 'quick-chips present');
  chip.click();
  assert.ok(nudge.value.indexOf('punish turtling') === 0 && nudge.value.length > 'punish turtling'.length,
    'clicking a chip appends its text to the nudge');
  // Fixtures summary names the deck / mapset / panel candidates are measured on.
  // (jsdom inlines only decks+maps content, so activeMapset() falls back to 'all'.)
  var ms = win.Engine.activeMapset();
  var msId = (ms && ms.id) || 'all';
  var fx = doc.getElementById('wbFixtures').textContent;
  assert.ok(/mapset/i.test(fx) && new RegExp(msId).test(fx) && /panel/i.test(fx) && /hard/.test(fx),
    'Fixtures summary shows the deck / mapset (' + msId + ') / panel (got: ' + fx.slice(0, 90) + ')');
  // AC2: Launch assembles the run-config the #138 orchestrator consumes and hands off.
  var launched = null;
  win.WB_ON_LAUNCH = function (cfg) { launched = cfg; };
  doc.getElementById('wbLaunch').click();
  assert.ok(launched && typeof launched === 'object', 'Launch hands a config object to the launch hook');
  assert.ok(launched === win.WB_LAST_CONFIG, 'the handed config is also exposed as WB_LAST_CONFIG');
  assert.ok(launched.loopType === 'map' && launched.profile && launched.profile.name === 'Map',
    'config carries the picked loop type (loopType string + the Tolerance profile, #138)');
  assert.ok(!('step' in launched.profile), 'the dead step field is gone from the run config (#164)');
  assert.ok(launched.nudge === nudge.value, 'config carries the opening nudge');
  assert.ok(launched.mapset === msId && Array.isArray(launched.panel) && launched.panel.length >= 1,
    'config carries the Fixtures (mapset id + personality panel) runDeckLoop consumes');
  // #141: the edited grace classes flow into the run config's Tolerance (profile is
  // the edited object runDeckLoop consumes), and balance axes never loosen into it.
  assert.ok(launched.profile && launched.profile.tolerances, 'config profile is the edited Tolerance object');
  assert.ok(launched.profile.tolerances.hq === 'bold', 'the per-axis escalation (HQ -> bold) flows into the run config');
  assert.ok(!('red' in launched.profile.tolerances) && !('first' in launched.profile.tolerances),
    'balance axes (Red%/1st%) never loosen into the config');
  // #164: the author-boldness Temperature is a separate passthrough scalar in the config.
  assert.ok(win.WB_TEMPERATURES && win.WB_TEMPERATURES.indexOf(launched.temperature) >= 0,
    'config carries the author-boldness Temperature (' + launched.temperature + ')');

  console.log('== Plan phase: debrief questionnaire editor (#142) ==');
  // AC1/2: the #111 questionnaire's entries (feel + reflex) render as editable
  // rows pre-run, not hardcoded prose — one row per WOA_QUESTIONNAIRE.questions.
  assert.ok(win.WOA_QUESTIONNAIRE && win.WOA_QUESTIONNAIRE.questions.length,
    'questionnaire.js loaded as a browser global');
  var qRows = doc.querySelectorAll('#wbQz .wb-qrow');
  assert.ok(qRows.length === win.WOA_QUESTIONNAIRE.questions.length,
    'editor lists every questionnaire entry (' + qRows.length + ' rows for ' + win.WOA_QUESTIONNAIRE.questions.length + ' questions)');
  var qIds = Array.prototype.map.call(doc.querySelectorAll('#wbQz .wb-qid'), function (c) { return c.textContent; });
  assert.ok(qIds.indexOf('feel') >= 0 && qIds.indexOf('reflex') >= 0,
    'feel + reflex entries present as rows (got ' + qIds.join(',') + ')');
  var qText = doc.querySelector('#wbQz .wb-qtext');
  assert.ok(qText && qText.tagName === 'TEXTAREA' && qText.value.trim(), 'each entry is an editable text field, not fixed prose');
  // editing a row updates the in-memory model that Save posts to the server.
  qText.value = 'edited question text';
  qText.dispatchEvent(new win.Event('input', { bubbles: true }));
  assert.ok(win.WB_QUESTIONS[0].text === 'edited question text', 'editing a row updates the questionnaire model');
  // + add question appends an editable row.
  doc.getElementById('wbQAdd').click();
  assert.ok(doc.querySelectorAll('#wbQz .wb-qrow').length === qRows.length + 1, '+ add question appends an editable row');
  doc.getElementById('wbQSave').click(); // persists through the (stubbed) server without error

  console.log('== Run phase: live loop monitor + Worth-a-look anomaly panel (#144) ==');
  doc.querySelector('#wbNav .wb-tab[data-phase="run"]').click();
  // Idle before any loop reports: no progress, just the "no loop running" note.
  assert.ok(/No loop running/i.test(doc.getElementById('wbRun').textContent), 'Run phase idle until the loop reports');
  // AC1: feed a mock #138 loop status (LOOP_STEP shape) and assert progress renders.
  win.wbSetRunStatus({
    loopType: 'card', state: 'running', iter: 3, iters: 6, swept: 1200,
    best: { candidate: 'cand2', score: 4.1 },
    steps: [
      { iter: 1, candidate: 'cand1', score: 5.2, velocity: -0.3, verdict: 'reject', reason: 'no improvement (-0.30)' },
      { iter: 2, candidate: 'cand2', score: 4.1, velocity: 1.1, verdict: 'adopt', reason: 'healthier by 1.10' },
      { iter: 3, candidate: 'cand3', score: 4.4, velocity: -0.3, verdict: 'reject', reason: 'no improvement (-0.30)' }
    ],
    signals: {
      declines: [{ card: 'Bombardment', declined: 14, offered: 18 }, { card: 'Advance', declined: 2, offered: 20 }],
      zeroKills: { count: 7, total: 1200 },
      feelNotes: { count: 42 }
    }
  });
  var runPane = doc.getElementById('wbPane-run').textContent;
  assert.ok(/3 \/ 6/.test(runPane), 'Run panel shows live iteration N / total (3 / 6)');
  assert.ok(/1200/.test(runPane), 'Run panel shows skirmishes swept');
  assert.ok(/4\.1/.test(runPane) && /cand2/.test(runPane), 'Run panel shows the running-best candidate + score');
  assert.ok(/cand3/.test(doc.getElementById('wbRunLog').textContent), 'log tail shows the latest LOOP_STEP rows');
  // AC2: the Worth-a-look panel surfaces the anomaly classes from the run.
  var anom = doc.getElementById('wbAnom').textContent;
  assert.ok(/Bombardment/.test(anom) && /14\/18/.test(anom), 'anomaly panel flags a card declined most of its offered turns');
  assert.ok(!/Advance/.test(anom), 'a card declined only occasionally is NOT flagged (below the majority threshold)');
  assert.ok(/zero-kill/i.test(anom), 'anomaly panel flags zero-kill stalemates');
  assert.ok(/feel-notes engaged/i.test(anom) && /42/.test(anom), 'anomaly panel confirms feel-notes are engaged');
  // AC2: pause/stop control the loop through the WB_ON_CONTROL hook.
  var controls = [];
  win.WB_ON_CONTROL = function (action) { controls.push(action); };
  doc.getElementById('wbPause').click();
  doc.getElementById('wbStop').click();
  assert.deepStrictEqual(controls, ['pause', 'stop'], 'pause + stop buttons signal the loop through WB_ON_CONTROL');
  // A paused status flips Pause -> Resume; a terminal status disables both controls.
  win.wbSetRunStatus({ loopType: 'card', state: 'paused', iter: 3, iters: 6, swept: 1200, signals: { feelNotes: { count: 0 } } });
  assert.ok(/Resume/.test(doc.getElementById('wbPause').textContent), 'a paused loop offers Resume');
  assert.ok(/feel-notes silent/i.test(doc.getElementById('wbAnom').textContent), 'a silent debrief is itself flagged worth a look');
  win.wbSetRunStatus({ loopType: 'card', state: 'done', iter: 6, iters: 6, swept: 2400 });
  assert.ok(doc.getElementById('wbStop').disabled && doc.getElementById('wbPause').disabled, 'a finished loop disables pause/stop');
  win.WB_RUN_STATUS = null; // leave the pane idle for a clean re-open

  console.log('== Results phase: content-first review (#145) ==');
  doc.querySelector('#wbNav .wb-tab[data-phase="results"]').click();
  // Idle before the loop reports its final candidate set.
  assert.ok(/No results yet/i.test(doc.getElementById('wbResults').textContent), 'Results phase idle until the loop reports');
  // AC1/AC3: feed a mock #138 final candidate set and assert the built content leads.
  win.wbSetResults({
    loopType: 'card', adopted: 1, total: 3, runId: 42,
    cards: [
      { tag: 'keep', change: 'new', card: { name: 'Sapper', cost: 4, text: 'Dig in and hold.', steps: [{ type: 'attack', mod: 1 }] }, resid: 0.4, win: 52, seen: 18 },
      { tag: 'cut', change: 'tuned', card: { name: 'Bombardment', text: 'Blow it up.', steps: [{ type: 'attack', mod: 2 }] }, resid: 2.1, win: 61, seen: 14, note: 'always-good-on-sight' }
    ],
    weights: [{ personality: 'hard', deltas: [{ key: 'aggression', before: 1.0, after: 1.4 }, { key: 'hold', before: 0.5, after: 0.5 }] }],
    balance: { note: 'panel fold', metrics: [{ label: 'Drag', value: '2.1', cls: 'ok' }, { label: 'Swings', value: '3.4', cls: 'ok' }] },
    feels: { count: 2, notes: ['felt grindy mid-game', 'cavalry mattered'] },
    signals: { declines: [{ card: 'Bombardment', declined: 14, offered: 18 }], zeroKills: { count: 7, total: 1200 }, feelNotes: { count: 42 } }
  });
  var resPane = doc.getElementById('wbPane-results').textContent;
  // AC1: built content leads, tagged keep/iterate/cut with change-notes.
  assert.ok(/Cards built/i.test(resPane), 'Results leads with the Cards built section');
  assert.ok(/Sapper/.test(resPane) && /Dig in and hold/.test(resPane), 'a built card face renders (name + text)');
  var tags = Array.prototype.map.call(doc.querySelectorAll('#wbResults .wb-tag'), function (t) { return t.textContent; });
  assert.ok(tags.indexOf('keep') >= 0 && tags.indexOf('cut') >= 0, 'cards are tagged keep / cut (got ' + tags.join(',') + ')');
  assert.ok(/resid 0\.4/.test(resPane) && /win 52/.test(resPane) && /seen 18/.test(resPane), 'resid·win·seen render as evidence beneath the design');
  assert.ok(/Heuristic deltas/i.test(resPane) && /aggression/.test(resPane) && /1\.4/.test(resPane), 'heuristic deltas render before&rarr;after');
  // AC1: the full balance report is NESTED (a <details>), not the front page.
  var details = doc.querySelectorAll('#wbResults details.wb-details');
  assert.ok(details.length >= 2, 'balance + feels reports are nested under <details> (' + details.length + ')');
  var bal = Array.prototype.filter.call(details, function (d) { return /Balance report/i.test(d.querySelector('summary').textContent); })[0];
  assert.ok(bal && !bal.open, 'the balance report is collapsed by default, not the front page');
  assert.ok(/Drag/.test(bal.textContent) && /2\.1/.test(bal.textContent), 'the nested balance report carries the metrics table');
  // AC2: feels debriefs nested; Run-phase anomaly flags carried forward.
  var feels = Array.prototype.filter.call(details, function (d) { return /Feels debriefs/i.test(d.querySelector('summary').textContent); })[0];
  assert.ok(feels && /cavalry mattered/.test(feels.textContent), 'feels debriefs (#111) render nested');
  assert.ok(/Worth a look/i.test(resPane) && /Bombardment/.test(doc.querySelector('#wbResults .wb-anoms').textContent),
    'Run-phase anomaly flags carry forward into Results');
  win.WB_RESULTS = null; // leave idle for a clean re-open

  console.log('== Authored-this-run feed: add/edit/remove render as cards (#165) ==');
  // Idle before the Author runs.
  assert.ok(/No authored content yet/i.test(doc.getElementById('wbAuthored').textContent), 'Authored feed idle until the card Author runs');
  // AC8: feed the Author's this-run record (the shape /api/authored serves) and assert
  // each add/edit/remove renders as a CARD (name + text), visibly distinguished, not JSON.
  win.wbSetAuthored({
    nudge: 'build out toward 30 cards', temperature: 'bold',
    cards: [
      { action: 'add', card: { id: 'reserve_line', name: 'Reserve Line', points: 4, text: 'Dig in, then deploy an infantry.', steps: [{ type: 'trench' }, { type: 'deploy', unit: 'infantry' }] }, note: 'fills a dig-then-push gap' },
      { action: 'edit', card: { id: 'attack_plus1', name: 'Attack +1', points: 3, text: 'Order an attack with +1 support.', steps: [{ type: 'attack', mod: 1 }] }, note: 'reworded' },
      { action: 'remove', card: { id: 'mass_assault', name: 'Mass Assault', points: 4, text: 'All-in.', steps: [{ type: 'attack', mod: 2 }] }, note: 'shadowed by conscription' }
    ]
  });
  var authPane = doc.getElementById('wbAuthored');
  var acts = Array.prototype.map.call(authPane.querySelectorAll('.wb-act'), function (a) { return a.textContent; });
  assert.deepStrictEqual(acts, ['added', 'edited', 'removed'], 'add/edit/remove each render a distinct action badge (got ' + acts.join(',') + ')');
  assert.ok(/Reserve Line/.test(authPane.textContent) && /Dig in, then deploy an infantry/.test(authPane.textContent),
    'an authored card renders as a card (name + player text), not JSON');
  assert.ok(!/"steps"|\{"type"/.test(authPane.textContent), 'the feed shows content, never raw JSON');
  assert.ok(/trench &middot; deploy infantry/.test(authPane.innerHTML) || /trench.*deploy infantry/.test(authPane.textContent),
    'steps render human-readable (unit named), not a JSON blob');
  assert.ok(authPane.querySelector('.wb-authored.remove'), 'a removed card is visibly distinguished (its own class)');
  assert.ok(/build out toward 30 cards/.test(authPane.textContent) && /bold/.test(authPane.textContent),
    'the run nudge + temperature that drove the Author are shown');
  win.WB_AUTHORED = null; // leave idle for a clean re-open

  doc.getElementById('wbBack').click();
  assert.ok(doc.getElementById('menu').classList.contains('active'), 'workbench Back returns to the menu');

  console.log('== AI skirmish through the DOM ==');
  doc.getElementById('btnAI').click();
  assert.ok(doc.getElementById('game').classList.contains('active'), 'game screen shown');
  assert.ok(doc.querySelectorAll('#board polygon.hex').length >= 19, 'board hexes rendered');
  assert.ok(doc.querySelectorAll('#board .coordlbl').length >= 19, 'grid labels rendered on hexes');
  var lblTexts = Array.prototype.map.call(doc.querySelectorAll('#board .coordlbl'), function (t) { return t.textContent; });
  assert.ok(lblTexts.indexOf('A1') >= 0, 'label A1 present (got e.g. ' + lblTexts.slice(0, 4).join(',') + ')');

  console.log('== player mats ==');
  assert.ok(doc.querySelectorAll('#matRed .slot').length === 13, 'red mat has 13 piece slots (7+2+1+3)');
  assert.ok(doc.querySelectorAll('#matBlue .slot').length === 13, 'blue mat has 13 piece slots');
  // one .scard per card COPY in the active deck — derive the total from the
  // deck so this stays correct at any deck size, not a hardcoded count.
  var deckTotal = win.Engine.CARDS.reduce(function (a, c) { return a + (+c.count || 0); }, 0);
  assert.ok(doc.querySelectorAll('#matRed .scard').length === deckTotal, 'red mat tracks all ' + deckTotal + ' orders');
  assert.ok(doc.querySelectorAll('#matBlue .scard').length === deckTotal, 'blue mat tracks all ' + deckTotal + ' orders (enemy spend visible)');
  assert.ok(doc.querySelectorAll('#matRed .slot svg').length === 13, 'reserve slots carry piece glyphs at skirmish start');
  assert.ok(!!doc.getElementById('scorecard'), 'campaign score card present in top bar');

  // play like a (random but legal) human until the skirmish ends or 80 turns pass
  var steps = 0;
  function tick() {
    var APP = win.APP, E = win.Engine;
    if (!APP.st || APP.st.phase === 'skirmish-over' || steps++ > 4000) return done();
    if (APP.ui.busy) return realSetTimeout(tick, 8); // AI is animating
    if (APP.st.current !== APP.mySide) return realSetTimeout(tick, 8);
    try {
      if (APP.st.phase === 'choose-card') {
        var cid = APP.st.hands[APP.mySide][0];
        E.playCard(APP.st, cid, 'normal');
        win.renderAll();
      } else {
        var o = E.stepOptions(APP.st);
        var c = { skip: true };
        if (o && o.type === 'deploy' && o.targets.length) c = { hex: o.targets[0] };
        else if (o && o.type === 'attack' && o.attacks.length) c = { from: o.attacks[0].from, to: o.attacks[0].to, via: o.attacks[0].via };
        else if (o && o.type === 'reposition' && o.moves.length) c = { from: o.moves[0].from, to: o.moves[0].to };
        else if (o && o.type === 'trench' && o.targets.length) {
          var hx = o.targets[0];
          var ors = E.trenchOrientations(APP.st, hx);
          c = { hex: hx, dirs: ors[0] };
        }
        try { E.applyStep(APP.st, c); }
        catch (stepErr) {
          // this step forbids skipping — take the first real legal choice
          // instead of the skip the picker fell back to.
          var choices = E.enumerateChoices(APP.st), alt = null;
          for (var ci = 0; ci < choices.length; ci++) { if (!choices[ci].skip) { alt = choices[ci]; break; } }
          E.applyStep(APP.st, alt || { skip: true });
        }
        win.afterChange();
      }
    } catch (e) { return reject(e); }
    realSetTimeout(tick, 2);
  }
  function done() {
    var st = win.APP.st;
    assert.ok(st && (st.phase === 'skirmish-over' || st.turnNumber > 3), 'skirmish progressed (phase=' + (st && st.phase) + ', turn=' + (st && st.turnNumber) + ')');
    var logTxt = doc.getElementById('log').textContent;
    assert.ok(/at [A-G][0-9]/.test(logTxt), 'journal uses grid references (sample: "' + (logTxt.match(/[A-Z][a-z]+ deploys [^.]+\./) || ['?'])[0] + '")');
    assert.ok(doc.querySelectorAll('#log .entry.hdr').length >= 1, 'journal skirmish header styled');
    assert.ok(doc.querySelectorAll('#log .tn').length >= 3, 'journal entries carry turn markers');
    var spentRed = doc.querySelectorAll('#matRed .scard.gone').length;
    var spentBlue = doc.querySelectorAll('#matBlue .scard.gone').length;
    assert.ok(spentRed >= 1 && spentBlue >= 1, 'both mats show spent orders (red ' + spentRed + ', blue ' + spentBlue + ')');
    assert.ok(doc.querySelectorAll('#matRed .slot.field, #matRed .slot.lost').length >= 1, 'red mat slots emptied as pieces deployed/died');

    console.log('== maps screen & editor ==');
    doc.getElementById('btnQuit').click();
    doc.getElementById('btnMaps').click();
    var tiles = doc.querySelectorAll('#mapGrid .mapitem').length;
    assert.ok(tiles >= win.Engine.MAPS.length, 'all built-in maps listed (+ any shipped customs): ' + tiles + ' tiles');
    var tileBtns = Array.prototype.map.call(doc.querySelectorAll('#mapGrid .mapitem')[0].querySelectorAll('.btns button'), function (b) { return b.textContent; });
    assert.ok(tileBtns.indexOf('Play') >= 0 && tileBtns.indexOf('Balance') >= 0, 'map tiles offer Play + Balance (' + tileBtns.join('/') + ')');
    doc.getElementById('btnNewMap').click();
    assert.ok(doc.getElementById('editorScr').classList.contains('active'), 'editor opens');
    var hits = doc.querySelectorAll('#edBoard .edge-hit');
    assert.ok(hits.length > 0, 'editor edge hit-targets present (' + hits.length + ')');
    hits[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    var painted = Object.keys(win.ED.edges).length;
    assert.ok(painted === 1, 'clicking an edge paints terrain (' + painted + ' side)');
    doc.getElementById('edMirror').click();
    assert.ok(Object.keys(win.ED.edges).length === 2, 'Mirror creates the rotated twin side');

    console.log('== map roster deletion + board-shape carving (V0) ==');
    var firstTileBtns = doc.querySelector('#mapGrid .mapitem .btns');
    assert.ok(firstTileBtns && firstTileBtns.textContent.indexOf('Delete') >= 0, 'built-in map tiles offer Delete (floor of 5 enforced on click)');
    var hexTool = doc.querySelector('.edtools button[data-tool="hexes"]');
    hexTool.dispatchEvent(new win.Event('click', { bubbles: true }));
    assert.ok(win.ED.hexes && Object.keys(win.ED.hexes).length === 24, 'Board-hexes tool converts to a custom outline seeded from the template');
    assert.ok(doc.getElementById('edShape').value === '@custom', 'shape dropdown flips to Custom');
    var beforeCarve = Object.keys(win.ED.hexes).length;
    win.edRemoveHex('0,0');
    win.renderEditor();
    assert.ok(Object.keys(win.ED.hexes).length === beforeCarve - 1, 'a hex can be carved out');
    assert.ok(/23\/24 hexes/.test(doc.getElementById('edStock').textContent), 'hex count shown against the 24 ceiling');
    win.ED.red = [2, -2]; win.ED.blue = [-3, 2];
    win.ED.edges = {}; // the stray single side painted above has no physical piece
    doc.getElementById('edName').value = 'Carved Smoke Test';
    var carvedDef = win.edBuildDef();
    assert.ok(carvedDef && carvedDef.shapeDef && carvedDef.shapeDef.hexes.length === 23, 'carved map saves an inline shapeDef');
    assert.ok(win.Engine.validateMaps([carvedDef]).length === 0, 'carved map validates: ' + win.Engine.validateMaps([carvedDef]).join('; '));

    console.log('== TwoSetsOfThree: long terrain runs split into stock pieces ==');
    var ring = win.splitRun([0, 1, 2, 3, 4, 5]);
    assert.ok(ring.length === 2 && ring[0].length === 3 && ring[1].length === 3, 'full forest ring = two length-3 pieces');
    var five = win.splitRun([5, 0, 1, 2, 3]);
    assert.ok(five.length === 2 && five[0].length === 3 && five[1].length === 2 && five[0][0] === 5,
      'five-side arc splits 3+2 from its true start (' + JSON.stringify(five) + ')');
    var ringPieces = win.groupEdgesToPieces({ '0,0>0': 'F', '0,0>1': 'F', '0,0>2': 'F', '0,0>3': 'F', '0,0>4': 'F', '0,0>5': 'F' });
    assert.ok(ringPieces.length === 2 && ringPieces.every(function (p) { return p.edges.length === 3; }),
      'editor groups a painted ring as two stock pieces');
    var ringMap = { name: 'Ring Test', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: ringPieces };
    assert.ok(win.Engine.validateMaps([ringMap]).length === 0, 'two sets of three validate cleanly');

    console.log('== editor Balance -> dashboard, map as drawn ==');
    // the editor's Balance button routes the UNSAVED carved map (still open in
    // the editor above) through openDashDef into the one dashboard pipeline as a
    // transient '(as drawn)' option.
    doc.getElementById('dashN').value = '20'; // openDashDef runs with whatever n is picked — keep it fast
    doc.getElementById('edBalance').click();  // openDashDef(edBuildDef())
    assert.ok(doc.getElementById('dashScr').classList.contains('active'), 'editor Balance opens the Balance Dashboard');
    var adhocOpt = doc.querySelector('#dashMap option[value="@adhoc"]');
    assert.ok(!!adhocOpt && /as drawn.*Carved Smoke Test/.test(adhocOpt.textContent) && doc.getElementById('dashMap').value === '@adhoc',
      'ad-hoc "(as drawn)" option injected and selected');
    assert.ok(win.DASH.adhoc && win.DASH.adhoc.name === 'Carved Smoke Test' && win.DASH.running,
      'DASH.adhoc carries the unsaved def and the run started');
    var waited = 0;
    (function waitAdhoc() {
      if (!win.DASH.running && win.DASH.results.length) {
        assert.ok(win.DASH.results.length === 1 && win.DASH.results[0].map.name === 'Carved Smoke Test',
          'ad-hoc dashboard run finished on the map as drawn');
        return watchMode();
      }
      if ((waited += 100) > 60000) { assert.ok(false, 'ad-hoc dashboard run never finished'); return watchMode(); }
      realSetTimeout(waitAdhoc, 100);
    })();

    function watchMode() {
      console.log('== balance dashboard ==');
      doc.getElementById('edBack').click();
      doc.getElementById('btnMapsBack').click();
      doc.getElementById('btnDash').click();
      assert.ok(doc.getElementById('dashScr').classList.contains('active'), 'dashboard opens from the menu');
      assert.ok(doc.querySelectorAll('#dashMap option').length >= win.Engine.MAPS.length, 'map picker lists the pool');

      console.log('== dashboard shell: header pickers + pill nav + temperature ==');
      assert.ok(doc.getElementById('dashHead') && doc.getElementById('dashRunA') && doc.getElementById('dashRunB'),
        'dark header + run A/B pickers present');
      // dashLoadRuns' GET /api/runs is async — let the empty-runs fetch settle
      // before reading the picker's fallback text.
      realSetTimeout(function () {
        assert.ok(doc.getElementById('dashRunA').disabled && doc.getElementById('dashRunA').options[0].textContent === 'No runs yet',
          'no saved runs — run pickers show the "No runs yet" fallback');
      }, 0);
      assert.ok(doc.querySelectorAll('#dashPills .dpill').length === 5, 'five pills: Overview | Maps | Cards | Units | Tables');
      assert.ok(doc.querySelector('#dashPills .dpill[data-view="tables"]').classList.contains('sel'), 'Tables is the selected pill');
      assert.ok(doc.getElementById('dashRunControls').style.display !== 'none', 'Run/Save controls visible on Tables');
      doc.querySelector('#dashPills .dpill[data-view="overview"]').click();
      assert.ok(win.DASH.view === 'overview', 'clicking Overview switches DASH.view');
      assert.ok(doc.getElementById('dashRunControls').style.display === 'none' && doc.getElementById('dashOut').style.display === 'none',
        'Run/Save + the Tables output hide outside Tables (charts context is view-only)');
      assert.ok(doc.getElementById('dashPaneOverview').style.display !== 'none' &&
         /no saved runs yet/i.test(doc.getElementById('dashPaneOverview').textContent),
        'Overview pane: "no saved runs yet" fallback note when the db is empty');
      assert.ok(doc.getElementById('dashPaneMaps').style.display === 'none' && doc.getElementById('dashPaneUnits').style.display === 'none',
        'the other three panes stay hidden while Overview is active');
      doc.getElementById('dashTemp').value = 'T2';
      doc.getElementById('dashTemp').dispatchEvent(new win.Event('change', { bubbles: true }));
      assert.ok(win.DASH.temperature === 'T2', 'temperature selector writes DASH.temperature');
      doc.querySelector('#dashPills .dpill[data-view="tables"]').click();
      assert.ok(win.DASH.view === 'tables' && doc.getElementById('dashRunControls').style.display !== 'none' &&
         doc.getElementById('dashOut').style.display !== 'none',
        'back on Tables: run controls + output reappear');

      doc.getElementById('dashN').value = '20';
      doc.getElementById('dashMap').value = win.Engine.MAPS[4].name; // The Cockpit (fast skirmishes)
      doc.getElementById('dashRun').click();
      var dw = 0;
      (function waitDash() {
        if (!win.DASH.running && win.DASH.results.length) {
          assert.ok(win.DASH.results.length === 1, 'dashboard run finished on the chosen map');
          assert.ok(doc.querySelectorAll('#dashOut table').length === 2, 'map table + card report rendered');
          assert.ok(doc.querySelectorAll('#dashOut th.sortable').length > 10, 'columns are sortable');
          var dashTxt = doc.getElementById('dashOut').textContent;
          assert.ok(/Aggression/.test(dashTxt) && /Decisiveness/.test(dashTxt), 'behaviour + decisiveness metrics shown');
          // dashboard numbers must equal the CLI's: same fold, same seeds
          var cli = win.Engine.balanceMap(win.Engine.MAPS[4], 20, { seedBase: 1 * 7919, diffRed: 'normal', diffBlue: 'normal' });
          var gui = win.DASH.results[0].out;
          assert.ok(cli.redWins === gui.redWins && cli.turns === gui.turns && cli.attacks === gui.attacks,
            'GUI and CLI agree exactly (red ' + gui.redWins + '/' + cli.redWins + ', turns ' + gui.turns + '/' + cli.turns + ')');
          var th = doc.querySelector('#dashOut th[data-key="red"]');
          th.dispatchEvent(new win.Event('click', { bubbles: true }));
          assert.ok(doc.querySelector('#dashOut th.sorted'), 'clicking a header sorts');
          // save-report builder produces a full markdown report
          var rpt = win.dashReportMarkdown();
          assert.ok(doc.getElementById('dashSave') && /## Maps/.test(rpt) && /## Card report/.test(rpt) && /Drag \| Swings/.test(rpt),
            'Save report button + markdown report (maps, card report, pacing cols)');

          // per-skirmish detail still collected for ui/charts.js's primitives (the
          // Cards tab reuses them) — not wired to a pill yet, so check the data survives.
          var detKey = win.DASH.results[0].map.name;
          assert.ok(win.DASH.detail[detKey] && win.DASH.detail[detKey].turns.length === 20 &&
             win.DASH.detail[detKey].winTypes.length === 20,
            'dashRun collected per-skirmish turns + winTypes (' + (win.DASH.detail[detKey] || { turns: [] }).turns.length + ' skirmishes)');

          console.log('== view-only panes: pill switch keeps the last run in memory ==');
          doc.querySelector('#dashPills .dpill[data-view="maps"]').click();
          assert.ok(win.DASH.view === 'maps', 'Maps pill selected');
          assert.ok(doc.getElementById('dashRunControls').style.display === 'none' && doc.getElementById('dashOut').style.display === 'none',
            'Run/Save + the Tables table hide on the Maps pane');
          var mapsTxt = doc.getElementById('dashPaneMaps').textContent;
          assert.ok(/no saved runs yet/i.test(mapsTxt),
            'Maps pane: "no saved runs yet" fallback note while the db is empty');
          doc.querySelector('#dashPills .dpill[data-view="cards"]').click();
          assert.ok(win.DASH.view === 'cards' && doc.getElementById('dashPaneCards').style.display !== 'none' &&
             doc.getElementById('dashPaneMaps').style.display === 'none',
            'Cards pill shows its own pane and hides Maps');
          doc.querySelector('#dashPills .dpill[data-view="tables"]').click();
          assert.ok(doc.querySelectorAll('#dashOut table').length === 2, 'back on Tables: map table + card report still render');
          assert.ok(doc.querySelector('#dashOut th.sorted'), 'sort state survived the pill round-trip');
          return overviewSmoke(startWatch);
        }
        if ((dw += 100) > 60000) { assert.ok(false, 'dashboard run never finished'); return startWatch(); }
        realSetTimeout(waitDash, 100);
      })();
    }

    // the Overview screen on a SEEDED DASH state — jsdom has no real server, so this
    // overrides win.fetch (GET /api/skirmishes?run=<id>) to answer the way a real
    // browser+server would, seeds two tiny fixture runs straight onto
    // DASH.runs/runA/runB, and drives renderOverview through the same #dashPills click
    // every other pane test uses. Last use of DASH in this file, so nothing is restored.
    function overviewSmoke(next) {
      console.log('== Overview screen: seeded DASH state ==');
      function envelope(map, seed, fp, winner, winType) {
        return JSON.stringify({
          v: '9.9-test', map: map, seed: seed, fp: fp, winner: winner, winType: winType, turns: 4,
          trace: [
            { p: 'red', id: 'c1', mode: 'normal', turn: 1, seen: 1, a: 'deploy', u: 'infantry', h: '0,0', ld: 'red' },
            { p: 'blue', id: 'c2', mode: 'normal', turn: 2, seen: 1, a: 'deploy', u: 'cavalry', h: '1,0', ld: 'red' },
            { p: 'red', id: 'c3', mode: 'normal', turn: 3, seen: 1, a: 'attack', h: '1,0', k: 1, ld: 'red' },
            { p: 'blue', id: 'c4', mode: 'normal', turn: 4, seen: 1, a: 'swap', ld: 'blue' }
          ],
          units: { infantry: { dep: [1], atk: 1, abs: 0, kill: 1, die: 0 }, cavalry: { dep: [2], atk: 0, abs: 1, kill: 0, die: 1 }, artillery: { dep: [], atk: 0, abs: 0, kill: 0, die: 0 } }
        });
      }
      function row(id, map, seed, winner, winType, fp, fsRed, fsBlue) {
        return { id: id, map: map, seed: seed, firstPlayer: fp, winner: winner, winType: winType, turns: 4,
          fsRed: fsRed, fsBlue: fsBlue, firstBlood: winner, leadChanges: 1, killTail: 0, zeroKill: 0, tiebreak: 0,
          attacks: 1, swaps: 1, marches: 0, deploys: 2, resEndRed: 0, resEndBlue: 0,
          trace: envelope(map, seed, fp, winner, winType) };
      }
      var rowsA = [
        row(1, 'Fixture Alpha', 1, 'red', 'hq', 'red', 5, 3),
        row(2, 'Fixture Alpha', 2, 'blue', 'attrition', 'blue', 4, 4),
        row(3, 'Fixture Beta', 3, 'red', 'attrition', 'red', 6, 2)
      ];
      var rowsB = [
        row(4, 'Fixture Alpha', 4, 'blue', 'hq', 'red', 3, 5),
        row(5, 'Fixture Alpha', 5, 'blue', 'attrition', 'blue', 4, 6),
        row(6, 'Fixture Beta', 6, 'blue', 'hq', 'red', 2, 7)
      ];
      // run B's Fixture Alpha rows carry a per-turn fs timeline — run A's rows do
      // NOT, so toggling the Maps drill-down to run A exercises the "this run
      // predates the fs capture" honest-grey path on the |VP-diff| track.
      rowsB[0].fs = [[1, 0], [1, 1], [2, 1], [2, 2]];
      rowsB[1].fs = [[1, 0], [1, 1], [2, 1], [2, 2]];
      var fetchCalls = [];
      win.fetch = function (url) {
        fetchCalls.push(url);
        var data = /run=9001/.test(url) ? rowsA : (/run=9002/.test(url) ? rowsB : []);
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve(data); } });
      };
      win.DASH.runs = [
        { id: 9001, version: '9.9-test', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 3, label: 'fixture A' },
        { id: 9002, version: '9.9-test', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 3, label: 'fixture B' }
      ];
      win.DASH.runA = 9001; win.DASH.runB = 9002;
      doc.querySelector('#dashPills .dpill[data-view="overview"]').click();
      var ow = 0;
      (function waitOverview() {
        var el = doc.getElementById('dashPaneOverview');
        if (el.querySelector('.ov-wrap')) {
          assert.ok(fetchCalls.some(function (u) { return /run=9001/.test(u); }) && fetchCalls.some(function (u) { return /run=9002/.test(u); }),
            'renderOverview fetched both runs via GET /api/skirmishes?run=<id> (' + fetchCalls.join(', ') + ')');
          var txt = el.textContent;
          assert.ok(/Verdict:/.test(txt), 'verdict banner rendered');
          assert.ok(/Red%/.test(txt) && /Drag/.test(txt) && /Swings/.test(txt), 'band board rows rendered (scored metrics)');
          assert.ok(/First-blood/.test(txt), 'guard row (First-blood→win) rendered below the fold');
          assert.ok(/\(n=3\)/.test(txt), 'fleet-wide n=3 < 240 small-n greys the row with "(n=N)"');
          assert.ok(/Fixture Alpha/.test(txt) && /Fixture Beta/.test(txt), 'map dumbbells rendered one row per map seen in either run');
          assert.ok(/deploy interleave/.test(txt) && /median settle/.test(txt), 'pacing minis rendered (1e)');
          var mapRow = el.querySelector('.ov-map-row[data-map="Fixture Alpha"]');
          assert.ok(!!mapRow, 'a map dumbbell row carries data-map and is clickable');
          if (mapRow) mapRow.click();
          assert.ok(win.DASH.mapFocus === 'Fixture Alpha' && win.DASH.view === 'maps',
            'clicking a map row sets DASH.mapFocus + switches to the Maps pill (AC2)');
          return mapDrillSmoke(function () { workbenchTrajSmoke(next); });
        }
        if ((ow += 50) > 5000) { assert.ok(false, 'Overview never finished its seeded render'); return next(); }
        realSetTimeout(waitOverview, 50);
      })();
    }

    // the Map drill-down screen (breadcrumb, A|B|A/B toggle, tempo lanes +
    // |VP-diff| track, per-map band board, settle curve) reusing the SAME seeded
    // fixture overviewSmoke just built (SKIRMISH_CACHE is already warm from the
    // Overview fetch above — dashLoadSkirmishRows hits the cache, so every render
    // below is synchronous, no fetch/wait needed). Runs straight off the mapRow
    // click's DASH.view='maps' switch.
    function mapDrillSmoke(next) {
      console.log('== Map drill-down screen: seeded DASH state ==');
      var el = doc.getElementById('dashPaneMaps');
      assert.ok(!!el.querySelector('.mapd-wrap'), 'the real drill-down rendered');

      console.log('-- breadcrumb map switcher --');
      var crumbs = el.querySelectorAll('.mapd-crumb');
      assert.ok(crumbs.length === 2, 'one breadcrumb crumb per map seen in either run (' + crumbs.length + ')');
      var cur = el.querySelector('.mapd-crumb.cur');
      assert.ok(!!cur && cur.textContent === 'Fixture Alpha', 'the focused map is marked current in the breadcrumb');
      el.querySelector('.mapd-arrow[data-step="1"]').click();
      assert.ok(win.DASH.mapFocus === 'Fixture Beta', '› arrow steps to the next map (' + win.DASH.mapFocus + ')');
      el.querySelector('.mapd-arrow[data-step="1"]').click();
      assert.ok(win.DASH.mapFocus === 'Fixture Alpha', '› wraps back around (2 maps, 2 steps) to the first (' + win.DASH.mapFocus + ')');
      el.querySelector('.mapd-crumb[data-map="Fixture Beta"]').click();
      assert.ok(win.DASH.mapFocus === 'Fixture Beta' && el.querySelector('.mapd-crumb.cur').textContent === 'Fixture Beta',
        'clicking a crumb directly focuses that map');
      el.querySelector('.mapd-crumb[data-map="Fixture Alpha"]').click(); // back to the fixture with 2 skirmishes/run
      el = doc.getElementById('dashPaneMaps'); // el.innerHTML was replaced by the click's re-render

      console.log('-- A|B|A/B toggle (default B) --');
      var sel = el.querySelector('.ab-toggle span.sel');
      assert.ok(!!sel && sel.textContent === 'B' && win.DASH.abMode === 'B', 'toggle defaults to B');

      console.log('-- tempo lanes: absolute per-lane scale, never 100%-stacked --');
      var laneRows = {};
      el.querySelectorAll('[data-lane]').forEach(function (r) { laneRows[r.getAttribute('data-lane')] = r; });
      assert.ok(Object.keys(laneRows).length === 4, 'four lanes rendered: deploy/attack/swap/march');
      // Fixture Alpha's fixed trace (1 deploy/attack/swap each, spread across
      // octiles, no march at all) -> deploy/attack/swap each peak at 1/turn,
      // march peaks at 0. A shared-scale ("100%-stacked") bug would drag
      // march's printed max up to match the other lanes' 1.00 instead of its
      // own true (zero) peak — this is the forbidden pattern's fingerprint.
      ['deploy', 'attack', 'swap'].forEach(function (a) {
        assert.ok(laneRows[a].getAttribute('data-lanemax') === '1.00', a + ' lane scales to its OWN max (1.00/turn)');
      });
      assert.ok(laneRows.march.getAttribute('data-lanemax') === '0.00',
        'march lane (never played this fixture) keeps its OWN 0.00 max, not borrowed from the other lanes (proves per-lane scale, not a shared 100% total)');
      assert.ok(/max \d+\.\d\d\/turn/.test(el.textContent), 'each lane prints its own "max N.NN/turn" scale label');

      console.log('-- |VP-diff| track: honest grey on a run that predates fs capture --');
      assert.ok(!/unavailable/.test(el.textContent), 'run B (default) carries fs -> track renders, no "unavailable" note');
      assert.ok(el.querySelectorAll('.mapd-col-l svg polyline').length >= 1, '|VP-diff| track drew a polyline for run B');
      el.querySelector('.ab-toggle [data-ab="A"]').click();
      assert.ok(win.DASH.abMode === 'A', 'clicking A switches the toggle');
      el = doc.getElementById('dashPaneMaps');
      assert.ok(/predates the fs capture/.test(el.textContent),
        'run A (no fs on its rows) greys the |VP-diff| track with the honest "predates the fs capture" note instead of a fabricated line');

      console.log('-- A/B mode: B solid, A ghost overlay --');
      el.querySelector('.ab-toggle [data-ab="AB"]').click();
      assert.ok(win.DASH.abMode === 'AB', 'clicking A/B switches the toggle');
      el = doc.getElementById('dashPaneMaps');
      assert.ok(!/predates the fs capture/.test(el.textContent), 'A/B mode draws run B (which has fs) solid — the grey note is gone again');
      assert.ok(el.querySelectorAll('[data-lane] [style*="dashed"]').length > 0, 'A/B mode overlays run A as a dashed ghost bar in the lanes');
      assert.ok(/B solid, A ghost outline/.test(el.textContent), 'caption names the overlay convention');

      console.log('-- per-map band board (reuses the Overview row renderer, map small-n scope) --');
      assert.ok(/This map vs its bands/.test(el.textContent), 'band board section rendered');
      assert.ok(/Red%/.test(el.textContent) && /Drag/.test(el.textContent) && /Swings/.test(el.textContent), 'scored band rows rendered');
      assert.ok(/First-blood/.test(el.textContent), 'guard row rendered below the fold');
      assert.ok(/\(n=2\)/.test(el.textContent), 'map-scope n=2 < 40 (map threshold) greys the row with "(n=N)" — not the fleet 240 threshold');

      console.log('-- settle curve, this map --');
      assert.ok(/settle curve, this map/.test(el.textContent), 'settle curve section rendered');
      assert.ok(el.querySelectorAll('.mapd-col-r svg polyline').length >= 2, 'settle curve drew both A and B polylines');

      console.log('-- balance score header --');
      assert.ok(/balance/.test(el.textContent) && el.textContent.indexOf('→') >= 0, 'this map\'s balance score A → B is shown in the header');

      el.querySelector('.ab-toggle [data-ab="B"]').click(); // leave the toggle back at its default for anything downstream
      next();
    }

    // Trajectory phase (#143): the champion line rendered live from SEEDED woa.db
    // rows. jsdom has no server, so stub GET /api/runs + /api/skirmishes the way a
    // real server+db would, seeding a parent_id chain (#110): two candidates lose
    // to the opening incumbent 'seed' (reject), the third is adopted (parent flips
    // to 'cand3'), a fourth is the current candidate. The panel must fold that
    // chain into a champion line — a red test that fails if the db read/fold/plot
    // path is dropped (the AC's guard against an all-placeholder Trajectory).
    function workbenchTrajSmoke(next) {
      console.log('== Trajectory phase: champion line from seeded woa.db (#143) ==');
      function traj(map, seed, winner, parentId) {
        return { id: seed, map: map, seed: seed, firstPlayer: 'red', winner: winner, winType: 'hq', turns: 4,
          fsRed: 5, fsBlue: 3, firstBlood: winner, leadChanges: 1, killTail: 0, zeroKill: 0, tiebreak: 0,
          attacks: 1, swaps: 1, marches: 0, deploys: 2, resEndRed: 0, resEndBlue: 0, parentId: parentId,
          trace: JSON.stringify({ v: '9.9-test', map: map, seed: seed, fp: 'red', winner: winner, winType: 'hq', turns: 4,
            trace: [{ p: 'red', id: 'c1', mode: 'normal', turn: 1, seen: 1, a: 'attack', h: '0,0', k: 1, ld: 'red' }],
            units: { infantry: { dep: [1], atk: 1, abs: 0, kill: 1, die: 0 } } }) };
      }
      // Each iteration replays the SAME (map,seed) schedule [(Alpha,101),(Alpha,102)];
      // parent_id is the reigning incumbent. The incumbent advances (adopt) only
      // when the NEXT iteration chains to a different parent: iter2 (seed->cand2)
      // and iter4 (cand2->cand4) are the two adopts; iter1/iter3 are rejects; iter5
      // is the last candidate tried (verdict not in the chain).
      var rows = [
        traj('Alpha', 101, 'red', 'seed'),  traj('Alpha', 102, 'blue', 'seed'),  // iter1 (reject)
        traj('Alpha', 101, 'red', 'seed'),  traj('Alpha', 102, 'red', 'seed'),   // iter2 (adopt)
        traj('Alpha', 101, 'red', 'cand2'), traj('Alpha', 102, 'blue', 'cand2'), // iter3 (reject)
        traj('Alpha', 101, 'red', 'cand2'), traj('Alpha', 102, 'red', 'cand2'),  // iter4 (adopt)
        traj('Alpha', 101, 'blue', 'cand4'), traj('Alpha', 102, 'blue', 'cand4') // iter5 (current)
      ];
      rows.forEach(function (r, i) { r.id = i + 1; }); // unique row ids (seed repeats across iterations)
      var runsResp = [{ id: 7001, version: '9.9-test', kind: 'balance', tool: 'loop.js', redAi: 'hard', blueAi: 'hard', n: 2, label: 'loop' }];
      win.fetch = function (url) {
        var data = /\/api\/runs/.test(url) ? runsResp : (/\/api\/skirmishes/.test(url) ? rows : []);
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve(data); } });
      };
      win.renderWorkbench();
      doc.querySelector('#wbNav .wb-tab[data-phase="trajectory"]').click();
      var tw = 0;
      (function waitTraj() {
        var el = doc.getElementById('wbTraj');
        if (el && el.querySelector('svg.wb-traj-svg path[d]') && el.querySelector('svg.wb-traj-svg path').getAttribute('d')) {
          var svg = el.querySelector('svg.wb-traj-svg');
          assert.ok(win.WB_PHASE === 'trajectory', 'trajectory phase active');
          // AC1: a champion LINE from real parent_id rows — the path connects the
          // two CONFIRMED adopts (M..L..), never the unverified last candidate.
          var d = svg.querySelector('path').getAttribute('d');
          assert.ok(/M[\d.\s]+L[\d.\s]+/.test(d), 'champion line drawn as an SVG path through the >=2 adopted points (' + d.slice(0, 40) + ')');
          // AC1: adopt/reject/current markers present — one dot per iteration, with
          // rejects hollow (fill = parchment) and adopted champions filled.
          var dots = svg.querySelectorAll('circle');
          assert.ok(dots.length === 5, 'one dot per reconstructed iteration (' + dots.length + ' for 5 iterations)');
          var hollow = Array.prototype.filter.call(dots, function (c) { return /parch/.test(c.getAttribute('fill')); });
          assert.ok(hollow.length === 2, 'the two rejected candidates render as hollow off-line dots (' + hollow.length + ')');
          // the stat strip surfaces the fold: iterations / adopted / rejected, with
          // the two confirmed adopts counted (the last candidate is not an adopt).
          var txt = el.textContent;
          assert.ok(/iterations/.test(txt) && /adopted/.test(txt) && /rejected/.test(txt), 'stat strip surfaces iterations/adopted/rejected');
          assert.ok(/adopted2/.test(txt.replace(/\s+/g, '')), 'exactly the two confirmed adopts are counted, not the unverified last candidate (' + txt.replace(/\s+/g, '').slice(0, 120) + ')');
          assert.ok(/logs\/woa\.db/.test(txt), 'the panel names logs/woa.db as its live source (never a committed .md)');
          win.fetch = function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve([]); } }); }; // restore
          return next();
        }
        if ((tw += 50) > 5000) { assert.ok(false, 'Trajectory champion line never rendered'); win.fetch = function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve([]); } }); }; return next(); }
        realSetTimeout(waitTraj, 50);
      })();
    }

    function startWatch() {
      console.log('== deck editor ==');
      doc.getElementById('dashBack').click();
      doc.getElementById('btnDeck').click();
      assert.ok(doc.getElementById('deckScr').classList.contains('active'), 'deck editor opens');
      assert.ok(doc.querySelectorAll('#dkList .dkli').length === win.Engine.CARDS.length,
        'one list row per card (' + doc.querySelectorAll('#dkList .dkli').length + ')');
      assert.ok(doc.querySelector('#dkDetail .dkd-name') && doc.querySelectorAll('#dkStepList .dkstep').length >= 1,
        'detail panel + GUI step builder render for the selected card');
      // deckProblems() accepts a 16-17 band (design ceiling, not one exact count;
      // every shipped content/decks/*.js deck lands in that band), so "clean" and
      // the break-it thresholds below are proved against the real band, not a
      // hardcoded count.
      assert.ok(win.deckProblems(win.Engine.CARDS).length === 0, 'built-in deck validates clean');
      assert.ok(!doc.getElementById('dkSave').disabled, 'Save enabled on a valid deck');
      // break it: bump the selected card's count so the total exceeds the 16-17 band -> validation refuses
      var cnt = doc.querySelector('#dkDetail .dkd-count');
      cnt.value = String(+cnt.value + 1);
      cnt.dispatchEvent(new win.Event('input', { bubbles: true }));
      assert.ok(/must total 16-17/.test(doc.getElementById('dkWarn').textContent), 'over-band (>17) deck flagged');
      assert.ok(doc.getElementById('dkSave').disabled, 'Save disabled while invalid');
      // two starting cards / bad step type are refused too
      var broken = JSON.parse(JSON.stringify(win.Engine.CARDS));
      broken[1].starting = true;
      assert.ok(win.deckProblems(broken).some(function (p) { return /exactly ONE/.test(p); }), 'double starting card refused');
      var badStep = JSON.parse(JSON.stringify(win.Engine.CARDS));
      badStep[0].steps = [{ type: 'heal' }];
      assert.ok(win.deckProblems(badStep).some(function (p) { return /unknown type/.test(p); }), 'unknown step type refused');
      var benched = JSON.parse(JSON.stringify(win.Engine.CARDS));
      benched[2].out = true; // benched cards drop from the total (here 17 -> 14, under the 16-17 band)
      assert.ok(win.deckProblems(benched).some(function (p) { return /must total 16-17/.test(p); }), 'benching a card drops it below the 16-17 band');
      // WOA #56: an over-army-points deck is refused by the same validation pass.
      // Swap the cheapest card for a maxed-out one so the total blows past the cap
      // without changing the card count (isolates the points gate from the size band).
      var overPts = JSON.parse(JSON.stringify(win.Engine.CARDS));
      overPts.forEach(function (c) { if (!c.starting) c.steps = [{ type: 'deploy', unit: 'artillery' }, { type: 'attack', mod: 5, tieSpare: true, anywhere: true }]; });
      assert.ok(win.Engine.deckPoints({ cards: overPts.filter(function (c) { return !c.out; }) }) > win.Engine.DECK_POINTS_CAP &&
         win.deckProblems(overPts).some(function (p) { return /over the army-points budget/.test(p); }), 'over-budget deck refused by the points gate');
      // five deck slots, exactly one active
      assert.ok(doc.querySelectorAll('#dkSlots .dkslot[data-slot]').length === 5, 'five deck slots offered');
      assert.ok(doc.querySelectorAll('#dkSlots .dkslot.active').length === 1, 'exactly one active deck marked');
      doc.querySelector('#dkSlots .dkslot[data-slot="2"]').click();
      assert.ok(doc.querySelector('#dkSlots .dkslot[data-slot="2"]').classList.contains('open') &&
         doc.querySelectorAll('#dkList .dkli').length === win.Engine.CARDS.length,
        'switching to an empty slot clones the open deck for editing');
      doc.getElementById('dkBack').click();

      console.log('== watch mode (AI vs AI spectate) ==');
      doc.getElementById('btnWatch').click();
      assert.ok(doc.getElementById('game').classList.contains('active'), 'watch mode starts a game');
      var w0 = 0;
      (function waitWatch() {
        var st = win.APP.st;
        if (st && (st.turnNumber >= 3 || st.phase === 'skirmish-over')) {
          assert.ok(true, 'both generals played without input (turn ' + st.turnNumber + ')');
          return manualPlayer();
        }
        if ((w0 += 100) > 30000) { assert.ok(false, 'watch mode stalled at turn ' + (st && st.turnNumber)); return manualPlayer(); }
        realSetTimeout(waitWatch, 100);
      })();
    }

    function manualPlayer() {
      console.log('== field manual diagram player (V1) ==');
      doc.getElementById('btnQuit').click();
      var liveShape = win.Engine.currentShape();
      doc.getElementById('btnManual').click();
      assert.ok(doc.getElementById('manualOvr').classList.contains('active'), 'manual overlay opens');
      assert.ok(doc.querySelectorAll('#mpTabs .mptab').length === 3, 'diagram player present with 3 example tabs');
      assert.ok(doc.querySelectorAll('#mpBoard polygon.hex').length >= 8,
        'mini-board hexes rendered (' + doc.querySelectorAll('#mpBoard polygon.hex').length + ')');
      assert.ok(win.Engine.currentShape() === liveShape, 'rendering restored the live board shape (' + liveShape + ')');
      var c0 = doc.getElementById('mpCounter').textContent;
      doc.getElementById('mpNext').click();
      doc.getElementById('mpNext').click();
      var c2 = doc.getElementById('mpCounter').textContent;
      assert.ok(c0 === '1/7' && c2 === '3/7', 'Next advances the beat counter (' + c0 + ' -> ' + c2 + ')');
      assert.ok(doc.querySelectorAll('#mpBoard .mring.gold').length >= 1, 'gold attacker-support ring(s) on the mini board');
      // engine-truth guarantee: the tallies shown must equal supportFor/computeAttack
      // run fresh on the EXACT fixture state being shown (window.MANUAL.state/atk)
      var E2 = win.Engine, M = win.MANUAL;
      var prevShape = E2.currentShape();
      E2.setBoard(M.state.boardShape);
      var asup = E2.supportFor(M.state, 'red', M.atk.to, M.atk.from, true);
      var base = E2.UNITS[M.state.units[M.atk.from].type].atk;
      var res = E2.computeAttack(M.state, M.atk);
      E2.setBoard(prevShape);
      var pill3 = doc.querySelector('#mpBoard .mpill-t').textContent;
      assert.ok(pill3 === (base + asup.total) + ' vs ?', 'beat-3 tally = engine base + supportFor total (' + pill3 + ')');
      assert.ok(doc.querySelectorAll('#mpBoard .mring.gold').length === asup.hexes.length,
        'one gold ring per engine-confirmed supporter (' + asup.hexes.length + ')');
      doc.getElementById('mpNext').click(); // forest beat
      doc.getElementById('mpNext').click(); // defender beat
      doc.getElementById('mpNext').click(); // totals beat
      var pill6 = doc.querySelector('#mpBoard .mpill-t').textContent;
      assert.ok(pill6 === res.attackerPower + ' vs ' + res.defenderPower,
        'final pill = engine computeAttack (' + pill6 + ')');
      assert.ok(doc.querySelectorAll('#mpBoard .mring.steel').length >= 1, 'steel defender-support ring shown');
      doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      assert.ok(doc.getElementById('mpCounter').textContent === '5/7', 'ArrowLeft steps back a beat');
      doc.querySelector('#manualOvr .ovr-btns button').click();
      assert.ok(!doc.getElementById('manualOvr').classList.contains('active'), 'manual closes');
      finish();
    }

    function finish() {
      loopBridge(function () {
        console.log('\n== smoke play-through complete ==');
        resolve();
      });
    }

    // #154 loop bridge — the ONE seam crossing game/<->dev/: clicking Launch in the
    // Plan phase must spawn a real dev/loop.js and the Run phase advance through its
    // live LOOP_STEP output. Drive it through the REAL route: stand up a throwaway
    // server on server.js's exported handler, point the browser's fetch at it, then
    // fire the genuine WB_ON_LAUNCH (boot.js) and poll the genuine wbPollRunStatus.
    function loopBridge(done) {
      console.log('== Run phase: real dev/loop.js launch through /api/runloop (#154) ==');
      var http = require('http'), os = require('os');
      var srvMod = require(path.join(GAME, 'server.js'));
      var srv = http.createServer(srvMod.handler).listen(0, function () {
        var port = srv.address().port;
        var tmpDb = path.join(os.tmpdir(), 'woa-smoke-loop-' + process.pid + '.db');
        // Proxy the browser's relative /api/* fetches to the throwaway server.
        win.fetch = function (url, opts) {
          opts = opts || {};
          return new Promise(function (res, rej) {
            var r = http.request({ host: '127.0.0.1', port: port, path: url, method: opts.method || 'GET', headers: opts.headers || {} }, function (resp) {
              var chunks = []; resp.on('data', function (d) { chunks.push(d); });
              resp.on('end', function () {
                var text = Buffer.concat(chunks).toString('utf8');
                res({ ok: resp.statusCode >= 200 && resp.statusCode < 300, status: resp.statusCode,
                  json: function () { return Promise.resolve(text ? JSON.parse(text) : null); } });
              });
            });
            r.on('error', rej);
            if (opts.body) r.write(opts.body);
            r.end();
          });
        };
        function teardown() { try { srv.close(); } catch (e) {} try { fs.unlinkSync(tmpDb); } catch (e) {} }

        // Re-open the workbench and restore the genuine (server-served) launch hook,
        // then fire it with a small, isolated config (1 map, temp db) so a real hard-AI
        // sweep is ~6s, not the full roster's minute-plus.
        doc.getElementById('btnWorkbench').click();
        win.WB_ON_LAUNCH = wbRealLaunch; win.WB_ON_CONTROL = wbRealControl;
        win.WB_ON_LAUNCH({ loopType: 'card', iters: 2, n: 2, panel: ['hard'], profile: 'card', mapset: 'all', maps: 1, db: tmpDb });
        if (win.WB_POLL) { win.clearInterval(win.WB_POLL); win.WB_POLL = null; } // drive polling ourselves, faster than boot's 1s tick

        var seenRunning = false, maxIter = 0, waited = 0;
        function poll() {
          win.wbPollRunStatus();           // the genuine bridge poll: GET /api/runloop -> wbSetRunStatus
          var s = win.WB_RUN_STATUS || {};
          if (s.state === 'running' || s.state === 'paused') seenRunning = true;
          if (typeof s.iter === 'number' && s.iter > maxIter) maxIter = s.iter;
          if (s.state === 'done' || s.state === 'stopped') {
            assert.ok(seenRunning, 'Run phase saw the loop process running (status produced from a spawned process)');
            assert.ok(maxIter >= 2, 'Run status advanced iter 1 -> 2 (reached ' + maxIter + ')');
            assert.strictEqual(s.state, 'done', 'the 2-iteration loop reached state:done');
            assert.ok((s.steps || []).length === 2, 'both LOOP_STEP lines folded into the status (' + (s.steps || []).length + ')');
            assert.ok((s.swept || 0) > 0, 'the swept counter advanced from the loop output (' + s.swept + ')');
            teardown();
            win.fetch = function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve([]); } }); }; // restore no-op
            return done();
          }
          if ((waited += 200) > 120000) { teardown(); assert.ok(false, 'loop never reached done (last state ' + s.state + ', iter ' + maxIter + ')'); }
          realSetTimeout(poll, 200);
        }
        realSetTimeout(poll, 200);
      });
    }
  }
  realSetTimeout(tick, 30);
}, 50);
}));
