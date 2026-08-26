/* Commander content: it loads and its schema holds (wayfinder #88). Data-only —
   asserts the stub parses into WOA_CONTENT.commanders and every field is shaped
   right; NO rules effect is checked because the engine ignores commanders today. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
require('./test.helpers.js'); // requiring the engine populates global.WOA_CONTENT

test('commanders content loads + schema', () => {
  var cmds = (typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.commanders) || [];
  assert.ok(cmds.length >= 1, 'at least one commander loaded from content/commanders/');
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
    assert.ok(Array.isArray(c.abilities), c.id + ': abilities is an array');
    assert.strictEqual(c.abilities.length, 0, c.id + ': abilities stays inert/empty (the #24 hook)');
  });
});
