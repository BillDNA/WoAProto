/* Auto-split from game/test.js (ADR-0003: node:test). Subsystem: maps.
   Frozen-API entry game/test.js delegates here; run this file directly with
   `node game/test.maps.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E } = require('./test.helpers.js');

test('map validation', () => {
var probs = E.validateMaps();
assert.ok(probs.length === 0, 'all built-in maps valid' + (probs.length ? ': ' + probs.join('; ') : ''));
// Maps are per-item files under game/content/maps/. `custom:true` marks Bill's
// experiments; the shipped map library is the non-custom maps.
var builtinMaps = E.MAPS.filter(function (m) { return !m.custom; });
// Mechanism, not a pinned count: the shipped library must stay
// above the 5-map floor so a first-to-3 campaign always has fresh boards. Adding
// or cutting a shipped map above the floor reds nothing here.
assert.ok(builtinMaps.length >= 5, 'shipped (non-custom) map library stays above the 5-map floor (got ' + builtinMaps.length + ' of ' + E.MAPS.length + ' total)');
(function () {
  // HQ-distance guardrail applies to the SHIPPED map library; custom maps are Bill's
  // experiments (a turn-2 rush map can be intentional) and are exempt.
  builtinMaps.forEach(function (m) {
    var d = E.dist(E.key(m.redHQ[0], m.redHQ[1]), E.key(m.blueHQ[0], m.blueHQ[1]));
    assert.ok(d >= 4, m.name + ': HQs ' + d + ' apart (4+ so there is no turn-2 rush)');
  });
})();
});

test('carved shapeDef map rebuilds its board after a LAN serialize', () => {
(function () {
  // The seam: a carved-outline map travels inside battle.maps; the joiner/resumer
  // rebuilds the board from that transmitted shapeDef ALONE (ensureMapShape). Drive
  // it: build a battle on a carved map, JSON round-trip it (the whole-state LAN
  // hand-off), and start the skirmish on the far side — the board must be the
  // carved outline, not a fallback.
  var carved = E.MAPS.filter(function (m) { return m.shapeDef && m.shapeDef.hexes; })[0];
  assert.ok(carved, 'there is a carved shapeDef map in the library to exercise');
  var battle = E.newBattle({ seed: 9, firstPlayer: 'red', maps: [carved] });
  var wire = JSON.parse(JSON.stringify(battle));                 // the wire: whole-state JSON
  assert.ok(wire.maps[0].shapeDef && Array.isArray(wire.maps[0].shapeDef.hexes),
    'shapeDef survives serialization inside battle.maps (nothing local needed to rebuild)');
  var st = E.newSkirmish(wire);                                  // far side rebuilds from the wire
  var hexes = E.boardHexes(st.board.boardShape);
  assert.ok(hexes.length === carved.shapeDef.hexes.length,
    'the rebuilt board has exactly the carved outline (' + hexes.length + ' hexes)');
  assert.ok(hexes.length !== E.boardHexes(E.DEFAULT_SHAPE).length,
    'the carved board is not the default shape — really rebuilt from shapeDef, not fallen back');
})();
});

test('active mapset', () => {
(function () {
  var one = [E.MAPS[0]];
  var m = E.newBattle({ seed: 33, maps: one });
  assert.ok(m.maps.length === 1 && m.mapOrder.length === 1, 'battle carries its own 1-map set');
  var st = E.newSkirmish(m);
  assert.ok(st.mapName === E.MAPS[0].name, 'skirmish 1 uses the pooled map');
  m.skirmishIndex = 3; m.lastLoser = "red";
  var st2 = E.newSkirmish(m);
  assert.ok(st2.mapName === E.MAPS[0].name, 'pool cycles when skirmishes outnumber maps');
})();
});

test('load order: one declared chain, no second hand-list', () => {
(function () {
  var fs = require('fs'), path = require('path');
  var GAME = path.join(__dirname, '..');
  var ORDER = require(path.join(GAME, 'load-order.js'));

  // 1. index.html hand-lists exactly one script: load-order.js, which writes the rest.
  var html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
  var tags = [];
  html.replace(/<script src="([^"]+)"><\/script>/g, function (m, src) { tags.push(src); return m; });
  assert.ok(JSON.stringify(tags) === JSON.stringify(['load-order.js']),
    'index.html hand-lists only load-order.js (got ' + JSON.stringify(tags) + ')');

  // 2. Every listed path exists, and no path is listed twice — a second entry
  //    would run the file twice and hide which position is the real one.
  var seen = {};
  ORDER.PAGE.forEach(function (src) {
    assert.ok(fs.existsSync(path.join(GAME, src)), 'listed script exists: ' + src);
    assert.ok(!seen[src], 'listed once: ' + src);
    seen[src] = true;
  });

  // 3. Every shipped .js under engine/ and ui/ is scheduled, at any depth — a
  //    file that exists but is unlisted silently never loads. A house's own
  //    *.test.js sits beside the code it covers and is NOT a shipped part;
  //    game/test/test.js requires those directly.
  function walk(sub, out) {
    fs.readdirSync(path.join(GAME, sub), { withFileTypes: true }).forEach(function (e) {
      var rel = sub + '/' + e.name;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.js$/.test(e.name) && !/\.test\.js$/.test(e.name)) out.push(rel);
    });
    return out;
  }
  walk('engine', []).forEach(function (f) {
    assert.ok(ORDER.ENGINE.indexOf(f) >= 0, 'engine part is scheduled: ' + f);
  });
  walk('ui', []).forEach(function (f) {
    assert.ok(ORDER.APP.indexOf(f) >= 0, 'ui file is scheduled: ' + f);
  });
  // game/ root too: a script dropped beside sim.js and never listed would load
  // nowhere. These four are the entry points that READ the chain rather than
  // sitting in it, so they are the only unscheduled files allowed here.
  var LOADERS = ['engine.js', 'load-order.js', 'server.js', 'sweep-worker.js'];
  fs.readdirSync(GAME, { withFileTypes: true }).forEach(function (e) {
    if (!e.isFile() || !/\.js$/.test(e.name)) return;
    assert.ok(ORDER.PAGE.indexOf(e.name) >= 0 || LOADERS.indexOf(e.name) >= 0,
      'game/' + e.name + ' is either scheduled in load-order.js or a known loader');
  });

  // 4. The load-time reads that are the whole reason an order exists.
  var pageAt = function (src) { return ORDER.PAGE.indexOf(src); };
  assert.ok(pageAt('maps.js') < pageAt('engine/01-core.js'),
    'maps.js (WOA_BUILTIN) before 01-core, which reads it while loading');
  assert.ok(ORDER.ENGINE.indexOf('engine/00-config.js') < ORDER.ENGINE.indexOf('engine/ai/ai-config.js'),
    'ai-config after 00-config, whose defineConfigHome it calls while loading — a NESTED path a filename sort would put last');
  assert.ok(ORDER.ENGINE[ORDER.ENGINE.length - 1] === 'engine/07-export.js',
    '07-export last — it reads the whole namespace while loading');
  assert.ok(ORDER.PAGE[ORDER.PAGE.length - 1] === 'ui/boot.js', 'ui/boot.js last — it owns load-time wiring');
  assert.ok(pageAt('content/manifest.js') < ORDER.PAGE.indexOf(ORDER.ENGINE[0]),
    'content loads before the engine');
  assert.ok(pageAt('applied-battalion.js') > pageAt('content/manifest.js') &&
    pageAt('applied-battalion.js') < ORDER.PAGE.indexOf(ORDER.ENGINE[0]),
    'the battalion override resolves after content is populated, before the engine snapshots it');

  // 5. No consumer keeps a second copy of the chain: each reads load-order.js
  //    and hand-lists no engine path, at any depth.
  var ROOT = path.join(GAME, '..');
  [path.join(GAME, 'engine.js'), path.join(GAME, 'sweep-worker.js'),
   path.join(ROOT, 'dev', 'page-harness.js')].forEach(function (f) {
    var src = fs.readFileSync(f, 'utf8');
    var name = path.basename(f);
    assert.ok(/load-order\.js/.test(src), name + ' reads load-order.js');
    assert.ok(!/['"]engine\//.test(src), name + ' hand-lists no engine path');
  });
})();
});

test('content/manifest.js staleness', () => {
(function () {
  var fs = require('fs'), path = require('path');
  var gen = require('../content/manifest-gen.js');
  var expected = gen.buildManifest();
  var actual;
  try { actual = fs.readFileSync(gen.MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n'); } catch (e) { actual = null; }
  assert.ok(actual === expected,
    'content/manifest.js matches the content/ dirs' +
    (actual === expected ? '' : ' — STALE: regenerate it (boot the server, or `node -e "require(\'./game/content/manifest-gen.js\').regen()"`)'));
})();
});
