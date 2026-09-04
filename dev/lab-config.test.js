/* dev/lab-config.test.js — the dev-lab config tier is a REAL home, populated and read.
   Run: node --test dev/lab-config.test.js  (node:test + node:assert, no framework)

   Asserts the MECHANISM (the seam), never the tuned numbers: that the home was made by
   the shared Engine.defineConfigHome (same digest getter as Engine.CONFIG), that it is
   organized into named sections, and that the LLM timeout has ONE owner both transports
   read — the duplicate is gone. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const LAB = require('./lab-config.js');
const { LlmSession } = require('./llm-session.js');

/* ---- the home is made by the shared helper (the seam) ---- */
test('lab-config was made by Engine.defineConfigHome (its digest getter IS the shared one)', function () {
  const labGet = Object.getOwnPropertyDescriptor(LAB, 'digest').get;
  const cfgGet = Object.getOwnPropertyDescriptor(E.CONFIG, 'digest').get;
  assert.strictEqual(typeof labGet, 'function');
  assert.strictEqual(labGet, cfgGet, 'a hand-rolled home would not share the engine home getter');
});

test('the digest is non-enumerable and stable across reads', function () {
  assert.ok(!Object.keys(LAB).includes('digest'), 'digest must not enumerate as a section');
  assert.strictEqual(LAB.digest, LAB.digest);
});

/* ---- progressive disclosure: intentional named sections, not a flat bag ---- */
test('the home is organized into named sections', function () {
  ['llm', 'claudePlays', 'balance', 'balanceReport', 'tuneWeights', 'sweep'].forEach(function (section) {
    assert.strictEqual(typeof LAB[section], 'object', 'missing section: ' + section);
    assert.ok(LAB[section] && !Array.isArray(LAB[section]), section + ' must be a named group');
  });
});

/* ---- the LLM timeout has ONE owner both transports read ---- */
test('llm-session reads its default timeout from the home (no private copy)', function () {
  const s = new LlmSession({}); // no timeoutMs override -> must fall back to the home
  assert.strictEqual(s._timeoutMs, LAB.llm.timeoutMs);
  s.close();
});

test('both transports reference LAB.llm.timeoutMs — the duplicated literal is gone', function () {
  ['llm-client.js', 'llm-session.js'].forEach(function (f) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.ok(src.indexOf('LAB.llm.timeoutMs') >= 0, f + ' must read the shared timeout owner');
    // The old inline default must not survive as a second literal owner in either file.
    assert.ok(src.indexOf('= 180000') < 0, f + ' still hardcodes the timeout literal');
  });
});
