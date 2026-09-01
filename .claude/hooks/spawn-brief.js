#!/usr/bin/env node
/* Canonical-brief injector (#198, ADR-0004 §2). A PreToolUse hook on the subagent-spawn tool
   (Task/Agent). When the spawned agent is a woa-implement role — testwriter-* or reviewer-* — it
   REWRITES the spawn prompt to the canonical brief in .claude/briefs/<role>.md, so the brief is
   mechanical and identical every run: the implementer spawns with a one-liner (a ticket ref) and
   cannot water the brief down. Variable bits ({TICKET}/{BRANCH}/{WORKTREE}) are filled from the
   one-liner; the brief cites docs/woa-implement.md for the detail, it does not restate it.
   Wired in .claude/settings.json (PreToolUse, matcher Task|Agent). dev/spawn-brief.test.js is the gate. */
'use strict';
const fs = require('fs');
const path = require('path');

const BRIEFS = path.resolve(__dirname, '..', 'briefs');

// Role from the spawn's subagent_type AND name (either may carry it), e.g. "testwriter-168".
function roleTag(input) {
  return String(((input && input.subagent_type) || '') + ' ' + ((input && input.name) || ''));
}
function roleOf(input) {
  const tag = roleTag(input);
  if (/testwriter/i.test(tag)) return 'testwriter';
  if (/reviewer/i.test(tag)) return 'reviewer';
  return null;
}

// Best-effort variable extraction from the one-liner prompt + the role tag.
function vars(input) {
  const tag = roleTag(input);
  const prompt = String((input && input.prompt) || '');
  const hay = tag + ' ' + prompt;
  const ticketM = hay.match(/#?(\d{2,6})\b/);
  const branchM = prompt.match(/\b((?:worktree-|content-run-|woa[-\w]*)[\w.\/-]+)\b/);
  const wtM = prompt.match(/([^\s"']*\.claude\/worktrees\/[\w.-]+)/);
  return {
    TICKET: ticketM ? ticketM[1] : 'the ticket named in the spawn',
    BRANCH: branchM ? branchM[1] : 'the ticket branch (verify with git branch --show-current)',
    WORKTREE: wtM ? wtM[1] : 'the current worktree',
  };
}

function fill(tpl, v) {
  return tpl.replace(/\{(TICKET|BRANCH|WORKTREE)\}/g, (_, k) => v[k]);
}

/* Pure decision. Returns { updatedInput } to rewrite the spawn, or null to leave it. */
function decide(payload, briefsDir) {
  const tool = payload && payload.tool_name;
  if (tool !== 'Task' && tool !== 'Agent') return null;
  const input = payload.tool_input || {};
  const role = roleOf(input);
  if (!role) return null;
  let tpl;
  try { tpl = fs.readFileSync(path.join(briefsDir || BRIEFS, role + '.md'), 'utf8'); }
  catch { return null; }
  const prompt = fill(tpl, vars(input)).trim();
  return { updatedInput: Object.assign({}, input, { prompt }) };
}

module.exports = { decide, roleOf, vars, fill, BRIEFS };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { /* malformed → no rewrite */ }
    const d = decide(payload);
    if (d) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          updatedInput: d.updatedInput,
        },
      }));
    }
    process.exit(0);
  });
}
