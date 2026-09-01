#!/usr/bin/env node
/* Sanctioned phase-marker control for the woa-implement protocol (#198, ADR-0004 §2).
   The marker `.claude/impl-phase` gates the test-freeze hook; the freeze + Bash guard deny
   writing it any other way, so a phase change is only ever this named, greppable act — never
   a silent Edit or a `printf > marker` the implementer slips past its own freeze.

   Usage:  node .claude/hooks/impl-phase.js <phase>   # set (testwriter | implement | ...)
           node .claude/hooks/impl-phase.js           # print the current phase */
'use strict';
const fs = require('fs');
const path = require('path');

// The marker path — env-overridable (WOA_IMPL_PHASE_FILE) so parallel test files can each
// isolate their own marker instead of racing the one real file; defaults to the real
// .claude/impl-phase the freeze hook gates (unset env = unchanged behavior).
function markerPath() { return process.env.WOA_IMPL_PHASE_FILE || path.resolve(__dirname, '..', 'impl-phase'); }
const PHASES = ['testwriter', 'implement'];

function get() { try { return fs.readFileSync(markerPath(), 'utf8').trim(); } catch { return ''; } }
function set(phase) { fs.writeFileSync(markerPath(), phase + '\n'); }

module.exports = { get, set, markerPath, get MARKER() { return markerPath(); }, PHASES };

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === undefined) { process.stdout.write((get() || '<unset>') + '\n'); process.exit(0); }
  if (!PHASES.includes(arg)) {
    process.stderr.write('unknown phase "' + arg + '" (expected one of: ' + PHASES.join(', ') + ')\n');
    process.exit(2);
  }
  set(arg);
  process.stdout.write('impl-phase = ' + arg + '\n');
  process.exit(0);
}
