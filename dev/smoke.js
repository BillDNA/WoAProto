/* Headless UI smoke test: boots index.html in jsdom, plays a full AI-vs-AI
   battle through the real DOM, pokes the maps screen and the editor.
   Run from the repo root:  node dev/smoke.js  */
var fs = require('fs');
var path = require('path');
var { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));

var GAME = path.join(__dirname, '..', 'game');
function read(f) { return fs.readFileSync(path.join(GAME, f), 'utf8'); }

var html = read('index.html');
// inline the three scripts so jsdom needs no loader
html = html
  .replace('<script src="maps.js"></script>', '<script>' + read('maps.js') + '</script>')
  .replace('<script src="engine.js"></script>', '<script>' + read('engine.js') + '</script>')
  .replace('<script src="custom-maps.js"></script>', '<script>' + read('custom-maps.js') + '</script>');

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
  ok(win.Engine && win.Engine.MAPS.length === 12, 'engine loaded with 12 maps');
  ok(doc.querySelectorAll('#edShape option').length === Object.keys(win.Engine.SHAPES).length, 'editor shape dropdown built from maps.js');

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
        E.applyStep(APP.st, c);
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
    ok(doc.querySelectorAll('#mapGrid .mapitem').length === 12, '12 map tiles listed');
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

    console.log('== in-game balance report ==');
    win.runBalanceUI(win.Engine.MAPS[4]); // The Cockpit (fast battles)
    var waited = 0;
    (function waitBal() {
      if (doc.getElementById('balMore')) {
        ok(true, 'balance report rendered after 20 battles');
        ok(/wins/.test(doc.getElementById('balPanel').textContent), 'report shows win rates');
        win.closeBal();
        return watchMode();
      }
      if ((waited += 100) > 60000) { ok(false, 'balance report never finished'); return watchMode(); }
      realSetTimeout(waitBal, 100);
    })();

    function watchMode() {
      console.log('== watch mode (AI vs AI spectate) ==');
      doc.getElementById('edBack').click();
      doc.getElementById('btnMapsBack').click();
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
