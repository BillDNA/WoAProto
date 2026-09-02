#!/usr/bin/env node
/* The war-story backstop, wired into the gate: the tree stays grep-clean of
   ticket refs, round/dated narration, and era labels. Runs check-prose.js as a
   child so a regression fails `npm test`, not just a manual run. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

test('docs and comments carry no war-story residue', () => {
  const script = path.join(__dirname, 'check-prose.js');
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'check-prose found war-story residue:\n' + r.stdout);
});
