#!/usr/bin/env node
/* dev/test-freeze.test.js — the test-freeze tooth (#198, ADR-0004 §2).
   The PreToolUse hook must DENY an Edit/Write to a test file when the phase marker is
   not `testwriter`, and must NOT over-block (allows in the testwriter phase, and allows
   any non-test path). Two homes proven here: the pure decide() and the real CLI (stdin
   → exit code / JSON), plus the settings.json wiring that arms it.
   Run: node --test dev/test-freeze.test.js   (offline) */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const HOOK = path.join(__dirname, '..', '.claude', 'hooks', 'test-freeze.js');
const SETTINGS = path.join(__dirname, '..', '.claude', 'settings.json');
const hook = require(HOOK);

const edit = fp => ({ tool_name: 'Edit', tool_input: { file_path: fp } });
const write = fp => ({ tool_name: 'Write', tool_input: { file_path: fp } });
const multi = fp => ({ tool_name: 'MultiEdit', tool_input: { file_path: fp } });

// Paths that ARE test files (ADR-0004's three homes), and paths that are not.
const TEST_PATHS = [
  'dev/pr-lint.test.js',
  '/abs/repo/dev/test-freeze.test.js',
  'game/test.js',
  'game/test.geometry.js',
  './game/test.reports.js',
  'dev/smoke.js',
];
const NON_TEST_PATHS = [
  'game/engine.js',
  'dev/ui-review.js',
  'game/ui/board.js',
  'docs/workflow.md',
  'dev/smoke-notes.js',      // not dev/smoke.js
  'game/testing-utils.js',   // not game/test*.js (no separator before "test" as the dir)
];

test('classifier: the three test-file homes match, product files do not', () => {
  for (const p of TEST_PATHS) assert.ok(hook.isTestFile(p), 'is a test file: ' + p);
  for (const p of NON_TEST_PATHS) assert.ok(!hook.isTestFile(p), 'not a test file: ' + p);
});

test('RED: a test-file Edit/Write is DENIED when phase != testwriter', () => {
  for (const phase of ['implement', '', 'review', 'anything']) {
    for (const p of TEST_PATHS) {
      assert.strictEqual(hook.decide(edit(p), phase).deny, true,
        'Edit ' + p + ' denied at phase "' + phase + '"');
      assert.strictEqual(hook.decide(write(p), phase).deny, true,
        'Write ' + p + ' denied at phase "' + phase + '"');
    }
  }
});

test('the matcher covers MultiEdit too: a MultiEdit test-file write is denied/allowed by phase', () => {
  // settings.json arms Edit|Write|MultiEdit; MultiEdit can edit a test file, so it must
  // route through the same freeze — denied outside testwriter, allowed inside.
  assert.strictEqual(hook.decide(multi('dev/pr-lint.test.js'), 'implement').deny, true);
  assert.strictEqual(hook.decide(multi('dev/pr-lint.test.js'), 'testwriter').deny, false);
  assert.strictEqual(hook.decide(multi('game/engine.js'), 'implement').deny, false);
});

test('no over-block: allowed in the testwriter phase, and for any non-test path', () => {
  for (const p of TEST_PATHS) {
    assert.strictEqual(hook.decide(edit(p), 'testwriter').deny, false,
      'testwriter may edit ' + p);
  }
  for (const phase of ['implement', 'testwriter', '']) {
    for (const p of NON_TEST_PATHS) {
      assert.strictEqual(hook.decide(edit(p), phase).deny, false,
        'non-test path ' + p + ' allowed at phase "' + phase + '"');
    }
  }
});

test('a deny carries a reason that names the file and the required phase', () => {
  const { deny, reason } = hook.decide(edit('dev/pr-lint.test.js'), 'implement');
  assert.ok(deny);
  assert.ok(reason.includes('dev/pr-lint.test.js'), 'reason names the file');
  assert.ok(/testwriter/.test(reason), 'reason names the required phase');
});

// End-to-end: the real CLI reads the payload on stdin and emits a structured deny —
// exit 0 with { permissionDecision: 'deny' } on stdout (the PreToolUse contract).
// Drive it through the real marker file the hook reads (.claude/impl-phase), restored after.
function withPhase(phase, fn) {
  const marker = hook.PHASE_FILE;
  const prev = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : null;
  try { fs.writeFileSync(marker, phase); return fn(); }
  finally {
    if (prev !== null) fs.writeFileSync(marker, prev);
    else if (fs.existsSync(marker)) fs.unlinkSync(marker);
  }
}
function runCLI(payload) {
  let code = 0, out = '';
  try { out = execFileSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' }); }
  catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  let decision = null;
  try { decision = JSON.parse(out || '{}').hookSpecificOutput || null; } catch { /* no json */ }
  return { code, out, decision };
}

test('CLI: a frozen test edit emits a deny decision on stdout (exit 0)', () => {
  withPhase('implement', () => {
    const { code, decision } = runCLI(edit('dev/pr-lint.test.js'));
    assert.strictEqual(code, 0, 'structured hook exits 0 and carries the decision in stdout');
    assert.ok(decision, 'stdout is a hookSpecificOutput JSON');
    assert.strictEqual(decision.permissionDecision, 'deny', 'the decision is deny');
    assert.ok(/testwriter/.test(decision.permissionDecisionReason || ''), 'reason names the phase');
  });
});

test('CLI: a test edit in the testwriter phase is allowed (no deny emitted)', () => {
  withPhase('testwriter', () => {
    const { code, decision } = runCLI(edit('dev/pr-lint.test.js'));
    assert.strictEqual(code, 0);
    assert.ok(!decision || decision.permissionDecision !== 'deny', 'no deny in testwriter phase');
  });
});

test('CLI: a non-test-file write is always allowed, marker irrelevant', () => {
  withPhase('implement', () => {
    const { code, decision } = runCLI(write('game/engine.js'));
    assert.strictEqual(code, 0);
    assert.ok(!decision || decision.permissionDecision !== 'deny', 'non-test write not denied');
  });
});

test('wiring: settings.json arms the hook on Edit|Write via a PreToolUse entry', () => {
  const cfg = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  const pre = cfg.hooks && cfg.hooks.PreToolUse;
  assert.ok(Array.isArray(pre) && pre.length > 0, 'settings.json has hooks.PreToolUse');
  const armed = pre.find(e =>
    /Edit/.test(e.matcher || '') && /Write/.test(e.matcher || '') &&
    (e.hooks || []).some(h => /test-freeze\.js/.test(h.command || '')));
  assert.ok(armed, 'a PreToolUse entry matches Edit|Write and runs test-freeze.js');
});
