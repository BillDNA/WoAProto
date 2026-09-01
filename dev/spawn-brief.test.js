#!/usr/bin/env node
/* dev/spawn-brief.test.js — canonical-brief injector (#198, ADR-0004 §2). A one-liner spawn of a
   testwriter or reviewer teammate is REWRITTEN to the canonical brief, so the implementer cannot
   author (or water down) the brief. Asserts the rewrite replaces the implementer's text, fills the
   ticket, and cites the protocol rather than restating it.
   Run: node --test dev/spawn-brief.test.js */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const HOOK = path.join(__dirname, '..', '.claude', 'hooks', 'spawn-brief.js');
const s = require(HOOK);

const spawn = (subagent_type, prompt, name) =>
  ({ tool_name: 'Task', tool_input: { subagent_type, name, prompt, description: 'x' } });

test('roleOf reads the role from subagent_type or name', () => {
  assert.strictEqual(s.roleOf({ subagent_type: 'testwriter-168' }), 'testwriter');
  assert.strictEqual(s.roleOf({ name: 'reviewer-169' }), 'reviewer');
  assert.strictEqual(s.roleOf({ subagent_type: 'general-purpose', name: 'foo' }), null);
});

test('a one-liner testwriter spawn is rewritten to the canonical brief with the ticket filled', () => {
  const d = s.decide(spawn('testwriter-168', '#168'));
  assert.ok(d && d.updatedInput, 'rewrite happened');
  const p = d.updatedInput.prompt;
  assert.ok(/fresh, independent test-writer for #168/.test(p), 'names the role + ticket #168');
  assert.ok(/docs\/woa-implement\.md/.test(p), 'cites the protocol (does not restate it)');
  assert.ok(!/\{TICKET\}/.test(p), 'placeholder filled');
});

test('the implementer one-liner is REPLACED, not appended (no word-soup survives)', () => {
  const junk = 'please write some tests i guess, do whatever, maybe check it renders';
  const d = s.decide(spawn('testwriter-168', junk));
  assert.ok(!d.updatedInput.prompt.includes('do whatever'), 'implementer prose does not survive');
  assert.ok(d.updatedInput.prompt.length < 800, 'brief is a terse one-liner, not word soup');
});

test('reviewer spawn is rewritten and its first-action /code-review mandate is present', () => {
  const d = s.decide(spawn('reviewer-168', 'review it'));
  assert.ok(/reviewer for #168/.test(d.updatedInput.prompt), 'reviewer role + ticket');
  assert.ok(/\/code-review/.test(d.updatedInput.prompt), 'carries the /code-review first-action');
});

test('vars extracts ticket, branch, worktree from the spawn', () => {
  const v = s.vars({ subagent_type: 'testwriter-168',
    prompt: 'work in /repo/.claude/worktrees/runloop-repoint-168 on worktree-runloop-repoint-168' });
  assert.strictEqual(v.TICKET, '168');
  assert.ok(/worktree-runloop-repoint-168/.test(v.BRANCH), 'branch detected');
  assert.ok(/\.claude\/worktrees\/runloop-repoint-168/.test(v.WORKTREE), 'worktree detected');
});

test('non-role spawns and non-spawn tools are left untouched', () => {
  assert.strictEqual(s.decide(spawn('general-purpose', 'do a thing', 'helper')), null);
  assert.strictEqual(s.decide({ tool_name: 'Bash', tool_input: { command: 'ls' } }), null);
});

test('CLI: a testwriter Task payload emits updatedInput with the canonical brief', () => {
  const out = execFileSync('node', [HOOK], {
    input: JSON.stringify(spawn('testwriter-168', '#168')), encoding: 'utf8',
  });
  const j = JSON.parse(out);
  assert.strictEqual(j.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.ok(/test-writer for #168/.test(j.hookSpecificOutput.updatedInput.prompt), 'CLI rewrote the prompt');
});

test('wiring: settings.json runs spawn-brief.js on a PreToolUse Task|Agent matcher', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude', 'settings.json'), 'utf8'));
  const pre = (cfg.hooks && cfg.hooks.PreToolUse) || [];
  assert.ok(pre.some(e => /Task/.test(e.matcher || '') &&
    (e.hooks || []).some(h => /spawn-brief\.js/.test(h.command || ''))),
    'a PreToolUse Task entry runs spawn-brief.js');
});
