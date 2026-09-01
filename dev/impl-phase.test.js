#!/usr/bin/env node
/* dev/impl-phase.test.js — the sanctioned phase-setter (#198, ADR-0004 §2). It is the only
   legitimate way to change .claude/impl-phase; it rejects unknown phases and round-trips set/get.
   Run: node --test dev/impl-phase.test.js */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, '..', '.claude', 'hooks', 'impl-phase.js');
const mod = require(CLI);

function run(args) {
  try { return { out: execFileSync('node', [CLI, ...args], { encoding: 'utf8' }), code: 0 }; }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), code: e.status }; }
}

test('set/get round-trips through the marker file', () => {
  const marker = mod.MARKER;
  const prev = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : null;
  try {
    run(['testwriter']);
    assert.strictEqual(mod.get(), 'testwriter');
    run(['implement']);
    assert.strictEqual(mod.get(), 'implement');
    assert.strictEqual(run([]).out.trim(), 'implement', 'no-arg prints current phase');
  } finally {
    if (prev !== null) fs.writeFileSync(marker, prev);
    else if (fs.existsSync(marker)) fs.unlinkSync(marker);
  }
});

test('an unknown phase is rejected (exit 2), marker unchanged', () => {
  const marker = mod.MARKER;
  const prev = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : null;
  try {
    fs.writeFileSync(marker, 'implement\n');
    const { code } = run(['bogus']);
    assert.strictEqual(code, 2, 'rejects an unknown phase');
    assert.strictEqual(mod.get(), 'implement', 'marker left untouched on rejection');
  } finally {
    if (prev !== null) fs.writeFileSync(marker, prev);
    else if (fs.existsSync(marker)) fs.unlinkSync(marker);
  }
});
