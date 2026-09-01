#!/usr/bin/env node
/* Bash companion to the test-freeze hook (#198, ADR-0004 §2). The Edit/Write freeze cannot
   see a shell redirect, so a bare `printf testwriter > .claude/impl-phase` or `echo … > x.test.js`
   would slip past it. This PreToolUse hook on Bash denies a command that WRITES to the phase
   marker (always — phase changes go through impl-phase.js) or to a test file (unless the marker
   reads `testwriter`). Reads are never blocked; only write transports are scanned.
   Wired in .claude/settings.json; dev/guard-bash.test.js is the gate. */
'use strict';
const path = require('path');
const { isTestFile, isMarkerFile, readPhase, TESTWRITER } = require(path.join(__dirname, 'test-freeze.js'));

const unquote = t => t.replace(/^['"]|['"]$/g, '');

// Candidate write targets in a shell command: > / >> redirects, tee, sed -i, cp/mv dest, dd of=.
function writeTargets(command) {
  const cmd = String(command || '');
  const out = [];
  let m;
  const redir = /(?:^|[^0-9<>])>>?\s*("[^"]+"|'[^']+'|[^\s;|&>]+)/g;
  while ((m = redir.exec(cmd))) out.push(unquote(m[1]));
  const tee = /\btee\b\s+(?:-a\s+)?("[^"]+"|'[^']+'|[^\s;|&]+)/g;
  while ((m = tee.exec(cmd))) out.push(unquote(m[1]));
  const dd = /\bdd\b[^;|&]*\bof=("[^"]+"|'[^']+'|[^\s;|&]+)/g;
  while ((m = dd.exec(cmd))) out.push(unquote(m[1]));
  // sed -i / cp / mv: the edited/destination path is the last bare token of that segment.
  for (const seg of cmd.split(/[;|&]+/)) {
    if (/\bsed\b[^]*-i\b/.test(seg) || /\b(cp|mv)\b/.test(seg)) {
      const toks = seg.trim().split(/\s+/).filter(t => t && !t.startsWith('-'));
      if (toks.length > 1) out.push(unquote(toks[toks.length - 1]));
    }
  }
  return out;
}

/* Pure decision. Returns { deny, reason }. `phase` defaults to the live marker. */
function decideBash(command, phase) {
  const p = phase !== undefined ? phase : readPhase();
  for (const t of writeTargets(command)) {
    if (isMarkerFile(t)) {
      return { deny: true, reason:
        'guard-bash: a shell write to the phase marker .claude/impl-phase is blocked. ' +
        'Change phase only via `node .claude/hooks/impl-phase.js <phase>`.' };
    }
    if (isTestFile(t) && p !== TESTWRITER) {
      return { deny: true, reason:
        'guard-bash: a shell write to a test file (' + t + ') is blocked while .claude/impl-phase ' +
        'is "' + (p || '<unset>') + '". Tests are authored by a fresh test-writer subagent, not the ' +
        'implementer. See docs/woa-implement.md.' };
    }
  }
  return { deny: false, reason: '' };
}

module.exports = { decideBash, writeTargets };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { /* malformed → no command */ }
    const command = payload && payload.tool_input && payload.tool_input.command;
    const { deny, reason } = decideBash(command);
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
