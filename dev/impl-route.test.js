#!/usr/bin/env node
/* dev/impl-route.test.js — the routing tooth (#198, ADR-0004). The UserPromptSubmit router must
   inject the woa-implement protocol when (and only when) a submitted prompt invokes an implement
   skill, and the injected text must carry the feature-complete + separate-reviewer mandate.
   Run: node --test dev/impl-route.test.js */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const HOOK = path.join(__dirname, '..', '.claude', 'hooks', 'impl-route.js');
const r = require(HOOK);

test('detects an implement invocation across its signatures', () => {
  for (const p of [
    '/implement https://github.com/BillDNA/WoAProto/issues/198',
    '/mattpocock-skills:implement #198',
    '<command-name>/mattpocock-skills:implement</command-name>',
    'Implement the work described by the user in the spec or tickets.',
  ]) {
    assert.strictEqual(r.invokesImplement(p), true, 'invokes: ' + p);
  }
});

test('does NOT fire on unrelated prompts (no spurious injection)', () => {
  for (const p of [
    'how does the implementation of the engine work?',   // "implement" substring, not an invocation
    'please review the balance report',
    '/code-review 214',
    '',
  ]) {
    assert.strictEqual(r.invokesImplement(p), false, 'no injection for: ' + p);
  }
});

test('injected context carries the protocol + the feature-complete mandate', () => {
  const { inject, context } = r.routeDecision('/implement #198');
  assert.strictEqual(inject, true);
  assert.ok(/FEATURE-COMPLETE/i.test(context), 'mandate present');
  assert.ok(/fresh test-writer/i.test(context) || /test-writer phase/i.test(context), 'protocol body present');
  assert.ok(/DIFFERENT subagent|separate/i.test(context), 'separate-reviewer clause present');
  assert.ok(!/^---\n/.test(context), 'frontmatter stripped');
});

test('a non-implement prompt injects nothing', () => {
  assert.deepStrictEqual(r.routeDecision('just chatting'), { inject: false, context: '' });
});

test('CLI: stdin prompt that invokes implement emits additionalContext', () => {
  const out = execFileSync('node', [HOOK], {
    input: JSON.stringify({ prompt: '/implement #198', hook_event_name: 'UserPromptSubmit' }),
    encoding: 'utf8',
  });
  const j = JSON.parse(out);
  assert.strictEqual(j.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.ok(/FEATURE-COMPLETE/i.test(j.hookSpecificOutput.additionalContext), 'CLI injects the mandate');
});

test('CLI: an unrelated prompt emits nothing', () => {
  const out = execFileSync('node', [HOOK], {
    input: JSON.stringify({ prompt: 'hello there' }), encoding: 'utf8',
  });
  assert.strictEqual(out.trim(), '', 'no output when not an implement run');
});

test('wiring: settings.json runs impl-route.js on UserPromptSubmit (no matcher)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude', 'settings.json'), 'utf8'));
  const ups = cfg.hooks && cfg.hooks.UserPromptSubmit;
  assert.ok(Array.isArray(ups) && ups.length > 0, 'has hooks.UserPromptSubmit');
  assert.ok(ups.some(e => (e.hooks || []).some(h => /impl-route\.js/.test(h.command || ''))),
    'a UserPromptSubmit entry runs impl-route.js');
});
