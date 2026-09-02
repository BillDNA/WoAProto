/* Pins the decks→battalions rename: "deck" must stay scoped to the draw-pile
   runtime + the persisted db column (dev/check-deck-scope.js owns the allowlist).
   A future build-layer stray fails here instead of rotting the rename. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { scan } = require('./check-deck-scope.js');

test('deck-scope: no build-layer "deck" outside the runtime + persistence allowlist', () => {
  const r = scan();
  assert.strictEqual(r.violations.length, 0,
    'build-layer "deck" leaked outside the allowlist — rename to "battalion" (or mark the draw-pile/db line with deck-scope-ok):\n  ' +
    r.violations.join('\n  '));
  assert.strictEqual(r.stale.length, 0,
    'allowlisted file(s) are now deck-free — drop them from dev/check-deck-scope.js:\n  ' +
    r.stale.join('\n  '));
});
