/* Headless UI smoke test: boots index.html in jsdom, plays a full AI-vs-AI
   battle through the real DOM, pokes the maps screen and the editor.
   Run from the repo root:  node dev/smoke.js  */
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
  ['decks', 'maps'].forEach(function (kind) {
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
// no-op (the old exact-string replaces broke invisibly when a tag changed).
html = html.replace(/<script src="([^"]+)"><\/script>/g, function (tag, src) {
  if (src === 'content/manifest.js') return '<script>' + readContent() + '</script>';
  return '<script>' + read(src) + '</script>';
});
if (/<script [^>]*src=/.test(html)) {
  console.log('FAIL - un-inlined <script src> tag survived (inliner regex mismatch)');
  process.exit(1);
}

var fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  ok - ' + msg);
  else { console.log('  FAIL - ' + msg); fails++; }
}

var dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'file:///game/index.html' });
var win = dom.window, doc = win.document;
win.confirm = function () { return true; };

// jsdom has no rAF-based timers issue but uses real setTimeout — speed the AI up
var realSetTimeout = win.setTimeout;
win.setTimeout = function (fn, ms) { return realSetTimeout(fn, Math.min(ms || 0, 5)); };

setTimeout(function () {
  console.log('== boot ==');
  ok(win.Engine && win.Engine.MAPS.length >= 5, 'engine loaded the map roster (' + (win.Engine && win.Engine.MAPS.length) + ' maps)');
  ok(doc.querySelectorAll('#edShape option').length === Object.keys(win.Engine.SHAPES).length + 1,
    'editor shape dropdown = maps.js shapes + the Custom entry');

  console.log('== AI battle through the DOM ==');
  doc.getElementById('btnAI').click();
  ok(doc.getElementById('game').classList.contains('active'), 'game screen shown');
  ok(doc.querySelectorAll('#board polygon.hex').length >= 19, 'board hexes rendered');
  ok(doc.querySelectorAll('#board .coordlbl').length >= 19, 'grid labels rendered on hexes');
  var lblTexts = Array.prototype.map.call(doc.querySelectorAll('#board .coordlbl'), function (t) { return t.textContent; });
  ok(lblTexts.indexOf('A1') >= 0, 'label A1 present (got e.g. ' + lblTexts.slice(0, 4).join(',') + ')');

  console.log('== player mats ==');
  ok(doc.querySelectorAll('#matRed .slot').length === 13, 'red mat has 13 piece slots (7+2+1+3)');
  ok(doc.querySelectorAll('#matBlue .slot').length === 13, 'blue mat has 13 piece slots');
  ok(doc.querySelectorAll('#matRed .scard').length === 16, 'red mat tracks all 16 orders');
  ok(doc.querySelectorAll('#matBlue .scard').length === 16, 'blue mat tracks all 16 orders (enemy spend visible)');
  ok(doc.querySelectorAll('#matRed .slot svg').length === 13, 'reserve slots carry piece glyphs at battle start');
  ok(!!doc.getElementById('scorecard'), 'campaign score card present in top bar');

  // play like a (random but legal) human until the battle ends or 80 turns pass
  var steps = 0;
  function tick() {
    var APP = win.APP, E = win.Engine;
    if (!APP.st || APP.st.phase === 'battle-over' || steps++ > 4000) return done();
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
          // must-play-step (eb01d8e) forbids skipping this step — take the first
          // real legal choice instead of the skip the picker fell back to.
          var choices = E.enumerateChoices(APP.st), alt = null;
          for (var ci = 0; ci < choices.length; ci++) { if (!choices[ci].skip) { alt = choices[ci]; break; } }
          E.applyStep(APP.st, alt || { skip: true });
        }
        win.afterChange();
      }
    } catch (e) { console.log('  FAIL - exception mid-battle: ' + e.message); fails++; return done(); }
    realSetTimeout(tick, 2);
  }
  function done() {
    var st = win.APP.st;
    ok(st && (st.phase === 'battle-over' || st.turnNumber > 3), 'battle progressed (phase=' + (st && st.phase) + ', turn=' + (st && st.turnNumber) + ')');
    var logTxt = doc.getElementById('log').textContent;
    ok(/at [A-G][0-9]/.test(logTxt), 'journal uses grid references (sample: "' + (logTxt.match(/[A-Z][a-z]+ deploys [^.]+\./) || ['?'])[0] + '")');
    ok(doc.querySelectorAll('#log .entry.hdr').length >= 1, 'journal battle header styled');
    ok(doc.querySelectorAll('#log .tn').length >= 3, 'journal entries carry turn markers');
    var spentRed = doc.querySelectorAll('#matRed .scard.gone').length;
    var spentBlue = doc.querySelectorAll('#matBlue .scard.gone').length;
    ok(spentRed >= 1 && spentBlue >= 1, 'both mats show spent orders (red ' + spentRed + ', blue ' + spentBlue + ')');
    ok(doc.querySelectorAll('#matRed .slot.field, #matRed .slot.lost').length >= 1, 'red mat slots emptied as pieces deployed/died');

    console.log('== maps screen & editor ==');
    doc.getElementById('btnQuit').click();
    doc.getElementById('btnMaps').click();
    var tiles = doc.querySelectorAll('#mapGrid .mapitem').length;
    ok(tiles >= win.Engine.MAPS.length, 'all built-in maps listed (+ any shipped customs): ' + tiles + ' tiles');
    var tileBtns = Array.prototype.map.call(doc.querySelectorAll('#mapGrid .mapitem')[0].querySelectorAll('.btns button'), function (b) { return b.textContent; });
    ok(tileBtns.indexOf('Play') >= 0 && tileBtns.indexOf('Balance') >= 0, 'map tiles offer Play + Balance (' + tileBtns.join('/') + ')');
    doc.getElementById('btnNewMap').click();
    ok(doc.getElementById('editorScr').classList.contains('active'), 'editor opens');
    var hits = doc.querySelectorAll('#edBoard .edge-hit');
    ok(hits.length > 0, 'editor edge hit-targets present (' + hits.length + ')');
    hits[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    var painted = Object.keys(win.ED.edges).length;
    ok(painted === 1, 'clicking an edge paints terrain (' + painted + ' side)');
    doc.getElementById('edMirror').click();
    ok(Object.keys(win.ED.edges).length === 2, 'Mirror creates the rotated twin side');

    console.log('== map roster deletion + board-shape carving (V0) ==');
    var firstTileBtns = doc.querySelector('#mapGrid .mapitem .btns');
    ok(firstTileBtns && firstTileBtns.textContent.indexOf('Delete') >= 0, 'built-in map tiles offer Delete (floor of 5 enforced on click)');
    var hexTool = doc.querySelector('.edtools button[data-tool="hexes"]');
    hexTool.dispatchEvent(new win.Event('click', { bubbles: true }));
    ok(win.ED.hexes && Object.keys(win.ED.hexes).length === 24, 'Board-hexes tool converts to a custom outline seeded from the template');
    ok(doc.getElementById('edShape').value === '@custom', 'shape dropdown flips to Custom');
    var beforeCarve = Object.keys(win.ED.hexes).length;
    win.edRemoveHex('0,0');
    win.renderEditor();
    ok(Object.keys(win.ED.hexes).length === beforeCarve - 1, 'a hex can be carved out');
    ok(/23\/24 hexes/.test(doc.getElementById('edStock').textContent), 'hex count shown against the 24 ceiling');
    win.ED.red = [2, -2]; win.ED.blue = [-3, 2];
    win.ED.edges = {}; // the stray single side painted above has no physical piece
    doc.getElementById('edName').value = 'Carved Smoke Test';
    var carvedDef = win.edBuildDef();
    ok(carvedDef && carvedDef.shapeDef && carvedDef.shapeDef.hexes.length === 23, 'carved map saves an inline shapeDef');
    ok(win.Engine.validateMaps([carvedDef]).length === 0, 'carved map validates: ' + win.Engine.validateMaps([carvedDef]).join('; '));

    console.log('== TwoSetsOfThree: long terrain runs split into stock pieces ==');
    var ring = win.splitRun([0, 1, 2, 3, 4, 5]);
    ok(ring.length === 2 && ring[0].length === 3 && ring[1].length === 3, 'full forest ring = two length-3 pieces');
    var five = win.splitRun([5, 0, 1, 2, 3]);
    ok(five.length === 2 && five[0].length === 3 && five[1].length === 2 && five[0][0] === 5,
      'five-side arc splits 3+2 from its true start (' + JSON.stringify(five) + ')');
    var ringPieces = win.groupEdgesToPieces({ '0,0>0': 'F', '0,0>1': 'F', '0,0>2': 'F', '0,0>3': 'F', '0,0>4': 'F', '0,0>5': 'F' });
    ok(ringPieces.length === 2 && ringPieces.every(function (p) { return p.edges.length === 3; }),
      'editor groups a painted ring as two stock pieces');
    var ringMap = { name: 'Ring Test', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: ringPieces };
    ok(win.Engine.validateMaps([ringMap]).length === 0, 'two sets of three validate cleanly');

    console.log('== editor Balance -> dashboard, map as drawn (restructure step 9) ==');
    // The old in-game balance lab is gone; the editor's Balance button routes the
    // UNSAVED carved map (still open in the editor above) through openDashDef into
    // the one dashboard pipeline as a transient '(as drawn)' option.
    doc.getElementById('dashN').value = '20'; // openDashDef runs with whatever n is picked — keep it fast
    doc.getElementById('edBalance').click();  // openDashDef(edBuildDef())
    ok(doc.getElementById('dashScr').classList.contains('active'), 'editor Balance opens the Balance Dashboard');
    var adhocOpt = doc.querySelector('#dashMap option[value="@adhoc"]');
    ok(!!adhocOpt && /as drawn.*Carved Smoke Test/.test(adhocOpt.textContent) && doc.getElementById('dashMap').value === '@adhoc',
      'ad-hoc "(as drawn)" option injected and selected');
    ok(win.DASH.adhoc && win.DASH.adhoc.name === 'Carved Smoke Test' && win.DASH.running,
      'DASH.adhoc carries the unsaved def and the run started');
    var waited = 0;
    (function waitAdhoc() {
      if (!win.DASH.running && win.DASH.results.length) {
        ok(win.DASH.results.length === 1 && win.DASH.results[0].map.name === 'Carved Smoke Test',
          'ad-hoc dashboard run finished on the map as drawn');
        return watchMode();
      }
      if ((waited += 100) > 60000) { ok(false, 'ad-hoc dashboard run never finished'); return watchMode(); }
      realSetTimeout(waitAdhoc, 100);
    })();

    function watchMode() {
      console.log('== balance dashboard ==');
      doc.getElementById('edBack').click();
      doc.getElementById('btnMapsBack').click();
      doc.getElementById('btnDash').click();
      ok(doc.getElementById('dashScr').classList.contains('active'), 'dashboard opens from the menu');
      ok(doc.querySelectorAll('#dashMap option').length >= win.Engine.MAPS.length, 'map picker lists the pool');

      console.log('== dashboard shell: header pickers + pill nav + temperature (WOA-034) ==');
      ok(doc.getElementById('dashHead') && doc.getElementById('dashRunA') && doc.getElementById('dashRunB'),
        'dark header + run A/B pickers present');
      ok(doc.getElementById('dashRunA').disabled && doc.getElementById('dashRunA').options[0].textContent === '(no server)',
        'file:// — run pickers show the no-server fallback (dashLoadRuns never calls fetch, AC4)');
      ok(doc.querySelectorAll('#dashPills .dpill').length === 5, 'five pills: Overview | Maps | Cards | Units | Tables');
      ok(doc.querySelector('#dashPills .dpill[data-view="tables"]').classList.contains('sel'), 'Tables is the selected pill');
      ok(doc.getElementById('dashRunControls').style.display !== 'none', 'Run/Save controls visible on Tables');
      doc.querySelector('#dashPills .dpill[data-view="overview"]').click();
      ok(win.DASH.view === 'overview', 'clicking Overview switches DASH.view');
      ok(doc.getElementById('dashRunControls').style.display === 'none' && doc.getElementById('dashOut').style.display === 'none',
        'Run/Save + the Tables output hide outside Tables (AC2: charts context is view-only)');
      ok(doc.getElementById('dashPaneOverview').style.display !== 'none' &&
         /no server/i.test(doc.getElementById('dashPaneOverview').textContent) &&
         /map row/.test(doc.getElementById('dashPaneOverview').textContent),
        'Overview pane: file:// "no server, in-memory run only" fallback note (AC4)');
      ok(doc.getElementById('dashPaneMaps').style.display === 'none' && doc.getElementById('dashPaneUnits').style.display === 'none',
        'the other three panes stay hidden while Overview is active');
      doc.getElementById('dashTemp').value = 'T2';
      doc.getElementById('dashTemp').dispatchEvent(new win.Event('change', { bubbles: true }));
      ok(win.DASH.temperature === 'T2', 'temperature selector writes DASH.temperature');
      doc.querySelector('#dashPills .dpill[data-view="tables"]').click();
      ok(win.DASH.view === 'tables' && doc.getElementById('dashRunControls').style.display !== 'none' &&
         doc.getElementById('dashOut').style.display !== 'none',
        'back on Tables: run controls + output reappear');

      doc.getElementById('dashN').value = '20';
      doc.getElementById('dashMap').value = win.Engine.MAPS[4].name; // The Cockpit (fast battles)
      doc.getElementById('dashRun').click();
      var dw = 0;
      (function waitDash() {
        if (!win.DASH.running && win.DASH.results.length) {
          ok(win.DASH.results.length === 1, 'dashboard run finished on the chosen map');
          ok(doc.querySelectorAll('#dashOut table').length === 2, 'map table + card report rendered');
          ok(doc.querySelectorAll('#dashOut th.sortable').length > 10, 'columns are sortable');
          var dashTxt = doc.getElementById('dashOut').textContent;
          ok(/Aggression/.test(dashTxt) && /Decisiveness/.test(dashTxt), 'behaviour + decisiveness metrics shown');
          // dashboard numbers must equal the CLI's: same fold, same seeds
          var cli = win.Engine.balanceMap(win.Engine.MAPS[4], 20, { seedBase: 1 * 7919, diffRed: 'normal', diffBlue: 'normal' });
          var gui = win.DASH.results[0].out;
          ok(cli.redWins === gui.redWins && cli.turns === gui.turns && cli.attacks === gui.attacks,
            'GUI and CLI agree exactly (red ' + gui.redWins + '/' + cli.redWins + ', turns ' + gui.turns + '/' + cli.turns + ')');
          var th = doc.querySelector('#dashOut th[data-key="red"]');
          th.dispatchEvent(new win.Event('click', { bubbles: true }));
          ok(doc.querySelector('#dashOut th.sorted'), 'clicking a header sorts');
          // Feedback Round 2: save-report builder produces a full markdown report
          var rpt = win.dashReportMarkdown();
          ok(doc.getElementById('dashSave') && /## Maps/.test(rpt) && /## Card report/.test(rpt) && /Drag \| Swings/.test(rpt),
            'Save report button + markdown report (maps, card report, pacing cols)');

          // per-battle detail still collected for ui/charts.js's primitives, which
          // WOA-035+ reuses (spec README: Cards tab "evolves the existing charts.js
          // card quadrant") — not wired to a pill yet, so check the data survives.
          var detKey = win.DASH.results[0].map.name;
          ok(win.DASH.detail[detKey] && win.DASH.detail[detKey].turns.length === 20 &&
             win.DASH.detail[detKey].winTypes.length === 20,
            'dashRun collected per-battle turns + winTypes (' + (win.DASH.detail[detKey] || { turns: [] }).turns.length + ' battles)');

          console.log('== view-only panes: pill switch keeps the last run in memory (WOA-034, AC4) ==');
          doc.querySelector('#dashPills .dpill[data-view="maps"]').click();
          ok(win.DASH.view === 'maps', 'Maps pill selected');
          ok(doc.getElementById('dashRunControls').style.display === 'none' && doc.getElementById('dashOut').style.display === 'none',
            'Run/Save + the Tables table hide on the Maps pane');
          var mapsTxt = doc.getElementById('dashPaneMaps').textContent;
          ok(/no server/i.test(mapsTxt) && /1 map row/.test(mapsTxt),
            'Maps pane: file:// fallback note references the 1 in-memory map row from the run just finished');
          doc.querySelector('#dashPills .dpill[data-view="cards"]').click();
          ok(win.DASH.view === 'cards' && doc.getElementById('dashPaneCards').style.display !== 'none' &&
             doc.getElementById('dashPaneMaps').style.display === 'none',
            'Cards pill shows its own pane and hides Maps');
          doc.querySelector('#dashPills .dpill[data-view="tables"]').click();
          ok(doc.querySelectorAll('#dashOut table').length === 2, 'back on Tables: map table + card report still render');
          ok(doc.querySelector('#dashOut th.sorted'), 'sort state survived the pill round-trip');
          return overviewSmoke(startWatch);
        }
        if ((dw += 100) > 60000) { ok(false, 'dashboard run never finished'); return startWatch(); }
        realSetTimeout(waitDash, 100);
      })();
    }

    // WOA-035 (AC5): the Overview screen on a SEEDED DASH state — jsdom has no
    // real server, so this stubs win.fetch (GET /api/battles?run=<id>) and
    // win.canNet the way a real browser+server would answer, seeds two tiny
    // fixture runs straight onto DASH.runs/runA/runB, and drives renderOverview
    // through the same #dashPills click every other pane test above uses. Last
    // use of DASH/canNet in this file (deck editor / watch / manual don't touch
    // either), so nothing is restored afterward — `next` (startWatch) continues
    // the suite same as before this ticket.
    function overviewSmoke(next) {
      console.log('== Overview screen: seeded DASH state (WOA-035) ==');
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
      win.canNet = true; // seed "server present" without a real server
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
          ok(fetchCalls.some(function (u) { return /run=9001/.test(u); }) && fetchCalls.some(function (u) { return /run=9002/.test(u); }),
            'renderOverview fetched both runs via GET /api/battles?run=<id> (' + fetchCalls.join(', ') + ')');
          var txt = el.textContent;
          ok(/Verdict:/.test(txt), 'verdict banner rendered');
          ok(/Red%/.test(txt) && /Drag/.test(txt) && /Swings/.test(txt), 'band board rows rendered (scored metrics)');
          ok(/First-blood/.test(txt), 'guard row (First-blood→win) rendered below the fold');
          ok(/\(n=3\)/.test(txt), 'fleet-wide n=3 < 240 small-n greys the row with "(n=N)" (SPEC §8)');
          ok(/Fixture Alpha/.test(txt) && /Fixture Beta/.test(txt), 'map dumbbells rendered one row per map seen in either run');
          ok(/deploy interleave/.test(txt) && /median settle/.test(txt), 'pacing minis rendered (1e)');
          var mapRow = el.querySelector('.ov-map-row[data-map="Fixture Alpha"]');
          ok(!!mapRow, 'a map dumbbell row carries data-map and is clickable');
          if (mapRow) mapRow.click();
          ok(win.DASH.mapFocus === 'Fixture Alpha' && win.DASH.view === 'maps',
            'clicking a map row sets DASH.mapFocus + switches to the Maps pill (AC2)');
          var mapsTxt = doc.getElementById('dashPaneMaps').textContent;
          ok(/Fixture Alpha/.test(mapsTxt), 'Maps stub echoes the focused map name so the click visibly works (AC2)');
          return next();
        }
        if ((ow += 50) > 5000) { ok(false, 'Overview never finished its seeded render'); return next(); }
        realSetTimeout(waitOverview, 50);
      })();
    }

    function startWatch() {
      console.log('== deck editor ==');
      doc.getElementById('dashBack').click();
      doc.getElementById('btnDeck').click();
      ok(doc.getElementById('deckScr').classList.contains('active'), 'deck editor opens');
      ok(doc.querySelectorAll('#dkList .dkli').length === win.Engine.CARDS.length,
        'one list row per card (' + doc.querySelectorAll('#dkList .dkli').length + ')');
      ok(doc.querySelector('#dkDetail .dkd-name') && doc.querySelectorAll('#dkStepList .dkstep').length >= 1,
        'detail panel + GUI step builder render for the selected card');
      ok(win.deckProblems(win.Engine.CARDS).length === 0, 'built-in deck validates clean');
      ok(!doc.getElementById('dkSave').disabled, 'Save enabled on a valid deck');
      // break it: bump the selected card's count so the total exceeds 16 -> validation refuses
      var cnt = doc.querySelector('#dkDetail .dkd-count');
      cnt.value = String(+cnt.value + 1);
      cnt.dispatchEvent(new win.Event('input', { bubbles: true }));
      ok(/must total 16/.test(doc.getElementById('dkWarn').textContent), 'over-16 deck flagged');
      ok(doc.getElementById('dkSave').disabled, 'Save disabled while invalid');
      // two starting cards / bad step type are refused too
      var broken = JSON.parse(JSON.stringify(win.Engine.CARDS));
      broken[1].starting = true;
      ok(win.deckProblems(broken).some(function (p) { return /exactly ONE/.test(p); }), 'double starting card refused');
      var badStep = JSON.parse(JSON.stringify(win.Engine.CARDS));
      badStep[0].steps = [{ type: 'heal' }];
      ok(win.deckProblems(badStep).some(function (p) { return /unknown type/.test(p); }), 'unknown step type refused');
      var benched = JSON.parse(JSON.stringify(win.Engine.CARDS));
      benched[2].out = true; // Feedback Round 1: benched cards drop from the 16
      ok(win.deckProblems(benched).some(function (p) { return /must total 16/.test(p); }), 'benching a card drops it from the 16');
      // Feedback Round 2: five deck slots, exactly one active
      ok(doc.querySelectorAll('#dkSlots .dkslot[data-slot]').length === 5, 'five deck slots offered');
      ok(doc.querySelectorAll('#dkSlots .dkslot.active').length === 1, 'exactly one active deck marked');
      doc.querySelector('#dkSlots .dkslot[data-slot="2"]').click();
      ok(doc.querySelector('#dkSlots .dkslot[data-slot="2"]').classList.contains('open') &&
         doc.querySelectorAll('#dkList .dkli').length === win.Engine.CARDS.length,
        'switching to an empty slot clones the open deck for editing');
      doc.getElementById('dkBack').click();

      console.log('== watch mode (AI vs AI spectate) ==');
      doc.getElementById('btnWatch').click();
      ok(doc.getElementById('game').classList.contains('active'), 'watch mode starts a game');
      var w0 = 0;
      (function waitWatch() {
        var st = win.APP.st;
        if (st && (st.turnNumber >= 3 || st.phase === 'battle-over')) {
          ok(true, 'both generals played without input (turn ' + st.turnNumber + ')');
          return manualPlayer();
        }
        if ((w0 += 100) > 30000) { ok(false, 'watch mode stalled at turn ' + (st && st.turnNumber)); return manualPlayer(); }
        realSetTimeout(waitWatch, 100);
      })();
    }

    function manualPlayer() {
      console.log('== field manual diagram player (V1) ==');
      doc.getElementById('btnQuit').click();
      var liveShape = win.Engine.currentShape();
      doc.getElementById('btnManual').click();
      ok(doc.getElementById('manualOvr').classList.contains('active'), 'manual overlay opens');
      ok(doc.querySelectorAll('#mpTabs .mptab').length === 3, 'diagram player present with 3 example tabs');
      ok(doc.querySelectorAll('#mpBoard polygon.hex').length >= 8,
        'mini-board hexes rendered (' + doc.querySelectorAll('#mpBoard polygon.hex').length + ')');
      ok(win.Engine.currentShape() === liveShape, 'rendering restored the live board shape (' + liveShape + ')');
      var c0 = doc.getElementById('mpCounter').textContent;
      doc.getElementById('mpNext').click();
      doc.getElementById('mpNext').click();
      var c2 = doc.getElementById('mpCounter').textContent;
      ok(c0 === '1/7' && c2 === '3/7', 'Next advances the beat counter (' + c0 + ' -> ' + c2 + ')');
      ok(doc.querySelectorAll('#mpBoard .mring.gold').length >= 1, 'gold attacker-support ring(s) on the mini board');
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
      ok(pill3 === (base + asup.total) + ' vs ?', 'beat-3 tally = engine base + supportFor total (' + pill3 + ')');
      ok(doc.querySelectorAll('#mpBoard .mring.gold').length === asup.hexes.length,
        'one gold ring per engine-confirmed supporter (' + asup.hexes.length + ')');
      doc.getElementById('mpNext').click(); // forest beat
      doc.getElementById('mpNext').click(); // defender beat
      doc.getElementById('mpNext').click(); // totals beat
      var pill6 = doc.querySelector('#mpBoard .mpill-t').textContent;
      ok(pill6 === res.attackerPower + ' vs ' + res.defenderPower,
        'final pill = engine computeAttack (' + pill6 + ')');
      ok(doc.querySelectorAll('#mpBoard .mring.steel').length >= 1, 'steel defender-support ring shown');
      doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      ok(doc.getElementById('mpCounter').textContent === '5/7', 'ArrowLeft steps back a beat');
      doc.querySelector('#manualOvr .ovr-btns button').click();
      ok(!doc.getElementById('manualOvr').classList.contains('active'), 'manual closes');
      finish();
    }

    function finish() {
      console.log(fails === 0 ? '\nSMOKE PASSED' : '\n' + fails + ' SMOKE FAILURES');
      process.exit(fails === 0 ? 0 : 1);
    }
  }
  realSetTimeout(tick, 30);
}, 50);
