#!/usr/bin/env node
/* dev/golden.test.js — the 60-game byte-equality net in the gate (dev/golden.js).
   A refactor that changes any Core-Six outcome fails here; an intended
   rules/AI/content change regenerates the golden (`node dev/golden.js --write`)
   atomically with the rules-version bump. Run: node --test dev/golden.test.js */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const golden = require(path.join(__dirname, 'golden.js'));

test('golden: the Core-Six 60-game set is byte-identical to the committed transcript', function () {
  const r = golden.check();
  assert.ok(r.ok, r.ok ? '' :
    'the deterministic 60-game set drifted from dev/golden/core-six-60.json:\n  ' + r.diff +
    '\n(if intended, bump the rules version and `node dev/golden.js --write`)');
});

test('golden: the fixture is the fixed 10/map × Core Six shape', function () {
  const g = golden.readGolden();
  assert.strictEqual(g.nPerMap, 10, 'golden is 10 games per map');
  assert.strictEqual(g.transcript.length, 60, 'golden is 60 games (10 × the Core Six)');
  assert.strictEqual(g.mapset, 'core7', 'golden runs the frozen Core-Six mapset id');
  assert.ok(/^[0-9a-f]{64}$/.test(g.sha256), 'golden carries a sha256 of the transcript');
});
