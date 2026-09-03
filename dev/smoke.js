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
  ['cards', 'battalions', 'maps'].forEach(function (kind) {
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

realSetTimeout(function () {
  console.log('== boot ==');
  assert.ok(win.Engine && win.Engine.MAPS.length >= 5, 'engine loaded the map library (' + (win.Engine && win.Engine.MAPS.length) + ' maps)');
  assert.ok(doc.querySelectorAll('#edShape option').length === Object.keys(win.Engine.SHAPES).length + 1,
    'editor shape dropdown = maps.js shapes + the Custom entry');

  console.log('== partition: front door hides dev tooling by default ==');
  assert.ok(!doc.getElementById('btnAI'), 'old March-against-AI button gone from the front door');
  assert.ok(doc.getElementById('btnPlay') && doc.getElementById('btnSettings'), 'front door offers Play + Settings');
  assert.ok(!win.devMode(), 'dev mode off by default');
  assert.ok(!win.screenAllowed('maps') && !win.screenAllowed('battalion') && !win.screenAllowed('dash') && !win.screenAllowed('devhub'),
    'dev screens gated off while dev mode is off');
  assert.ok(win.screenAllowed('campaign') && win.screenAllowed('settings'), 'player screens always allowed');
  assert.ok(doc.getElementById('settingsScr').querySelector('#sideRow') && doc.getElementById('diffSel'),
    'side + enemy general moved off the menu into Settings');

  console.log('== front door → campaign → battle ==');
  doc.getElementById('btnPlay').click();
  assert.ok(doc.getElementById('campaignScr').classList.contains('active'),
    'Play opens the campaign run-flow stub, not a battle directly');
  // config identity: a persistent screen-corner overlay stamps the live
  // config identity onto every screenshot. Assert it renders and carries the digests.
  var bug = doc.getElementById('configBug');
  assert.ok(bug, 'the config bug overlay is present');
  assert.ok(bug.textContent.indexOf(win.Engine.CONFIG.digest) >= 0, 'the config bug shows the engine config digest');
  assert.ok(bug.textContent.indexOf(win.UI_CONFIG.digest) >= 0, 'the config bug shows the UI config digest');
  assert.ok(bug.textContent.indexOf('v' + win.Engine.VERSION) >= 0, 'the config bug shows the rules version');
  // UI home identity: its digest getter is the SAME function as the engine home's
  // (both from Engine.defineConfigHome) — a hand-rolled UI home would red here.
  var uiGet = Object.getOwnPropertyDescriptor(win.UI_CONFIG, 'digest').get;
  var cfgGet = Object.getOwnPropertyDescriptor(win.Engine.CONFIG, 'digest').get;
  assert.ok(typeof uiGet === 'function' && uiGet === cfgGet,
    'UI_CONFIG was made by Engine.defineConfigHome (its digest getter IS the shared one)');

  console.log('== muster (player battalion builder) ==');
  doc.getElementById('btnMuster').click();
  assert.ok(doc.getElementById('buildBattalionScr').classList.contains('active'), 'Muster opens the player battalion builder');
  assert.ok(doc.querySelectorAll('#pbPool .pbpool-row').length === win.Engine.CARD_POOL.length,
    'the pool lists every pool card (' + doc.querySelectorAll('#pbPool .pbpool-row').length + ')');
  assert.ok(doc.querySelectorAll('#pbList .pbli').length >= 1, 'the battalion is seeded from the active slot');
  assert.ok(/\/\s*100\s*pts/.test(doc.getElementById('pbFoot').textContent), 'the muster readout shows the army-points cap (100)');
  // config homes: the readout is driven by the homes, not bare literals.
  // The muster footer's cap and band track E.CONFIG.pointsCap and UI_CONFIG.battalionBand
  // — read the live dials and assert the rendered text agrees, so tuning a dial reds nothing.
  var pbFootText = doc.getElementById('pbFoot').textContent;
  assert.ok(win.UI_CONFIG && win.UI_CONFIG.battalionBand, 'UI_CONFIG is the UI-config home');
  // the cap is rendered with thin-space separators, so match on the number + "pts"
  // (\s spans the thin space); read the live dial so tuning the cap reds nothing.
  assert.ok(new RegExp('\\/\\s*' + win.Engine.CONFIG.pointsCap + '\\s*pts').test(pbFootText),
    'the muster cap readout is read from the engine config home (CONFIG.pointsCap)');
  assert.ok(pbFootText.indexOf('target ' + win.UI_CONFIG.battalionBand.min) >= 0,
    'the muster band readout is read from the UI-config home (UI_CONFIG.battalionBand)');
  assert.ok(!doc.getElementById('pbMarch').disabled, 'March Out is enabled on a legal battalion');
  var pbN = win.pbCount();
  doc.querySelector('#pbPool .pbpool-add').click();
  assert.ok(win.pbCount() === pbN + 1, 'adding a pool card raises the muster count');
  // the seam March Out threads through: the built battalion + a seated opponent → sideDecks
  var pbBuilt = win.shipCards(win.PB.cards);
  var pbBattle = win.Engine.newBattle({ maps: [win.Engine.MAPS[0]],
    battalions: { red: { cards: pbBuilt }, blue: (win.PB.opponent && win.PB.opponent.b.id) || null } });
  var pbSk = win.Engine.newSkirmish(pbBattle);
  assert.ok(pbSk.cards.sideDecks && pbSk.cards.sideDecks.red.cards.length >= 1,
    'the built battalion threads into a real skirmish via sideDecks (asymmetric seat)');
  doc.getElementById('pbBack').click();
  assert.ok(doc.getElementById('campaignScr').classList.contains('active'), 'Back returns to the campaign');

  doc.getElementById('btnNextBattle').click();
  assert.ok(doc.getElementById('game').classList.contains('active'), 'Quick battle drops into a battle');
  assert.ok(doc.querySelectorAll('#board polygon.hex').length >= 19, 'board hexes rendered');
  assert.ok(doc.querySelectorAll('#board .coordlbl').length >= 19, 'grid labels rendered on hexes');
  var lblTexts = Array.prototype.map.call(doc.querySelectorAll('#board .coordlbl'), function (t) { return t.textContent; });
  assert.ok(lblTexts.indexOf('A1') >= 0, 'label A1 present (got e.g. ' + lblTexts.slice(0, 4).join(',') + ')');

  console.log('== player mats ==');
  assert.ok(doc.querySelectorAll('#matRed .slot').length === 13, 'red mat has 13 piece slots (7+2+1+3)');
  assert.ok(doc.querySelectorAll('#matBlue .slot').length === 13, 'blue mat has 13 piece slots');
  // one .scard per card COPY in the active battalion — derive the total from the
  // battalion so this stays correct at any battalion size, not a hardcoded count.
  var battalionTotal = win.Engine.CARDS.reduce(function (a, c) { return a + (+c.count || 0); }, 0);
  assert.ok(doc.querySelectorAll('#matRed .scard').length === battalionTotal, 'red mat tracks all ' + battalionTotal + ' orders');
  assert.ok(doc.querySelectorAll('#matBlue .scard').length === battalionTotal, 'blue mat tracks all ' + battalionTotal + ' orders (enemy spend visible)');
  assert.ok(doc.querySelectorAll('#matRed .slot svg').length === 13, 'reserve slots carry piece glyphs at skirmish start');
  assert.ok(!!doc.getElementById('scorecard'), 'campaign score card present in top bar');

  // play like a (random but legal) human until the skirmish ends or 80 turns pass
  var steps = 0;
  function tick() {
    var APP = win.APP, E = win.Engine;
    if (!APP.st || APP.st.flow.phase === 'skirmish-over' || steps++ > 4000) return done();
    if (APP.ui.busy) return realSetTimeout(tick, 8); // AI is animating
    if (APP.st.flow.current !== APP.mySide) return realSetTimeout(tick, 8);
    try {
      if (APP.st.flow.phase === 'choose-card') {
        var cid = APP.st.cards.hands[APP.mySide][0];
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
    assert.ok(st && (st.flow.phase === 'skirmish-over' || st.flow.turnNumber > 3), 'skirmish progressed (phase=' + (st && st.flow.phase) + ', turn=' + (st && st.flow.turnNumber) + ')');
    var logTxt = doc.getElementById('log').textContent;
    assert.ok(/at [A-G][0-9]/.test(logTxt), 'journal uses grid references (sample: "' + (logTxt.match(/[A-Z][a-z]+ deploys [^.]+\./) || ['?'])[0] + '")');
    assert.ok(doc.querySelectorAll('#log .entry.hdr').length >= 1, 'journal skirmish header styled');
    assert.ok(doc.querySelectorAll('#log .tn').length >= 3, 'journal entries carry turn markers');
    var spentRed = doc.querySelectorAll('#matRed .scard.gone').length;
    var spentBlue = doc.querySelectorAll('#matBlue .scard.gone').length;
    assert.ok(spentRed >= 1 && spentBlue >= 1, 'both mats show spent orders (red ' + spentRed + ', blue ' + spentBlue + ')');
    assert.ok(doc.querySelectorAll('#matRed .slot.field, #matRed .slot.lost').length >= 1, 'red mat slots emptied as pieces deployed/died');

    console.log('== dev mode reveals the Dev Hub → maps screen & editor ==');
    doc.getElementById('btnQuit').click();
    assert.ok(doc.getElementById('menu').classList.contains('active'), 'Menu returns to the front door');
    win.setDevMode(true); // arm the real dev flag (the ` hotkey / Settings toggle path)
    assert.ok(win.devMode() && win.screenAllowed('maps'), 'dev mode on reveals the dev screens');
    doc.getElementById('btnDevHub').click(); // dev-only front-door link → Dev Hub
    assert.ok(doc.getElementById('devHubScr').classList.contains('active'), 'Dev Hub opens');
    assert.ok(doc.getElementById('btnMaps') && doc.getElementById('btnBattalion') && doc.getElementById('btnDash') && doc.getElementById('btnWatch'),
      'Dev Hub generated its tool buttons from the registry');
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

    console.log('== map library deletion + board-shape carving ==');
    var firstTileBtns = doc.querySelector('#mapGrid .mapitem .btns');
    assert.ok(firstTileBtns && firstTileBtns.textContent.indexOf('Delete') >= 0, 'built-in map tiles offer Delete (floor of 5 enforced on click)');
    var hexTool = doc.querySelector('.edtools button[data-tool="hexes"]');
    hexTool.dispatchEvent(new win.Event('click', { bubbles: true }));
    assert.ok(win.ED.hexes && Object.keys(win.ED.hexes).length === win.Engine.CONFIG.mapHexCeiling, 'Board-hexes tool converts to a custom outline seeded from the template');
    assert.ok(doc.getElementById('edShape').value === '@custom', 'shape dropdown flips to Custom');
    var beforeCarve = Object.keys(win.ED.hexes).length;
    win.edRemoveHex('0,0');
    win.renderEditor();
    assert.ok(Object.keys(win.ED.hexes).length === beforeCarve - 1, 'a hex can be carved out');
    // the ceiling shown is read from the UI-config home, not a bare literal —
    // both map-editor guards and this readout agree on E.CONFIG.mapHexCeiling.
    assert.ok(new RegExp('23\\/' + win.Engine.CONFIG.mapHexCeiling + ' hexes').test(doc.getElementById('edStock').textContent),
      'hex count shown against the ceiling read from the UI-config home');
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
      assert.ok(doc.querySelectorAll('#dashPills .dpill').length === 6, 'six pills: Overview | Maps | Cards | Units | Cross-cuts | Tables');
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
        'the other panes stay hidden while Overview is active');

      // Cross-cuts pill: renders on its own (no run A/B). jsdom has no fetch, so
      // the pane must show its no-server note, never throw.
      doc.querySelector('#dashPills .dpill[data-view="crosscuts"]').click();
      assert.ok(win.DASH.view === 'crosscuts' && doc.getElementById('dashPaneCrosscuts').style.display !== 'none',
        'clicking Cross-cuts switches to and shows the Cross-cuts pane');
      assert.ok(/cross-cuts/i.test(doc.getElementById('dashPaneCrosscuts').textContent),
        'Cross-cuts pane renders its heading without a server (graceful no-data)');

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
          // dashboard numbers must equal the CLI's: same fold, same seeds.
          // balanceMap is the sim layer (WOA_SIM), separate from the engine.
          var cli = win.WOA_SIM.balanceMap(win.Engine.MAPS[4], 20, { seedBase: 1 * 7919, diffRed: 'normal', diffBlue: 'normal' });
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
      // predates the fs capture" honest-grey path on the |FS-diff| track.
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
          return mapDrillSmoke(next);
        }
        if ((ow += 50) > 5000) { assert.ok(false, 'Overview never finished its seeded render'); return next(); }
        realSetTimeout(waitOverview, 50);
      })();
    }

    // the Map drill-down screen (breadcrumb, A|B|A/B toggle, tempo lanes +
    // |FS-diff| track, per-map band board, settle curve) reusing the SAME seeded
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

      console.log('-- |FS-diff| track: honest grey on a run that predates fs capture --');
      assert.ok(!/unavailable/.test(el.textContent), 'run B (default) carries fs -> track renders, no "unavailable" note');
      assert.ok(el.querySelectorAll('.mapd-col-l svg polyline').length >= 1, '|FS-diff| track drew a polyline for run B');
      el.querySelector('.ab-toggle [data-ab="A"]').click();
      assert.ok(win.DASH.abMode === 'A', 'clicking A switches the toggle');
      el = doc.getElementById('dashPaneMaps');
      assert.ok(/predates the fs capture/.test(el.textContent),
        'run A (no fs on its rows) greys the |FS-diff| track with the honest "predates the fs capture" note instead of a fabricated line');

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

    function startWatch() {
      console.log('== battalion editor ==');
      doc.getElementById('dashBack').click();
      doc.getElementById('btnBattalion').click();
      assert.ok(doc.getElementById('battalionScr').classList.contains('active'), 'battalion editor opens');
      assert.ok(doc.querySelectorAll('#dkList .dkli').length === win.Engine.CARDS.length,
        'one list row per card (' + doc.querySelectorAll('#dkList .dkli').length + ')');
      assert.ok(doc.querySelector('#dkDetail .dkd-name') && doc.querySelectorAll('#dkStepList .dkstep').length >= 1,
        'detail panel + GUI step builder render for the selected card');
      // battalionProblems() accepts a 16-19 band (design ceiling, not one exact count;
      // every shipped content/battalions/*.js battalion lands in that band), so "clean" and
      // the break-it thresholds below are proved against the real band, not a
      // hardcoded count.
      assert.ok(win.battalionProblems(win.Engine.CARDS).length === 0, 'built-in battalion validates clean');
      assert.ok(!doc.getElementById('dkSave').disabled, 'Save enabled on a valid battalion');
      // break it: bump the selected card's count so the total exceeds the 16-19 band -> validation refuses
      var cnt = doc.querySelector('#dkDetail .dkd-count');
      cnt.value = String(+cnt.value + 4);
      cnt.dispatchEvent(new win.Event('input', { bubbles: true }));
      assert.ok(/must total 16-19/.test(doc.getElementById('dkWarn').textContent), 'over-band (>19) battalion flagged');
      assert.ok(doc.getElementById('dkSave').disabled, 'Save disabled while invalid');
      // two starting cards / bad step type are refused too
      var broken = JSON.parse(JSON.stringify(win.Engine.CARDS));
      broken[1].starting = true;
      assert.ok(win.battalionProblems(broken).some(function (p) { return /exactly ONE/.test(p); }), 'double starting card refused');
      var badStep = JSON.parse(JSON.stringify(win.Engine.CARDS));
      badStep[0].steps = [{ type: 'heal' }];
      assert.ok(win.battalionProblems(badStep).some(function (p) { return /unknown type/.test(p); }), 'unknown step type refused');
      var benched = JSON.parse(JSON.stringify(win.Engine.CARDS));
      benched[2].out = true; // benched cards drop from the total (here 17 -> 14, under the 16-19 band)
      assert.ok(win.battalionProblems(benched).some(function (p) { return /must total 16-19/.test(p); }), 'benching a card drops it below the 16-19 band');
      // An over-army-points battalion is refused by the same validation pass.
      // Swap the cheapest card for a maxed-out one so the total blows past the cap
      // without changing the card count (isolates the points gate from the size band).
      var overPts = JSON.parse(JSON.stringify(win.Engine.CARDS));
      overPts.forEach(function (c) { if (!c.starting) c.steps = [{ type: 'deploy', unit: 'artillery' }, { type: 'attack', mod: 5, tieSpare: true, anywhere: true }]; });
      assert.ok(win.Engine.battalionPoints({ cards: overPts.filter(function (c) { return !c.out; }) }) > win.Engine.BATTALION_POINTS_CAP &&
         win.battalionProblems(overPts).some(function (p) { return /over the army-points budget/.test(p); }), 'over-budget battalion refused by the points gate');
      // five battalion slots, exactly one active
      assert.ok(doc.querySelectorAll('#dkSlots .dkslot[data-slot]').length === 5, 'five battalion slots offered');
      assert.ok(doc.querySelectorAll('#dkSlots .dkslot.active').length === 1, 'exactly one active battalion marked');
      doc.querySelector('#dkSlots .dkslot[data-slot="2"]').click();
      assert.ok(doc.querySelector('#dkSlots .dkslot[data-slot="2"]').classList.contains('open') &&
         doc.querySelectorAll('#dkList .dkli').length === win.Engine.CARDS.length,
        'switching to an empty slot clones the open battalion for editing');
      // battalion assembler: the pool picker lists the shared pool (content/cards/) and
      // adds a card from it (fresh slot 2 is disposable, so mutating it is safe here).
      var poolSel = doc.getElementById('dkAddPool');
      assert.ok(poolSel && poolSel.options.length === win.Engine.CARD_POOL.length + 1,
        'pool picker lists every pool card + the placeholder (' + (poolSel && poolSel.options.length) + ')');
      var absent = win.Engine.CARD_POOL.filter(function (c) { return win.Engine.CARDS.every(function (x) { return x.id !== c.id; }); })[0];
      if (absent) {
        var rows0 = doc.querySelectorAll('#dkList .dkli').length;
        poolSel.value = absent.id;
        poolSel.dispatchEvent(new win.Event('change', { bubbles: true }));
        assert.ok(doc.querySelectorAll('#dkList .dkli').length === rows0 + 1 &&
          doc.querySelector('#dkDetail .dkd-id').value === absent.id,
          'picking a pool card adds it to the battalion and selects it (' + absent.id + ')');
      }
      doc.getElementById('dkBack').click();

      console.log('== watch mode (AI vs AI spectate) ==');
      doc.getElementById('btnWatch').click();
      assert.ok(doc.getElementById('game').classList.contains('active'), 'watch mode starts a game');
      var w0 = 0;
      (function waitWatch() {
        var st = win.APP.st;
        if (st && (st.flow.turnNumber >= 3 || st.flow.phase === 'skirmish-over')) {
          assert.ok(true, 'both generals played without input (turn ' + st.flow.turnNumber + ')');
          return manualPlayer();
        }
        if ((w0 += 100) > 30000) { assert.ok(false, 'watch mode stalled at turn ' + (st && st.flow.turnNumber)); return manualPlayer(); }
        realSetTimeout(waitWatch, 100);
      })();
    }

    function manualPlayer() {
      console.log('== field manual diagram player ==');
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
      E2.setBoard(M.state.board.boardShape);
      var asup = E2.supportFor(M.state, 'red', M.atk.to, M.atk.from, true);
      var base = E2.UNITS[M.state.pieces.units[M.atk.from].type].atk;
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
      console.log('\n== smoke play-through complete ==');
      resolve();
    }
  }
  realSetTimeout(tick, 30);
}, 50);
}));
