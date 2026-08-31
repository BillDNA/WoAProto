/* Commander content: it loads and its schema holds (wayfinder #88). Data-only —
   asserts the stub parses into WOA_CONTENT.commanders and every field is shaped
   right; NO rules effect is checked because the engine ignores commanders today. */
'use strict';
const { test } = require('./test.helpers.js');
const assert = require('node:assert');
require('./test.helpers.js'); // requiring the engine populates global.WOA_CONTENT

test('commanders content loads + schema', () => {
  var content = (typeof global !== 'undefined' && global.WOA_CONTENT) || {};
  var cmds = content.commanders || [];
  assert.ok(cmds.length >= 1, 'at least one commander loaded from content/commanders/');
  var deckIds = {};
  (content.decks || []).forEach(function (d) { if (d && d.id) deckIds[d.id] = true; });
  var ids = {};
  cmds.forEach(function (c) {
    assert.ok(c && typeof c.id === 'string' && c.id, 'commander has a non-empty id');
    assert.ok(!ids[c.id], 'commander id "' + c.id + '" is unique');
    ids[c.id] = true;
    assert.ok(typeof c.name === 'string' && c.name, c.id + ': name is a non-empty string');
    assert.ok(c.side === 'red' || c.side === 'blue' || c.side === null,
      c.id + ": side is 'red' | 'blue' | null");
    assert.ok(typeof c.theme === 'string' && c.theme, c.id + ': theme is a non-empty string');
    // personality is an aiConfig value: a preset/panel-name STRING, or an inline
    // AI_WEIGHTS override OBJECT (the commander holding its own weights). Either
    // must be non-empty; difficulty/search-depth is a separate run dial, not here.
    if (typeof c.personality === 'string') {
      assert.ok(c.personality, c.id + ': personality string is non-empty');
    } else {
      assert.ok(c.personality && typeof c.personality === 'object' && !Array.isArray(c.personality)
        && Object.keys(c.personality).length > 0,
        c.id + ': personality is a non-empty weights object');
      Object.keys(c.personality).forEach(function (k) {
        assert.ok(typeof c.personality[k] === 'number', c.id + ': weight "' + k + '" is a number');
      });
    }
    // deck is polymorphic like personality (#112): a fixed-deck POINTER string, or
    // an AFFINITY object tilting over the three DERIVED facets — unit/posture/curve
    // only (no new per-card metadata). Both forms inert; nothing drafts yet. This
    // test is the only guard on typos in inert content, so it resolves the pointer
    // and pins each facet's derived value-keys against the enumerated facet values.
    if (typeof c.deck === 'string') {
      assert.ok(c.deck, c.id + ': deck string pointer is non-empty');
      assert.ok(deckIds[c.deck], c.id + ': deck pointer "' + c.deck + '" resolves in WOA_CONTENT.decks');
    } else {
      assert.ok(c.deck && typeof c.deck === 'object' && !Array.isArray(c.deck)
        && Object.keys(c.deck).length > 0,
        c.id + ': deck is a non-empty affinity object');
      // Enumerated derived values per facet (facet name → allowed value-keys), from
      // steps[].unit / steps[].type / starting|noOpener. A typo'd value tilts nothing.
      var FACET_VALUES = {
        unit: { infantry: 1, cavalry: 1, artillery: 1 },
        posture: { deploy: 1, attack: 1, trench: 1, reposition: 1, barrage: 1 },
        curve: { starting: 1, noOpener: 1 }
      };
      Object.keys(c.deck).forEach(function (facet) {
        assert.ok(FACET_VALUES[facet], c.id + ': deck facet "' + facet + '" is one of unit/posture/curve');
        var tilt = c.deck[facet];
        assert.ok(tilt && typeof tilt === 'object' && !Array.isArray(tilt)
          && Object.keys(tilt).length > 0,
          c.id + ': deck.' + facet + ' is a non-empty value→weight map');
        Object.keys(tilt).forEach(function (v) {
          assert.ok(FACET_VALUES[facet][v], c.id + ': deck.' + facet + '.' + v + ' is a known ' + facet + ' value');
          assert.ok(Number.isFinite(tilt[v]) && tilt[v] >= 0,
            c.id + ': deck.' + facet + '.' + v + ' weight is a finite, non-negative number');
        });
      });
    }
    assert.ok(Array.isArray(c.abilities), c.id + ': abilities is an array');
    assert.strictEqual(c.abilities.length, 0, c.id + ': abilities stays inert/empty (the #24 hook)');
  });
});
