#!/usr/bin/env node
/* Test-freeze PreToolUse hook (ADR-0004 §2, #198). DENIES an Edit/Write to a test file
   (*.test.js, game/test*.js, dev/smoke.js) unless the phase marker `.claude/impl-phase`
   reads `testwriter`; an absent or other marker is frozen (fail-closed). It also denies an
   Edit/Write to the marker itself, so the implementer cannot lift its own freeze — a phase
   change goes only through `node .claude/hooks/impl-phase.js` (a loud, greppable act).
   Wired in .claude/settings.json under hooks.PreToolUse (matcher Edit|Write|MultiEdit); the
   companion Bash guard (guard-bash.js) closes the shell-redirect path. dev/test-freeze.test.js
   is the gate. */
'use strict';
const fs = require('fs');
const path = require('path');

// Repo root, resolved from this file's location so cwd never matters.
const ROOT = path.resolve(__dirname, '..', '..');
// env-overridable (WOA_IMPL_PHASE_FILE) so parallel test files isolate their own marker
// instead of racing the one real file; defaults to the real marker (unset env = unchanged).
function phaseFile() { return process.env.WOA_IMPL_PHASE_FILE || path.join(ROOT, '.claude', 'impl-phase'); }
const TESTWRITER = 'testwriter';

// A path is a test file when it matches one of ADR-0004's three homes. Checked on the
// path tail so absolute, repo-relative, and ./-prefixed forms all resolve the same.
const TEST_PATTERNS = [
  /\.test\.js$/,                       // *.test.js — every dev suite + the split game tests
  /(^|\/)game\/test(\.[^/]+)?\.js$/,   // game/test.js and its test.<area>.js shards (not testing-utils.js)
  /(^|\/)dev\/smoke\.js$/,             // dev/smoke.js — the UI smoke gate
];

function isTestFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const norm = filePath.replace(/\\/g, '/');
  return TEST_PATTERNS.some(re => re.test(norm));
}

// The phase marker itself — never editable through the Edit/Write tools (only impl-phase.js).
function isMarkerFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  return filePath.replace(/\\/g, '/').endsWith('.claude/impl-phase');
}

// The current phase, trimmed; '' when the marker is absent or unreadable.
function readPhase(file) {
  try { return fs.readFileSync(file || phaseFile(), 'utf8').trim(); }
  catch { return ''; }
}

/* Pure decision. `payload` is the PreToolUse stdin object; `phase` is injected for the
   test (defaults to the live marker). Returns { deny, reason }. Denies only a test-file
   write while phase !== 'testwriter'; everything else (non-test paths, testwriter phase)
   is allowed — no over-block. */
function decide(payload, phase) {
  const p = phase !== undefined ? phase : readPhase();
  const filePath = payload && payload.tool_input && payload.tool_input.file_path;
  if (isMarkerFile(filePath)) {
    return {
      deny: true,
      reason:
        'test-freeze: the phase marker .claude/impl-phase is not editable through Edit/Write. ' +
        'Change phase only via `node .claude/hooks/impl-phase.js <phase>` — the implementer must ' +
        'not lift its own freeze. See docs/woa-implement.md.',
    };
  }
  if (!isTestFile(filePath)) return { deny: false, reason: '' };
  if (p === TESTWRITER) return { deny: false, reason: '' };
  return {
    deny: true,
    reason:
      'test-freeze: editing a test file (' + filePath + ') is blocked while ' +
      '.claude/impl-phase is "' + (p || '<unset>') + '" (needs "' + TESTWRITER + '"). Do NOT flip ' +
      'the marker to edit this test — the implementer has zero test-editing power. A blocking or ' +
      'missing test is authored by a FRESH test-writer subagent (marker `testwriter`), never by you. ' +
      'See the woa-implement protocol in docs/woa-implement.md.',
  };
}

module.exports = { decide, isTestFile, isMarkerFile, readPhase, TEST_PATTERNS, get PHASE_FILE() { return phaseFile(); }, phaseFile, TESTWRITER };

// CLI: read the PreToolUse payload on stdin, deny a frozen test-file write via the
// structured contract — exit 0 with a JSON permissionDecision on stdout (the current
// PreToolUse form; the docs say pick this OR exit-2/stderr, not both). Allow → exit 0,
// no output.
if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { /* malformed → treat as no file */ }
    const { deny, reason } = decide(payload);
    if (deny) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      }));
    }
    process.exit(0);
  });
}
