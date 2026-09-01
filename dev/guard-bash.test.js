#!/usr/bin/env node
/* dev/guard-bash.test.js — the shell-redirect half of the test-freeze tooth (#198, ADR-0004 §2).
   The Bash guard must DENY a command that writes the phase marker (always) or a test file
   (outside the testwriter phase), across redirect / tee / sed -i / cp / mv / dd, and must NOT
   block reads or writes to ordinary product files.
   Run: node --test dev/guard-bash.test.js */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const g = require(path.join(__dirname, '..', '.claude', 'hooks', 'guard-bash.js'));

test('RED: shell writes to the phase marker are denied in any phase', () => {
  for (const phase of ['implement', 'testwriter', '']) {
    for (const cmd of [
      'printf testwriter > .claude/impl-phase',
      'echo implement >> .claude/impl-phase',
      'echo x | tee .claude/impl-phase',
    ]) {
      assert.strictEqual(g.decideBash(cmd, phase).deny, true, 'denied: ' + cmd + ' @' + phase);
    }
  }
});

test('RED: shell writes to a test file are denied outside testwriter', () => {
  for (const cmd of [
    'echo "assert(1)" > dev/pr-lint.test.js',
    "sed -i '' 's/x/y/' game/test.js",
    'cp /tmp/fake dev/smoke.js',
    'mv /tmp/fake game/test.geometry.js',
  ]) {
    assert.strictEqual(g.decideBash(cmd, 'implement').deny, true, 'denied at implement: ' + cmd);
  }
});

test('no over-block: test-file writes are allowed in testwriter; product + reads always allowed', () => {
  assert.strictEqual(g.decideBash('echo x > dev/pr-lint.test.js', 'testwriter').deny, false);
  for (const cmd of [
    'node game/test.js',                       // running tests is a read, not a write
    'cat dev/smoke.js',                        // reading a test file
    'echo x > game/engine.js',                 // writing a product file
    'node .claude/hooks/impl-phase.js testwriter', // the sanctioned setter (not a shell write)
    'grep -n foo .claude/impl-phase',          // reading the marker
  ]) {
    assert.strictEqual(g.decideBash(cmd, 'implement').deny, false, 'allowed: ' + cmd);
  }
});

test('writeTargets extracts redirect/tee/dd/sed/cp/mv destinations', () => {
  assert.deepStrictEqual(g.writeTargets('echo a > x.test.js'), ['x.test.js']);
  assert.ok(g.writeTargets('foo | tee -a dev/smoke.js').includes('dev/smoke.js'));
  assert.ok(g.writeTargets('dd if=/dev/zero of=game/test.js').includes('game/test.js'));
});

test('wiring: settings.json runs guard-bash.js on a PreToolUse Bash matcher', () => {
  const fs = require('fs'), path = require('path');
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude', 'settings.json'), 'utf8'));
  const pre = (cfg.hooks && cfg.hooks.PreToolUse) || [];
  assert.ok(pre.some(e => /Bash/.test(e.matcher || '') &&
    (e.hooks || []).some(h => /guard-bash\.js/.test(h.command || ''))),
    'a PreToolUse Bash entry runs guard-bash.js');
});
