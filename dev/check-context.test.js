#!/usr/bin/env node
/* The term→code spine (docs/context/), wired into the gate:
   every home pointer's anchor still appears in its file, and no locked alias has
   regressed. Home pointers are line-number-free — the anchor is the greppable key,
   so a line shift never fails the gate; only a rename / move-out / delete does.
   The unit tests below prove the guard actually bites (a vanished anchor fails, a
   re-added line number is rejected), so the anti-churn property can't quietly rot. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { checkHomes } = require('./check-context.js');

test('the whole spine resolves and locked aliases stay clean', () => {
  const script = path.join(__dirname, 'check-context.js');
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'check-context failed:\n' + r.stdout);
});

test('a real anchor resolves by appearing anywhere in its file (no line pin)', () => {
  const r = checkHomes([{ name: 'X', home: '`dev/check-context.js` — `checkHomes`' }]);
  assert.strictEqual(r.resolved, 1);
  assert.strictEqual(r.fails.length, 0);
});

test('a vanished anchor (rename / move-out / delete) FAILS', () => {
  const r = checkHomes([{ name: 'Y', home: '`dev/check-context.js` — `zzzNotARealAnchorzzz`' }]);
  assert.strictEqual(r.fails.length, 1);
  assert.match(r.fails[0], /no longer in/);
});

test('a re-added line number is REJECTED (anti-churn guard)', () => {
  const r = checkHomes([{ name: 'Z', home: '`dev/check-context.js:42` — `checkHomes`' }]);
  assert.strictEqual(r.fails.length, 1);
  assert.match(r.fails[0], /line number/);
});
