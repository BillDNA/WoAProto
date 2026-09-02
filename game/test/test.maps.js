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

test('index.html script-tag chain', () => {
(function () {
  var fs = require('fs'), path = require('path');
  var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  var tags = [];
  html.replace(/<script src="([^"]+)"><\/script>/g, function (m, src) { tags.push(src); return m; });
  function diskSorted(sub) {
    try {
      return fs.readdirSync(path.join(__dirname, '..', sub)).filter(function (f) { return /\.js$/.test(f); })
        .sort().map(function (f) { return sub + '/' + f; });
    } catch (e) { return null; }
  }
  var manIdx = tags.indexOf('content/manifest.js');
  assert.ok(manIdx >= 0, 'content/manifest.js tag present');
  var engineParts = diskSorted('engine');
  var engineTags = tags.filter(function (t) { return /^engine\//.test(t); });
  assert.ok(JSON.stringify(engineTags) === JSON.stringify(engineParts),
    'engine tags = engine/ dir in sorted order (' + engineTags.length + ' parts)');
  assert.ok(engineParts.every(function (t) { return tags.indexOf(t) > manIdx; }),
    'every engine part loads after content/manifest.js');
  var uiParts = diskSorted('ui');
  if (uiParts) {
    var uiTags = tags.filter(function (t) { return /^ui\//.test(t); });
    assert.ok(uiParts.every(function (t) { return uiTags.indexOf(t) >= 0; }) && uiTags.length === uiParts.length,
      'every ui/ file has a tag (' + uiTags.length + ')');
    assert.ok(uiTags[uiTags.length - 1] === 'ui/boot.js', 'ui/boot.js is the last ui tag');
    var lastEngine = tags.indexOf(engineTags[engineTags.length - 1]);
    assert.ok(uiTags.every(function (t) { return tags.indexOf(t) > lastEngine; }), 'ui loads after the engine');
  }
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
