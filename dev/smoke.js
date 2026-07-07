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
          return startWatch();
        }
        if ((dw += 100) > 60000) { ok(false, 'dashboard run never finished'); return startWatch(); }
        realSetTimeout(waitDash, 100);
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
          return finish();
        }
        if ((w0 += 100) > 30000) { ok(false, 'watch mode stalled at turn ' + (st && st.turnNumber)); return finish(); }
        realSetTimeout(waitWatch, 100);
      })();
    }

    function finish() {
      console.log(fails === 0 ? '\nSMOKE PASSED' : '\n' + fails + ' SMOKE FAILURES');
      process.exit(fails === 0 ? 0 : 1);
    }
  }
  realSetTimeout(tick, 30);
}, 50);
