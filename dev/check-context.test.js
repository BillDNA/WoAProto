#!/usr/bin/env node
/* CONTEXT.md's term→code spine, wired into the gate: every home pointer resolves
   to its real file:line and no locked alias has regressed. Runs check-context.js
   as a child so drift (a comment edit that shifts an anchor's line) fails
   `npm test`, not just a manual run. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

test('CONTEXT.md home pointers resolve and locked aliases stay clean', () => {
  const script = path.join(__dirname, 'check-context.js');
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'check-context failed:\n' + r.stdout);
});
