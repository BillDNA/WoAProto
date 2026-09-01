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
// experiments; the shipped roster is the non-custom maps.
var builtinMaps = E.MAPS.filter(function (m) { return !m.custom; });
assert.ok(builtinMaps.length === 10, '10 shipped (non-custom) maps in the content roster (got ' + builtinMaps.length + ' of ' + E.MAPS.length + ' total)');
(function () {
  // HQ-distance guardrail applies to the SHIPPED roster; custom maps are Bill's
  // experiments (a turn-2 rush map can be intentional) and are exempt.
  builtinMaps.forEach(function (m) {
    var d = E.dist(E.key(m.redHQ[0], m.redHQ[1]), E.key(m.blueHQ[0], m.blueHQ[1]));
    assert.ok(d >= 4, m.name + ': HQs ' + d + ' apart (4+ so there is no turn-2 rush)');
  });
})();
});

test('map pool', () => {
(function () {
  var one = [E.MAPS[0]];
  var m = E.newMatch({ seed: 33, maps: one });
  assert.ok(m.maps.length === 1 && m.mapOrder.length === 1, 'match carries its own 1-map pool');
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
  var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  var tags = [];
  html.replace(/<script src="([^"]+)"><\/script>/g, function (m, src) { tags.push(src); return m; });
  function diskSorted(sub) {
    try {
      return fs.readdirSync(path.join(__dirname, sub)).filter(function (f) { return /\.js$/.test(f); })
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
  var gen = require('./content/manifest-gen.js');
  var expected = gen.buildManifest();
  var actual;
  try { actual = fs.readFileSync(gen.MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n'); } catch (e) { actual = null; }
  assert.ok(actual === expected,
    'content/manifest.js matches the content/ dirs' +
    (actual === expected ? '' : ' — STALE: regenerate it (boot the server, or `node -e "require(\'./game/content/manifest-gen.js\').regen()"`)'));
})();
});
